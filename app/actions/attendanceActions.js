'use server';

import dbConnect from '@/lib/db';
import Attendance from '@/models/Attendance';
import Fighter from '@/models/Fighter';
import User from '@/models/User';
import GymSettings from '@/models/GymSettings';
import { calculateDistanceMeters, isValidCoordinatePair } from '@/lib/geoUtils';
import { getCurrentUser } from './authActions';
import { revalidatePath } from 'next/cache';

/**
 * Returns formatted 12-hour IST local time string with seconds (e.g. "06:30:15 AM")
 */
function getFormattedTime(dateObj = new Date()) {
  return dateObj.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Formats duration in seconds to "02h 15m 30s"
 */
function formatDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds < 0) return '00h 00m 00s';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

/**
 * Normalizes date to 'YYYY-MM-DD' in IST (Asia/Kolkata)
 */
function getTodayDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Counts Mon-Sat training days (excluding Sundays) for a YYYY-MM calendar month.
 */
function countTrainingDaysInMonth(yearMonth) {
  const [year, month] = String(yearMonth || '').split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) return 26;
  const totalCalendarDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let trainingDays = 0;
  for (let day = 1; day <= totalCalendarDays; day++) {
    if (new Date(Date.UTC(year, month - 1, day)).getUTCDay() !== 0) {
      trainingDays++;
    }
  }
  return trainingDays;
}

/**
 * Serializes gym location settings safely for Client Components.
 */
function serializeGymSettings(doc, includeCoordinates = false) {
  const lat = doc?.latitude !== null && doc?.latitude !== undefined ? Number(doc.latitude) : null;
  const lng = doc?.longitude !== null && doc?.longitude !== undefined ? Number(doc.longitude) : null;
  const hasCoordinates = lat !== null && lng !== null && isValidCoordinatePair(lat, lng);

  return {
    locationLabel: doc?.locationLabel || 'Mutants Academy',
    latitude: includeCoordinates && hasCoordinates ? lat : null,
    longitude: includeCoordinates && hasCoordinates ? lng : null,
    hasCoordinates,
    radiusMeters: Number(doc?.radiusMeters) || 100,
    geofenceEnabled: doc?.geofenceEnabled ?? true,
    requireCheckOutLocation: doc?.requireCheckOutLocation ?? true,
    updatedByName: includeCoordinates ? doc?.updatedByName || '' : '',
    updatedAt: includeCoordinates && doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
  };
}

/**
 * Verifies fighter GPS coordinates against saved gym geofence on the server.
 */
async function verifyFighterLocation(locationPayload, isCheckOut = false) {
  const settingsDoc = await GymSettings.findOne({ key: 'default' }).lean();
  const settings = serializeGymSettings(settingsDoc, true);

  if (!settings.geofenceEnabled) {
    return { ok: true, enforced: false, distanceMeters: null };
  }

  if (isCheckOut && !settings.requireCheckOutLocation) {
    return { ok: true, enforced: false, distanceMeters: null };
  }

  if (!settings.hasCoordinates) {
    return {
      ok: false,
      error: `Gym GPS location is not set yet. Ask Coach or MainAdmin to pin ${settings.locationLabel} under Attendance -> Gym Location.`,
    };
  }

  const rawLat = locationPayload?.latitude;
  const rawLng = locationPayload?.longitude;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (
    !locationPayload ||
    rawLat === undefined ||
    rawLat === null ||
    String(rawLat).trim() === '' ||
    rawLng === undefined ||
    rawLng === null ||
    String(rawLng).trim() === '' ||
    !isValidCoordinatePair(lat, lng)
  ) {
    return {
      ok: false,
      error: `GPS location is required to verify you are at ${settings.locationLabel}. Allow Location access and tap again.`,
    };
  }

  const distanceMeters = Math.round(
    calculateDistanceMeters(lat, lng, settings.latitude, settings.longitude)
  );

  if (distanceMeters > settings.radiusMeters) {
    const accuracy = Number(locationPayload?.accuracy);
    const accuracyNote =
      Number.isFinite(accuracy) && accuracy > 250
        ? ` (Weak GPS signal ±${Math.round(accuracy)}m — try near a window or ask Coach/Admin to mark manually)`
        : '';

    return {
      ok: false,
      error: `You are ${distanceMeters}m away from ${settings.locationLabel} (allowed radius: ${settings.radiusMeters}m). Check in from inside the gym or ask Coach/Admin to mark manually.${accuracyNote}`,
    };
  }

  return { ok: true, enforced: true, distanceMeters };
}

/**
 * Returns the current Gym Location geofence settings.
 */
export async function getGymLocationSettings() {
  try {
    await dbConnect();
    const currentUser = await getCurrentUser();
    if (!currentUser) return { error: 'Unauthorized' };

    const doc = await GymSettings.findOne({ key: 'default' }).lean();
    const includeCoordinates = currentUser.role === 'MainAdmin' || currentUser.role === 'Coach';
    return {
      success: true,
      settings: serializeGymSettings(doc, includeCoordinates),
    };
  } catch (err) {
    console.error('Error fetching gym location settings:', err);
    return { error: 'Failed to load gym location settings' };
  }
}

/**
 * Updates Gym GPS coordinates, geofence radius, and check-in rules (MainAdmin & Coach).
 */
export async function updateGymLocationSettings({
  locationLabel,
  latitude,
  longitude,
  radiusMeters,
  geofenceEnabled,
  requireCheckOutLocation,
}) {
  try {
    await dbConnect();
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'MainAdmin' && currentUser.role !== 'Coach')) {
      return { error: 'Unauthorized: Only MainAdmin or Coach can update gym location.' };
    }

    const existing = await GymSettings.findOne({ key: 'default' }).lean();

    let nextLat = existing?.latitude ?? null;
    let nextLng = existing?.longitude ?? null;
    const hasLatInput = latitude !== undefined && latitude !== null && String(latitude).trim() !== '';
    const hasLngInput = longitude !== undefined && longitude !== null && String(longitude).trim() !== '';

    if (hasLatInput || hasLngInput) {
      const parsedLat = Number(latitude);
      const parsedLng = Number(longitude);
      if (!hasLatInput || !hasLngInput || !isValidCoordinatePair(parsedLat, parsedLng)) {
        return { error: 'Enter valid latitude (-90 to 90) and longitude (-180 to 180) coordinates.' };
      }
      nextLat = Number(parsedLat.toFixed(6));
      nextLng = Number(parsedLng.toFixed(6));
    }

    const nextGeofenceEnabled = Boolean(geofenceEnabled);
    if (nextGeofenceEnabled && (nextLat === null || nextLng === null)) {
      return {
        error:
          'Set gym coordinates first ("Use My Current Location" or paste Google Maps link/coordinates) before enabling location verification.',
      };
    }

    const nextRadius = Math.min(2000, Math.max(20, Math.round(Number(radiusMeters) || 100)));
    const nextLabel = String(locationLabel || '').trim() || 'Mutants Academy';

    const dbUser = await User.findById(currentUser.id).select('name').lean();

    const updated = await GymSettings.findOneAndUpdate(
      { key: 'default' },
      {
        $set: {
          key: 'default',
          locationLabel: nextLabel,
          latitude: nextLat,
          longitude: nextLng,
          radiusMeters: nextRadius,
          geofenceEnabled: nextGeofenceEnabled,
          requireCheckOutLocation: Boolean(requireCheckOutLocation),
          updatedBy: currentUser.id,
          updatedByName: dbUser?.name || currentUser.role,
        },
      },
      { upsert: true, new: true }
    ).lean();

    revalidatePath('/admin/attendance');
    revalidatePath('/fighter/attendance');

    return {
      success: true,
      settings: serializeGymSettings(updated, true),
      message: nextGeofenceEnabled
        ? `Gym pin updated (${nextLabel} • ${nextRadius}m radius).`
        : 'Location check turned OFF. Athletes can check in without GPS.',
    };
  } catch (err) {
    console.error('Error updating gym location settings:', err);
    return { error: err.message || 'Failed to update gym location settings' };
  }
}

/**
 * Fighter Check-In (Punch In to Mats)
 */
export async function fighterPunchIn(location = null) {
  try {
    await dbConnect();
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'Fighter') {
      return { error: 'Unauthorized: Only logged-in fighters can punch in.' };
    }

    const fighter = await Fighter.findById(currentUser.id).lean();
    if (!fighter) {
      return { error: 'Fighter profile not found.' };
    }

    const todayStr = getTodayDateString();
    let record = await Attendance.findOne({ fighterId: fighter._id, date: todayStr });

    if (record && record.status === 'Checked In') {
      return {
        success: true,
        alreadyCheckedIn: true,
        record: {
          _id: record._id.toString(),
          inTime: record.inTime,
          inTimestamp: record.inTimestamp?.toISOString() || null,
          status: record.status,
          checkInRank: record.checkInRank,
          checkInDistanceMeters: record.checkInDistanceMeters ?? null,
          locationVerified: Boolean(record.locationVerified),
        },
        message: `You are already checked in at ${record.inTime}!`,
      };
    }

    const geoCheck = await verifyFighterLocation(location, false);
    if (!geoCheck.ok) {
      return { error: geoCheck.error };
    }

    const locationNote =
      geoCheck.enforced && geoCheck.distanceMeters !== null
        ? ` • ${geoCheck.distanceMeters}m from gym`
        : '';

    if (record) {
      // If previously completed, allow re-checking in
      const now = new Date();
      record.inTimestamp = now;
      record.inTime = getFormattedTime(now);
      record.outTime = '';
      record.outTimestamp = null;
      record.status = 'Checked In';
      record.markedBy = 'Athlete';
      record.checkInDistanceMeters = geoCheck.distanceMeters;
      record.checkOutDistanceMeters = null;
      record.locationVerified = geoCheck.enforced;
      await record.save();

      revalidatePath('/fighter/attendance');
      revalidatePath('/admin/attendance');

      return {
        success: true,
        record: {
          _id: record._id.toString(),
          inTime: record.inTime,
          inTimestamp: record.inTimestamp.toISOString(),
          status: record.status,
          checkInRank: record.checkInRank,
          checkInDistanceMeters: record.checkInDistanceMeters ?? null,
          locationVerified: Boolean(record.locationVerified),
        },
        message: `Welcome back to the mats! Checked in at ${record.inTime}${locationNote}.`,
      };
    }

    // Determine early-bird arrival rank for today
    const existingCheckInsCount = await Attendance.countDocuments({
      date: todayStr,
      inTimestamp: { $ne: null },
    });
    const checkInRank = existingCheckInsCount + 1;

    const now = new Date();
    const newRecord = await Attendance.create({
      fighterId: fighter._id,
      fighterName: fighter.name,
      style: fighter.style || 'MMA',
      date: todayStr,
      inTime: getFormattedTime(now),
      inTimestamp: now,
      checkInRank,
      status: 'Checked In',
      markedBy: 'Athlete',
      checkInDistanceMeters: geoCheck.distanceMeters,
      locationVerified: geoCheck.enforced,
    });

    revalidatePath('/fighter/attendance');
    revalidatePath('/admin/attendance');

    return {
      success: true,
      record: {
        _id: newRecord._id.toString(),
        inTime: newRecord.inTime,
        inTimestamp: newRecord.inTimestamp.toISOString(),
        status: newRecord.status,
        checkInRank: newRecord.checkInRank,
        checkInDistanceMeters: newRecord.checkInDistanceMeters ?? null,
        locationVerified: Boolean(newRecord.locationVerified),
      },
      message: `Punch In Recorded! You are #${checkInRank} on the mats today${locationNote} 🔥`,
    };
  } catch (err) {
    console.error('Punch in error:', err);
    return { error: err.message || 'Failed to punch in' };
  }
}

/**
 * Fighter Check-Out (Punch Out / Leave Mats)
 */
export async function fighterPunchOut(location = null) {
  try {
    await dbConnect();
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'Fighter') {
      return { error: 'Unauthorized: Only logged-in fighters can punch out.' };
    }

    const todayStr = getTodayDateString();
    const record = await Attendance.findOne({ fighterId: currentUser.id, date: todayStr });

    if (!record) {
      return { error: 'No active check-in record found for today.' };
    }

    if (record.status === 'Completed' && record.outTimestamp) {
      return {
        success: true,
        alreadyCompleted: true,
        message: `You already checked out today at ${record.outTime}. Duration: ${record.durationFormatted}`,
      };
    }

    const geoCheck = await verifyFighterLocation(location, true);
    if (!geoCheck.ok) {
      return { error: geoCheck.error };
    }

    const now = new Date();
    const inTimeDate = record.inTimestamp || now;
    const durationSeconds = Math.max(0, Math.floor((now.getTime() - inTimeDate.getTime()) / 1000));
    const durationFormatted = formatDuration(durationSeconds);

    record.outTimestamp = now;
    record.outTime = getFormattedTime(now);
    record.durationSeconds = durationSeconds;
    record.durationFormatted = durationFormatted;
    record.status = 'Completed';
    record.checkOutDistanceMeters = geoCheck.distanceMeters;
    record.locationVerified = Boolean(record.locationVerified || geoCheck.enforced);
    await record.save();

    revalidatePath('/fighter/attendance');
    revalidatePath('/admin/attendance');

    const locationNote =
      geoCheck.enforced && geoCheck.distanceMeters !== null
        ? ` • ${geoCheck.distanceMeters}m from gym`
        : '';

    return {
      success: true,
      record: {
        _id: record._id.toString(),
        inTime: record.inTime,
        outTime: record.outTime,
        durationFormatted,
        status: record.status,
        checkInDistanceMeters: record.checkInDistanceMeters ?? null,
        checkOutDistanceMeters: record.checkOutDistanceMeters ?? null,
        locationVerified: Boolean(record.locationVerified),
      },
      message: `Great sparring session! Checked out at ${record.outTime} (${durationFormatted} on mats${locationNote}).`,
    };
  } catch (err) {
    console.error('Punch out error:', err);
    return { error: err.message || 'Failed to punch out' };
  }
}

/**
 * Fetches today's live mat status, timer data, and competitive early-bird leaderboard.
 */
export async function getTodayAttendanceDashboard(targetFighterId = null) {
  try {
    await dbConnect();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { error: 'Unauthorized' };
    }

    const fighterId = targetFighterId || (currentUser.role === 'Fighter' ? currentUser.id : null);
    const todayStr = getTodayDateString();
    const includeCoordinates = currentUser.role === 'MainAdmin' || currentUser.role === 'Coach';

    const [myRecDoc, allFighters, todayRecords, gymDoc] = await Promise.all([
      fighterId ? Attendance.findOne({ fighterId, date: todayStr }).lean() : Promise.resolve(null),
      Fighter.find({ isInactive: { $ne: true } })
        .select('name photo style joiningDate createdAt experienceLevel weightClass phone')
        .lean(),
      Attendance.find({ date: todayStr }).lean(),
      GymSettings.findOne({ key: 'default' }).lean(),
    ]);

    // 1. My record for today
    let myRecord = null;
    if (myRecDoc) {
      myRecord = {
        _id: myRecDoc._id.toString(),
        inTime: myRecDoc.inTime || '',
        outTime: myRecDoc.outTime || '',
        inTimestamp: myRecDoc.inTimestamp ? myRecDoc.inTimestamp.toISOString() : null,
        outTimestamp: myRecDoc.outTimestamp ? myRecDoc.outTimestamp.toISOString() : null,
        durationSeconds: myRecDoc.durationSeconds || 0,
        durationFormatted: myRecDoc.durationFormatted || '00h 00m 00s',
        status: myRecDoc.status,
        checkInRank: myRecDoc.checkInRank || null,
        checkInDistanceMeters: myRecDoc.checkInDistanceMeters ?? null,
        checkOutDistanceMeters: myRecDoc.checkOutDistanceMeters ?? null,
        locationVerified: Boolean(myRecDoc.locationVerified),
      };
    }

    // 2. Full Active Fighters Roster & Live Today Attendance
    const recordMap = {};
    todayRecords.forEach((r) => {
      recordMap[r.fighterId.toString()] = r;
    });

    let onMatsCount = 0;
    let checkedInTotal = 0;

    const attendanceList = allFighters.map((f) => {
      const fid = f._id.toString();
      const rec = recordMap[fid];
      const hasCheckedIn = !!rec && !!rec.inTime;
      const isOnMats = rec?.status === 'Checked In';

      if (hasCheckedIn) checkedInTotal++;
      if (isOnMats) onMatsCount++;

      return {
        _id: rec ? rec._id.toString() : `temp_${fid}`,
        fighterId: fid,
        fighterName: f.name,
        photo: f.photo || null,
        style: f.style || 'MMA',
        joiningDate: f.joiningDate ? f.joiningDate.toISOString() : f.createdAt ? f.createdAt.toISOString() : null,
        experienceLevel: f.experienceLevel || 'Beginner',
        weightClass: f.weightClass || '',
        hasCheckedIn,
        isOnMats,
        inTime: rec?.inTime || '',
        outTime: rec?.outTime || '',
        inTimestamp: rec?.inTimestamp ? rec.inTimestamp.toISOString() : null,
        outTimestamp: rec?.outTimestamp ? rec.outTimestamp.toISOString() : null,
        durationFormatted: rec?.durationFormatted || '--:--:--',
        durationSeconds: rec?.durationSeconds || 0,
        status: rec ? rec.status : 'Not Checked In',
        checkInRank: rec?.checkInRank || null,
        checkInDistanceMeters: rec?.checkInDistanceMeters ?? null,
        checkOutDistanceMeters: rec?.checkOutDistanceMeters ?? null,
        locationVerified: Boolean(rec?.locationVerified),
      };
    });

    return {
      success: true,
      todayDate: todayStr,
      myRecord,
      attendanceList,
      gymSettings: serializeGymSettings(gymDoc, includeCoordinates),
      stats: {
        totalFighters: allFighters.length,
        totalCheckedInToday: checkedInTotal,
        currentlyOnMats: onMatsCount,
        completedSessions: checkedInTotal - onMatsCount,
      },
    };
  } catch (err) {
    console.error('Error fetching today attendance dashboard:', err);
    return { error: 'Failed to load attendance dashboard' };
  }
}

/**
 * Fetches personal attendance history matching Screenshot 2 (Date, InTime, OutTime, Duration).
 */
export async function getFighterAttendanceHistory(targetFighterId = null, monthStr = '') {
  try {
    await dbConnect();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { error: 'Unauthorized' };
    }

    const fighterId = targetFighterId || (currentUser.role === 'Fighter' ? currentUser.id : null);
    if (!fighterId) {
      return { error: 'Fighter ID required' };
    }

    let targetMonth = monthStr;
    if (!targetMonth) {
      targetMonth = getTodayDateString().substring(0, 7);
    }

    const records = await Attendance.find({
      fighterId,
      date: { $regex: new RegExp(`^${targetMonth}`) },
    })
      .sort({ date: -1 })
      .lean();

    let totalDurationSeconds = 0;
    let completedSessions = 0;

    const history = records.map((r) => {
      const durSec = Number(r.durationSeconds) || 0;
      totalDurationSeconds += durSec;
      if (r.status === 'Completed' || r.status === 'Checked In' || r.status === 'Present' || r.status === 'Late') {
        completedSessions++;
      }

      return {
        _id: r._id.toString(),
        date: r.date,
        fighterName: r.fighterName,
        style: r.style || 'MMA',
        inTime: r.inTime || 'N/A',
        outTime: r.outTime || 'In Session',
        durationFormatted: r.durationFormatted || formatDuration(durSec),
        durationSeconds: durSec,
        status: r.status,
      };
    });

    // Count actual Mon-Sat training days (excluding Sundays) for the selected month
    const expectedDays = countTrainingDaysInMonth(targetMonth);
    const avgDurationSeconds = completedSessions > 0 ? Math.round(totalDurationSeconds / completedSessions) : 0;
    const avgDurationFormatted = formatDuration(avgDurationSeconds);

    return {
      success: true,
      month: targetMonth,
      history,
      stats: {
        presentDays: completedSessions,
        totalExpectedDays: expectedDays,
        avgWorkingHours: avgDurationFormatted,
        totalHoursFormatted: formatDuration(totalDurationSeconds),
      },
    };
  } catch (err) {
    console.error('Error fetching attendance history:', err);
    return { error: 'Failed to load history' };
  }
}

/**
 * Admin/Coach manual punch override for any athlete
 */
export async function adminManualPunch({ fighterId, action = 'check-in', date = null }) {
  try {
    await dbConnect();
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'MainAdmin' && currentUser.role !== 'Coach')) {
      return { error: 'Unauthorized: Admin or Coach credentials required.' };
    }

    const fighter = await Fighter.findById(fighterId);
    if (!fighter) return { error: 'Fighter not found' };

    const targetDate = date || getTodayDateString();
    let record = await Attendance.findOne({ fighterId, date: targetDate });
    const now = new Date();

    if (action === 'check-in') {
      const existingCount = await Attendance.countDocuments({ date: targetDate, inTimestamp: { $ne: null } });
      const checkInRank = existingCount + 1;

      if (!record) {
        record = await Attendance.create({
          fighterId: fighter._id,
          fighterName: fighter.name,
          style: fighter.style || 'MMA',
          date: targetDate,
          inTime: getFormattedTime(now),
          inTimestamp: now,
          checkInRank,
          status: 'Checked In',
          markedBy: currentUser.role === 'MainAdmin' ? 'Admin' : 'Coach',
          markedById: currentUser.id,
          checkInDistanceMeters: null,
          checkOutDistanceMeters: null,
          locationVerified: false,
        });
      } else {
        record.inTimestamp = now;
        record.inTime = getFormattedTime(now);
        record.outTime = '';
        record.outTimestamp = null;
        record.status = 'Checked In';
        record.markedBy = currentUser.role === 'MainAdmin' ? 'Admin' : 'Coach';
        record.checkInDistanceMeters = null;
        record.checkOutDistanceMeters = null;
        record.locationVerified = false;
        await record.save();
      }
    } else if (action === 'check-out') {
      if (!record) {
        return { error: 'Athlete has not checked in today yet.' };
      }
      const inTimeDate = record.inTimestamp || now;
      const durationSeconds = Math.max(0, Math.floor((now.getTime() - inTimeDate.getTime()) / 1000));
      record.outTimestamp = now;
      record.outTime = getFormattedTime(now);
      record.durationSeconds = durationSeconds;
      record.durationFormatted = formatDuration(durationSeconds);
      record.status = 'Completed';
      await record.save();
    } else if (action === 'absent') {
      if (!record) {
        record = await Attendance.create({
          fighterId: fighter._id,
          fighterName: fighter.name,
          style: fighter.style || 'MMA',
          date: targetDate,
          status: 'Absent',
          markedBy: currentUser.role === 'MainAdmin' ? 'Admin' : 'Coach',
        });
      } else {
        record.status = 'Absent';
        record.inTime = '';
        record.outTime = '';
        await record.save();
      }
    } else if (action === 'reset') {
      if (record) {
        await Attendance.findByIdAndDelete(record._id);
      }
    }

    revalidatePath('/admin/attendance');
    revalidatePath('/fighter/attendance');

    return { success: true };
  } catch (err) {
    console.error('Admin manual punch error:', err);
    return { error: 'Manual punch action failed' };
  }
}

/**
 * Returns full attendance roster for Admin with early-bird order, in/out timestamps, and CSV support
 */
export async function getAdminAttendanceRoster(targetDate, filters = {}) {
  try {
    await dbConnect();
    const currentUser = await getCurrentUser();
    if (!currentUser) return { error: 'Unauthorized' };

    const dateStr = targetDate || getTodayDateString();
    const fighterQuery = { isInactive: { $ne: true } };

    if (currentUser.role === 'Coach') {
      fighterQuery.assignedCoach = currentUser.id;
    }

    if (filters.style && filters.style !== 'All') {
      fighterQuery.style = filters.style;
    }

    if (filters.search && filters.search.trim()) {
      fighterQuery.name = { $regex: filters.search.trim(), $options: 'i' };
    }

    const fighters = await Fighter.find(fighterQuery)
      .populate('assignedCoach', 'name')
      .sort({ name: 1 })
      .lean();
    const fighterIds = fighters.map((f) => f._id);

    const [records, gymDoc] = await Promise.all([
      Attendance.find({
        date: dateStr,
        fighterId: { $in: fighterIds },
      }).lean(),
      GymSettings.findOne({ key: 'default' }).lean(),
    ]);

    const recordMap = {};
    records.forEach((r) => {
      recordMap[r.fighterId.toString()] = r;
    });

    let onMatsCount = 0;
    let completedCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let unmarkedCount = 0;

    const roster = fighters.map((f) => {
      const fid = f._id.toString();
      const rec = recordMap[fid];
      let status = 'Unmarked';

      if (rec) {
        status = rec.status;
        if (status === 'Checked In') onMatsCount++;
        else if (status === 'Completed' || status === 'Present') completedCount++;
        else if (status === 'Late') lateCount++;
        else if (status === 'Absent') absentCount++;
      } else {
        unmarkedCount++;
      }

      return {
        fighterId: fid,
        name: f.name,
        phone: f.phone,
        style: f.style || 'MMA',
        photo: f.photo || null,
        joiningDate: f.joiningDate ? new Date(f.joiningDate).toISOString() : f.createdAt ? new Date(f.createdAt).toISOString() : null,
        experienceLevel: f.experienceLevel || 'Athlete',
        assignedCoachName: f.assignedCoach?.name || 'Unassigned',
        status,
        inTime: rec?.inTime || '',
        outTime: rec?.outTime || '',
        inTimestamp: rec?.inTimestamp ? new Date(rec.inTimestamp).toISOString() : null,
        durationFormatted: rec?.durationFormatted || '--:--:--',
        checkInRank: rec?.checkInRank || null,
        markedBy: rec?.markedBy || '',
        checkInDistanceMeters: rec?.checkInDistanceMeters ?? null,
        checkOutDistanceMeters: rec?.checkOutDistanceMeters ?? null,
        locationVerified: Boolean(rec?.locationVerified),
      };
    });

    const presentTotal = onMatsCount + completedCount;

    return {
      success: true,
      date: dateStr,
      roster,
      gymSettings: serializeGymSettings(gymDoc, true),
      stats: {
        total: fighters.length,
        totalFighters: fighters.length,
        onMats: onMatsCount,
        completed: completedCount,
        presentCount: presentTotal,
        lateCount,
        absentCount,
        unmarked: unmarkedCount,
        attendanceRate: fighters.length > 0 ? Math.round(((presentTotal + lateCount) / fighters.length) * 100) : 0,
      },
    };
  } catch (err) {
    console.error('Error fetching admin attendance roster:', err);
    return { error: 'Failed to fetch attendance records' };
  }
}

/**
 * Alias for admin date attendance retrieval
 */
export async function getAttendanceForDate(dateStr) {
  return getAdminAttendanceRoster(dateStr);
}

/**
 * 1-Tap set attendance status by Admin or Coach
 */
export async function setFighterAttendance({ fighterId, date, status, session = 'General' }) {
  try {
    await dbConnect();
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'MainAdmin' && currentUser.role !== 'Coach')) {
      return { error: 'Unauthorized: Admin or Coach credentials required.' };
    }

    const fighter = await Fighter.findById(fighterId).lean();
    if (!fighter) return { error: 'Fighter not found.' };

    const targetDate = date || getTodayDateString();

    if (status === 'Unmarked') {
      await Attendance.findOneAndDelete({ fighterId, date: targetDate });
      revalidatePath('/admin/attendance');
      revalidatePath('/fighter/attendance');
      return { success: true };
    }

    const now = new Date();
    const formattedNow = getFormattedTime(now);

    let record = await Attendance.findOne({ fighterId, date: targetDate });
    if (!record) {
      record = new Attendance({
        fighterId,
        fighterName: fighter.name,
        style: fighter.style || 'MMA',
        date: targetDate,
        session,
        status,
        markedBy: currentUser.role === 'MainAdmin' ? 'Admin' : 'Coach',
        markedById: currentUser.id,
      });

      if (status === 'Present' || status === 'Checked In' || status === 'Late') {
        record.inTime = formattedNow;
        record.inTimestamp = now;
      }
    } else {
      record.status = status;
      record.session = session;
      record.markedBy = currentUser.role === 'MainAdmin' ? 'Admin' : 'Coach';
      record.markedById = currentUser.id;

      if ((status === 'Present' || status === 'Late' || status === 'Checked In') && !record.inTime) {
        record.inTime = formattedNow;
        record.inTimestamp = now;
      } else if (status === 'Absent') {
        record.inTime = '';
        record.outTime = '';
        record.inTimestamp = null;
        record.outTimestamp = null;
        record.durationFormatted = '00h 00m 00s';
      }
    }

    await record.save();

    revalidatePath('/admin/attendance');
    revalidatePath('/fighter/attendance');
    return { success: true };
  } catch (err) {
    console.error('Error setting fighter attendance:', err);
    return { error: 'Failed to update attendance record' };
  }
}

/**
 * Bulk mark visible fighters
 */
export async function bulkMarkAttendance({ date, status = 'Present', fighterIds = [], session = 'General' }) {
  try {
    await dbConnect();
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'MainAdmin' && currentUser.role !== 'Coach')) {
      return { error: 'Unauthorized: Admin or Coach credentials required.' };
    }

    if (!fighterIds || fighterIds.length === 0) {
      return { success: true, count: 0 };
    }

    const targetDate = date || getTodayDateString();
    const fighters = await Fighter.find({ _id: { $in: fighterIds } }).lean();
    const fighterMap = {};
    fighters.forEach((f) => {
      fighterMap[f._id.toString()] = f;
    });

    const now = new Date();
    const formattedNow = getFormattedTime(now);

    const ops = fighterIds.map((id) => {
      const fighter = fighterMap[id];
      return {
        updateOne: {
          filter: { fighterId: id, date: targetDate },
          update: {
            $set: {
              fighterName: fighter?.name || 'Athlete',
              style: fighter?.style || 'MMA',
              status,
              session,
              inTime: formattedNow,
              inTimestamp: now,
              markedBy: currentUser.role === 'MainAdmin' ? 'Admin' : 'Coach',
              markedById: currentUser.id,
            },
          },
          upsert: true,
        },
      };
    });

    await Attendance.bulkWrite(ops);

    revalidatePath('/admin/attendance');
    revalidatePath('/fighter/attendance');
    return { success: true, count: fighterIds.length };
  } catch (err) {
    console.error('Bulk mark attendance error:', err);
    return { error: 'Failed to bulk mark attendance' };
  }
}

/**
 * Monthly Attendance Summary Report for CSV Export
 */
export async function getMonthlyAttendanceReport(yearMonth) {
  try {
    await dbConnect();
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'MainAdmin' && currentUser.role !== 'Coach')) {
      return { error: 'Unauthorized' };
    }

    const ym = yearMonth || getTodayDateString().substring(0, 7);
    const dateRegex = new RegExp(`^${ym}`);

    const fighters = await Fighter.find({ isInactive: { $ne: true } })
      .sort({ name: 1 })
      .lean();

    const attendanceRecords = await Attendance.find({
      date: { $regex: dateRegex },
    }).lean();

    // Group records by fighterId
    const fighterAttendanceMap = {};
    attendanceRecords.forEach((r) => {
      const fid = r.fighterId.toString();
      if (!fighterAttendanceMap[fid]) {
        fighterAttendanceMap[fid] = [];
      }
      fighterAttendanceMap[fid].push(r);
    });

    const summary = fighters.map((f) => {
      const recs = fighterAttendanceMap[f._id.toString()] || [];
      let present = 0;
      let late = 0;
      let absent = 0;

      recs.forEach((r) => {
        if (r.status === 'Present' || r.status === 'Checked In' || r.status === 'Completed') {
          present++;
        } else if (r.status === 'Late') {
          late++;
        } else if (r.status === 'Absent') {
          absent++;
        }
      });

      return {
        fighterId: f._id.toString(),
        name: f.name,
        phone: f.phone || 'N/A',
        style: f.style || 'MMA',
        present,
        late,
        absent,
      };
    });

    return { success: true, yearMonth: ym, summary };
  } catch (err) {
    console.error('Error generating monthly attendance report:', err);
    return { error: 'Failed to generate report' };
  }
}

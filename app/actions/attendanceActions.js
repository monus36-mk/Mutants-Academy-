'use server';

import dbConnect from '@/lib/db';
import Attendance from '@/models/Attendance';
import Fighter from '@/models/Fighter';
import User from '@/models/User';
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
 * Fighter Check-In (Punch In to Mats)
 */
export async function fighterPunchIn() {
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

    if (record) {
      if (record.status === 'Checked In') {
        return {
          success: true,
          alreadyCheckedIn: true,
          record: {
            _id: record._id.toString(),
            inTime: record.inTime,
            inTimestamp: record.inTimestamp?.toISOString() || null,
            status: record.status,
            checkInRank: record.checkInRank,
          },
          message: `You are already checked in at ${record.inTime}!`,
        };
      }
      // If previously completed, allow re-checking in
      const now = new Date();
      record.inTimestamp = now;
      record.inTime = getFormattedTime(now);
      record.outTime = '';
      record.outTimestamp = null;
      record.status = 'Checked In';
      record.markedBy = 'Athlete';
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
        },
        message: `Welcome back to the mats! Checked in at ${record.inTime}.`,
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
      },
      message: `Punch In Recorded! You are #${checkInRank} on the mats today 🔥`,
    };
  } catch (err) {
    console.error('Punch in error:', err);
    return { error: err.message || 'Failed to punch in' };
  }
}

/**
 * Fighter Check-Out (Punch Out / Leave Mats)
 */
export async function fighterPunchOut() {
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

    const now = new Date();
    const inTimeDate = record.inTimestamp || now;
    const durationSeconds = Math.max(0, Math.floor((now.getTime() - inTimeDate.getTime()) / 1000));
    const durationFormatted = formatDuration(durationSeconds);

    record.outTimestamp = now;
    record.outTime = getFormattedTime(now);
    record.durationSeconds = durationSeconds;
    record.durationFormatted = durationFormatted;
    record.status = 'Completed';
    await record.save();

    revalidatePath('/fighter/attendance');
    revalidatePath('/admin/attendance');

    return {
      success: true,
      record: {
        _id: record._id.toString(),
        inTime: record.inTime,
        outTime: record.outTime,
        durationFormatted,
        status: record.status,
      },
      message: `Great sparring session! Checked out at ${record.outTime} (${durationFormatted} on mats).`,
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

    // 1. My record for today
    let myRecord = null;
    if (fighterId) {
      const rec = await Attendance.findOne({ fighterId, date: todayStr }).lean();
      if (rec) {
        myRecord = {
          _id: rec._id.toString(),
          inTime: rec.inTime || '',
          outTime: rec.outTime || '',
          inTimestamp: rec.inTimestamp ? rec.inTimestamp.toISOString() : null,
          outTimestamp: rec.outTimestamp ? rec.outTimestamp.toISOString() : null,
          durationSeconds: rec.durationSeconds || 0,
          durationFormatted: rec.durationFormatted || '00h 00m 00s',
          status: rec.status,
          checkInRank: rec.checkInRank || null,
        };
      }
    }

    // 2. Full Active Fighters Roster & Live Today Attendance
    const allFighters = await Fighter.find({ isInactive: { $ne: true } })
      .select('name photo style joiningDate createdAt experienceLevel weightClass phone')
      .lean();

    const todayRecords = await Attendance.find({ date: todayStr }).lean();
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
      };
    });

    return {
      success: true,
      todayDate: todayStr,
      myRecord,
      attendanceList,
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

    // Approximate days in month (standard ~24 training days per month)
    const expectedDays = 24;
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
        });
      } else {
        record.inTimestamp = now;
        record.inTime = getFormattedTime(now);
        record.outTime = '';
        record.outTimestamp = null;
        record.status = 'Checked In';
        record.markedBy = currentUser.role === 'MainAdmin' ? 'Admin' : 'Coach';
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

    const records = await Attendance.find({
      date: dateStr,
      fighterId: { $in: fighterIds },
    }).lean();

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
      };
    });

    const presentTotal = onMatsCount + completedCount;

    return {
      success: true,
      date: dateStr,
      roster,
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

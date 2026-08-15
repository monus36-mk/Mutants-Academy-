'use server';

import dbConnect from '@/lib/db';
import Fighter from '@/models/Fighter';
import User from '@/models/User';
import { getCurrentUser } from './authActions';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

import { calculateStatus } from '@/lib/utils';

export async function getFighters(filters = {}) {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Unauthorized' };
    }

    const query = {};

    // Role-based access control: Coaches can only view their own fighters
    if (user.role === 'Coach') {
      query.assignedCoach = user.id;
    } else if (filters.assignedCoach) {
      // MainAdmin filtering by coach
      query.assignedCoach = filters.assignedCoach;
    }

    // Filter by name (case-insensitive search)
    if (filters.search) {
      query.name = { $regex: filters.search, $options: 'i' };
    }

    let fighters = await Fighter.find(query)
      .populate('assignedCoach', 'name email')
      .sort({ nextPaymentDate: 1 })
      .lean();

    // Map through fighters to calculate statuses dynamically and serialize objects
    let serializedFighters = fighters.map(f => {
      const computedStatus = calculateStatus(f.nextPaymentDate);
      return {
        ...f,
        _id: f._id.toString(),
        assignedCoach: f.assignedCoach ? {
          _id: f.assignedCoach._id.toString(),
          name: f.assignedCoach.name,
          email: f.assignedCoach.email,
        } : null,
        entryDate: f.entryDate ? f.entryDate.toISOString() : null,
        joiningDate: f.joiningDate ? f.joiningDate.toISOString() : (f.entryDate ? f.entryDate.toISOString() : null),
        email: f.email || '',
        dob: f.dob ? f.dob.toISOString() : null,
        nextPaymentDate: f.nextPaymentDate ? f.nextPaymentDate.toISOString() : null,
        status: computedStatus,
        createdAt: f.createdAt ? f.createdAt.toISOString() : null,
      };
    });

    // Client-side status filtering if specified
    if (filters.status) {
      serializedFighters = serializedFighters.filter(f => f.status === filters.status);
    }

    return { success: true, fighters: serializedFighters };
  } catch (err) {
    console.error('Error fetching fighters:', err);
    return { error: 'Failed to fetch fighters' };
  }
}

export async function addFighter(prevState, formData) {
  try {
    await dbConnect();

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { error: 'Unauthorized' };
    }

    const name = formData.get('name')?.trim();
    const phone = formData.get('phone')?.trim();
    const email = formData.get('email')?.trim();
    const dobStr = formData.get('dob');
    const weightClass = formData.get('weightClass')?.trim();
    const experienceLevel = formData.get('experienceLevel');
    const packageDurationMonths = Number(formData.get('packageDurationMonths'));
    const entryDateStr = formData.get('entryDate');
    const joiningDateStr = formData.get('joiningDate');
    const password = formData.get('password');
    const style = formData.get('style');

    if (!name || !phone || !email || !dobStr || !weightClass || !experienceLevel || !packageDurationMonths || !style) {
      return { error: 'Please fill in all required fields.' };
    }

    // Determine assigned coach based on role
    let assignedCoach;
    if (currentUser.role === 'Coach') {
      assignedCoach = currentUser.id;
    } else {
      assignedCoach = formData.get('assignedCoach');
      if (!assignedCoach) {
        return { error: 'Please select an assigned coach.' };
      }
    }

    // Set dates
    const entryDate = entryDateStr ? new Date(entryDateStr) : new Date();
    const joiningDate = joiningDateStr ? new Date(joiningDateStr) : entryDate;
    const nextPaymentDate = new Date(entryDate);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + packageDurationMonths);

    // Initial dynamic status calculation
    const status = calculateStatus(nextPaymentDate);

    // Hash the password if provided
    let hashedPassword = undefined;
    if (password && password.trim() !== '') {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    // Create Fighter
    await Fighter.create({
      name,
      phone,
      email,
      dob: new Date(dobStr),
      weightClass,
      experienceLevel,
      assignedCoach,
      entryDate,
      joiningDate,
      packageDurationMonths,
      nextPaymentDate,
      status,
      password: hashedPassword,
      style,
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    console.error('Error adding fighter:', err);
    return { error: 'Failed to add fighter. Please check inputs.' };
  }
}

export async function renewFighterSubscription(fighterId, durationMonths) {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Unauthorized' };
    }

    const fighter = await Fighter.findById(fighterId);
    if (!fighter) {
      return { error: 'Fighter not found' };
    }

    // Permission check: Coach can only renew their own fighters
    if (user.role === 'Coach' && fighter.assignedCoach.toString() !== user.id) {
      return { error: 'Unauthorized to renew this fighter.' };
    }

    const packageDuration = Number(durationMonths);
    if (!packageDuration || packageDuration <= 0) {
      return { error: 'Invalid renewal duration.' };
    }

    const today = new Date();
    let baseDate = new Date(fighter.nextPaymentDate);

    // If subscription is expired, start renewal from today
    if (baseDate < today) {
      baseDate = today;
    }

    const newPaymentDate = new Date(baseDate);
    newPaymentDate.setMonth(newPaymentDate.getMonth() + packageDuration);

    fighter.packageDurationMonths = packageDuration;
    fighter.nextPaymentDate = newPaymentDate;
    fighter.status = calculateStatus(newPaymentDate);

    await fighter.save();

    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    console.error('Error renewing subscription:', err);
    return { error: 'Failed to renew subscription.' };
  }
}

export async function deleteFighter(fighterId) {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Unauthorized' };
    }

    const fighter = await Fighter.findById(fighterId);
    if (!fighter) {
      return { error: 'Fighter not found' };
    }

    // Permission check
    if (user.role === 'Coach' && fighter.assignedCoach.toString() !== user.id) {
      return { error: 'Unauthorized to delete this fighter.' };
    }

    await Fighter.findByIdAndDelete(fighterId);

    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    console.error('Error deleting fighter:', err);
    return { error: 'Failed to delete fighter.' };
  }
}

export async function updateFighter(fighterId, prevState, formData) {
  try {
    await dbConnect();
    
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Unauthorized' };
    }

    const name = formData.get('name')?.trim();
    const phone = formData.get('phone')?.trim();
    const email = formData.get('email')?.trim();
    const dobStr = formData.get('dob');
    const weightClass = formData.get('weightClass')?.trim();
    const experienceLevel = formData.get('experienceLevel');
    let assignedCoach = formData.get('assignedCoach');
    const entryDateStr = formData.get('entryDate');
    const joiningDateStr = formData.get('joiningDate');
    const password = formData.get('password');
    const style = formData.get('style');

    if (!name || !phone || !email || !dobStr || !weightClass || !experienceLevel || !style) {
      return { error: 'Please fill in all required fields.' };
    }

    const fighter = await Fighter.findById(fighterId);
    if (!fighter) {
      return { error: 'Fighter not found' };
    }

    // Permission check: Coach can only edit their own fighters
    if (user.role === 'Coach' && fighter.assignedCoach.toString() !== user.id) {
      return { error: 'Unauthorized to edit this fighter.' };
    }

    // If coach, make sure they cannot reassign the coach
    if (user.role === 'Coach') {
      assignedCoach = user.id;
    }

    fighter.name = name;
    fighter.phone = phone;
    fighter.email = email;
    fighter.dob = new Date(dobStr);
    fighter.weightClass = weightClass;
    fighter.experienceLevel = experienceLevel;
    fighter.style = style;
    if (assignedCoach) {
      fighter.assignedCoach = assignedCoach;
    }

    // Update password if a new one is provided
    if (password && password.trim() !== '') {
      fighter.password = await bcrypt.hash(password, 12);
    }

    // Update joining date
    if (joiningDateStr) {
      fighter.joiningDate = new Date(joiningDateStr);
    }

    if (entryDateStr) {
      const newEntryDate = new Date(entryDateStr);
      fighter.entryDate = newEntryDate;
      
      // Recalculate next payment date
      const newNextPaymentDate = new Date(newEntryDate);
      newNextPaymentDate.setMonth(newNextPaymentDate.getMonth() + fighter.packageDurationMonths);
      fighter.nextPaymentDate = newNextPaymentDate;
      
      // Recalculate status dynamically
      fighter.status = calculateStatus(newNextPaymentDate);
    }

    await fighter.save();

    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    console.error('Error updating fighter:', err);
    return { error: 'Failed to update fighter.' };
  }
}

export async function getFighterProfile() {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user || user.role !== 'Fighter') {
      return { error: 'Unauthorized' };
    }

    const fighter = await Fighter.findById(user.id)
      .populate('assignedCoach', 'name email')
      .lean();

    if (!fighter) {
      return { error: 'Fighter profile not found' };
    }

    const computedStatus = calculateStatus(fighter.nextPaymentDate);

    return {
      success: true,
      fighter: {
        ...fighter,
        _id: fighter._id.toString(),
        assignedCoach: fighter.assignedCoach ? {
          _id: fighter.assignedCoach._id.toString(),
          name: fighter.assignedCoach.name,
          email: fighter.assignedCoach.email,
        } : null,
        entryDate: fighter.entryDate ? fighter.entryDate.toISOString() : null,
        joiningDate: fighter.joiningDate ? fighter.joiningDate.toISOString() : (fighter.entryDate ? fighter.entryDate.toISOString() : null),
        dob: fighter.dob ? fighter.dob.toISOString() : null,
        nextPaymentDate: fighter.nextPaymentDate ? fighter.nextPaymentDate.toISOString() : null,
        status: computedStatus,
      }
    };
  } catch (err) {
    console.error('Error fetching fighter profile:', err);
    return { error: 'Failed to fetch fighter profile' };
  }
}

export async function setupFighterPassword(prevState, formData) {
  try {
    await dbConnect();

    const email = formData.get('email')?.trim();
    const phone = formData.get('phone')?.trim();
    const password = formData.get('password');

    if (!email || !phone || !password) {
      return { error: 'Please enter all verification fields and a new password.' };
    }

    // Find fighter by email (case-insensitive) and phone
    const emailLower = email.toLowerCase();
    const fighter = await Fighter.findOne({ 
      email: emailLower,
      phone: phone
    });

    if (!fighter) {
      return { error: 'No athlete profile matches the provided email and phone number. Please contact your coach to verify your details.' };
    }

    // Hash and save new password
    fighter.password = await bcrypt.hash(password, 12);
    await fighter.save();

    return { success: true };
  } catch (err) {
    console.error('Error setting fighter password:', err);
    return { error: 'Something went wrong. Please try again.' };
  }
}

export async function getPeers() {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user || user.role !== 'Fighter') {
      return { error: 'Unauthorized' };
    }

    // Retrieve all fighters excluding sensitive info
    const fighters = await Fighter.find({})
      .populate('assignedCoach', 'name email')
      .sort({ name: 1 })
      .lean();

    const sanitizedFighters = fighters.map((f) => ({
      _id: f._id.toString(),
      name: f.name,
      phone: f.phone,
      email: f.email || '',
      dob: f.dob ? f.dob.toISOString() : null,
      weightClass: f.weightClass,
      experienceLevel: f.experienceLevel,
      joiningDate: f.joiningDate ? f.joiningDate.toISOString() : (f.entryDate ? f.entryDate.toISOString() : null),
      style: f.style || 'MMA',
      assignedCoach: f.assignedCoach ? {
        name: f.assignedCoach.name,
        email: f.assignedCoach.email,
      } : null,
    }));

    return { success: true, fighters: sanitizedFighters };
  } catch (err) {
    console.error('Error fetching peers directory:', err);
    return { error: 'Failed to fetch peers directory' };
  }
}


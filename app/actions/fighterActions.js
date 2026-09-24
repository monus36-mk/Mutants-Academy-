'use server';

import dbConnect from '@/lib/db';
import Fighter from '@/models/Fighter';
import User from '@/models/User';
import { getCurrentUser } from './authActions';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

import { calculateStatus } from '@/lib/utils';
import { sendWelcomeEmail } from '@/lib/mail';

export async function getFighters(filters = {}) {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Unauthorized' };
    }

    const dbUser = await User.findById(user.id).lean();
    const userRole = dbUser ? dbUser.role : user.role;
    const userCategory = dbUser ? dbUser.category : null;

    const query = {};

    // Access control: Coaches can only view students in their discipline (field of study)
    if (userRole === 'Coach') {
      const coachCategory = userCategory || 'Martial Arts';
      if (coachCategory === 'Martial Arts') {
        query.style = { $in: ['MMA', 'Striking', 'Grappling'] };
      } else if (coachCategory === 'Silambam') {
        query.eca = 'Silambam';
      }
    }

    if (filters.assignedCoach) {
      query.assignedCoach = filters.assignedCoach;
    }

    // Filter by name (case-insensitive search)
    if (filters.search) {
      query.name = { $regex: filters.search, $options: 'i' };
    }

    let sortObj = { joiningDate: 1, weightClass: 1 };
    if (filters.sortBy === 'JuniorFirst') {
      sortObj = { joiningDate: -1, weightClass: 1 };
    } else if (filters.sortBy === 'WeightAsc') {
      sortObj = { weightClass: 1, joiningDate: 1 };
    } else if (filters.sortBy === 'WeightDesc') {
      sortObj = { weightClass: -1, joiningDate: 1 };
    } else if (filters.sortBy === 'SeniorFirst_WeightAsc') {
      sortObj = { joiningDate: 1, weightClass: 1 };
    } else if (filters.sortBy === 'SeniorFirst_WeightDesc') {
      sortObj = { joiningDate: 1, weightClass: -1 };
    } else if (filters.sortBy === 'WeightAsc_SeniorFirst') {
      sortObj = { weightClass: 1, joiningDate: 1 };
    } else if (filters.sortBy === 'WeightDesc_SeniorFirst') {
      sortObj = { weightClass: -1, joiningDate: 1 };
    } else if (filters.sortBy === 'ExpirySoonest') {
      sortObj = { nextPaymentDate: 1, joiningDate: 1 };
    }

    let fighters = await Fighter.find(query)
      .populate('assignedCoach', 'name email')
      .sort(sortObj)
      .collation({ locale: 'en_US', numericOrdering: true })
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
        eca: f.eca || 'None',
      };
    });

    // Client-side status filtering if specified
    if (filters.status) {
      serializedFighters = serializedFighters.filter(f => f.status === filters.status);
    }

    // Filter by Martial Style (style)
    if (filters.style && filters.style !== 'All') {
      serializedFighters = serializedFighters.filter(f => f.style === filters.style);
    }

    // Filter by ECA (eca)
    if (filters.eca && filters.eca !== 'All') {
      serializedFighters = serializedFighters.filter(f => (f.eca || 'None') === filters.eca);
    }

    // Filter by Experience Level (experienceLevel)
    if (filters.experienceLevel && filters.experienceLevel !== 'All') {
      serializedFighters = serializedFighters.filter(f => f.experienceLevel === filters.experienceLevel);
    }

    // Filter by Age Group (ageFilter)
    if (filters.ageFilter && filters.ageFilter !== 'All') {
      serializedFighters = serializedFighters.filter(f => {
        if (!f.dob) return false;
        const calculateAge = (dobString) => {
          if (!dobString) return null;
          const birthDate = new Date(dobString);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          return age;
        };
        const age = calculateAge(f.dob);
        if (age === null) return false;
        if (filters.ageFilter === 'Youth') return age < 18;
        if (filters.ageFilter === 'Adult') return age >= 18 && age <= 35;
        if (filters.ageFilter === 'Master') return age > 35;
        return true;
      });
    }

    // Filter by Tenure (tenureFilter)
    if (filters.tenureFilter && filters.tenureFilter !== 'All') {
      serializedFighters = serializedFighters.filter(f => {
        const calculateTenureMonths = (joiningDateStr) => {
          if (!joiningDateStr) return 0;
          const joined = new Date(joiningDateStr);
          const today = new Date();
          const yearsDiff = today.getFullYear() - joined.getFullYear();
          const monthsDiff = today.getMonth() - joined.getMonth();
          return yearsDiff * 12 + monthsDiff;
        };
        const tenureMonths = calculateTenureMonths(f.joiningDate);
        if (filters.tenureFilter === 'Newcomer') return tenureMonths < 6;
        if (filters.tenureFilter === 'Veteran') return tenureMonths >= 6;
        return true;
      });
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
    const countryCode = formData.get('countryCode')?.trim() || '+91';
    let phone = formData.get('phone')?.trim();
    const email = formData.get('email')?.trim();
    const dobStr = formData.get('dob');
    const weightClass = formData.get('weightClass')?.trim();
    const experienceLevel = formData.get('experienceLevel');
    const eca = formData.get('eca') || 'None';
    const packageDurationMonths = Number(formData.get('packageDurationMonths'));
    const entryDateStr = formData.get('entryDate');
    const joiningDateStr = formData.get('joiningDate');
    const password = formData.get('password');
    const style = formData.get('style');

    if (!name || !phone || !email || !dobStr || !weightClass || !experienceLevel || !packageDurationMonths || !style) {
      return { error: 'Please fill in all required fields.' };
    }

    if (style === 'None' && eca === 'None') {
      return { error: 'Please select at least a Martial Arts style or an Extra Curricular Activity.' };
    }

    if (phone && !phone.startsWith('+')) {
      const cleanCC = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
      phone = `${cleanCC} ${phone}`;
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
    const fighter = await Fighter.create({
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
      eca,
    });

    // Send Welcome Email
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const activationLink = `${appUrl}/login/activate?email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`;
      await sendWelcomeEmail(email, name, activationLink);
    } catch (mailErr) {
      console.error('Failed to send welcome email to fighter:', mailErr);
    }

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
    const countryCode = formData.get('countryCode')?.trim() || '+91';
    let phone = formData.get('phone')?.trim();
    const email = formData.get('email')?.trim();
    const dobStr = formData.get('dob');
    const weightClass = formData.get('weightClass')?.trim();
    const experienceLevel = formData.get('experienceLevel');
    let assignedCoach = formData.get('assignedCoach');
    const entryDateStr = formData.get('entryDate');
    const joiningDateStr = formData.get('joiningDate');
    const password = formData.get('password');
    const style = formData.get('style');
    const eca = formData.get('eca') || 'None';

    if (!name || !phone || !email || !dobStr || !weightClass || !experienceLevel || !style) {
      return { error: 'Please fill in all required fields.' };
    }

    if (style === 'None' && eca === 'None') {
      return { error: 'Please select at least a Martial Arts style or an Extra Curricular Activity.' };
    }

    if (phone && !phone.startsWith('+')) {
      const cleanCC = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
      phone = `${cleanCC} ${phone}`;
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
    fighter.eca = eca;
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

export async function getFighterProfile(userId = null) {
  try {
    await dbConnect();

    let id = userId;
    if (!id) {
      const user = await getCurrentUser();
      if (!user || user.role !== 'Fighter') {
        return { error: 'Unauthorized' };
      }
      id = user.id;
    }

    const fighter = await Fighter.findById(id)
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

    // Find fighter by email (case-insensitive)
    const escapedEmail = email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const emailRegex = new RegExp(`^${escapedEmail}$`, 'i');
    const fighters = await Fighter.find({ email: emailRegex });

    // Loosely check phone number matching the last 10 digits
    const cleanInputPhone = phone.replace(/\D/g, '');
    const fighter = fighters.find(f => {
      if (!f.phone) return false;
      const cleanFighterPhone = f.phone.replace(/\D/g, '');
      if (cleanInputPhone.length >= 10 && cleanFighterPhone.length >= 10) {
        return cleanInputPhone.slice(-10) === cleanFighterPhone.slice(-10);
      }
      return cleanInputPhone === cleanFighterPhone;
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

export async function getPeers(userId = null) {
  try {
    await dbConnect();

    if (!userId) {
      const user = await getCurrentUser();
      if (!user || user.role !== 'Fighter') {
        return { error: 'Unauthorized' };
      }
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
      eca: f.eca || 'None',
      bio: f.bio || '',
      photo: f.photo || '',
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

export async function updateSelfFighterProfile(style, weightClass, bio = '', photo = '') {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user || user.role !== 'Fighter') {
      return { error: 'Unauthorized' };
    }

    if (!style || !weightClass) {
      return { error: 'Please enter all fields' };
    }

    const fighter = await Fighter.findById(user.id);
    if (!fighter) {
      return { error: 'Fighter profile not found' };
    }

    fighter.style = style;
    fighter.weightClass = weightClass;
    fighter.bio = bio;
    if (photo !== undefined) {
      fighter.photo = photo;
    }
    await fighter.save();

    revalidatePath('/fighter');
    revalidatePath('/fighter/profile');

    return { success: true };
  } catch (err) {
    console.error('Error updating self profile:', err);
    return { error: 'Failed to update profile details' };
  }
}


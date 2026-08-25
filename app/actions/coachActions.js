'use server';

import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getCurrentUser } from './authActions';
import { revalidatePath } from 'next/cache';

export async function getCoaches() {
  try {
    await dbConnect();
    
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Unauthorized' };
    }

    const coaches = await User.find({ role: 'Coach' })
      .select('_id name email role category createdAt')
      .sort({ name: 1 })
      .lean();

    return {
      success: true,
      coaches: coaches.map(c => ({
        ...c,
        _id: c._id.toString(),
        category: c.category || 'Martial Arts',
        createdAt: c.createdAt ? c.createdAt.toISOString() : null,
      }))
    };
  } catch (err) {
    console.error('Error fetching coaches:', err);
    return { error: 'Failed to fetch coaches' };
  }
}

export async function onboardCoach(prevState, formData) {
  try {
    await dbConnect();
    
    // Check permission
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== 'MainAdmin') {
      return { error: 'Unauthorized. Only Main Admin can onboard coaches.' };
    }

    const name = formData.get('name')?.trim();
    const email = formData.get('email')?.trim().toLowerCase();
    const password = formData.get('password');
    const category = formData.get('category');

    if (!name || !email || !password || !category) {
      return { error: 'All fields are required.' };
    }

    if (!['Martial Arts', 'Silambam'].includes(category)) {
      return { error: 'Invalid discipline/category.' };
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return { error: 'A coach or admin with this email already exists.' };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'Coach',
      category,
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (err) {
    console.error('Error onboarding coach:', err);
    return { error: 'Failed to onboard coach. Please try again.' };
  }
}

export async function deleteCoach(coachId) {
  try {
    await dbConnect();
    
    // Check permission
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'MainAdmin') {
      return { error: 'Unauthorized. Only Main Admin can delete coaches.' };
    }

    const coach = await User.findOne({ _id: coachId, role: 'Coach' });
    if (!coach) {
      return { error: 'Coach/Sub-admin not found.' };
    }

    await User.deleteOne({ _id: coachId });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (err) {
    console.error('Error deleting coach:', err);
    return { error: 'Failed to delete coach. Please try again.' };
  }
}

export async function updateCoach(coachId, formData) {
  try {
    await dbConnect();
    
    // Check permission
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'MainAdmin') {
      return { error: 'Unauthorized. Only Main Admin can edit coaches.' };
    }

    const name = formData.get('name')?.trim();
    const email = formData.get('email')?.trim().toLowerCase();
    const category = formData.get('category');
    const password = formData.get('password');

    if (!name || !email || !category) {
      return { error: 'Name, email, and discipline are required.' };
    }

    if (!['Martial Arts', 'Silambam'].includes(category)) {
      return { error: 'Invalid discipline/category.' };
    }

    const existingUser = await User.findOne({ email, _id: { $ne: coachId } });
    if (existingUser) {
      return { error: 'Another user with this email already exists.' };
    }

    const updateData = { name, email, category };
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 12);
    }

    await User.findByIdAndUpdate(coachId, updateData);

    revalidatePath('/admin/users');
    return { success: true };
  } catch (err) {
    console.error('Error updating coach:', err);
    return { error: 'Failed to update coach. Please try again.' };
  }
}


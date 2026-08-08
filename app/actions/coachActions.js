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
      .select('_id name email role createdAt')
      .sort({ name: 1 })
      .lean();

    return {
      success: true,
      coaches: coaches.map(c => ({
        ...c,
        _id: c._id.toString(),
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

    if (!name || !email || !password) {
      return { error: 'All fields are required.' };
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
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (err) {
    console.error('Error onboarding coach:', err);
    return { error: 'Failed to onboard coach. Please try again.' };
  }
}

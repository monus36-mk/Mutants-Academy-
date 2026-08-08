'use server';

import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { signToken, verifyToken } from '@/lib/auth';

export async function login(prevState, formData) {
  try {
    await dbConnect();
  } catch (dbErr) {
    console.error('Database connection error in login:', dbErr);
    return { error: 'Database connection failed. Please ensure MongoDB is running (locally or via a .env.local Atlas string).' };
  }

  try {
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) {
      return { error: 'Please enter all fields' };
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return { error: 'Invalid email or password' };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return { error: 'Invalid email or password' };
    }

    // Sign Token
    const token = await signToken({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });

    return { success: true, role: user.role };
  } catch (err) {
    console.error('Login action error:', err);
    return { error: 'Something went wrong. Please try again.' };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  return { success: true };
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken) return null;
    
    const payload = await verifyToken(sessionToken);
    return payload;
  } catch (err) {
    return null;
  }
}

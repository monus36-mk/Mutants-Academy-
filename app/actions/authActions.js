'use server';

import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Fighter from '@/models/Fighter';
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

    const emailLower = email.toLowerCase();
    let account = await User.findOne({ email: emailLower });
    let role = account?.role;

    if (!account) {
      // If not found in Users, check Fighters
      account = await Fighter.findOne({ email: emailLower });
      if (account) {
        role = 'Fighter';
      }
    }

    if (!account) {
      return { error: 'Invalid email or password' };
    }

    if (role === 'Fighter' && !account.password) {
      return { error: 'This athlete account has not been activated yet. Please click "Activate Athlete Account" below to set up your password.' };
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return { error: 'Invalid email or password' };
    }

    // Sign Token
    const token = await signToken({
      id: account._id.toString(),
      name: account.name,
      email: account.email,
      role: role,
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

    return { success: true, role: role };
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

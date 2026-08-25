'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Fighter from '@/models/Fighter';
import { signToken, verifyToken } from '@/lib/auth';
import { sendOtpEmail } from '@/lib/mail';

export async function login(prevState, formData) {
  try {
    await dbConnect();
  } catch (dbErr) {
    console.error('Database connection error in login:', dbErr);
    return { error: 'Database connection failed. Please ensure MongoDB is running (locally or via a .env.local Atlas string).' };
  }

  try {
    const email = formData.get('email')?.trim();
    const password = formData.get('password');

    if (!email || !password) {
      return { error: 'Please enter all fields' };
    }

    const escapedEmail = email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const emailRegex = new RegExp(`^${escapedEmail}$`, 'i');
    
    // Query both collections in parallel to optimize lookup latency
    const [userAccount, fighterAccount] = await Promise.all([
      User.findOne({ email: emailRegex }).lean(),
      Fighter.findOne({ email: emailRegex }).lean()
    ]);

    let account = userAccount || fighterAccount;
    let role = userAccount ? userAccount.role : (fighterAccount ? 'Fighter' : null);

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

    if (role === 'Fighter') {
      redirect('/fighter');
    } else {
      redirect('/admin');
    }
  } catch (err) {
    if (err.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
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

export async function sendResetOtp(prevState, formData) {
  try {
    await dbConnect();
    
    const email = formData.get('email')?.trim();
    if (!email) {
      return { error: 'Please enter your email address' };
    }

    const escapedEmail = email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const emailRegex = new RegExp(`^${escapedEmail}$`, 'i');

    // Query User and Fighter models
    const [userAccount, fighterAccount] = await Promise.all([
      User.findOne({ email: emailRegex }),
      Fighter.findOne({ email: emailRegex })
    ]);

    const account = userAccount || fighterAccount;
    if (!account) {
      return { error: 'No account found with this email address' };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    account.resetOtp = otp;
    account.resetOtpExpires = expiry;
    await account.save();

    // Send email
    await sendOtpEmail(account.email, account.name, otp);

    return { success: true, email: account.email };
  } catch (err) {
    console.error('Error sending reset OTP:', err);
    return { error: 'Something went wrong. Please try again.' };
  }
}

export async function verifyOtpAndResetPassword(prevState, formData) {
  try {
    await dbConnect();

    const email = formData.get('email')?.trim();
    const otp = formData.get('otp')?.trim();
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (!email || !otp || !password || !confirmPassword) {
      return { error: 'Please fill in all fields' };
    }

    if (password !== confirmPassword) {
      return { error: 'Passwords do not match' };
    }

    if (password.length < 6) {
      return { error: 'Password must be at least 6 characters long' };
    }

    const escapedEmail = email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const emailRegex = new RegExp(`^${escapedEmail}$`, 'i');

    // Query User and Fighter models
    const [userAccount, fighterAccount] = await Promise.all([
      User.findOne({ email: emailRegex }),
      Fighter.findOne({ email: emailRegex })
    ]);

    const account = userAccount || fighterAccount;
    if (!account) {
      return { error: 'Account not found' };
    }

    if (!account.resetOtp || account.resetOtp !== otp || new Date() > account.resetOtpExpires) {
      return { error: 'Invalid or expired OTP code' };
    }

    // Hash and save new password
    account.password = await bcrypt.hash(password, 12);
    account.resetOtp = undefined;
    account.resetOtpExpires = undefined;
    await account.save();

    return { success: true };
  } catch (err) {
    console.error('Error verifying OTP / resetting password:', err);
    return { error: 'Failed to reset password. Please try again.' };
  }
}

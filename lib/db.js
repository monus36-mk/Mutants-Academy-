import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mutants-academy';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
    
    // Seed initial MainAdmin if none exists in the DB (run only once per container initialization)
    if (!global.adminSeeded) {
      await seedInitialAdmin();
      global.adminSeeded = true;
    }
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

async function seedInitialAdmin() {
  try {
    const newAdminEmail = 'admin.mutants@gmail.com';
    const newAdminPassword = 'fury26';
    const hashedPassword = await bcrypt.hash(newAdminPassword, 12);
    
    // Check if the new admin already exists
    const existingNewAdmin = await User.findOne({ email: newAdminEmail });
    if (!existingNewAdmin) {
      console.log('Seeding new MainAdmin...');
      await User.create({
        name: 'Main Admin',
        email: newAdminEmail,
        password: hashedPassword,
        role: 'MainAdmin',
      });
      console.log(`Seeded new MainAdmin: ${newAdminEmail} / ${newAdminPassword}`);
    } else {
      // Update the password if it's already there
      existingNewAdmin.password = hashedPassword;
      await existingNewAdmin.save();
      console.log(`Updated MainAdmin credentials for: ${newAdminEmail}`);
    }
    
    // Clean up legacy admin if it exists
    const oldAdminEmail = 'admin@mutantsacademy.com';
    if (oldAdminEmail !== newAdminEmail) {
      const deleteResult = await User.deleteOne({ email: oldAdminEmail });
      if (deleteResult.deletedCount > 0) {
        console.log(`Deleted legacy default admin: ${oldAdminEmail}`);
      }
    }
  } catch (err) {
    console.error('Error seeding/updating default admin user:', err);
  }
}

export default dbConnect;

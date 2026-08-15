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
    const adminCount = await User.countDocuments({ role: 'MainAdmin' });
    if (adminCount === 0) {
      console.log('No MainAdmin found. Seeding default MainAdmin...');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await User.create({
        name: 'Main Admin',
        email: 'admin@mutantsacademy.com',
        password: hashedPassword,
        role: 'MainAdmin',
      });
      console.log('Seeded default MainAdmin: admin@mutantsacademy.com / admin123');
    }
  } catch (err) {
    console.error('Error seeding default admin user:', err);
  }
}

export default dbConnect;

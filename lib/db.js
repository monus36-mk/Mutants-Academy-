import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

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
    const oldAdminEmail = 'admin@mutantsacademy.com';

    // Check existence before hashing so warm/cold requests skip expensive bcrypt work
    const [existingNewAdmin] = await Promise.all([
      User.findOne({ email: newAdminEmail }).select('_id password').lean(),
      User.deleteOne({ email: oldAdminEmail }),
    ]);

    if (!existingNewAdmin) {
      const hashedPassword = await bcrypt.hash(newAdminPassword, 12);
      await User.create({
        name: 'Main Admin',
        email: newAdminEmail,
        password: hashedPassword,
        role: 'MainAdmin',
      });
      console.log(`Seeded new MainAdmin: ${newAdminEmail}`);
    } else if (!existingNewAdmin.password) {
      const hashedPassword = await bcrypt.hash(newAdminPassword, 12);
      await User.updateOne({ _id: existingNewAdmin._id }, { $set: { password: hashedPassword } });
    }
  } catch (err) {
    console.error('Error seeding/updating default admin user:', err);
  }
}

export default dbConnect;

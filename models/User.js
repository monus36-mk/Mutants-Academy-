import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
    },
    role: {
      type: String,
      enum: ['MainAdmin', 'Coach'],
      default: 'Coach',
    },
    resetOtp: {
      type: String,
    },
    resetOtpExpires: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Prevent compiling model query if it already exists
export default mongoose.models.User || mongoose.model('User', UserSchema);

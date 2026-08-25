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
    category: {
      type: String,
      enum: ['Martial Arts', 'Silambam'],
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

// Re-compile model to update schema in development hot-reloading
if (mongoose.models.User) {
  delete mongoose.models.User;
}
export default mongoose.model('User', UserSchema);

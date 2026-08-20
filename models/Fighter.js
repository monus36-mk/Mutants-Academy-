import mongoose from 'mongoose';

const FighterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Please provide a phone number'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
    },
    dob: {
      type: Date,
      required: [true, 'Please provide a date of birth'],
    },
    weightClass: {
      type: String,
      required: [true, 'Please provide a weight class'],
      trim: true,
    },
    experienceLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Pro'],
      required: [true, 'Please select an experience level'],
    },
    style: {
      type: String,
      enum: ['Striking', 'Grappling', 'MMA'],
      default: 'MMA',
      required: [true, 'Please select a fighting style'],
    },
    assignedCoach: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please assign a coach'],
    },
    entryDate: {
      type: Date,
      default: Date.now,
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    packageDurationMonths: {
      type: Number,
      required: [true, 'Please specify package duration in months'],
    },
    nextPaymentDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Due Soon', 'Expired'],
      default: 'Active',
    },
    bio: {
      type: String,
      default: '',
      trim: true,
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

// Prevent compiling model query unless schema updates require it
if (mongoose.models.Fighter) {
  delete mongoose.models.Fighter;
}
export default mongoose.models.Fighter || mongoose.model('Fighter', FighterSchema);

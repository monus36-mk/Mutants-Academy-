import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema(
  {
    fighterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fighter',
      required: true,
      index: true,
    },
    fighterName: {
      type: String,
      required: true,
      trim: true,
    },
    style: {
      type: String,
      enum: ['Striking', 'Grappling', 'MMA', 'None'],
      default: 'MMA',
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      index: true,
    },
    inTime: {
      type: String, // e.g. "06:30:15 AM"
      default: '',
    },
    outTime: {
      type: String, // e.g. "08:45:20 AM"
      default: '',
    },
    inTimestamp: {
      type: Date,
      default: null,
    },
    outTimestamp: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    durationFormatted: {
      type: String, // e.g. "02h 15m 05s"
      default: '00h 00m 00s',
    },
    checkInRank: {
      type: Number, // 1 for 1st arrival, 2 for 2nd arrival, etc.
      default: null,
    },
    status: {
      type: String,
      enum: ['Checked In', 'Completed', 'Absent', 'Late', 'Present'],
      default: 'Checked In',
    },
    session: {
      type: String,
      enum: ['General', 'Morning', 'Evening', 'Sparring'],
      default: 'General',
    },
    markedBy: {
      type: String,
      default: 'Athlete', // 'Athlete' | 'Coach' | 'Admin'
    },
    markedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one attendance document per fighter per day
AttendanceSchema.index({ fighterId: 1, date: 1 }, { unique: true });
// Index for today's leaderboard queries
AttendanceSchema.index({ date: 1, inTimestamp: 1 });

export default mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);

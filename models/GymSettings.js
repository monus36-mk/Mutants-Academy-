import mongoose from 'mongoose';

/**
 * Singleton settings schema storing the active gym geofence pin and rules
 * so athletes must be on-site when self-marking mat attendance.
 */
const GymSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'default',
      unique: true,
    },
    locationLabel: {
      type: String,
      trim: true,
      default: 'Mutants Academy',
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    radiusMeters: {
      type: Number,
      default: 100,
      min: 20,
      max: 2000,
    },
    geofenceEnabled: {
      type: Boolean,
      default: true,
    },
    requireCheckOutLocation: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedByName: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.GymSettings || mongoose.model('GymSettings', GymSettingsSchema);


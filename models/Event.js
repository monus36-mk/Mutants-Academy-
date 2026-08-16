import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Please provide an event date'],
    },
    location: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ['Sparring', 'Tournament', 'Seminar', 'Announcement'],
      default: 'Announcement',
    },
    rsvps: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Fighter',
      },
    ],
    image: {
      type: String,
    },
    audio: {
      type: String,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    titleColor: {
      type: String,
      default: 'default',
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Fighter',
      },
    ],
    comments: [
      {
        fighter: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Fighter',
          required: false,
        },
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: false,
        },
        authorName: {
          type: String,
        },
        authorRole: {
          type: String,
        },
        text: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Prevent compiling model query unless schema updates require it
if (mongoose.models.Event && (!mongoose.models.Event.schema.paths.pinned || !mongoose.models.Event.schema.paths.titleColor)) {
  delete mongoose.models.Event;
}
export default mongoose.models.Event || mongoose.model('Event', EventSchema);

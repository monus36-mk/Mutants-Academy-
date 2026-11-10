import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema(
  {
    fighterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fighter',
      required: [true, 'Please provide a fighter ID'],
    },
    fighterName: {
      type: String,
      required: [true, 'Please provide a fighter name'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please provide payment amount'],
    },
    durationMonths: {
      type: Number,
      required: [true, 'Please provide duration in months'],
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'Cash', 'YouPI', 'Bank Transfer'],
      default: 'UPI',
    },
    transactionId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Completed', 'Pending', 'Failed'],
      default: 'Completed',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

if (mongoose.models.Payment) {
  delete mongoose.models.Payment;
}

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);

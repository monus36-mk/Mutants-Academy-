import mongoose from 'mongoose';

const BankCreditSchema = new mongoose.Schema(
  {
    utr: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    bank: {
      type: String,
      default: 'UPI',
    },
    senderInfo: {
      type: String,
      trim: true,
    },
    rawMessage: {
      type: String,
      trim: true,
    },
    claimed: {
      type: Boolean,
      default: false,
      index: true,
    },
    claimedByFighterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fighter',
    },
    claimedPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
  },
  { timestamps: true }
);

if (mongoose.models.BankCredit) {
  delete mongoose.models.BankCredit;
}

export default mongoose.models.BankCredit || mongoose.model('BankCredit', BankCreditSchema);

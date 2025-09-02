import mongoose from 'mongoose';
const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    provider: { type: String, default: 'paystack' },
    reference: { type: String, index: true, unique: true },
    amount: { type: Number, required: true }, // kobo
    currency: { type: String, default: 'NGN' },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
      index: true,
    },
    meta: { type: Object },
  },
  { timestamps: true }
);
export default mongoose.model('Payment', paymentSchema);

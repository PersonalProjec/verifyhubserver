import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: true,
    },
    amount: { type: Number, required: true }, // store in smallest unit (e.g., kobo/cent)
    currency: { type: String, default: 'NGN' },
    status: {
      type: String,
      enum: ['pending', 'successful', 'failed', 'refunded'],
      index: true,
      default: 'pending',
    },
    provider: { type: String }, // paystack/flutterwave/stripe/etc
    reference: { type: String, index: true }, // provider reference
    meta: { type: Object }, // gateway response or extra info
  },
  { timestamps: true }
);

paymentSchema.index({ createdAt: -1 });

export default mongoose.model('Payment', paymentSchema);

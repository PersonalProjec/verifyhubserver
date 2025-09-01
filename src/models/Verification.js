import mongoose from 'mongoose';

const verificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: true,
    },
    type: { type: String, required: true }, // e.g., 'WAEC', 'NECO', 'BirthCert', etc.
    provider: { type: String }, // API/source used (if any)
    targetId: { type: String }, // token/number/ID being verified
    input: { type: Object }, // raw params posted (safe subset)
    status: {
      type: String,
      enum: ['pending', 'verified', 'failed'],
      default: 'pending',
      index: true,
    },
    result: { type: Object }, // normalized verification result
    evidenceUrl: { type: String }, // link to signed PDF / receipt if any
  },
  { timestamps: true }
);

verificationSchema.index({ createdAt: -1 });

export default mongoose.model('Verification', verificationSchema);

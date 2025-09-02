import mongoose from 'mongoose';
const auditSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    type: { type: String, index: true }, // 'provider.run', 'verification.update', etc.
    meta: { type: Object },
  },
  { timestamps: true }
);
export default mongoose.model('Audit', auditSchema);

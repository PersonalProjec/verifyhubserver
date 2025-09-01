import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, index: true },
    passwordHash: String,
  },
  { timestamps: true }
);

adminSchema.methods.setPassword = async function (pwd) {
  this.passwordHash = await bcrypt.hash(pwd, 10);
};
adminSchema.methods.comparePassword = function (pwd) {
  return bcrypt.compare(pwd, this.passwordHash || '');
};

export default mongoose.model('Admin', adminSchema);

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, index: true },
  passwordHash: String,
  emailVerified: { type: Boolean, default: false },
  emailVerifyCode: String,          // 6-digit
  emailVerifyCodeExpiresAt: Date,
  loginCode: String,                // optional 6-digit for code-login
  loginCodeExpiresAt: Date
}, { timestamps: true });

userSchema.methods.setPassword = async function (pwd) {
  this.passwordHash = await bcrypt.hash(pwd, 10);
};
userSchema.methods.comparePassword = function (pwd) {
  return bcrypt.compare(pwd, this.passwordHash || '');
};

export default mongoose.model('User', userSchema);

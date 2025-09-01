import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, index: true },
    passwordHash: String,

    // Profile (all optional)
    firstName: String,
    lastName: String,
    address: String,
    phone: String,
    company: String,
    country: String,

    emailVerified: { type: Boolean, default: false },

    // Email verification
    emailVerifyCode: String,
    emailVerifyCodeExpiresAt: Date,
    emailVerifyCodeSentAt: Date,

    // One-time login code
    loginCode: String,
    loginCodeExpiresAt: Date,
    loginCodeSentAt: Date,

    // Password reset
    passwordResetCode: String,
    passwordResetExpiresAt: Date,
    passwordResetSentAt: Date,
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function (pwd) {
  this.passwordHash = await bcrypt.hash(pwd, 10);
};
userSchema.methods.comparePassword = function (pwd) {
  return bcrypt.compare(pwd, this.passwordHash || '');
};

export default mongoose.model('User', userSchema);

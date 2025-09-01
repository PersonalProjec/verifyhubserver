import User from '../models/User.js';
import { sixDigit, minutesFromNow } from '../utils/generateCodes.js';
import { signToken } from '../middleware/auth.js';
import { createMailer } from '../config/mailer.js';

const mailer = createMailer();

const COOLDOWN_SECONDS = 60;

function withinCooldown(lastSentAt, seconds = COOLDOWN_SECONDS) {
  if (!lastSentAt) return false;
  return Date.now() - new Date(lastSentAt).getTime() < seconds * 1000;
}

export async function register(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'email & password required' });

  let user = await User.findOne({ email });
  if (user) return res.status(409).json({ error: 'Email already exists' });

  user = new User({ email });
  await user.setPassword(password);

  // set verify code + cooldown
  user.emailVerifyCode = sixDigit();
  user.emailVerifyCodeExpiresAt = minutesFromNow(15);
  user.emailVerifyCodeSentAt = new Date();
  await user.save();

  await mailer.sendMail(
    email,
    'Verify your email',
    `<p>Your verification code is <b>${user.emailVerifyCode}</b>. It expires in 15 minutes.</p>`
  );

  res.json({ ok: true, message: 'Registered. Verification code sent.' });
}

export async function resendVerifyCode(req, res) {
  const { email } = req.body || {};
  const u = await User.findOne({ email });
  if (!u) return res.status(404).json({ error: 'User not found' });
  if (u.emailVerified)
    return res.status(400).json({ error: 'Email already verified' });

  if (withinCooldown(u.emailVerifyCodeSentAt))
    return res
      .status(429)
      .json({ error: 'Please wait 60 seconds before requesting another code' });

  u.emailVerifyCode = sixDigit();
  u.emailVerifyCodeExpiresAt = minutesFromNow(15);
  u.emailVerifyCodeSentAt = new Date();
  await u.save();

  await mailer.sendMail(
    email,
    'Verify your email',
    `<p>Your verification code is <b>${u.emailVerifyCode}</b>. It expires in 15 minutes.</p>`
  );

  res.json({ ok: true, message: 'Verification code re-sent' });
}

export async function verifyEmail(req, res) {
  const { email, code } = req.body || {};
  const u = await User.findOne({ email });
  if (!u) return res.status(404).json({ error: 'User not found' });
  if (u.emailVerified)
    return res.json({ ok: true, message: 'Already verified' });

  if (
    !u.emailVerifyCode ||
    u.emailVerifyCode !== code ||
    new Date() > u.emailVerifyCodeExpiresAt
  )
    return res.status(400).json({ error: 'Invalid/expired code' });

  u.emailVerified = true;
  u.emailVerifyCode = undefined;
  u.emailVerifyCodeExpiresAt = undefined;
  await u.save();

  res.json({ ok: true });
}

export async function login(req, res) {
  let { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'email & password required' });

  email = String(email).toLowerCase().trim();

  const u = await User.findOne({ email });
  if (!u) return res.status(404).json({ error: 'User not found' });
  if (!(await u.comparePassword(password)))
    return res.status(400).json({ error: 'Invalid credentials' });
  if (!u.emailVerified)
    return res.status(403).json({ error: 'Email not verified' });

  u.lastLoginAt = new Date();
  await u.save();

  const token = signToken({ sub: u._id, email: u.email, role: 'user' });
  res.json({ token });
}

export async function loginWithCode(req, res) {
  let { email, code } = req.body || {};
  if (!email || !code)
    return res.status(400).json({ error: 'email & code required' });

  email = String(email).toLowerCase().trim();
  code = String(code).trim();

  // Optional but recommended: enforce 6-digit numeric code
  if (!/^\d{6}$/.test(code))
    return res.status(400).json({ error: 'Invalid/expired code' });

  const u = await User.findOne({ email });
  if (!u) return res.status(404).json({ error: 'User not found' });

  if (!u.loginCode || u.loginCode !== code || new Date() > u.loginCodeExpiresAt)
    return res.status(400).json({ error: 'Invalid/expired code' });

  // consume the code + tidy metadata
  u.loginCode = undefined;
  u.loginCodeExpiresAt = undefined;
  u.loginCodeSentAt = undefined; // optional tidy
  u.lastLoginAt = new Date();

  // auto-verify on successful code login (your intended behavior)
  if (!u.emailVerified) u.emailVerified = true;

  await u.save();

  const token = signToken({ sub: u._id, email: u.email, role: 'user' });
  res.json({ token });
}

export async function requestLoginCode(req, res) {
  const { email } = req.body || {};
  const u = await User.findOne({ email });
  if (!u) return res.status(404).json({ error: 'User not found' });

  if (withinCooldown(u.loginCodeSentAt))
    return res
      .status(429)
      .json({ error: 'Please wait 60 seconds before requesting another code' });

  u.loginCode = sixDigit();
  u.loginCodeExpiresAt = minutesFromNow(10);
  u.loginCodeSentAt = new Date();
  await u.save();

  await mailer.sendMail(
    email,
    'Your login code',
    `<p>Code: <b>${u.loginCode}</b> (valid for 10 minutes)</p>`
  );

  res.json({ ok: true, message: 'Login code sent' });
}

export async function forgotPassword(req, res) {
  const { email } = req.body || {};
  const u = await User.findOne({ email });
  // For privacy, always return ok, but only send if user exists
  if (!u)
    return res.json({
      ok: true,
      message: 'If this email exists, a reset code has been sent.',
    });

  if (withinCooldown(u.passwordResetSentAt))
    return res
      .status(429)
      .json({ error: 'Please wait 60 seconds before requesting another code' });

  u.passwordResetCode = sixDigit();
  u.passwordResetExpiresAt = minutesFromNow(15);
  u.passwordResetSentAt = new Date();
  await u.save();

  await mailer.sendMail(
    email,
    'Reset your password',
    `<p>Your password reset code is <b>${u.passwordResetCode}</b>. It expires in 15 minutes.</p>`
  );

  res.json({ ok: true, message: 'Reset code sent if the email exists.' });
}

export async function resetPassword(req, res) {
  const { email, code, newPassword } = req.body || {};
  if (!email || !code || !newPassword)
    return res.status(400).json({ error: 'email, code, newPassword required' });

  const u = await User.findOne({ email });
  if (!u) return res.status(404).json({ error: 'User not found' });

  if (
    !u.passwordResetCode ||
    u.passwordResetCode !== code ||
    new Date() > u.passwordResetExpiresAt
  )
    return res.status(400).json({ error: 'Invalid/expired code' });

  // consume the reset
  u.passwordResetCode = undefined;
  u.passwordResetExpiresAt = undefined;
  u.passwordResetSentAt = undefined;

  u.passwordHash = await (await import('bcrypt')).default.hash(newPassword, 10);
  await u.save();

  res.json({ ok: true, message: 'Password has been reset' });
}

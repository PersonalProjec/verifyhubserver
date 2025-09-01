import { Router } from 'express';
import User from '../models/User.js';
import { sixDigit, minutesFromNow } from '../utils/generateCodes.js';
import { signToken } from '../middleware/auth.js';
import { createMailer } from '../config/mailer.js';

const router = Router();
const mailer = createMailer();

// Register
router.post('/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'email & password required' });

  let user = await User.findOne({ email });
  if (user) return res.status(409).json({ error: 'Email already exists' });

  user = new User({ email });
  await user.setPassword(password);
  user.emailVerifyCode = sixDigit();
  user.emailVerifyCodeExpiresAt = minutesFromNow(15);
  await user.save();

  await mailer.sendMail(
    email,
    'Verify your email',
    `<p>Your verification code is <b>${user.emailVerifyCode}</b>. It expires in 15 minutes.</p>`
  );

  res.json({ ok: true, message: 'Registered. Verification code sent.' });
});

// Verify email
router.post('/verify-email', async (req, res) => {
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
});

// Login with password
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const u = await User.findOne({ email });
  if (!u) return res.status(404).json({ error: 'User not found' });
  if (!(await u.comparePassword(password)))
    return res.status(400).json({ error: 'Invalid credentials' });
  if (!u.emailVerified)
    return res.status(403).json({ error: 'Email not verified' });
  const token = signToken({ sub: u._id, email: u.email, role: 'user' });
  res.json({ token });
});

// Request one-time login code (passwordless alternative)
router.post('/request-login-code', async (req, res) => {
  const { email } = req.body || {};
  const u = await User.findOne({ email });
  if (!u) return res.status(404).json({ error: 'User not found' });
  u.loginCode = sixDigit();
  u.loginCodeExpiresAt = minutesFromNow(10);
  await u.save();
  await mailer.sendMail(
    email,
    'Your login code',
    `<p>Code: <b>${u.loginCode}</b> (10 mins)</p>`
  );
  res.json({ ok: true });
});

// Login with one-time code
router.post('/login-with-code', async (req, res) => {
  const { email, code } = req.body || {};
  const u = await User.findOne({ email });
  if (!u) return res.status(404).json({ error: 'User not found' });
  if (!u.loginCode || u.loginCode !== code || new Date() > u.loginCodeExpiresAt)
    return res.status(400).json({ error: 'Invalid/expired code' });

  u.loginCode = undefined;
  u.loginCodeExpiresAt = undefined;
  if (!u.emailVerified) u.emailVerified = true; // Optional: verify on first successful code
  await u.save();

  const token = signToken({ sub: u._id, email: u.email, role: 'user' });
  res.json({ token });
});

export default router;

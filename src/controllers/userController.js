import User from '../models/User.js';
import bcrypt from 'bcrypt';

export async function getMe(req, res) {
  const u = await User.findById(req.user.sub).lean();
  if (!u) return res.status(404).json({ error: 'User not found' });
  // expose safe fields only
  const {
    email, firstName, lastName, address, phone, company, country, createdAt, updatedAt, emailVerified
  } = u;
  res.json({ email, firstName, lastName, address, phone, company, country, emailVerified, createdAt, updatedAt });
}

export async function updateMe(req, res) {
  const allowed = ['firstName', 'lastName', 'address', 'phone', 'company', 'country'];
  const patch = {};
  for (const k of allowed) if (k in req.body) patch[k] = req.body[k];

  const u = await User.findByIdAndUpdate(req.user.sub, { $set: patch }, { new: true });
  if (!u) return res.status(404).json({ error: 'User not found' });

  res.json({
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    address: u.address,
    phone: u.phone,
    company: u.company,
    country: u.country,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword & newPassword required' });

  const u = await User.findById(req.user.sub);
  if (!u) return res.status(404).json({ error: 'User not found' });

  const ok = await u.comparePassword(currentPassword);
  if (!ok) return res.status(400).json({ error: 'Current password incorrect' });

  u.passwordHash = await bcrypt.hash(newPassword, 10);
  await u.save();
  res.json({ ok: true, message: 'Password updated' });
}

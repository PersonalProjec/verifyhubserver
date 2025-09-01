import Admin from '../models/Admin.js';
import bcrypt from 'bcrypt';
import { signToken } from '../middleware/auth.js';

export async function adminLogin(req, res) {
  const { username, password } = req.body || {};
  const a = await Admin.findOne({ username });
  if (!a) return res.status(404).json({ error: 'Admin not found' });
  if (!(await a.comparePassword(password)))
    return res.status(400).json({ error: 'Invalid credentials' });
  const token = signToken({
    sub: a._id,
    username: a.username,
    admin: true,
    role: 'admin',
  });
  res.json({ token });
}

export function getAdminInfo(req, res) {
  res.json({ ok: true, admin: req.admin });
}

export async function changeAdminPassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: 'currentPassword & newPassword required' });
  }

  const adminId = req.admin?.sub; // set by requireAdmin middleware
  const a = await Admin.findById(adminId);
  if (!a) return res.status(404).json({ error: 'Admin not found' });

  const ok = await a.comparePassword(currentPassword);
  if (!ok) return res.status(400).json({ error: 'Current password incorrect' });

  a.passwordHash = await bcrypt.hash(newPassword, 10);
  await a.save();

  res.json({ ok: true, message: 'Admin password updated' });
}

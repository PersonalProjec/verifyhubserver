import { Router } from 'express';
import Admin from '../models/Admin.js';
import { signToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  const a = await Admin.findOne({ username });
  if (!a) return res.status(404).json({ error: 'Admin not found' });
  if (!(await a.comparePassword(password))) return res.status(400).json({ error: 'Invalid credentials' });
  const token = signToken({ sub: a._id, username: a.username, admin: true, role: 'admin' });
  res.json({ token });
});

// Example protected admin endpoint
router.get('/me', requireAdmin, (req, res) => {
  res.json({ ok: true, admin: req.admin });
});

export default router;

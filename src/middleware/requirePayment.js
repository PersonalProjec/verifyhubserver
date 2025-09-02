import User from '../models/User.js';

export async function requirePayment(req, res, next) {
  const u = await User.findById(req.user.sub).select('credits').lean();
  if (!u) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (u.credits <= 0) {
    return res.status(402).json({ error: 'Payment required' });
  }
  next();
}

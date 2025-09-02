import User from '../models/User.js';

// Cost table (can expand later)
export function getVerificationCost(type = 'Generic') {
  return 5; // flat 5 credits for now
}

export async function requireCreditsForVerification(req, res, next) {
  try {
    // multer put fields in req.body; if we place this AFTER multer in the route,
    // we can read req.body.type. Otherwise default to Generic.
    const type = (req.body?.type || 'Generic').trim();
    const needed = getVerificationCost(type);

    const u = await User.findById(req.user.sub).select('credits email').lean();
    if (!u) return res.status(404).json({ error: 'User not found' });

    const have = Number(u.credits || 0);
    if (have < needed) {
      return res
        .status(402)
        .json({ error: 'Payment required', required: needed, credits: have });
    }

    // pass the computed cost along so controller can deduct
    req._verificationCost = needed;
    next();
  } catch (e) {
    console.error('requireCreditsForVerification error', e);
    res.status(500).json({ error: 'Server error' });
  }
}

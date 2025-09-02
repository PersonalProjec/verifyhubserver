const windowMs = 60 * 1000;
const limits = new Map(); // userId -> { count, reset }

export function rateLimitVerify(maxPerMinute = 12) {
  return (req, res, next) => {
    const uid = req.user?.sub || req.ip;
    const now = Date.now();
    const ent = limits.get(uid) || { count: 0, reset: now + windowMs };
    if (now > ent.reset) {
      ent.count = 0;
      ent.reset = now + windowMs;
    }
    ent.count += 1;
    limits.set(uid, ent);
    if (ent.count > maxPerMinute) {
      return res
        .status(429)
        .json({ error: 'Too many requests, please wait a minute.' });
    }
    next();
  };
}

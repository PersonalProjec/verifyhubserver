const mem = new Map(); // key -> { until: Date }
const TTL_MS = 5 * 60 * 1000;

export function idempotency() {
  return (req, res, next) => {
    const key = req.header('Idempotency-Key');
    if (!key) return next();
    const scope = `${req.user?.sub || 'anon'}:${req.method}:${
      req.originalUrl
    }:${key}`;
    const now = Date.now();
    const entry = mem.get(scope);
    if (entry && entry.until > now) {
      return res.status(409).json({ error: 'Duplicate request (idempotent)' });
    }
    mem.set(scope, { until: now + TTL_MS });
    next();
  };
}

import User from '../models/User.js';
import Verification from '../models/Verification.js';
import Payment from '../models/Payment.js';

export async function getAdminOverview(req, res) {
  // Simple, fast counters. Expand later as needed.
  const [
    usersTotal,
    usersEmailVerified,
    verTotal,
    verVerified,
    verFailed,
    verPending,
    payTotal,
    revenueKobo,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ emailVerified: true }),
    Verification.countDocuments({}),
    Verification.countDocuments({ status: 'verified' }),
    Verification.countDocuments({ status: 'failed' }),
    Verification.countDocuments({ status: 'pending' }),
    Payment.countDocuments({}),
    Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, sum: { $sum: '$amount' } } },
    ]),
  ]);

  const revenue = revenueKobo?.[0]?.sum || 0;

  res.json({
    users: {
      total: usersTotal,
      emailVerified: usersEmailVerified,
    },
    verifications: {
      total: verTotal,
      verified: verVerified,
      failed: verFailed,
      pending: verPending,
    },
    payments: {
      total: payTotal,
      revenueKobo: revenue,
    },
    providers: {
      total: 0, // placeholder until you wire real providers
    },
    // room for more: system health, queues, storage, etc.
  });
}

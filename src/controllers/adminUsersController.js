import User from '../models/User.js';
import Verification from '../models/Verification.js';
import Payment from '../models/Payment.js';
import mongoose from 'mongoose';

export async function listUsers(req, res) {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || '20', 10), 1),
    100
  );
  const search = (req.query.search || '').trim();

  const query = {};
  if (search) {
    query.$or = [
      { email: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
    ];
  }

  // 1) fetch list + total first
  const [items, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  // 2) aggregate counts for just these users
  let verificationsMap = {};
  let paymentsMap = {};
  if (items.length > 0) {
    const ids = items.map((u) => u._id);
    const [verAgg, payAgg] = await Promise.all([
      Verification.aggregate([
        { $match: { userId: { $in: ids } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { userId: { $in: ids } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ]),
    ]);
    verificationsMap = Object.fromEntries(
      verAgg.map((v) => [String(v._id), v.count])
    );
    paymentsMap = Object.fromEntries(
      payAgg.map((p) => [String(p._id), p.count])
    );
  }

  // 3) shape response
  const rows = items.map((u) => ({
    id: u._id,
    email: u.email,
    firstName: u.firstName || '',
    lastName: u.lastName || '',
    phone: u.phone || '',
    company: u.company || '',
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt || null,
    verificationsCount: verificationsMap[String(u._id)] || 0,
    paymentsCount: paymentsMap[String(u._id)] || 0,
  }));

  res.json({ page, limit, total, items: rows });
}

export async function getUserById(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ error: 'Invalid user id' });

  const u = await User.findById(id).lean();
  if (!u) return res.status(404).json({ error: 'User not found' });

  const profile = {
    id: u._id,
    email: u.email,
    firstName: u.firstName || '',
    lastName: u.lastName || '',
    address: u.address || '',
    phone: u.phone || '',
    company: u.company || '',
    country: u.country || '',
    emailVerified: !!u.emailVerified,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    lastLoginAt: u.lastLoginAt || null,
  };
  res.json(profile);
}

export async function getUserVerifications(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ error: 'Invalid user id' });
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || '20', 10), 1),
    100
  );
  const status = req.query.status;

  const query = { userId: id };
  if (status) query.status = status;

  const [items, total] = await Promise.all([
    Verification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Verification.countDocuments(query),
  ]);

  res.json({ page, limit, total, items });
}

export async function getUserPayments(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ error: 'Invalid user id' });
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || '20', 10), 1),
    100
  );
  const status = req.query.status;

  // const query = { userId: new mongoose.Types.ObjectId(id) };
  const query = { userId: id };
  if (status) query.status = status;

  const [items, total] = await Promise.all([
    Payment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Payment.countDocuments(query),
  ]);

  res.json({ page, limit, total, items });
}

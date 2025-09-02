import { listCatalog, getProviderCost } from '../providers/catalog.js';
import { runProvider } from '../providers/index.js';
import Verification from '../models/Verification.js';
import User from '../models/User.js';
import Audit from '../models/Audit.js';

export async function getProviderCatalog(req, res) {
  res.json({ providers: listCatalog() });
}

export async function runProviderVerification(req, res) {
  const { provider, fields } = req.body || {};
  if (!provider || typeof fields !== 'object') {
    return res.status(400).json({ error: 'provider and fields are required' });
  }

  // Create a verification record in 'pending' first (for traceability)
  const v = await Verification.create({
    userId: req.user.sub,
    type: provider.toUpperCase(),
    provider,
    targetId: fields?.examNumber || fields?.nin || null, // best-effort
    input: fields,
    status: 'pending',
    result: null,
    evidenceUrl: null,
    code: `vh_${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
  });

  let out,
    verdict = 'failed';
  try {
    out = await runProvider(provider, fields);
    verdict = out?.verdict === 'verified' ? 'verified' : 'failed';
  } catch (e) {
    // mark as failed but include error in result
    out = { error: e.message || 'Provider error' };
  }

  // Deduct credits atomically based on provider cost
  const cost = Number(req._providerCost || getProviderCost(provider));
  await User.updateOne({ _id: req.user.sub }, { $inc: { credits: -cost } });

  // Persist normalized result
  await Verification.updateOne(
    { _id: v._id },
    { $set: { status: verdict, result: { ...(out || {}), cost } } }
  );

  // Audit
  await Audit.create({
    userId: req.user.sub,
    type: 'provider.run',
    meta: { provider, fields, verdict, verificationId: v._id, cost },
  });

  res.json({
    id: v._id,
    code: v.code,
    status: verdict,
    cost,
    result: out?.normalized || null,
    raw: process.env.NODE_ENV === 'production' ? undefined : out?.raw || out, // hide raw in prod if you want
  });
}

import express from 'express';
import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import Payment from '../models/Payment.js';
import crypto from 'crypto';
import fetch from 'node-fetch';
import User from '../models/User.js';

const router = Router();
const PSK = process.env.PAYSTACK_SECRET_KEY;

// Price endpoint (so client can show it)
router.get('/price', (req, res) => {
  res.json({ amount: 1000 * 100, currency: 'NGN', credits: 1 }); // ₦1,000 => 1 credit
});

// Init checkout
router.post('/paystack/init', requireUser, async (req, res) => {
  const { amountKobo, credits = 1 } = req.body || {};
  const amount = Number(amountKobo || 100000); // default ₦1,000
  const reference = `vh_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  const p = await Payment.create({
    userId: req.user.sub,
    provider: 'paystack',
    reference,
    amount,
    currency: 'NGN',
    status: 'pending',
    meta: { credits },
  });

  const initRes = await fetch(
    'https://api.paystack.co/transaction/initialize',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PSK}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: req.user.email,
        amount,
        reference,
        callback_url: `${process.env.FRONTEND_BASE_URL}/dashboard/payments?ref=${reference}`,
      }),
    }
  ).then((r) => r.json());

  if (!initRes?.status) {
    return res
      .status(400)
      .json({ error: initRes?.message || 'Paystack init failed' });
  }
  res.json({ authorization_url: initRes.data.authorization_url, reference });
});

// Webhook (must be raw body in Express)
router.post(
  '/paystack/webhook',
  express.raw({ type: '*/*' }),
  async (req, res) => {
    const signature = req.headers['x-paystack-signature'];
    const computed = crypto
      .createHmac('sha512', PSK)
      .update(req.body)
      .digest('hex');
    if (signature !== computed) return res.status(401).end();

    const event = JSON.parse(req.body.toString('utf8'));
    if (event.event === 'charge.success') {
      const ref = event.data.reference;
      const pay = await Payment.findOne({ reference: ref });
      if (pay && pay.status !== 'success') {
        pay.status = 'success';
        pay.meta = { ...(pay.meta || {}), raw: event.data };
        await pay.save();
        // grant credits
        const credits = Number(pay.meta?.credits || 1);
        await User.updateOne({ _id: pay.userId }, { $inc: { credits } });
      }
    } else if (event.event === 'charge.failed') {
      const ref = event.data.reference;
      await Payment.updateOne(
        { reference: ref },
        { $set: { status: 'failed' } }
      );
    }
    res.json({ ok: true });
  }
);

router.get('/me', requireUser, async (req, res) => {
  const u = await User.findById(req.user.sub).select('credits').lean();
  res.json({ credits: u?.credits || 0 });
});

export default router;

import { putS3Object } from '../config/s3.js';
import {
  generateRefCode,
  sha256,
  tryDecodeQR,
  signAttestToken,
  verifyAttestToken,
} from '../utils/verifyUtils.js';
import Verification from '../models/Verification.js';
import path from 'path';
import PDFDocument from 'pdfkit';
// import pdf from 'pdf-parse';
import { createMailer } from '../config/mailer.js';

const mailer = createMailer();

async function extractPdfTextIfAny(file) {
  if (!file?.mimetype?.startsWith('application/pdf')) return '';
  try {
    // Lazy import so module init runs only when needed
    const mod = await import('pdf-parse').catch(() => null);
    if (!mod?.default) return '';
    const pdf = mod.default;
    const { text } = await pdf(file.buffer);
    return text?.slice(0, 20000) || '';
  } catch (err) {
    console.error('PDF parse failed:', err.message);
    return '';
  }
}

export async function uploadVerification(req, res) {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'file required' });

  const { type, issuerEmail, notes } = req.body || {};
  const ext = path.extname(file.originalname || '').toLowerCase();
  const contentType = file.mimetype || 'application/octet-stream';

  // 1) hash
  const hash = await sha256(file.buffer);

  // 2) upload file
  const key = `verifications/${req.user.sub}/${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}${ext || ''}`;
  const fileUrl = await putS3Object({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: contentType,
  });

  // 3) QR for images; text extraction for PDFs
  let qrText = null;
  if (contentType.startsWith('image/')) {
    qrText = await tryDecodeQR(file.buffer);
  }
  const pdfText = await extractPdfTextIfAny(file);

  // 4) create verification record
  const code = generateRefCode();
  const v = await Verification.create({
    userId: req.user.sub,
    type: type || 'Generic',
    provider: null,
    targetId: null,
    input: { issuerEmail: issuerEmail || null, notes: notes || null },
    status: 'pending',
    result: {
      fileUrl,
      fileHash: hash,
      qrText,
      pdfTextLength: pdfText?.length || 0,
    },
    evidenceUrl: null,
    code,
  });

  // 5) store PDF text (optional separate field to avoid bloating result)
  if (pdfText) {
    await Verification.updateOne(
      { _id: v._id },
      { $set: { 'result.pdfTextSnippet': pdfText.slice(0, 1000) } }
    );
  }

  // 6) email attestation link if issuerEmail present
  if (issuerEmail) {
    const token = signAttestToken({
      verificationId: v._id,
      ttlMinutes: 60 * 24 * 7,
    });
    const attestUrl = `${
      process.env.PUBLIC_BASE_URL || 'http://localhost:5173'
    }/attest?token=${encodeURIComponent(token)}`;
    // optional direct API links (Approve / Reject)
    const approveUrl = `${
      process.env.PUBLIC_BASE_URL || 'http://localhost:5173'
    }/attest?token=${encodeURIComponent(token)}&decision=verified`;
    const rejectUrl = `${
      process.env.PUBLIC_BASE_URL || 'http://localhost:5173'
    }/attest?token=${encodeURIComponent(token)}&decision=failed`;

    await mailer.sendMail(
      issuerEmail,
      'VerifyHub attestation request',
      `
      <p>Hello,</p>
      <p>An attestation is requested for a document uploaded to VerifyHub.</p>
      <p><b>Type:</b> ${v.type}<br/>
         <b>Hash (SHA-256):</b> ${hash}</p>
      <p>Please review and choose:</p>
      <p>
        <a href="${approveUrl}">✅ Approve</a> &nbsp; | &nbsp;
        <a href="${rejectUrl}">❌ Reject</a>
      </p>
      <p>Or open the attestation page to review first:<br/>
         <a href="${attestUrl}">${attestUrl}</a>
      </p>
      <p>If you did not expect this email, you can ignore it.</p>
      `
    );
  }

  const publicUrl = `${
    process.env.PUBLIC_BASE_URL || 'http://localhost:5173'
  }/v/${code}`;

  res.json({
    id: v._id,
    code,
    publicUrl,
    hash,
    qrText,
    fileUrl,
    status: v.status,
    emailed: !!issuerEmail,
  });
}

export async function getMyVerifications(req, res) {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || '20', 10), 1),
    100
  );
  const [items, total] = await Promise.all([
    Verification.find({ userId: req.user.sub })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Verification.countDocuments({ userId: req.user.sub }),
  ]);
  res.json({ page, limit, total, items });
}

export async function getOneVerification(req, res) {
  const { id } = req.params;
  const v = await Verification.findOne({
    _id: id,
    userId: req.user.sub,
  }).lean();
  if (!v) return res.status(404).json({ error: 'Not found' });
  res.json(v);
}

// PUBLIC (no auth) by code
export async function getPublicVerification(req, res) {
  const { code } = req.params;
  const v = await Verification.findOne({ code }).lean();
  if (!v || !v.sharePublic) return res.status(404).json({ error: 'Not found' });

  const { type, status, result, createdAt } = v;
  res.json({
    type,
    status,
    createdAt,
    fileHash: result?.fileHash || null,
    qrText: result?.qrText || null,
    evidenceUrl: v.evidenceUrl || null,
  });
}

// PUBLIC: receipt PDF
export async function publicReceiptPdf(req, res) {
  const { code } = req.params;
  const v = await Verification.findOne({ code }).lean();
  if (!v || !v.sharePublic) return res.status(404).end();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="verifyhub_receipt_${code}.pdf"`
  );

  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  doc.pipe(res);

  doc
    .fontSize(18)
    .text('VerifyHub Verification Receipt', { align: 'center' })
    .moveDown(1);
  doc.fontSize(11).text(`Reference Code: ${v.code}`);
  doc.text(`Type: ${v.type}`);
  doc.text(`Status: ${v.status}`);
  doc.text(`Created: ${new Date(v.createdAt).toISOString()}`);
  if (v.result?.fileHash) doc.text(`SHA-256: ${v.result.fileHash}`);
  if (v.result?.qrText) doc.text(`QR: ${v.result.qrText}`);
  if (v.input?.issuerEmail) doc.text(`Issuer Email: ${v.input.issuerEmail}`);
  doc
    .moveDown(1)
    .fontSize(10)
    .fillColor('#666')
    .text(
      'This receipt summarizes the verification record stored by VerifyHub. It includes a cryptographic hash of the uploaded document (if any).',
      { align: 'left' }
    );

  doc.end();
}

// ATTEST: POST /api/verify/:id/attest  body { token, decision: 'verified' | 'failed' }
export async function attestVerification(req, res) {
  const { id } = req.params;
  const { token, decision } = req.body || {};
  if (!token || !['verified', 'failed'].includes(decision))
    return res.status(400).json({ error: 'token and valid decision required' });

  const parsed = verifyAttestToken(token);
  if (!parsed || parsed.a !== 'attest' || String(parsed.v) !== String(id)) {
    return res.status(400).json({ error: 'Invalid/expired token' });
  }

  const v = await Verification.findById(id);
  if (!v) return res.status(404).json({ error: 'Not found' });

  v.status = decision;
  v.result = {
    ...(v.result || {}),
    attestedAt: new Date(),
    attestedDecision: decision,
  };
  await v.save();

  res.json({ ok: true, status: v.status });
}

export async function toggleSharePublic(req, res) {
  const { id } = req.params;
  const { share } = req.body || {};
  const v = await Verification.findOne({ _id: id, userId: req.user.sub });
  if (!v) return res.status(404).json({ error: 'Not found' });
  v.sharePublic = !!share;
  await v.save();
  res.json({ ok: true, sharePublic: v.sharePublic });
}

// controllers/verifyController.js
export async function sendAttestationEmail(req, res) {
  const { id } = req.params;
  const { issuerEmail } = req.body || {};
  if (!issuerEmail)
    return res.status(400).json({ error: 'issuerEmail required' });

  const v = await Verification.findOne({ _id: id, userId: req.user.sub });
  if (!v) return res.status(404).json({ error: 'Not found' });

  const token = signAttestToken({
    verificationId: v._id,
    ttlMinutes: 60 * 24 * 7,
  });
  const attestUrl = `${
    process.env.PUBLIC_BASE_URL || 'http://localhost:5173'
  }/attest?token=${encodeURIComponent(token)}`;
  const approveUrl = `${attestUrl}&decision=verified`;
  const rejectUrl = `${attestUrl}&decision=failed`;

  await mailer.sendMail(
    issuerEmail,
    'VerifyHub attestation request',
    `
      <p>Hello,</p>
      <p>An attestation is requested for a document uploaded to VerifyHub.</p>
      <p><b>Type:</b> ${v.type}<br/>
         <b>Hash (SHA-256):</b> ${v.result?.fileHash || ''}</p>
      <p>
        <a href="${approveUrl}">✅ Approve</a> &nbsp; | &nbsp;
        <a href="${rejectUrl}">❌ Reject</a>
      </p>
      <p>Review page: <a href="${attestUrl}">${attestUrl}</a></p>
    `
  );

  v.input = { ...(v.input || {}), issuerEmail };
  v.issuerEmailSentAt = new Date();
  await v.save();

  res.json({ ok: true });
}

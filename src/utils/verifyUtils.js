import crypto from 'crypto';
import { Jimp } from 'jimp';
import QrCode from 'qrcode-reader';
import jwt from 'jsonwebtoken';

export function generateRefCode(len = 10) {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O/I/1
  let out = 'vh_';
  for (let i = 0; i < len; i++)
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export async function sha256(bufferOrStream) {
  const hash = crypto.createHash('sha256');
  if (Buffer.isBuffer(bufferOrStream)) {
    hash.update(bufferOrStream);
    return hash.digest('hex');
  }
  return await new Promise((resolve, reject) => {
    bufferOrStream.on('data', (d) => hash.update(d));
    bufferOrStream.on('end', () => resolve(hash.digest('hex')));
    bufferOrStream.on('error', reject);
  });
}

// Try to decode QR from image buffer (PNG/JPG). Returns string or null.
export async function tryDecodeQR(imageBuffer) {
  try {
    const img = await Jimp.read(imageBuffer);
    const qr = new QrCode();
    return await new Promise((resolve) => {
      qr.callback = (err, v) => resolve(err ? null : v?.result || null);
      qr.decode(img.bitmap);
    });
  } catch {
    return null;
  }
}

export function signAttestToken({
  verificationId,
  action = 'attest',
  ttlMinutes = 60 * 24 * 7,
}) {
  const secret = process.env.ATTEST_JWT_SECRET;
  const payload = { v: String(verificationId), a: action };
  return jwt.sign(payload, secret, { expiresIn: `${ttlMinutes}m` });
}

export function verifyAttestToken(token) {
  const secret = process.env.ATTEST_JWT_SECRET;
  try {
    return jwt.verify(token, secret); // => { v, a, iat, exp }
  } catch {
    return null;
  }
}

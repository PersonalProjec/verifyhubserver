import 'dotenv/config';
import mongoose from 'mongoose';
import Verification from './src/models/Verification.js';

// same alphabet as generateRefCode (optional)
function genRef(len = 10) {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let out = 'vh_';
  for (let i = 0; i < len; i++)
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const cursor = Verification.find({
    $or: [{ code: { $exists: false } }, { code: null }],
  }).cursor();
  let updated = 0;
  for await (const v of cursor) {
    v.code = genRef();
    // optionally turn on sharing for existing items:
    // v.sharePublic = true;
    await v.save();
    updated++;
  }
  console.log(`✅ Backfilled ${updated} verification(s) with code`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

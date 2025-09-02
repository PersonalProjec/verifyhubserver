import 'dotenv/config';
import mongoose from 'mongoose';
import Verification from './src/models/Verification.js';
import Payment from './src/models/Payment.js';

async function fix(col) {
  const cursor = col.find({ userId: { $type: 'string' } }).cursor();
  let n = 0;
  for await (const doc of cursor) {
    if (mongoose.isValidObjectId(doc.userId)) {
      await col.updateOne(
        { _id: doc._id },
        { $set: { userId: new mongoose.Types.ObjectId(doc.userId) } }
      );
      n++;
    }
  }
  return n;
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const v = await fix(Verification);
  const p = await fix(Payment);
  console.log(`Fixed ${v} verifications, ${p} payments`);
  await mongoose.disconnect();
})();

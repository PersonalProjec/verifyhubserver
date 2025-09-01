import 'dotenv/config';
import { connectDB } from '../src/config/db.js';
import Admin from '../src/models/Admin.js';

(async () => {
  const [, , username, password] = process.argv;
  if (!username || !password) {
    console.log('Usage: npm run create-admin -- <username> <password>');
    process.exit(1);
  }
  await connectDB(process.env.MONGO_URI);
  let admin = await Admin.findOne({ username });
  if (!admin) admin = new Admin({ username });
  await admin.setPassword(password);
  await admin.save();
  console.log(`✅ Admin upserted: ${username}`);
  process.exit(0);
})();

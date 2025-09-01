import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

const ipLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30, // per IP per 5 minutes (tune as needed)
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(ipLimiter);


app.get('/', (_, res) => res.json({ ok: true, service: 'verify-hub-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);

const PORT = process.env.PORT || 5000;
connectDB(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`API on :${PORT}`)))
  .catch((e) => {
    console.error('Mongo error', e);
    process.exit(1);
  });

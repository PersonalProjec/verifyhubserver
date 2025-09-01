import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (_, res) => res.json({ ok: true, service: 'verify-hub-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;
connectDB(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`API on :${PORT}`)))
  .catch((e) => {
    console.error('Mongo error', e);
    process.exit(1);
  });

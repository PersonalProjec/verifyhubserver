import mongoose from 'mongoose';

export async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { dbName: 'verifyhub' });
  console.log('✅ MongoDB connected');
}

import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cellculture_db';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB');
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

export async function nextId(counterName: string): Promise<number> {
  const result = await mongoose.connection.collection('counters').findOneAndUpdate(
    { _id: counterName } as any,
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  const value = (result as any)?.value?.value ?? (result as any)?.value ?? 1;
  return Number(value);
}

import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import app from './app';
import { connectDatabase } from './db/db';

const PORT = process.env.BACKEND_PORT ? Number(process.env.BACKEND_PORT) : 4000;

async function start(): Promise<void> {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

start().catch((err) => {
  console.error('Unable to start backend:', err);
  process.exit(1);
});

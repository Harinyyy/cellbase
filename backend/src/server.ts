
import dotenv from 'dotenv';
import app from './app';
import { connectDatabase } from './db/db';

dotenv.config();

const PORT = Number(process.env.PORT || process.env.BACKEND_PORT || 4000);

async function start(): Promise<void> {
  await connectDatabase();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server listening on port ${PORT}`);
    console.log(`Health check: /health`);
  });
}

start().catch((err) => {
  console.error('Unable to start backend:', err);
  process.exit(1);
});

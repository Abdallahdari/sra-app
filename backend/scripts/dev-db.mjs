// Local development MongoDB (no install or Docker needed).
// Data persists in backend/data/db. In production, point MONGODB_URI at MongoDB Atlas instead.
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dbPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'db');
mkdirSync(dbPath, { recursive: true });

const port = Number(process.env.DB_PORT || 27017);
const server = await MongoMemoryServer.create({
  instance: { port, dbPath, storageEngine: 'wiredTiger', ip: '127.0.0.1' },
});
console.log(`MongoDB running at ${server.getUri()}sra  (data: ${dbPath})`);
console.log('Press Ctrl+C to stop.');

const stop = async () => {
  await server.stop({ doCleanup: false });
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

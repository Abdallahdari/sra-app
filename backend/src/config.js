import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const config = {
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || '0.0.0.0',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sra',
  mongoDb: process.env.MONGODB_DB || 'sra',
  dnsServers: (process.env.DNS_SERVERS || '').split(',').map((s) => s.trim()).filter(Boolean),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  jwtTtl: process.env.JWT_TTL || '7d',
  uploadsDir: process.env.UPLOADS_DIR || join(root, 'uploads'),
  rawDir: join(root, 'data', 'raw'),
  corsOrigin: process.env.CORS_ORIGIN || true,
  isProd: process.env.NODE_ENV === 'production',
};

if (config.isProd && config.jwtSecret === 'dev-only-change-me') {
  throw new Error('Set JWT_SECRET in production.');
}

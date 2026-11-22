import dns from 'node:dns';
import mongoose from 'mongoose';
import { config } from './config.js';

// Some networks (local DNS proxies, VPNs) don't answer the SRV lookups that
// mongodb+srv:// URLs need. Set DNS_SERVERS=1.1.1.1,8.8.8.8 to bypass them.
if (config.dnsServers.length) dns.setServers(config.dnsServers);

// Use the database named in the URI; fall back to MONGODB_DB ("sra")
// when the URI has no path, so Atlas URIs copied without "/sra" still work.
function hasDbName(uri) {
  const path = uri.replace(/^mongodb(\+srv)?:\/\/[^/]*/, '').split('?')[0];
  return path.replace(/^\//, '').length > 0;
}

export async function connectDb(uri = config.mongoUri) {
  mongoose.set('strictQuery', true);
  const opts = { serverSelectionTimeoutMS: 15000 };
  if (!hasDbName(uri)) opts.dbName = config.mongoDb;
  await mongoose.connect(uri, opts);
  return mongoose.connection;
}

export const disconnectDb = () => mongoose.disconnect();

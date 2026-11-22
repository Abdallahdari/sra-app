// Copies your local MongoDB to another one (e.g. MongoDB Atlas).
// Usage (local DB must be running: `npm run db`):
//   TARGET_URI="mongodb+srv://user:pass@cluster.xxx.mongodb.net" npm run copy:db
// Uses MONGODB_URI from .env as the target when TARGET_URI is not set.
//
// Full copy (default): every collection; documents with the same _id are replaced.
// Sample copy: PER_TYPE=2 tops up each content section to 2 items (newest first),
//   keeps what is already in the target, and copies other collections only when they are empty there.
import dns from 'node:dns';
import mongoose from 'mongoose';

const source = process.env.SOURCE_URI || 'mongodb://127.0.0.1:27017';
const target = process.env.TARGET_URI || process.env.MONGODB_URI;
const perType = Number(process.env.PER_TYPE) || 0;
if (!target || target === source) {
  console.error('Set TARGET_URI (or MONGODB_URI in .env) to your MongoDB Atlas connection string.');
  process.exit(1);
}
if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));

const { MongoClient } = mongoose.mongo;
const src = await MongoClient.connect(source);
const dst = await MongoClient.connect(target);
const srcDb = src.db(process.env.SOURCE_DB || process.env.MONGODB_DB || 'sra');
const dstDb = dst.db(process.env.TARGET_DB || process.env.MONGODB_DB || 'sra');

async function copyIndexes(name) {
  for (const idx of await srcDb.collection(name).indexes()) {
    if (idx.name === '_id_') continue;
    const { key, v, ns, ...opts } = idx;
    await dstDb.collection(name).createIndex(key, opts).catch((e) => console.warn(`  index ${idx.name}: ${e.message}`));
  }
}

async function topUpContents() {
  const from = srcDb.collection('contents');
  const to = dstDb.collection('contents');
  for (const type of await from.distinct('type')) {
    const have = await to.find({ type }, { projection: { _id: 1, slug: 1 } }).toArray();
    const need = perType - have.length;
    if (need <= 0) {
      console.log(`${type}: already has ${have.length}`);
      continue;
    }
    const docs = await from
      .find({
        type,
        published: { $ne: false },
        _id: { $nin: have.map((d) => d._id) },
        slug: { $nin: have.map((d) => d.slug).filter(Boolean) },
      })
      .sort({ featured: -1, date: -1, order: 1 })
      .limit(need)
      .toArray();
    if (docs.length) await to.insertMany(docs);
    console.log(`${type}: added ${docs.length} (now ${have.length + docs.length})`);
  }
  await copyIndexes('contents');
}

for (const { name } of await srcDb.listCollections({ type: 'collection' }).toArray()) {
  if (name.startsWith('system.')) continue;
  if (perType && name === 'contents') {
    await topUpContents();
    continue;
  }
  if (perType && (await dstDb.collection(name).estimatedDocumentCount()) > 0) {
    console.log(`${name}: kept existing`);
    continue;
  }
  const docs = await srcDb.collection(name).find().toArray();
  if (docs.length) {
    await dstDb.collection(name).bulkWrite(
      docs.map((d) => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } })),
    );
  }
  await copyIndexes(name);
  console.log(`${name}: ${docs.length} documents`);
}

await src.close();
await dst.close();
console.log('Done.');

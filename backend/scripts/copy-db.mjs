// Copies every collection from your local MongoDB to another one (e.g. MongoDB Atlas).
// Usage (local DB must be running: `npm run db`):
//   TARGET_URI="mongodb+srv://user:pass@cluster.xxx.mongodb.net/sra" npm run copy:db
// Existing documents in the target with the same _id are replaced.
import mongoose from 'mongoose';

const source = process.env.SOURCE_URI || 'mongodb://127.0.0.1:27017/sra';
const target = process.env.TARGET_URI;
if (!target) {
  console.error('Set TARGET_URI to your MongoDB Atlas connection string.');
  process.exit(1);
}

const { MongoClient } = mongoose.mongo;
const src = await MongoClient.connect(source);
const dst = await MongoClient.connect(target);
const srcDb = src.db(process.env.SOURCE_DB || 'sra');
const dstDb = dst.db(process.env.TARGET_DB || 'sra');

for (const { name } of await srcDb.listCollections({ type: 'collection' }).toArray()) {
  if (name.startsWith('system.')) continue;
  const docs = await srcDb.collection(name).find().toArray();
  if (docs.length) {
    await dstDb.collection(name).bulkWrite(
      docs.map((d) => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } })),
    );
  }
  for (const idx of await srcDb.collection(name).indexes()) {
    if (idx.name === '_id_') continue;
    const { key, v, ns, ...opts } = idx;
    await dstDb.collection(name).createIndex(key, opts).catch((e) => console.warn(`  index ${idx.name}: ${e.message}`));
  }
  console.log(`${name}: ${docs.length} documents`);
}

await src.close();
await dst.close();
console.log('Done.');

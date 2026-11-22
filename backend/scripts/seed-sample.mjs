// Put a small sample in the real database: ONE item per section + site settings.
// Runs the full sra.so import into a throwaway in-memory MongoDB, then copies
// the newest published item (with an image, when possible) of each type.
//
//   npm run seed:sample
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDb, disconnectDb } from '../src/db.js';
import { Content, Settings } from '../src/models.js';

const importScript = fileURLToPath(new URL('./import-wp.mjs', import.meta.url));

// SAMPLE_FROM=<mongodb uri> copies from an existing database (e.g. the local
// `npm run db` one) instead of re-importing sra.so, which is much faster.
let mem;
let memUri = process.env.SAMPLE_FROM;
if (memUri) {
  console.log(`1/3  Reading from ${memUri}`);
} else {
  console.log('1/3  Importing sra.so into a temporary in-memory database...');
  mem = await MongoMemoryServer.create();
  memUri = mem.getUri('sra-sample');
  await new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [importScript], {
      env: { ...process.env, MONGODB_URI: memUri, DNS_SERVERS: '' },
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`import exited with ${code}`))));
  });
}

console.log('2/3  Picking one item per section...');
const src = await mongoose.createConnection(memUri).asPromise();
const contents = src.collection('contents');
const types = await contents.distinct('type');
const picks = [];
for (const type of types.sort()) {
  const base = { type, published: true };
  const doc =
    (await contents.findOne({ ...base, image: { $ne: '' } }, { sort: { date: -1 } })) ||
    (await contents.findOne(base, { sort: { date: -1 } }));
  if (doc) picks.push(doc);
}
const settings = await src.collection('settings').find().toArray();
await src.close();
await mem?.stop();

console.log('3/3  Writing to the real database...');
await connectDb();
await Content.init();
for (const doc of picks) {
  const { _id, __v, ...rest } = doc;
  await Content.collection.updateOne({ wpKey: doc.wpKey }, { $set: rest, $setOnInsert: { _id } }, { upsert: true });
  console.log(`  ${doc.type.padEnd(11)} ${doc.title.slice(0, 70)}`);
}
for (const s of settings) {
  const { _id, __v, ...rest } = s;
  await Settings.collection.updateOne({ _id }, { $set: rest }, { upsert: true });
}
console.log(`Done: ${picks.length} items + ${settings.length} settings document(s) in "${mongoose.connection.db.databaseName}".`);
await disconnectDb();

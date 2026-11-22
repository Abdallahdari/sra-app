import { buildApp } from './app.js';
import { connectDb } from './db.js';
import { config } from './config.js';

await connectDb();
const app = await buildApp();
await app.listen({ port: config.port, host: config.host });

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    await app.close();
    process.exit(0);
  });
}

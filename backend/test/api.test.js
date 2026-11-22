// API tests against an isolated in-memory MongoDB (never touches the dev database).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import sharp from 'sharp';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let mongo, app, token, uploadsDir;

before(async () => {
  uploadsDir = mkdtempSync(join(tmpdir(), 'sra-uploads-'));
  process.env.UPLOADS_DIR = uploadsDir;
  mongo = await MongoMemoryServer.create();
  const { connectDb } = await import('../src/db.js');
  const { buildApp } = await import('../src/app.js');
  const { User } = await import('../src/models.js');
  const { hashPassword } = await import('../src/auth.js');
  await connectDb(mongo.getUri('sra-test'));
  await User.create({ email: 'admin@test.so', name: 'Tester', passwordHash: await hashPassword('correct-horse-1') });
  app = await buildApp({ logger: false });
});

after(async () => {
  await app?.close();
  const { disconnectDb } = await import('../src/db.js');
  await disconnectDb();
  await mongo?.stop();
  rmSync(uploadsDir, { recursive: true, force: true });
});

const inject = (opts) => app.inject({ ...opts, headers: { ...(opts.headers || {}), ...(token ? { authorization: `Bearer ${token}` } : {}) } });

test('rejects wrong password', async () => {
  const r = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'admin@test.so', password: 'nope' } });
  assert.equal(r.statusCode, 401);
});

test('admin routes require a token', async () => {
  const r = await app.inject({ method: 'GET', url: '/api/admin/stats' });
  assert.equal(r.statusCode, 401);
  const bad = await app.inject({ method: 'GET', url: '/api/admin/stats', headers: { authorization: 'Bearer forged.token.here' } });
  assert.equal(bad.statusCode, 401);
});

test('logs in and returns a token', async () => {
  const r = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'ADMIN@test.so ', password: 'correct-horse-1' } });
  assert.equal(r.statusCode, 200);
  token = r.json().token;
  assert.ok(token);
  assert.equal(r.json().user.email, 'admin@test.so');
  assert.equal(r.json().user.passwordHash, undefined);
});

test('validates required fields per type', async () => {
  const r = await inject({ method: 'POST', url: '/api/admin/content', payload: { type: 'event', title: 'No date' , date: null } });
  assert.equal(r.statusCode, 400);
  assert.match(r.json().error, /Event date is required/);
  const unknown = await inject({ method: 'POST', url: '/api/admin/content', payload: { type: 'hack', title: 'x' } });
  assert.equal(unknown.statusCode, 400);
});

let researchId;
test('admin creates research, public API lists it', async () => {
  const r = await inject({
    method: 'POST',
    url: '/api/admin/content',
    payload: {
      type: 'research',
      title: 'Mobile money use in Baidoa',
      category: 'Economy',
      summary: 'Survey of 400 households.',
      meta: { kind: 'Study', year: 2026, authors: 'SRA team' },
      source: 'wp', // must be ignored
      featured: true,
    },
  });
  assert.equal(r.statusCode, 201);
  const doc = r.json();
  researchId = doc._id;
  assert.equal(doc.slug, 'mobile-money-use-in-baidoa');
  assert.equal(doc.source, 'admin');

  const list = await app.inject({ method: 'GET', url: '/api/content?type=research&q=baidoa' });
  assert.equal(list.statusCode, 200);
  assert.equal(list.json().total, 1);
  assert.equal(list.json().items[0].body, undefined, 'list responses omit body');

  const home = await app.inject({ method: 'GET', url: '/api/home' });
  assert.equal(home.json().research.length, 1);
});

test('drafts are hidden from the public API', async () => {
  const r = await inject({ method: 'PUT', url: `/api/admin/content/${researchId}`, payload: { published: false } });
  assert.equal(r.statusCode, 200);
  const pub = await app.inject({ method: 'GET', url: `/api/content/${researchId}` });
  assert.equal(pub.statusCode, 404);
  const list = await app.inject({ method: 'GET', url: '/api/content?type=research' });
  assert.equal(list.json().total, 0);
  const admin = await inject({ method: 'GET', url: '/api/admin/content?type=research' });
  assert.equal(admin.json().total, 1);
});

test('meta updates merge instead of replacing', async () => {
  const r = await inject({ method: 'PUT', url: `/api/admin/content/${researchId}`, payload: { meta: { journal: 'HAJOS' } } });
  assert.equal(r.json().meta.authors, 'SRA team');
  assert.equal(r.json().meta.journal, 'HAJOS');
});

test('duplicate titles get unique slugs', async () => {
  const a = await inject({ method: 'POST', url: '/api/admin/content', payload: { type: 'story', title: 'Same title' } });
  const b = await inject({ method: 'POST', url: '/api/admin/content', payload: { type: 'story', title: 'Same title' } });
  assert.equal(a.json().slug, 'same-title');
  assert.equal(b.json().slug, 'same-title-2');
});

test('search input is treated as text, not regex', async () => {
  const r = await app.inject({ method: 'GET', url: '/api/content?q=' + encodeURIComponent('(.*') });
  assert.equal(r.statusCode, 200);
});

test('uploads an image and converts it to webp', async () => {
  const png = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: '#1B0E84' } }).png().toBuffer();
  const boundary = '----sra';
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="a.png"\r\nContent-Type: image/png\r\n\r\n`),
    png,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const r = await inject({ method: 'POST', url: '/api/admin/upload', payload: body, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } });
  assert.equal(r.statusCode, 200);
  assert.match(r.json().url, /^\/uploads\/admin\/.+\.webp$/);
  const file = await app.inject({ method: 'GET', url: r.json().url });
  assert.equal(file.statusCode, 200);
  const meta = await sharp(file.rawPayload).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(meta.width, 1200, 'resized to max width');
});

test('rejects non-image uploads', async () => {
  const boundary = '----sra';
  const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="x.html"\r\nContent-Type: text/html\r\n\r\n<script>alert(1)</script>\r\n--${boundary}--\r\n`;
  const r = await inject({ method: 'POST', url: '/api/admin/upload', payload: body, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } });
  assert.equal(r.statusCode, 400);
});

test('settings update and delete', async () => {
  const s = await inject({ method: 'PUT', url: '/api/admin/settings', payload: { announcement: 'Hello', evil: 'ignored' } });
  assert.equal(s.json().announcement, 'Hello');
  assert.equal(s.json().evil, undefined);
  const d = await inject({ method: 'DELETE', url: `/api/admin/content/${researchId}` });
  assert.equal(d.statusCode, 200);
  const again = await inject({ method: 'DELETE', url: `/api/admin/content/${researchId}` });
  assert.equal(again.statusCode, 404);
});

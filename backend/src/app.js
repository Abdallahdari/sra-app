import Fastify from 'fastify';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import mongoose from 'mongoose';
import { mkdirSync } from 'node:fs';
import { config } from './config.js';
import { Content, Settings, User } from './models.js';
import { TYPES, TYPE_NAMES, WRITABLE, typeDef } from './types.js';
import { requireAdmin, login, signToken, publicUser, hashPassword } from './auth.js';
import { storeImage } from './images.js';

// Fields returned in lists. `body` and `gallery` are only sent on detail requests,
// which keeps list payloads small and screens fast.
const LIST_FIELDS = 'type title slug summary image date category link videoUrl meta featured published order';

const isId = (v) => mongoose.isValidObjectId(v);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function sortFor(type) {
  if (type === 'service' || type === 'partner') return { order: 1, date: -1 };
  if (type === 'researcher') return { order: 1, title: 1 };
  if (type === 'episode') return { 'meta.number': -1, date: -1 };
  return { date: -1, _id: -1 };
}

/** Pick allowed fields from a request body and validate them against the type definition. */
function cleanInput(type, body, { partial = false } = {}) {
  const def = typeDef(type);
  const out = {};
  for (const k of WRITABLE) if (body[k] !== undefined) out[k] = body[k];
  const errors = [];
  if (!partial || out.title !== undefined) {
    if (!String(out.title || '').trim()) errors.push('Title is required');
  }
  for (const f of def.fields) {
    if (!f.required || partial) continue;
    const v = f.key.startsWith('meta.') ? out.meta?.[f.key.slice(5)] : out[f.key];
    if (v === undefined || v === null || v === '') errors.push(`${f.label} is required`);
  }
  if (out.gallery && !Array.isArray(out.gallery)) errors.push('Gallery must be a list');
  if (out.meta && (typeof out.meta !== 'object' || Array.isArray(out.meta))) errors.push('Invalid meta');
  if (out.date !== undefined && out.date !== null && Number.isNaN(new Date(out.date).getTime())) errors.push('Invalid date');
  return { data: out, errors };
}

export async function buildApp({ logger = !config.isProd ? { level: 'info' } : true } = {}) {
  const app = Fastify({ logger, trustProxy: true, bodyLimit: 2 * 1024 * 1024 });

  await app.register(cors, { origin: config.corsOrigin });
  await app.register(compress, { global: true, threshold: 1024 });
  await app.register(rateLimit, { global: false });
  await app.register(multipart, { limits: { fileSize: 12 * 1024 * 1024, files: 1 } });

  mkdirSync(config.uploadsDir, { recursive: true });
  await app.register(fastifyStatic, {
    root: config.uploadsDir,
    prefix: '/uploads/',
    immutable: true,
    maxAge: '365d', // file names contain a content hash, so they never change
  });

  // Short shared cache on public reads; the app also caches locally.
  const publicCache = (reply) => reply.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=600');

  app.get('/api/health', async () => ({ ok: true, db: mongoose.connection.readyState === 1 }));

  app.get('/api/meta/types', async (req, reply) => {
    publicCache(reply);
    return { types: TYPES };
  });

  app.get('/api/settings', async (req, reply) => {
    publicCache(reply);
    return (await Settings.findById('site').lean()) || {};
  });

  // One request powers the whole home screen.
  app.get('/api/home', async (req, reply) => {
    const pub = { published: true };
    const q = (type, limit, extra = {}) =>
      Content.find({ ...pub, type, ...extra }).select(LIST_FIELDS).sort(sortFor(type)).limit(limit).lean();
    const [settings, stories, insights, projects, events, episodes, videos, research, partners, services, fuel] = await Promise.all([
      Settings.findById('site').lean(),
      q('story', 6),
      q('insight', 8),
      q('project', 6),
      q('event', 4),
      q('episode', 6),
      q('video', 6),
      q('research', 6),
      q('partner', 20),
      q('service', 12),
      q('fuel', 10),
    ]);
    publicCache(reply);
    return { settings: settings || {}, stories, insights, projects, events, episodes, videos, research, partners, services, fuel };
  });

  app.get('/api/content', async (req, reply) => {
    const { type, category, q, featured } = req.query;
    if (type && !TYPE_NAMES.includes(type)) return reply.code(400).send({ error: 'Unknown type' });
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const filter = { published: true };
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (featured === 'true') filter.featured = true;
    if (q) {
      const re = new RegExp(escapeRe(String(q).slice(0, 80)), 'i');
      filter.$or = [{ title: re }, { summary: re }, { category: re }, { 'meta.guest': re }, { 'meta.authors': re }, { 'meta.client': re }];
    }
    const [items, total] = await Promise.all([
      Content.find(filter).select(LIST_FIELDS).sort(sortFor(type)).skip((page - 1) * limit).limit(limit).lean(),
      Content.countDocuments(filter),
    ]);
    publicCache(reply);
    return { items, total, page, pages: Math.ceil(total / limit), hasMore: page * limit < total };
  });

  app.get('/api/categories', async (req, reply) => {
    const { type } = req.query;
    if (!TYPE_NAMES.includes(type)) return reply.code(400).send({ error: 'Unknown type' });
    const rows = await Content.aggregate([
      { $match: { type, published: true, category: { $ne: '' } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    publicCache(reply);
    return rows.map((r) => ({ name: r._id, count: r.count }));
  });

  app.get('/api/content/:id', async (req, reply) => {
    const { id } = req.params;
    const filter = isId(id) ? { _id: id } : { slug: id, ...(req.query.type ? { type: req.query.type } : {}) };
    const item = await Content.findOne({ ...filter, published: true }).lean();
    if (!item) return reply.code(404).send({ error: 'Not found' });
    publicCache(reply);
    return item;
  });

  // ---------------- Auth ----------------
  app.post('/api/auth/login', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (req, reply) => {
    const { email, password } = req.body || {};
    const user = await login(email, password);
    if (!user) return reply.code(401).send({ error: 'Wrong email or password' });
    return { token: signToken(user), user: publicUser(user) };
  });

  // ---------------- Admin (protected) ----------------
  app.register(async (admin) => {
    admin.addHook('preHandler', requireAdmin);

    admin.get('/api/auth/me', async (req) => ({ user: publicUser(req.user) }));

    admin.post('/api/auth/password', async (req, reply) => {
      const { current, next } = req.body || {};
      if (!next || String(next).length < 8) return reply.code(400).send({ error: 'New password must be at least 8 characters' });
      const ok = await login(req.user.email, current);
      if (!ok) return reply.code(400).send({ error: 'Current password is wrong' });
      await User.updateOne({ _id: req.user._id }, { passwordHash: await hashPassword(next) });
      return { ok: true };
    });

    admin.get('/api/admin/stats', async () => {
      const rows = await Content.aggregate([
        { $group: { _id: { type: '$type', published: '$published' }, n: { $sum: 1 } } },
      ]);
      const byType = Object.fromEntries(TYPE_NAMES.map((t) => [t, { total: 0, drafts: 0 }]));
      for (const r of rows) {
        byType[r._id.type].total += r.n;
        if (!r._id.published) byType[r._id.type].drafts += r.n;
      }
      const recent = await Content.find().select('type title updatedAt published image').sort({ updatedAt: -1 }).limit(8).lean();
      return { byType, recent, total: rows.reduce((s, r) => s + r.n, 0) };
    });

    admin.get('/api/admin/content', async (req, reply) => {
      const { type, q } = req.query;
      if (!TYPE_NAMES.includes(type)) return reply.code(400).send({ error: 'Unknown type' });
      const limit = Math.min(Number(req.query.limit) || 30, 100);
      const page = Math.max(Number(req.query.page) || 1, 1);
      const filter = { type };
      if (q) filter.title = new RegExp(escapeRe(String(q).slice(0, 80)), 'i');
      const [items, total] = await Promise.all([
        Content.find(filter).select(`${LIST_FIELDS} updatedAt source`).sort(sortFor(type)).skip((page - 1) * limit).limit(limit).lean(),
        Content.countDocuments(filter),
      ]);
      return { items, total, page, hasMore: page * limit < total };
    });

    admin.get('/api/admin/content/:id', async (req, reply) => {
      if (!isId(req.params.id)) return reply.code(400).send({ error: 'Bad id' });
      const item = await Content.findById(req.params.id).lean();
      return item || reply.code(404).send({ error: 'Not found' });
    });

    admin.post('/api/admin/content', async (req, reply) => {
      const { type } = req.body || {};
      if (!TYPE_NAMES.includes(type)) return reply.code(400).send({ error: 'Unknown type' });
      const { data, errors } = cleanInput(type, req.body);
      if (errors.length) return reply.code(400).send({ error: errors.join('. ') });
      const doc = await Content.create({ ...data, type, source: 'admin' });
      return reply.code(201).send(doc.toObject());
    });

    admin.put('/api/admin/content/:id', async (req, reply) => {
      if (!isId(req.params.id)) return reply.code(400).send({ error: 'Bad id' });
      const doc = await Content.findById(req.params.id);
      if (!doc) return reply.code(404).send({ error: 'Not found' });
      const { data, errors } = cleanInput(doc.type, req.body || {}, { partial: true });
      if (errors.length) return reply.code(400).send({ error: errors.join('. ') });
      if (data.meta) data.meta = { ...(doc.meta || {}), ...data.meta };
      doc.set(data);
      if (data.title && doc.source === 'admin') doc.slug = '';
      await doc.save();
      return doc.toObject();
    });

    admin.delete('/api/admin/content/:id', async (req, reply) => {
      if (!isId(req.params.id)) return reply.code(400).send({ error: 'Bad id' });
      const r = await Content.deleteOne({ _id: req.params.id });
      return r.deletedCount ? { ok: true } : reply.code(404).send({ error: 'Not found' });
    });

    admin.put('/api/admin/settings', async (req) => {
      const allowed = ['hero', 'stats', 'regions', 'contact', 'social', 'about', 'announcement'];
      const update = {};
      for (const k of allowed) if (req.body?.[k] !== undefined) update[k] = req.body[k];
      return Settings.findByIdAndUpdate('site', { $set: update }, { new: true, upsert: true }).lean();
    });

    admin.post('/api/admin/upload', async (req, reply) => {
      const file = await req.file();
      if (!file) return reply.code(400).send({ error: 'No file' });
      if (!/^image\//.test(file.mimetype)) return reply.code(400).send({ error: 'Only images can be uploaded' });
      const buf = await file.toBuffer();
      try {
        const url = await storeImage(buf, { folder: 'admin' });
        return { url };
      } catch {
        return reply.code(400).send({ error: 'Could not read that image' });
      }
    });
  });

  app.setErrorHandler((err, req, reply) => {
    if (err.code === 11000) return reply.code(409).send({ error: 'An item with that title already exists' });
    if (err.validation || err.statusCode === 400) return reply.code(400).send({ error: err.message });
    if (err.statusCode === 429) return reply.code(429).send({ error: 'Too many attempts, try again later' });
    if (err.statusCode === 413 || err.code === 'FST_REQ_FILE_TOO_LARGE') return reply.code(413).send({ error: 'File is too large' });
    req.log.error(err);
    return reply.code(500).send({ error: 'Something went wrong' });
  });

  return app;
}

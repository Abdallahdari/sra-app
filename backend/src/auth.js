import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { User } from './models.js';

export const hashPassword = (pw) => bcrypt.hash(pw, 12);
const dummyHash = bcrypt.hash('not-a-real-password', 12);

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, config.jwtSecret, { expiresIn: config.jwtTtl });
}

/** Fastify preHandler: requires a valid Bearer token for an existing admin/editor. */
export async function requireAdmin(req, reply) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return reply.code(401).send({ error: 'Not signed in' });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(payload.sub).lean();
    if (!user) return reply.code(401).send({ error: 'Account not found' });
    req.user = user;
  } catch {
    return reply.code(401).send({ error: 'Session expired, please sign in again' });
  }
}

export async function login(email, password) {
  const user = await User.findOne({ email: String(email || '').toLowerCase().trim() });
  // Compare against a dummy hash when the user is missing to keep timing similar.
  const ok = await bcrypt.compare(String(password || ''), user?.passwordHash || (await dummyHash));
  if (!user || !ok) return null;
  user.lastLoginAt = new Date();
  await user.save();
  return user;
}

export const publicUser = (u) => ({ id: String(u._id), email: u.email, name: u.name, role: u.role });

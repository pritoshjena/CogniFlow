import {Router} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {z} from 'zod';
import {config} from './config.js';
import {User} from './models.js';
import {HttpError, h, nextIds, sUser} from './util.js';

export const auth = Router();
const WEEK = 7 * 24 * 3600 * 1000;

const setCookie = (res, uid) => res.cookie(config.cookie, jwt.sign({uid}, config.jwtSecret, {expiresIn: '7d'}), {
  httpOnly: true, sameSite: 'lax', secure: config.prod, maxAge: WEEK
});

/** Middleware: requires a valid login cookie and loads req.user. */
export async function requireAuth(req, _res, next) {
  try {
    let uid;
    try { uid = jwt.verify(req.cookies?.[config.cookie], config.jwtSecret).uid; } catch { throw new HttpError(401, 'Please sign in.'); }
    const user = await User.findOne({id: uid}).lean();
    if (!user) throw new HttpError(401, 'Please sign in.');
    req.user = user; req.uid = user.id;
    next();
  } catch (e) { next(e); }
}

// Tiny in-memory throttle against password guessing / signup spam. Use a shared store if you run several instances.
const hits = new Map();
function throttle(key, max, windowMs) {
  const now = Date.now(), rec = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (rec.length >= max) throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
  rec.push(now); hits.set(key, rec);
}

const skills = z.record(z.string().trim().min(1).max(40), z.number().int().min(1).max(3)).default({});
const registerBody = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(100),
  skills,
  cap: z.number().int().min(1).max(80).default(20)
});

auth.post('/register', h(async (req, res) => {
  throttle('reg:' + req.ip, 20, 3600 * 1000);
  const b = registerBody.parse(req.body);
  if (Object.keys(b.skills).length > 20) throw new HttpError(400, 'Too many skills.');
  if (await User.exists({email: b.email})) throw new HttpError(409, 'An account with this email already exists.');
  const [id] = await nextIds('user');
  const user = await User.create({id, name: b.name, email: b.email, passwordHash: await bcrypt.hash(b.password, 10), cap: b.cap,
    skills: Object.entries(b.skills).map(([name, level]) => ({name, level}))});
  setCookie(res, user.id);
  res.status(201).json({user: sUser(user, true)});
}));

const DUMMY = bcrypt.hashSync('not-a-real-password', 10);
auth.post('/login', h(async (req, res) => {
  const b = z.object({email: z.string().trim().toLowerCase().max(200), password: z.string().max(100)}).parse(req.body);
  throttle('login:' + req.ip + ':' + b.email, 10, 15 * 60 * 1000);
  const user = await User.findOne({email: b.email}).lean();
  const ok = await bcrypt.compare(b.password, user ? user.passwordHash : DUMMY);
  if (!user || !ok) throw new HttpError(401, 'Incorrect email or password.');
  setCookie(res, user.id);
  res.json({user: sUser(user, true)});
}));

auth.post('/logout', (_req, res) => { res.clearCookie(config.cookie); res.json({ok: true}); });
auth.get('/me', requireAuth, (req, res) => res.json({user: sUser(req.user, true)}));

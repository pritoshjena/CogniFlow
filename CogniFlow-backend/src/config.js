import 'dotenv/config';
import crypto from 'node:crypto';

const prod = process.env.NODE_ENV === 'production';
let secret = process.env.JWT_SECRET;
if (!secret) {
  if (prod) throw new Error('JWT_SECRET must be set in production.');
  secret = crypto.randomBytes(32).toString('hex');
  console.warn('[config] JWT_SECRET not set: using a temporary one. Logins reset on every restart.');
}

export const config = {
  prod,
  port: +process.env.PORT || 4000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cogniflow',
  jwtSecret: secret,
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
  aiUrl: (process.env.AI_SERVICE_URL || 'http://localhost:8787').replace(/\/+$/, ''),
  cookie: 'cf_token'
};

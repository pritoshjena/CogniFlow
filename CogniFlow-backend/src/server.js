import http from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import {ZodError} from 'zod';
import {config} from './config.js';
import {auth} from './auth.js';
import {api} from './api.js';
import {ai} from './ai.js';
import {attachRealtime} from './realtime.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({origin: config.clientOrigins, credentials: true}));
  app.use(express.json({limit: '200kb'}));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ok: true, db: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState]}));
  app.use('/api/auth', auth);
  app.use('/api/ai', ai);
  app.use('/api', api);
  app.use('/api', (_req, res) => res.status(404).json({error: 'Not found.'}));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof ZodError) return res.status(400).json({error: 'Invalid request.', details: err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)});
    if (err?.status && err.status < 500) return res.status(err.status).json({error: err.message});
    if (err?.status) return res.status(err.status).json({error: err.message});
    if (err?.type === 'entity.parse.failed') return res.status(400).json({error: 'Invalid JSON.'});
    console.error('[error]', err);
    res.status(500).json({error: 'Something went wrong on the server.'});
  });
  return app;
}

export async function start() {
  await mongoose.connect(config.mongoUri, {serverSelectionTimeoutMS: 8000});
  console.log('[db] connected');
  const server = http.createServer(createApp());
  attachRealtime(server);
  server.listen(config.port, () => console.log(`[api] listening on http://localhost:${config.port}`));
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch((e) => { console.error('Failed to start:', e.message); process.exit(1); });
}

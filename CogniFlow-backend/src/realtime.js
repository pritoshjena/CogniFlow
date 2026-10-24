// Socket.IO: each browser joins a room per project it belongs to plus a private user room.
// Every write publishes a small "patch" ({projects, tasks, log, prefs, pms, removed}) that clients merge by id.
import {Server} from 'socket.io';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import {config} from './config.js';
import {Project} from './models.js';

let io = null;

async function projectIdsFor(uid) {
  const ps = await Project.find({$or: [{leader: uid}, {team: uid}]}, {id: 1}).lean();
  return ps.map((p) => p.id);
}
async function join(socket) {
  const uid = socket.data.uid;
  socket.join('user:' + uid);
  for (const id of await projectIdsFor(uid)) socket.join('project:' + id);
}

export function attachRealtime(httpServer) {
  io = new Server(httpServer, {cors: {origin: config.clientOrigins, credentials: true}});
  io.use((socket, next) => {
    try {
      const token = cookie.parse(socket.handshake.headers.cookie || '')[config.cookie];
      socket.data.uid = jwt.verify(token, config.jwtSecret).uid;
      next();
    } catch { next(new Error('unauthorized')); }
  });
  io.on('connection', (socket) => { join(socket).catch((e) => console.error('[socket] join failed', e.message)); });
  return io;
}

export const emitProject = (projectId, patch) => { if (io) io.to('project:' + projectId).emit('patch', patch); };
export const emitUsers = (ids, patch) => { if (io) for (const id of new Set(ids)) io.to('user:' + id).emit('patch', patch); };

/** After membership changes: re-join rooms for that user's open sockets and tell them to reload their data. */
export async function refreshUser(uid) {
  if (!io) return;
  const sockets = await io.in('user:' + uid).fetchSockets();
  const ids = await projectIdsFor(uid);
  for (const s of sockets) {
    for (const room of s.rooms) if (room.startsWith('project:')) s.leave(room);
    for (const id of ids) s.join('project:' + id);
    s.emit('resync');
  }
}

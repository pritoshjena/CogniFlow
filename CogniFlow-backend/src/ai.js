// Server-side bridge to the Python AI recommender. The browser only ever talks to this API;
// the recommender's address (and its Gemini key) stay private on the server side.
import {Router} from 'express';
import {z} from 'zod';
import {config} from './config.js';
import {User, Task} from './models.js';
import {requireAuth} from './auth.js';
import {HttpError, h, getProject, needLeader} from './util.js';

export const ai = Router();
ai.use(requireAuth);

const LEVEL_OUT = {1: 1, 2: 2.5, 3: 4}; // CogniFlow 1-3 -> recommender 0-4 scale
const PRIO_OUT = {High: 'high', Medium: 'medium', Low: 'low'};
const isoDate = (d = new Date()) => d.toISOString().slice(0, 10);

async function call(path, body, timeoutMs) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(config.aiUrl + path, {method: body ? 'POST' : 'GET', headers: body ? {'Content-Type': 'application/json'} : undefined, body: body ? JSON.stringify(body) : undefined, signal: ctl.signal});
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const d = data?.detail ?? data;
      const msg = Array.isArray(d) ? d.map((x) => `${(x.loc || []).slice(1).join('.')}: ${x.msg}`).join('; ') : d?.message || d?.error || `status ${res.status}`;
      throw new HttpError(502, `AI service error: ${msg}`);
    }
    return data;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    if (e.name === 'AbortError') throw new HttpError(504, 'The AI service took too long to respond.');
    throw new HttpError(503, 'The AI service is not reachable. Start the Python recommender and check AI_SERVICE_URL.');
  } finally { clearTimeout(timer); }
}

async function memberPayloads(users) {
  const open = await Task.find({assignee: {$in: users.map((u) => u.id)}, status: {$ne: 'done'}}, {assignee: 1, effort: 1}).lean();
  const load = new Map();
  open.forEach((t) => load.set(t.assignee, (load.get(t.assignee) || 0) + t.effort));
  return users.map((u) => {
    const weekly = Math.max(1, u.cap || 20);
    return {id: String(u.id), name: u.name, role: u.id === users.leaderId ? 'Team leader' : 'Member',
      skills: (u.skills || []).map((s) => ({name: s.name, level: LEVEL_OUT[s.level] || 2})),
      weeklyCapacityHours: weekly, hoursPerDay: Math.min(12, Math.round(weekly / 5 * 10) / 10), currentLoadHours: load.get(u.id) || 0};
  });
}

async function projectPayload(p, extra) {
  let needs = p.needs || [];
  if (!needs.length) needs = [...new Set((await Task.find({project: p.id}, {skills: 1}).lean()).flatMap((t) => t.skills))];
  const parts = [(p.desc || '').trim() || `${p.name} project.`];
  if (needs.length) parts.push(`Skills this project needs: ${needs.join(', ')}.`);
  if (p.milestones.length) parts.push(`Existing milestones: ${p.milestones.map((m) => m.name).join(', ')}.`);
  let d = parts.join(' ');
  if (d.length < 10) d = (d + ' CogniFlow project.').padEnd(10, '.');
  return {title: p.name.slice(0, 180), description: d.slice(0, 8000), workingDaysPerWeek: 5, hoursPerWorkday: 6, ...extra};
}

ai.get('/health', h(async (_req, res) => res.json(await call('/health', null, 6000))));

/** Draft tasks, owners, milestones and a timeline for a project. Leader only. */
ai.post('/projects/:id/plan', h(async (req, res) => {
  const b = z.object({endISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), maxTasks: z.number().int().min(4).max(12).default(8), everyone: z.boolean().default(false)}).parse(req.body);
  const p = await getProject(req.params.id);
  needLeader(p, req.uid, 'generate an AI plan');
  const ids = b.everyone ? null : [...new Set([p.leader, ...p.team])];
  const users = await User.find(ids ? {id: {$in: ids}} : {}).limit(60).lean();
  users.leaderId = p.leader;
  const body = {project: await projectPayload(p, {startDate: isoDate(), targetDeadline: b.endISO}), teamMembers: await memberPayloads(users),
    options: {maxTasks: b.maxTasks, contingencyPercent: 15, includeUnassigned: false}};
  const result = await call('/api/plan', body, 90000);
  res.json({...result, _pool: users.map((u) => u.id)});
}));

/** Owner recommendations for the project's unassigned open tasks. Leader only. */
ai.post('/projects/:id/assignments', h(async (req, res) => {
  const p = await getProject(req.params.id);
  needLeader(p, req.uid, 'ask for AI assignments');
  const tasks = await Task.find({project: p.id, assignee: null, status: {$ne: 'done'}}).lean();
  if (!tasks.length) return res.json({ok: true, recommendations: []});
  const names = new Map(p.milestones.map((m) => [m.id, m.name]));
  const users = await User.find({id: {$in: [...new Set([p.leader, ...p.team])]}}).lean();
  users.leaderId = p.leader;
  const body = {project: await projectPayload(p, {startDate: isoDate()}), teamMembers: await memberPayloads(users), options: {includeUnassigned: true},
    tasks: tasks.slice(0, 100).map((t) => ({id: String(t.id), title: t.title, description: '', requiredSkills: t.skills, estimateHours: Math.min(240, Math.max(1, t.effort)),
      priority: PRIO_OUT[t.prio] || 'medium', dependsOn: t.deps.map(String), milestoneName: names.get(t.ms) || 'Delivery'}))};
  res.json(await call('/api/assignments/recommend', body, 30000));
}));

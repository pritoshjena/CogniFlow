import {Counter} from './models.js';

export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
export const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

/** Reserve n sequential numeric ids for a collection (atomic, safe with several server instances). */
export async function nextIds(name, n = 1) {
  const c = await Counter.findOneAndUpdate({_id: name}, {$inc: {seq: n}}, {upsert: true, new: true});
  return Array.from({length: n}, (_, i) => c.seq - n + 1 + i);
}

/* Serializers: DB documents -> the object shapes the React store uses. */
export const skillsObj = (arr) => Object.fromEntries((arr || []).map((s) => [s.name, s.level]));
export const sUser = (u, self) => ({id: u.id, name: u.name, role: u.role, cap: u.cap, skills: skillsObj(u.skills), ...(self ? {email: u.email} : {})});
export const sProject = (p) => ({id: p.id, name: p.name, desc: p.desc, leader: p.leader, start: p.start, team: [...p.team], needs: [...p.needs], milestones: p.milestones.map((m) => ({id: m.id, name: m.name, due: m.due}))});
export const sTask = (t) => ({id: t.id, project: t.project ?? null, title: t.title, ms: t.ms ?? null, skills: [...t.skills], prio: t.prio, effort: t.effort, due: t.due, status: t.status, assignee: t.assignee ?? null, deps: [...t.deps], interest: [...t.interest], ...(t.personal ? {personal: true, owner: t.owner} : {})});
export const sLog = (l) => ({id: String(l._id), u: l.u, type: l.type, t: l.t ?? null, pts: l.pts, ts: l.ts});
export const sPref = (p) => ({u: p.u, t: p.t, stance: p.stance ?? null, note: p.note || '', target: p.target ?? null});
export const sPm = (m) => ({id: m.id, owner: m.owner, name: m.name, due: m.due});

export const isLeader = (p, uid) => p.leader === uid;
export const onTeam = (p, uid) => p.leader === uid || p.team.includes(uid);

/** True if adding these dependency links to the task set creates a cycle. */
export function hasCycle(tasks) {
  const deps = new Map(tasks.map((t) => [t.id, t.deps || []]));
  const state = new Map();
  const visit = (id) => {
    if (state.get(id) === 1) return true;
    if (state.get(id) === 2) return false;
    state.set(id, 1);
    for (const d of deps.get(id) || []) if (deps.has(d) && visit(d)) return true;
    state.set(id, 2);
    return false;
  };
  return [...deps.keys()].some(visit);
}

/* Loaders that turn missing records into 404s. */
import {Project, Task} from './models.js';
export async function getProject(id) {
  const p = await Project.findOne({id: Number(id)});
  if (!p) throw new HttpError(404, 'Project not found.');
  return p;
}
export async function getTask(id) {
  const t = await Task.findOne({id: Number(id)});
  if (!t) throw new HttpError(404, 'Task not found.');
  return t;
}
export function needLeader(p, uid, what = 'do this') {
  if (p.leader !== uid) throw new HttpError(403, `Only the team leader can ${what}.`);
}
export function needMember(p, uid) {
  if (!onTeam(p, uid)) throw new HttpError(403, 'You are not on this project.');
}

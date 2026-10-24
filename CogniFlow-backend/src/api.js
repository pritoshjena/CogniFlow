import {Router} from 'express';
import {z} from 'zod';
import {User, Project, Task, Pref, Log, Pm} from './models.js';
import {requireAuth} from './auth.js';
import {emitProject, emitUsers, refreshUser} from './realtime.js';
import {HttpError, h, nextIds, sUser, sProject, sTask, sLog, sPref, sPm, onTeam, hasCycle, getProject, getTask, needLeader, needMember} from './util.js';

export const api = Router();
api.use(requireAuth);

const DAY = 86400000;
const ts = z.number().int().min(0).max(4102444800000); // epoch ms
const prio = z.enum(['High', 'Medium', 'Low']);
const logRow = (u, type, t, pts) => ({u, type, t: t ? t.id : null, pts, ts: Date.now()});
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const publishProject = (pid, patch) => { emitProject(pid, patch); return {patch}; };

/* ---------- initial load ---------- */
async function bootstrap(uid) {
  const [users, projects, pms] = await Promise.all([
    User.find().lean(), Project.find({$or: [{leader: uid}, {team: uid}]}).lean(), Pm.find({owner: uid}).lean()]);
  const pids = projects.map((p) => p.id), led = projects.filter((p) => p.leader === uid).map((p) => p.id);
  const tasks = await Task.find({$or: [{project: {$in: pids}}, {personal: true, owner: uid}]}).lean();
  const projTaskIds = tasks.filter((t) => t.project != null).map((t) => t.id);
  const ledTaskIds = tasks.filter((t) => led.includes(t.project)).map((t) => t.id);
  const [prefs, log] = await Promise.all([
    Pref.find({$or: [{u: uid}, {t: {$in: ledTaskIds}}]}).lean(), Log.find({t: {$in: projTaskIds}}).sort({ts: 1}).lean()]);
  return {me: uid, users: users.map((u) => sUser(u, u.id === uid)), projects: projects.map(sProject), tasks: tasks.map(sTask),
    prefs: prefs.map(sPref), log: log.map(sLog), pms: pms.map(sPm)};
}
api.get('/bootstrap', h(async (req, res) => res.json(await bootstrap(req.uid))));

/* ---------- projects ---------- */
const msRow = z.object({name: z.string().trim().min(1).max(100), due: ts});
api.post('/projects', h(async (req, res) => {
  const b = z.object({name: z.string().trim().min(1).max(120), desc: z.string().trim().max(2000).default(''),
    needs: z.array(z.string().max(40)).max(30).default([]), milestones: z.array(msRow).min(1).max(30), start: ts.optional()}).parse(req.body);
  const [id] = await nextIds('project');
  const mids = await nextIds('ms', b.milestones.length);
  const milestones = b.milestones.map((m, i) => ({id: mids[i], name: m.name, due: m.due})).sort((a, c) => a.due - c.due);
  const p = await Project.create({id, name: b.name, desc: b.desc, leader: req.uid, start: b.start ?? startOfToday(), team: [req.uid], needs: b.needs, milestones});
  await refreshUser(req.uid);
  res.status(201).json({patch: {projects: [sProject(p)]}});
}));

api.delete('/projects/:id', h(async (req, res) => {
  const p = await getProject(req.params.id);
  needLeader(p, req.uid, 'terminate this project');
  const tasks = await Task.find({project: p.id}, {id: 1}).lean(), tids = tasks.map((t) => t.id);
  await Promise.all([Task.deleteMany({project: p.id}), Pref.deleteMany({t: {$in: tids}}), Log.deleteMany({t: {$in: tids}}), p.deleteOne()]);
  const members = [p.leader, ...p.team];
  emitUsers(members, {removed: {projects: [p.id], tasks: tids}});
  await Promise.all(members.map(refreshUser));
  res.json({patch: {removed: {projects: [p.id], tasks: tids}}});
}));

api.post('/projects/:id/milestones', h(async (req, res) => {
  const {rows} = z.object({rows: z.array(msRow).min(1).max(30)}).parse(req.body);
  const p = await getProject(req.params.id);
  needLeader(p, req.uid, 'add milestones');
  const ids = await nextIds('ms', rows.length);
  rows.forEach((r, i) => p.milestones.push({id: ids[i], name: r.name, due: r.due}));
  p.milestones.sort((a, c) => a.due - c.due);
  await p.save();
  res.json(publishProject(p.id, {projects: [sProject(p)]}));
}));

/* ---------- team ---------- */
api.post('/projects/:id/team', h(async (req, res) => {
  const b = z.object({ids: z.array(z.number().int()).min(1).max(60), needs: z.array(z.string().max(40)).max(30).optional()}).parse(req.body);
  const p = await getProject(req.params.id);
  needLeader(p, req.uid, 'add members');
  const found = await User.find({id: {$in: b.ids}}, {id: 1}).lean();
  const fresh = found.map((u) => u.id).filter((id) => id !== p.leader && !p.team.includes(id));
  p.team.push(...fresh);
  if (b.needs) p.needs = b.needs;
  await p.save();
  await Promise.all(fresh.map(refreshUser));
  res.json(publishProject(p.id, {projects: [sProject(p)]}));
}));

api.delete('/projects/:id/team/:uid', h(async (req, res) => {
  const p = await getProject(req.params.id), uid = Number(req.params.uid);
  needLeader(p, req.uid, 'remove members');
  if (uid === p.leader) throw new HttpError(400, 'The leader cannot be removed.');
  if (!p.team.includes(uid)) throw new HttpError(404, 'That person is not on the team.');
  const freed = await Task.find({project: p.id, assignee: uid, status: {$ne: 'done'}});
  for (const t of freed) { t.assignee = null; await t.save(); }
  const logs = freed.length ? await Log.insertMany(freed.map((t) => logRow(req.uid, 'reassign', t, 1))) : [];
  p.team = p.team.filter((x) => x !== uid);
  await p.save();
  const patch = {projects: [sProject(p)], tasks: freed.map(sTask), log: logs.map(sLog)};
  emitProject(p.id, patch);
  emitUsers([uid], {removed: {projects: [p.id], tasks: (await Task.find({project: p.id}, {id: 1}).lean()).map((t) => t.id)}});
  await refreshUser(uid);
  res.json({patch});
}));

/* ---------- project tasks ---------- */
api.post('/projects/:id/tasks', h(async (req, res) => {
  const b = z.object({title: z.string().trim().min(1).max(180), ms: z.number().int(), skills: z.array(z.string().max(40)).max(11).default([]),
    prio: prio.default('Medium'), effort: z.number().min(1).max(240).default(6), due: ts, deps: z.array(z.number().int()).max(50).default([])}).parse(req.body);
  const p = await getProject(req.params.id);
  needLeader(p, req.uid, 'add tasks');
  if (!p.milestones.some((m) => m.id === b.ms)) throw new HttpError(400, 'Pick a milestone from this project.');
  if (b.deps.length && (await Task.countDocuments({project: p.id, id: {$in: b.deps}})) !== new Set(b.deps).size) throw new HttpError(400, 'A dependency is not a task in this project.');
  const [id] = await nextIds('task');
  const t = await Task.create({id, project: p.id, title: b.title, ms: b.ms, skills: b.skills, prio: b.prio, effort: b.effort, due: b.due, deps: [...new Set(b.deps)]});
  res.status(201).json(publishProject(p.id, {tasks: [sTask(t)]}));
}));

/** Reschedule / reassign / re-link several tasks at once (Crash Test and Project Time Machine "apply"). */
api.post('/projects/:id/tasks/bulk', h(async (req, res) => {
  const {tasks: rows} = z.object({tasks: z.array(z.object({id: z.number().int(), due: ts.optional(), assignee: z.number().int().nullable().optional(),
    deps: z.array(z.number().int()).max(50).optional()})).min(1).max(200)}).parse(req.body);
  const p = await getProject(req.params.id);
  needLeader(p, req.uid, 'change the live plan');
  const all = await Task.find({project: p.id});
  const byId = new Map(all.map((t) => [t.id, t]));
  for (const r of rows) {
    const t = byId.get(r.id);
    if (!t) throw new HttpError(400, `Task ${r.id} is not in this project.`);
    if (r.due !== undefined) t.due = r.due;
    if (r.assignee !== undefined) { if (r.assignee !== null && !onTeam(p, r.assignee)) throw new HttpError(400, 'Owners must be on the team.'); t.assignee = r.assignee; }
    if (r.deps !== undefined) { if (r.deps.some((d) => !byId.has(d) || d === t.id)) throw new HttpError(400, 'Invalid dependency.'); t.deps = [...new Set(r.deps)]; }
  }
  if (hasCycle(all.map((t) => ({id: t.id, deps: t.deps})))) throw new HttpError(400, 'Those changes create a circular dependency.');
  const touched = rows.map((r) => byId.get(r.id));
  await Promise.all(touched.map((t) => t.save()));
  const log = await Log.create(logRow(req.uid, 'update', touched[0], 1));
  res.json(publishProject(p.id, {tasks: touched.map(sTask), log: [sLog(log)]}));
}));

/** Approve an (edited) AI plan: reuse milestones by name, add tasks with dependencies, add chosen owners to the team. */
api.post('/projects/:id/ai/apply', h(async (req, res) => {
  const {rows} = z.object({rows: z.array(z.object({key: z.string().max(40), title: z.string().trim().min(1).max(180), ms: z.string().trim().min(1).max(100),
    skills: z.array(z.string().max(40)).max(11).default([]), prio: prio.default('Medium'), effort: z.number().min(1).max(240), due: ts,
    deps: z.array(z.string()).max(50).default([]), assignee: z.number().int().nullable().default(null)})).min(1).max(40)}).parse(req.body);
  const p = await getProject(req.params.id);
  needLeader(p, req.uid, 'approve an AI plan');
  const keys = new Set(rows.map((r) => r.key));
  if (keys.size !== rows.length) throw new HttpError(400, 'Duplicate task keys.');
  // Milestones: reuse by name, otherwise create one due on its latest task.
  const msByName = new Map(p.milestones.map((m) => [m.name.toLowerCase(), m.id]));
  const wanted = new Map();
  rows.forEach((r) => { const k = r.ms.toLowerCase(); if (!msByName.has(k)) { const w = wanted.get(k) || {name: r.ms, due: 0}; w.due = Math.max(w.due, r.due); wanted.set(k, w); } });
  const newIds = await nextIds('ms', wanted.size);
  [...wanted.entries()].forEach(([k, w], i) => { p.milestones.push({id: newIds[i], name: w.name, due: w.due}); msByName.set(k, newIds[i]); });
  p.milestones.sort((a, c) => a.due - c.due);
  // Owners must exist; they join the team.
  const ownerIds = [...new Set(rows.map((r) => r.assignee).filter((x) => x != null))];
  const okOwners = new Set((await User.find({id: {$in: ownerIds}}, {id: 1}).lean()).map((u) => u.id));
  const joined = ownerIds.filter((id) => okOwners.has(id) && id !== p.leader && !p.team.includes(id));
  p.team.push(...joined);
  const tids = await nextIds('task', rows.length), idOf = new Map(rows.map((r, i) => [r.key, tids[i]]));
  const docs = rows.map((r) => ({id: idOf.get(r.key), project: p.id, title: r.title, ms: msByName.get(r.ms.toLowerCase()), skills: r.skills, prio: r.prio, effort: r.effort, due: r.due,
    assignee: r.assignee != null && okOwners.has(r.assignee) ? r.assignee : null, deps: r.deps.filter((k) => idOf.has(k) && k !== r.key).map((k) => idOf.get(k))}));
  if (hasCycle(docs)) throw new HttpError(400, 'The plan has circular dependencies. Remove one and try again.');
  const [tasks] = await Promise.all([Task.insertMany(docs), p.save()]);
  const logs = await Log.insertMany(tasks.filter((t) => t.assignee != null).map((t) => logRow(t.assignee, 'assign', t, 0)));
  await Promise.all(joined.map(refreshUser));
  res.status(201).json(publishProject(p.id, {projects: [sProject(p)], tasks: tasks.map(sTask), log: logs.map(sLog)}));
}));

/* ---------- task actions ---------- */
api.patch('/tasks/:id/status', h(async (req, res) => {
  const {status} = z.object({status: z.enum(['todo', 'doing', 'review', 'done'])}).parse(req.body);
  const t = await getTask(req.params.id);
  if (t.personal) {
    if (t.owner !== req.uid) throw new HttpError(403, 'This is not your task.');
    t.status = status; await t.save();
    emitUsers([req.uid], {tasks: [sTask(t)]});
    return res.json({patch: {tasks: [sTask(t)]}});
  }
  const p = await getProject(t.project);
  needMember(p, req.uid);
  if (status === 'done') throw new HttpError(400, 'Tasks are completed through review and approval.');
  if (t.assignee !== req.uid && p.leader !== req.uid) throw new HttpError(403, 'Only the owner or the team leader can move this task.');
  if (status !== 'todo' && t.deps.length) {
    const blocker = await Task.findOne({id: {$in: t.deps}, status: {$ne: 'done'}}).lean();
    if (blocker) throw new HttpError(409, `Finish “${blocker.title}” first.`);
  }
  t.status = status; await t.save();
  const log = await Log.create(logRow(req.uid, 'update', t, 1));
  res.json(publishProject(p.id, {tasks: [sTask(t)], log: [sLog(log)]}));
}));

api.post('/tasks/:id/progress', h(async (req, res) => {
  const t = await getTask(req.params.id), p = await getProject(t.project);
  if (t.assignee !== req.uid && p.leader !== req.uid) throw new HttpError(403, 'Only the owner or the team leader can log progress.');
  const log = await Log.create(logRow(req.uid, 'update', t, 1));
  res.json(publishProject(p.id, {log: [sLog(log)]}));
}));

api.post('/tasks/:id/approve', h(async (req, res) => {
  const t = await getTask(req.params.id), p = await getProject(t.project);
  needMember(p, req.uid);
  if (t.status !== 'review') throw new HttpError(409, 'This task is not waiting for review.');
  if (t.assignee === req.uid && p.leader !== req.uid) throw new HttpError(403, 'Someone else needs to review your work.');
  const rows = [logRow(req.uid, 'review', t, 3)];
  if (t.assignee != null) rows.push(logRow(t.assignee, 'complete', t, t.effort));
  t.status = 'done'; await t.save();
  const logs = await Log.insertMany(rows);
  res.json(publishProject(p.id, {tasks: [sTask(t)], log: logs.map(sLog)}));
}));

async function assignOne(t, p, userId, actor) {
  if (!onTeam(p, userId)) throw new HttpError(400, 'Owners must be on the project team.');
  if (t.status === 'done') throw new HttpError(409, 'This task is already complete.');
  const prev = t.assignee;
  if (prev === userId) return null;
  t.assignee = userId; t.interest = [];
  await t.save();
  return logRow(prev != null ? actor : userId, prev != null ? 'reassign' : 'assign', t, prev != null ? 1 : 0);
}
api.post('/tasks/:id/assign', h(async (req, res) => {
  const {userId} = z.object({userId: z.number().int()}).parse(req.body);
  const t = await getTask(req.params.id), p = await getProject(t.project);
  needLeader(p, req.uid, 'assign work');
  const row = await assignOne(t, p, userId, req.uid);
  const logs = row ? await Log.insertMany([row]) : [];
  res.json(publishProject(p.id, {tasks: [sTask(t)], log: logs.map(sLog)}));
}));

api.post('/projects/:id/assign-bulk', h(async (req, res) => {
  const {assignments} = z.object({assignments: z.array(z.object({taskId: z.number().int(), userId: z.number().int()})).min(1).max(100)}).parse(req.body);
  const p = await getProject(req.params.id);
  needLeader(p, req.uid, 'assign work');
  const tasks = [], rows = [];
  for (const a of assignments) {
    const t = await getTask(a.taskId);
    if (t.project !== p.id) throw new HttpError(400, `Task ${a.taskId} is not in this project.`);
    const row = await assignOne(t, p, a.userId, req.uid);
    tasks.push(t); if (row) rows.push(row);
  }
  const logs = rows.length ? await Log.insertMany(rows) : [];
  res.json(publishProject(p.id, {tasks: tasks.map(sTask), log: logs.map(sLog)}));
}));

api.post('/tasks/:id/interest', h(async (req, res) => {
  const t = await getTask(req.params.id), p = await getProject(t.project);
  needMember(p, req.uid);
  t.interest = t.interest.includes(req.uid) ? t.interest.filter((x) => x !== req.uid) : [...t.interest, req.uid];
  await t.save();
  res.json(publishProject(p.id, {tasks: [sTask(t)]}));
}));

/* ---------- task preferences (private to the person and the project's leader) ---------- */
api.put('/prefs', h(async (req, res) => {
  const b = z.object({taskId: z.number().int(), stance: z.enum(['want', 'ok', 'avoid']).nullable().optional(), note: z.string().max(500).optional(), target: ts.nullable().optional()}).parse(req.body);
  const t = await getTask(b.taskId), p = await getProject(t.project);
  needMember(p, req.uid);
  const set = {};
  for (const k of ['stance', 'note', 'target']) if (b[k] !== undefined) set[k] = b[k];
  const pref = await Pref.findOneAndUpdate({u: req.uid, t: t.id}, {$set: set, $setOnInsert: {u: req.uid, t: t.id}}, {upsert: true, new: true});
  const patch = {prefs: [sPref(pref)]};
  emitUsers([req.uid, p.leader], patch);
  res.json({patch});
}));

/* ---------- personal space ---------- */
api.post('/me/milestones', h(async (req, res) => {
  const b = msRow.parse(req.body);
  const [id] = await nextIds('ms');
  const m = await Pm.create({id, owner: req.uid, name: b.name, due: b.due});
  const patch = {pms: [sPm(m)]}; emitUsers([req.uid], patch);
  res.status(201).json({patch});
}));
api.delete('/me/milestones/:id', h(async (req, res) => {
  const m = await Pm.findOne({id: Number(req.params.id), owner: req.uid});
  if (!m) throw new HttpError(404, 'Milestone not found.');
  await m.deleteOne();
  const freed = await Task.find({personal: true, owner: req.uid, ms: m.id});
  for (const t of freed) { t.ms = null; await t.save(); }
  const patch = {removed: {pms: [m.id]}, tasks: freed.map(sTask)}; emitUsers([req.uid], patch);
  res.json({patch});
}));
api.post('/me/tasks', h(async (req, res) => {
  const b = z.object({title: z.string().trim().min(1).max(180), ms: z.number().int().nullable().default(null), prio: prio.default('Medium'), effort: z.number().min(1).max(240).default(4), due: ts}).parse(req.body);
  if (b.ms != null && !(await Pm.exists({id: b.ms, owner: req.uid}))) throw new HttpError(400, 'Pick one of your own milestones.');
  const [id] = await nextIds('task');
  const t = await Task.create({id, project: null, personal: true, owner: req.uid, assignee: req.uid, title: b.title, ms: b.ms, prio: b.prio, effort: b.effort, due: b.due});
  const patch = {tasks: [sTask(t)]}; emitUsers([req.uid], patch);
  res.status(201).json({patch});
}));
api.delete('/tasks/:id', h(async (req, res) => {
  const t = await getTask(req.params.id);
  if (!t.personal || t.owner !== req.uid) throw new HttpError(403, 'Only your own personal tasks can be deleted here.');
  await t.deleteOne();
  const patch = {removed: {tasks: [t.id]}}; emitUsers([req.uid], patch);
  res.json({patch});
}));

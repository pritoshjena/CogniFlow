// Client + data mapping for the CogniFlow AI Recommender service (FastAPI).
// The service never sees the Gemini key from the browser; it only receives project/team data.
import {S, U, MS, team, openEffort, projectNeeds, isoOf, today, DAY, SKILLS} from './store.js';

// In dev, Vite proxies /ai-api -> http://localhost:8787 (see vite.config.js), so no CORS setup is needed.
// In production set VITE_AI_API_URL to the deployed service URL and add this site to its CORS_ORIGINS.
var BASE = (import.meta.env && import.meta.env.VITE_AI_API_URL) || '/ai-api';
BASE = String(BASE).replace(/\/+$/, '');

async function request(path, body, timeoutMs) {
  var ctl = new AbortController();
  var timer = setTimeout(function () { ctl.abort(); }, timeoutMs || 60000);
  try {
    var res = await fetch(BASE + path, {
      method: body ? 'POST' : 'GET',
      headers: body ? {'Content-Type': 'application/json'} : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctl.signal
    });
    var data = null;
    try { data = await res.json(); } catch (e) { /* non-JSON error body */ }
    if (!res.ok) {
      var d = data && (data.detail || data);
      var msg = d && (d.message || d.error || (typeof d === 'string' ? d : '')) ;
      if (Array.isArray(d)) msg = d.map(function (x) { return (x.loc || []).slice(1).join('.') + ': ' + x.msg; }).join('; ');
      throw new Error(msg || ('The AI service answered with status ' + res.status + '.'));
    }
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('The AI service took too long to respond. Try again in a moment.');
    if (e instanceof TypeError) throw new Error('Could not reach the AI service. Start it with “uvicorn main:app --port 8787” (or set VITE_AI_API_URL).');
    throw e;
  } finally { clearTimeout(timer); }
}

export function aiHealth() { return request('/health', null, 6000); }

/* ---------- CogniFlow -> service ---------- */
// CogniFlow levels are 1-3 (Beginner..Advanced); the service scores 0-4, so Advanced maps to the top.
var LEVEL_OUT = {1: 1, 2: 2.5, 3: 4};
export function memberPayload(u) {
  var skills = Object.keys(u.skills || {}).map(function (k) { return {name: k, level: LEVEL_OUT[u.skills[k]] || 2}; });
  var weekly = Math.max(1, +u.cap || 20);
  return {
    id: String(u.id), name: u.name, role: u.role === 'leader' ? 'Team leader' : 'Member',
    skills: skills, weeklyCapacityHours: weekly, hoursPerDay: Math.min(12, Math.round(weekly / 5 * 10) / 10),
    currentLoadHours: openEffort(u.id)
  };
}
var PRIO_OUT = {High: 'high', Medium: 'medium', Low: 'low'};
function taskPayload(t) {
  var m = MS(t.ms);
  return {
    id: String(t.id), title: t.title, description: '', requiredSkills: (t.skills || []).slice(),
    estimateHours: Math.min(240, Math.max(1, t.effort || 1)), priority: PRIO_OUT[t.prio] || 'medium',
    dependsOn: (t.deps || []).map(String), milestoneName: m ? m.name : 'Delivery'
  };
}
function projectPayload(pr, extra) {
  var needs = projectNeeds(pr), desc = (pr.desc || '').trim();
  var parts = [desc || (pr.name + ' project.')];
  if (needs.length) parts.push('Skills this project needs: ' + needs.join(', ') + '.');
  if (pr.milestones && pr.milestones.length) parts.push('Existing milestones: ' + pr.milestones.map(function (m) { return m.name; }).join(', ') + '.');
  var d = parts.join(' ');
  if (d.length < 10) d = (d + ' CogniFlow project.').padEnd(10, '.');
  return Object.assign({title: (pr.name || 'Project').slice(0, 180), description: d.slice(0, 8000), workingDaysPerWeek: 5, hoursPerWorkday: 6}, extra || {});
}

/** Ask the service to draft tasks + owners + milestones + a timeline for a project. */
export function requestPlan(pr, opts) {
  var pool = opts.everyone ? S.users.slice() : [pr.leader].concat(pr.team).filter(function (id, i, a) { return a.indexOf(id) === i; }).map(U).filter(Boolean);
  var body = {
    project: projectPayload(pr, {startDate: isoOf(today), targetDeadline: opts.endISO || undefined}),
    teamMembers: pool.map(memberPayload),
    options: {maxTasks: Math.max(4, Math.min(12, +opts.maxTasks || 8)), contingencyPercent: 15, includeUnassigned: false}
  };
  return request('/api/plan', body, 90000).then(function (res) { res._pool = pool.map(function (u) { return u.id; }); return res; });
}

/** Ask the service who should own the given (already created) tasks. */
export function requestAssignments(pr, tasks) {
  var members = team();
  var body = {
    project: projectPayload(pr, {startDate: isoOf(today)}),
    teamMembers: members.map(memberPayload),
    tasks: tasks.map(taskPayload), options: {includeUnassigned: true}
  };
  return request('/api/assignments/recommend', body, 30000);
}

/* ---------- service -> CogniFlow ---------- */
// The service uses free-text skill names; fold them back into CogniFlow's skill list.
var ALIAS = {
  'react': 'React', 'javascript': 'React', 'frontend': 'React', 'frontend development': 'React', 'front end': 'React', 'html': 'React', 'css': 'React', 'html css': 'React', 'web': 'React',
  'node js': 'Node.js', 'node': 'Node.js', 'nodejs': 'Node.js', 'api': 'Node.js', 'apis': 'Node.js', 'backend': 'Node.js', 'backend development': 'Node.js', 'back end': 'Node.js', 'server': 'Node.js',
  'python': 'Python', 'ui ux': 'UI/UX', 'ux': 'UI/UX', 'ui': 'UI/UX', 'design': 'UI/UX', 'figma': 'UI/UX', 'ui design': 'UI/UX', 'ux research': 'UI/UX',
  'database': 'Database', 'sql': 'Database', 'mongodb': 'Database', 'data': 'Database',
  'testing': 'Testing', 'qa': 'Testing', 'quality assurance': 'Testing', 'devops': 'DevOps', 'deployment': 'DevOps', 'ci cd': 'DevOps', 'cloud': 'DevOps',
  'git': 'Git', 'documentation': 'Docs', 'docs': 'Docs', 'project planning': 'Docs', 'project management': 'Docs', 'presenting': 'Docs', 'research': 'Docs',
  'mobile': 'Mobile', 'flutter': 'Mobile', 'android': 'Mobile', 'ios': 'Mobile',
  'ml': 'ML', 'machine learning': 'ML', 'ai': 'ML', 'data science': 'ML'
};
function canon(s) { return String(s || '').toLowerCase().replace(/[._/-]+/g, ' ').replace(/\s+/g, ' ').trim(); }
export function mapSkill(s) {
  var c = canon(s), direct = SKILLS.find(function (k) { return canon(k) === c; });
  return direct || ALIAS[c] || null;
}
var PRIO_IN = {critical: 'High', high: 'High', medium: 'Medium', low: 'Low'};

/** Turn a /api/plan response into editable rows for the review panel. */
export function rowsFromPlan(res) {
  return (res.tasks || []).map(function (t) {
    var skills = [];
    (t.requiredSkills || []).forEach(function (s) { var m = mapSkill(s); if (m && skills.indexOf(m) < 0) skills.push(m); });
    var a = t.assignment, uid = a ? Number(a.memberId) : null;
    return {
      key: String(t.id), on: true, title: t.title, skills: skills, ms: t.milestoneName || 'Delivery',
      prio: PRIO_IN[t.priority] || 'Medium', effort: Math.round((t.estimateHours || 6) * 10) / 10,
      due: t.dueDate, start: t.startDate, deps: (t.dependsOn || []).map(String),
      assignee: Number.isFinite(uid) ? uid : null, confidence: a ? a.confidence : null,
      reasons: a ? a.reasons || [] : [], deliverable: t.deliverable || ''
    };
  });
}

// End-to-end check against a running API:  npm run smoke   (API_URL defaults to http://localhost:4000)
import {io} from 'socket.io-client';
const BASE = process.env.API_URL || 'http://localhost:4000';
let pass = 0, fail = 0;
const ok = (cond, label, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '  ✓' : '  ✗'} ${label}${cond ? '' : '  ' + extra}`); };

function client() {
  let cookie = '';
  const call = async (method, path, body) => {
    const res = await fetch(BASE + path, {method, headers: {'Content-Type': 'application/json', ...(cookie ? {Cookie: cookie} : {})}, body: body ? JSON.stringify(body) : undefined});
    const sc = res.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    return {status: res.status, body: await res.json().catch(() => ({}))};
  };
  return {call, get cookie() { return cookie; }};
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DAY = 86400000, now = Date.now();

const run = Date.now().toString(36);
const meera = client(), rohan = client(), anon = client();

console.log('Auth');
ok((await anon.call('GET', '/api/bootstrap')).status === 401, 'bootstrap requires sign-in');
ok((await anon.call('POST', '/api/auth/login', {email: 'meera@cogniflow.dev', password: 'wrong-password'})).status === 401, 'wrong password rejected');
let r = await meera.call('POST', '/api/auth/login', {email: 'meera@cogniflow.dev', password: 'Password123!'});
ok(r.status === 200 && r.body.user.name === 'Meera Nair', 'leader can sign in');
r = await rohan.call('POST', '/api/auth/login', {email: 'rohan@cogniflow.dev', password: 'Password123!'});
ok(r.status === 200, 'member can sign in');
const fresh = client();
r = await fresh.call('POST', '/api/auth/register', {name: 'New Person', email: `new-${run}@example.com`, password: 'longenough1', skills: {React: 3, 'Node.js': 2}});
ok(r.status === 201 && r.body.user.skills['Node.js'] === 2, 'registration works and keeps dotted skill names');
ok((await client().call('POST', '/api/auth/register', {name: 'x', email: `new-${run}@example.com`, password: 'longenough1'})).status === 409, 'duplicate email rejected');
ok((await client().call('POST', '/api/auth/register', {name: 'x', email: 'bad', password: 'short'})).status === 400, 'invalid signup rejected');

console.log('Data scoping');
let boot = (await meera.call('GET', '/api/bootstrap')).body;
ok(boot.projects.length === 3 && boot.tasks.length >= 38, 'leader loads her projects and tasks', JSON.stringify([boot.projects?.length, boot.tasks?.length]));
ok(boot.users.length >= 9 && !boot.users.some((u) => u.passwordHash), 'user list has no password hashes');
const rohanBoot = (await rohan.call('GET', '/api/bootstrap')).body;
ok(rohanBoot.projects.every((p) => p.leader === 1 || p.team.includes(2)), 'member only sees projects he belongs to');
ok((await fresh.call('GET', '/api/bootstrap')).body.projects.length === 0, 'new account starts with no projects');

console.log('Real-time');
const events = [];
const sock = io(BASE, {extraHeaders: {Cookie: rohan.cookie}, transports: ['websocket']});
await new Promise((res, rej) => { sock.on('connect', res); sock.on('connect_error', rej); setTimeout(() => rej(new Error('socket timeout')), 4000); });
sock.on('patch', (p) => events.push(p)); sock.on('resync', () => events.push({resync: true}));
ok(true, 'member socket connected');
const anonSock = io(BASE, {transports: ['websocket'], reconnection: false});
const denied = await new Promise((res) => { anonSock.on('connect_error', () => res(true)); anonSock.on('connect', () => res(false)); setTimeout(() => res(false), 3000); });
ok(denied, 'socket without login is refused'); anonSock.close();

console.log('Projects, milestones, tasks');
r = await meera.call('POST', '/api/projects', {name: `Smoke ${run}`, desc: 'Smoke test project', milestones: [{name: 'Build', due: now + 10 * DAY}, {name: 'Ship', due: now + 20 * DAY}]});
ok(r.status === 201 && r.body.patch.projects[0].milestones.length === 2, 'leader creates a project');
const P = r.body.patch.projects[0], ms = P.milestones[0].id;
ok((await rohan.call('POST', `/api/projects/${P.id}/milestones`, {rows: [{name: 'Nope', due: now}]})).status === 403, 'non-leader cannot add milestones');
ok((await rohan.call('POST', `/api/projects/${P.id}/tasks`, {title: 'x', ms, due: now})).status === 403, 'non-member cannot add tasks');
r = await meera.call('POST', `/api/projects/${P.id}/team`, {ids: [2]});
ok(r.status === 200 && r.body.patch.projects[0].team.includes(2), 'leader adds Rohan to the team');
await wait(600);
ok(events.some((e) => e.resync), 'Rohan is told to reload after being added');
const rb2 = (await rohan.call('GET', '/api/bootstrap')).body;
ok(rb2.projects.some((p) => p.id === P.id), 'Rohan now sees the project');
r = await meera.call('POST', `/api/projects/${P.id}/tasks`, {title: 'Design', ms, skills: ['UI/UX'], prio: 'High', effort: 6, due: now + 3 * DAY});
const T1 = r.body.patch.tasks[0];
r = await meera.call('POST', `/api/projects/${P.id}/tasks`, {title: 'Build UI', ms, skills: ['React'], effort: 8, due: now + 6 * DAY, deps: [T1.id]});
const T2 = r.body.patch.tasks[0];
ok(T2.deps[0] === T1.id, 'task with a dependency created');
ok((await meera.call('POST', `/api/projects/${P.id}/tasks`, {title: 'Bad', ms: 999999, due: now})).status === 400, 'milestone from another project rejected');

console.log('Task rules');
events.length = 0;
r = await meera.call('POST', `/api/tasks/${T1.id}/assign`, {userId: 2});
ok(r.status === 200 && r.body.patch.tasks[0].assignee === 2, 'leader assigns work');
await wait(600);
ok(events.some((e) => e.tasks?.some((t) => t.id === T1.id && t.assignee === 2)), 'assignment is pushed to Rohan in real time');
ok((await rohan.call('POST', `/api/tasks/${T1.id}/assign`, {userId: 1})).status === 403, 'member cannot assign work');
ok((await meera.call('POST', `/api/tasks/${T2.id}/assign`, {userId: 5})).status === 400, 'cannot assign to someone off the team');
await meera.call('POST', `/api/tasks/${T2.id}/assign`, {userId: 2});
ok((await rohan.call('PATCH', `/api/tasks/${T2.id}/status`, {status: 'doing'})).status === 409, 'blocked task cannot be started');
ok((await rohan.call('PATCH', `/api/tasks/${T1.id}/status`, {status: 'done'})).status === 400, 'done only via approval');
ok((await rohan.call('PATCH', `/api/tasks/${T1.id}/status`, {status: 'doing'})).status === 200, 'owner starts their task');
ok((await rohan.call('PATCH', `/api/tasks/${T1.id}/status`, {status: 'review'})).status === 200, 'owner sends for review');
ok((await rohan.call('POST', `/api/tasks/${T1.id}/approve`)).status === 403, 'owner cannot approve own work');
r = await meera.call('POST', `/api/tasks/${T1.id}/approve`);
ok(r.status === 200 && r.body.patch.tasks[0].status === 'done' && r.body.patch.log.length === 2, 'leader approves; review + completion logged');
ok((await rohan.call('PATCH', `/api/tasks/${T2.id}/status`, {status: 'doing'})).status === 200, 'dependent task unblocked after approval');

console.log('Bulk edit and preferences');
r = await meera.call('POST', `/api/projects/${P.id}/tasks/bulk`, {tasks: [{id: T2.id, due: now + 9 * DAY}]});
ok(r.status === 200 && r.body.patch.tasks[0].due === now + 9 * DAY, 'leader reschedules tasks in bulk');
ok((await meera.call('POST', `/api/projects/${P.id}/tasks/bulk`, {tasks: [{id: T1.id, deps: [T2.id]}]})).status === 400, 'circular dependency rejected');
r = await rohan.call('PUT', '/api/prefs', {taskId: T2.id, stance: 'want', note: 'Happy to take this'});
ok(r.status === 200 && r.body.patch.prefs[0].stance === 'want', 'member saves a task preference');
ok((await meera.call('GET', '/api/bootstrap')).body.prefs.some((x) => x.t === T2.id && x.u === 2), 'leader can see the preference');

console.log('Personal space');
r = await rohan.call('POST', '/api/me/milestones', {name: 'Thesis draft', due: now + 14 * DAY});
const pm = r.body.patch.pms[0];
r = await rohan.call('POST', '/api/me/tasks', {title: 'Read paper', ms: pm.id, due: now + 2 * DAY, effort: 3});
const PT = r.body.patch.tasks[0];
ok(PT.personal && PT.owner === 2 && PT.project === null, 'personal task created');
ok((await meera.call('GET', '/api/bootstrap')).body.tasks.every((t) => t.id !== PT.id), 'personal tasks are private');
ok((await rohan.call('PATCH', `/api/tasks/${PT.id}/status`, {status: 'doing'})).status === 200, 'owner updates personal task');
ok((await meera.call('DELETE', `/api/tasks/${PT.id}`)).status === 403, 'others cannot delete it');
r = await rohan.call('DELETE', `/api/me/milestones/${pm.id}`);
ok(r.status === 200 && r.body.patch.tasks[0].ms === null, 'deleting a milestone detaches its personal tasks');
ok((await rohan.call('DELETE', `/api/tasks/${PT.id}`)).status === 200, 'owner deletes personal task');

console.log('AI bridge');
r = await meera.call('GET', '/api/ai/health');
if (r.status === 200) {
  ok(true, 'recommender reachable through the API');
  r = await meera.call('POST', `/api/ai/projects/${P.id}/plan`, {maxTasks: 6, everyone: false});
  ok(r.status === 200 && r.body.tasks?.length > 0 && Array.isArray(r.body._pool), 'plan generated server-side', JSON.stringify(r.body).slice(0, 200));
  const rows = r.body.tasks.map((t) => ({key: t.id, title: t.title, ms: t.milestoneName, skills: [], prio: 'Medium', effort: t.estimateHours, due: Date.parse(t.dueDate), deps: t.dependsOn, assignee: t.assignment ? Number(t.assignment.memberId) : null}));
  r = await meera.call('POST', `/api/projects/${P.id}/ai/apply`, {rows});
  ok(r.status === 201 && r.body.patch.tasks.length === rows.length, 'AI plan imported with dependencies and milestones', JSON.stringify(r.body).slice(0, 200));
  ok((await rohan.call('POST', `/api/ai/projects/${P.id}/plan`, {})).status === 403, 'only the leader can request AI plans');
  r = await meera.call('POST', `/api/ai/projects/${P.id}/assignments`, {});
  ok(r.status === 200 && Array.isArray(r.body.recommendations), 'assignment recommendations returned');
} else ok(r.status === 503, 'AI bridge reports 503 when the recommender is offline (start it to test the rest)', String(r.status));

console.log('Cleanup');
ok((await rohan.call('DELETE', `/api/projects/${P.id}`)).status === 403, 'member cannot terminate a project');
r = await meera.call('DELETE', `/api/projects/${P.id}`);
ok(r.status === 200 && r.body.patch.removed.projects[0] === P.id, 'leader terminates the project');
ok(!(await meera.call('GET', '/api/bootstrap')).body.tasks.some((t) => t.project === P.id), 'its tasks are gone');
sock.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

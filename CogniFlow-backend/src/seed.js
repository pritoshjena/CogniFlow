// Loads the demo workspace into MongoDB: `npm run seed` (wipes the CogniFlow collections first).
// Every demo user can sign in with the password below, e.g. meera@cogniflow.dev (the team leader).
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import {config} from './config.js';
import {Counter, User, Project, Task, Pref, Log, Pm} from './models.js';

const DEMO_PASSWORD = 'Password123!';
const DAY = 86400000;
var d0 = new Date(); d0.setHours(0, 0, 0, 0);
var today = d0.getTime();
var dt = function (n) { return today + n * DAY; };

/* ---- demo data, copied from the original frontend store ---- */
function seed(){
  var mk=function(id,title,ms,skills,prio,effort,due,status,assignee,deps){return {id:id,title:title,ms:ms,skills:skills,prio:prio,effort:effort,due:dt(due),status:status,assignee:assignee,deps:deps,interest:[]}};
  var L=function(u,type,t,pts,d){return {u:u,type:type,t:t,pts:pts,ts:Date.now()+d*DAY}};
  var projects=[
    {id:1,name:'Campus Food Rescue',desc:'Connect campus canteens with students and NGOs so surplus food is picked up before it expires.',leader:1,start:dt(-10),team:[1,2,3,4,5,6],
      milestones:[{id:1,name:'Design and setup',due:dt(5)},{id:2,name:'Core features',due:dt(16)},{id:3,name:'Testing and demo',due:dt(28)}]},
    {id:2,name:'Campus Green Energy Audit',desc:'Collect hostel energy data, model baseline use and publish a savings dashboard for the facilities team.',leader:1,start:dt(-6),team:[1,3,4,5,7],
      milestones:[{id:4,name:'Survey and baseline',due:dt(8)},{id:5,name:'Analysis and dashboard',due:dt(20)},{id:6,name:'Report and handover',due:dt(32)}]},
    {id:3,name:'Alumni Mentor Portal',desc:'A portal that matches final-year students with alumni mentors and schedules sessions.',leader:1,start:dt(-4),team:[1,2,6,8],
      milestones:[{id:7,name:'Discovery',due:dt(7)},{id:8,name:'Build',due:dt(21)},{id:9,name:'Pilot',due:dt(30)}]}
  ];
  var msProject={};projects.forEach(function(p){p.milestones.forEach(function(m){msProject[m.id]=p.id})});
  var tasks=[
      mk(1,'Wireframes for donor and receiver flows',1,['UI/UX'],'High',8,-3,'done',5,[]),
      mk(2,'Database schema for listings and pickups',1,['Database'],'High',6,-1,'done',3,[]),
      mk(3,'Repository, CI and staging setup',1,['DevOps'],'Medium',5,2,'doing',1,[]),
      mk(4,'Login and role-based access API',1,['Node.js'],'High',10,4,'doing',3,[2]),
      mk(13,'Design system and empty states',1,['UI/UX'],'Medium',8,1,'review',5,[1]),
      mk(5,'Food listing screens',2,['React','UI/UX'],'High',14,10,'todo',2,[1,4]),
      mk(6,'Expiry flagging and alert service',2,['Node.js','Database'],'High',9,12,'todo',3,[2]),
      mk(7,'Pickup request flow',2,['React','Node.js'],'Medium',12,14,'todo',2,[5]),
      mk(8,'Donor dashboard',2,['React','UI/UX'],'Medium',10,15,'todo',2,[5]),
      mk(9,'Mobile pickup tracker',2,['Mobile'],'Medium',16,15,'todo',4,[4]),
      mk(10,'Notification emails',2,['Node.js'],'Low',5,-2,'todo',3,[]),
      mk(11,'Live availability map',2,['React'],'Medium',14,14,'todo',2,[4]),
      mk(15,'Deployment and monitoring setup',2,['DevOps'],'Medium',10,15,'todo',1,[3]),
      mk(16,'API validation and rate limits',2,['Node.js'],'Medium',8,13,'todo',3,[4]),
      mk(12,'Test plan and QA checklist',3,['Testing'],'Medium',6,18,'todo',6,[]),
      mk(14,'User guide and demo script',3,['Docs'],'Low',8,24,'todo',1,[]),
      mk(17,'Usability testing with five students',3,['UI/UX','Testing'],'Medium',8,22,'todo',5,[8]),
      mk(18,'Impact report page',3,['React','Docs'],'Low',6,24,'todo',null,[6]),
      mk(19,'End-to-end testing',3,['Testing'],'High',12,26,'todo',null,[7,8,9]),
      mk(20,'Final demo and presentation',3,['Docs'],'Medium',6,28,'todo',null,[19]),
      /* Campus Green Energy Audit */
      mk(21,'Energy meter survey plan',4,['Docs'],'Medium',6,-2,'done',5,[]),
      mk(22,'Sensor data ingestion service',4,['Python','Database'],'High',12,5,'doing',7,[]),
      mk(23,'Baseline consumption model',4,['ML','Python'],'High',14,8,'todo',7,[22]),
      mk(24,'Hostel energy dashboard',5,['React','UI/UX'],'Medium',14,18,'todo',5,[23]),
      mk(25,'Anomaly alert rules',5,['Python','Node.js'],'Medium',10,17,'todo',3,[22]),
      mk(26,'Facilities team interviews',5,['Docs','UI/UX'],'Low',6,15,'todo',null,[]),
      mk(27,'Savings simulator',5,['ML'],'Medium',12,19,'todo',null,[23]),
      mk(28,'Audit report draft',6,['Docs'],'High',10,28,'todo',1,[24,27]),
      mk(29,'Handover workshop',6,['Docs'],'Low',6,32,'todo',null,[28]),
      mk(30,'Dashboard testing',6,['Testing'],'Medium',8,30,'todo',null,[24]),
      /* Alumni Mentor Portal */
      mk(41,'Mentor interview synthesis',7,['Docs','UI/UX'],'Medium',8,3,'done',1,[]),
      mk(42,'Matching algorithm spec',7,['Python'],'High',8,6,'doing',6,[]),
      mk(43,'Mentor profile pages',8,['React','UI/UX'],'High',14,16,'todo',2,[41]),
      mk(44,'Session scheduling API',8,['Node.js','Database'],'High',12,18,'todo',8,[42]),
      mk(45,'Admin approval workflow',8,['Node.js'],'Medium',10,20,'todo',8,[44]),
      mk(46,'Pilot onboarding emails',9,['Docs'],'Low',5,26,'todo',null,[45]),
      mk(47,'Pilot feedback survey',9,['UI/UX','Testing'],'Medium',6,28,'todo',6,[43]),
      mk(48,'Pilot launch checklist',9,['DevOps'],'Medium',6,30,'todo',null,[44,45])
  ];
  tasks.forEach(function(t){t.project=msProject[t.ms]});
  return {v:2,me:1,cur:1,nextUser:9,nextTask:200,nextMs:100,nextProject:4,
    users:[
      {id:1,name:'Meera Nair',role:'leader',cap:20,skills:{'Python':3,'Docs':3,'DevOps':2}},
      {id:2,name:'Rohan Verma',role:'member',cap:24,skills:{'React':3,'UI/UX':2,'Testing':1}},
      {id:3,name:'Ananya Iyer',role:'member',cap:24,skills:{'Node.js':3,'Database':3,'DevOps':1}},
      {id:4,name:'Kabir Singh',role:'member',cap:20,skills:{'Mobile':3,'React':3}},
      {id:5,name:'Sara Khan',role:'member',cap:16,skills:{'UI/UX':3,'Docs':2,'React':1}},
      {id:6,name:'Dev Patel',role:'member',cap:20,skills:{'Testing':3,'Python':2,'Database':1}},
      {id:7,name:'Isha Rao',role:'member',cap:16,skills:{'ML':3,'Python':3,'Database':2}},
      {id:8,name:'Vikram Das',role:'member',cap:20,skills:{'Node.js':2,'DevOps':3}}
    ],
    projects:projects,
    tasks:tasks,
    pms:[{id:1001,owner:1,name:'Conference paper submission',due:dt(20)}],
    prefs:[{u:2,t:5,stance:'want',note:'I built similar listing UIs before.',target:null},{u:2,t:11,stance:'avoid',note:'Maps are new to me; happy to pair with someone.',target:null}],
    log:[L(5,'complete',1,8,-5),L(6,'review',1,3,-5),L(3,'complete',2,6,-4),L(2,'review',2,3,-4),L(4,'review',2,3,-3),
      L(1,'update',3,1,-3),L(1,'reassign',10,1,-2),L(3,'update',4,1,-2),L(3,'update',4,1,-1),L(5,'update',13,1,-1),
      L(6,'update',12,1,-1),L(2,'update',5,1,-2),L(1,'update',3,1,-1),L(5,'update',13,1,-2),L(2,'update',11,1,-3),
      L(5,'complete',21,6,-3),L(1,'review',21,3,-3),L(7,'update',22,1,-2),L(7,'update',22,1,-1),L(3,'update',25,1,-1),
      L(1,'complete',41,8,-2),L(6,'review',41,3,-2),L(6,'update',42,1,-1),L(2,'update',43,1,-1),L(8,'update',44,1,-1)]
  };
}

async function main() {
  if (config.prod && !process.argv.includes('--force')) throw new Error('Refusing to wipe a production database. Re-run with --force if you really mean it.');
  await mongoose.connect(config.mongoUri, {serverSelectionTimeoutMS: 8000});
  const s = seed();
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await Promise.all([Counter, User, Project, Task, Pref, Log, Pm].map((m) => m.deleteMany({})));
  await User.insertMany(s.users.map((u) => ({id: u.id, name: u.name, email: u.name.split(' ')[0].toLowerCase() + '@cogniflow.dev', passwordHash: hash,
    role: u.role, cap: u.cap, skills: Object.entries(u.skills).map(([name, level]) => ({name, level}))})));
  await Project.insertMany(s.projects.map((p) => ({id: p.id, name: p.name, desc: p.desc, leader: p.leader, start: p.start, team: p.team, needs: [], milestones: p.milestones})));
  await Task.insertMany(s.tasks.map((t) => ({id: t.id, project: t.project, title: t.title, ms: t.ms, skills: t.skills, prio: t.prio, effort: t.effort, due: t.due,
    status: t.status, assignee: t.assignee, deps: t.deps, interest: t.interest})));
  await Pm.insertMany(s.pms);
  await Pref.insertMany(s.prefs.map((x) => ({u: x.u, t: x.t, stance: x.stance, note: x.note, target: x.target})));
  await Log.insertMany(s.log);
  // Counters hold the last id handed out.
  await Counter.insertMany([{_id: 'user', seq: s.nextUser - 1}, {_id: 'task', seq: s.nextTask - 1}, {_id: 'ms', seq: 1100}, {_id: 'project', seq: s.nextProject - 1}]);
  console.log(`Seeded ${s.users.length} users, ${s.projects.length} projects, ${s.tasks.length} tasks. Demo login: meera@cogniflow.dev / ${DEMO_PASSWORD}`);
  await mongoose.disconnect();
}
main().catch((e) => { console.error('Seed failed:', e.message); process.exit(1); });

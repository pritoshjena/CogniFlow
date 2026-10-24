// All data + business rules (ported unchanged from the original CogniFlow file).
var SKILLS=['React','Node.js','Python','UI/UX','Database','Testing','DevOps','Git','Docs','Mobile','ML'];
var LVL=['','Beginner','Intermediate','Advanced'];
var KEY='CogniFlow-v2', DAY=86400000;
var d0=new Date(); d0.setHours(0,0,0,0);
var today=d0.getTime();
var dt=function(n){return today+n*DAY};
var PR={High:0,Medium:1,Low:2};
var STL={todo:'To do',doing:'In progress',review:'In review',done:'Done'};

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
export var S=load();
function load(){try{var r=localStorage.getItem(KEY);if(r){var s=JSON.parse(r);if(s&&s.v===2)return s}}catch(e){}return seed()}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
/* ---------- helpers ---------- */
var U=function(id){return S.users.find(function(u){return u.id===id})};
var T=function(id){return S.tasks.find(function(t){return t.id===id})};
var proj=function(){return S.projects.find(function(p){return p.id===S.cur})};
var projById=function(id){return S.projects.find(function(p){return p.id===id})};
var allMs=function(){var r=[];S.projects.forEach(function(p){r=r.concat(p.milestones)});return r.concat(S.pms)};
var MS=function(id){return allMs().find(function(m){return m.id===id})};
var ptasks=function(){return S.tasks.filter(function(t){return t.project===S.cur})};
var plog=function(){return S.log.filter(function(l){var t=T(l.t);return t&&t.project===S.cur})};
var myProjects=function(){return S.projects.filter(function(p){return p.leader===S.me||p.team.indexOf(S.me)>-1})};
var canLead=function(){return !!me()};
var ledCount=function(id){return S.projects.filter(function(p){return p.leader===id}).length};
var roleLabel=function(id){return ledCount(id)>0?'Team leader':'Member'};
var withProject=function(id,fn){var old=S.cur;S.cur=id;try{return fn()}finally{S.cur=old}};
var getPref=function(uid,tid){return S.prefs.find(function(x){return x.u===uid&&x.t===tid})};
var setPref=function(uid,tid,patch){var x=getPref(uid,tid);if(!x){x={u:uid,t:tid,stance:null,note:'',target:null};S.prefs.push(x)}Object.assign(x,patch);return x};
var STANCE={want:'Keen',ok:'Fine with it',avoid:'Prefer not'};
var me=function(){return U(S.me)};
var isLeader=function(){var p=proj();return !!p&&p.leader===S.me};
var onTeam=function(id){var p=proj();return !!p&&(p.team.indexOf(id)>-1||p.leader===id)};
var team=function(){var p=proj();return p?p.team.map(U).filter(Boolean):[]};
var open=function(t){return t.status!=='done'};
var blockers=function(t){return t.deps.map(T).filter(function(d){return d&&d.status!=='done'})};
var isBlocked=function(t){return open(t)&&blockers(t).length>0};
var overdue=function(t){return open(t)&&t.due<today};
var fmt=function(ts){return new Date(ts).toLocaleDateString('en-GB',{day:'numeric',month:'short'})};
var first=function(u){return u.name.split(' ')[0]};
var initials=function(n){return n.split(/\s+/).map(function(w){return w[0]}).slice(0,2).join('').toUpperCase()};
function ago(ts){var m=Math.floor((Date.now()-ts)/60000);if(m<2)return 'just now';if(m<60)return m+' min ago';var h=Math.floor(m/60);if(h<24)return h+' h ago';var d=Math.floor(h/24);return d===1?'yesterday':d+' days ago'}
function dueText(t){var d=Math.round((t.due-today)/DAY);if(open(t)&&d<0)return (-d)+'d overdue';if(d===0)return 'Due today';return 'Due '+fmt(t.due)}
function downstream(id){var seen={},q=[id];while(q.length){var c=q.shift();S.tasks.forEach(function(t){if(t.deps.indexOf(c)>-1&&!seen[t.id]){seen[t.id]=1;q.push(t.id)}})}return Object.keys(seen).map(Number).map(T)}
var openEffort=function(uid){return S.tasks.filter(function(t){return t.assignee===uid&&open(t)}).reduce(function(a,t){return a+t.effort},0)};
var cap2=function(u){return u.cap*2};
var loadOf=function(u){return openEffort(u.id)/cap2(u)};
var stateOf=function(l){return l>1?['Overloaded','bad']:l<0.45?['Underused','info']:['Balanced','good']};
function fit(u,t){if(!t.skills.length)return 50;var s=t.skills.reduce(function(a,k){return a+((u.skills[k]||0)/3)},0)/t.skills.length;return Math.round(s*100)}
function reason(u,t){var m=t.skills.filter(function(k){return u.skills[k]}).map(function(k){return LVL[u.skills[k]]+' '+k});return m.length?m.join(', '):'No matching skill'}
function rank(t,loads){return team().map(function(u){var eff=loads?loads[u.id]:openEffort(u.id);var l=eff/cap2(u),f=fit(u,t);return {u:u,f:f,l:l,score:f*0.7+(1-Math.min(l,1.2)/1.2)*30}}).sort(function(a,b){return b.score-a.score})}
function plan(){var loads={};team().forEach(function(u){loads[u.id]=openEffort(u.id)});var out={};
  ptasks().filter(function(t){return open(t)&&!t.assignee}).sort(function(a,b){return PR[a.prio]-PR[b.prio]||a.due-b.due}).forEach(function(t){var r=rank(t,loads)[0];if(r){out[t.id]=r.u.id;loads[r.u.id]+=t.effort}});return out}
function recs(){var out=[],loads={};team().forEach(function(u){loads[u.id]=openEffort(u.id)});
  var guard=0;
  while(guard++<8){
    var over=team().filter(function(u){return loads[u.id]/cap2(u)>1});if(!over.length)break;
    var best=null;
    over.forEach(function(from){ptasks().filter(function(t){return t.assignee===from.id&&t.status==='todo'&&!out.some(function(o){return o.t.id===t.id})}).forEach(function(t){
      team().filter(function(u){return u.id!==from.id}).forEach(function(to){var f=fit(to,t),l=(loads[to.id]+t.effort)/cap2(to);
        if(l<=0.9&&f>=40&&(!best||f>best.f||(f===best.f&&t.effort>best.t.effort)))best={t:t,from:from,to:to,f:f,l:l}})})});
    if(!best)break;out.push(best);loads[best.from.id]-=best.t.effort;loads[best.to.id]+=best.t.effort}
  return out}
function msStats(m){
  var mts=ptasks().filter(function(t){return t.ms===m.id});
  var total=mts.reduce(function(a,t){return a+t.effort},0),done=mts.filter(function(t){return !open(t)}).reduce(function(a,t){return a+t.effort},0);
  var days=Math.max(1,Math.round((m.due-today)/DAY));
  var upto=ptasks().filter(function(t){return open(t)&&MS(t.ms).due<=m.due});
  var per={},tot=0;upto.forEach(function(t){tot+=t.effort;if(t.assignee)per[t.assignee]=(per[t.assignee]||0)+t.effort});
  var worst=0,who=null;Object.keys(per).forEach(function(k){var u=U(+k);if(!u||!onTeam(u.id))return;var r=per[k]/(u.cap/7*days*0.8);if(r>worst){worst=r;who=u}});
  var tc=team().reduce(function(a,u){return a+u.cap/7},0)*days*0.8,r2=tc?tot/tc:0,ratio=Math.max(worst,r2);
  var late=mts.filter(overdue).length;
  var st=ratio>1?'slip':(ratio>0.75||late)?'risk':'ok';
  if(total&&done===total)st='ok';
  return {m:m,total:total,done:done,pct:total?Math.round(done/total*100):0,ratio:ratio,who:worst>=r2?who:null,st:st,late:late,slipDays:Math.max(1,Math.ceil((ratio-1)*days))}}
function risks(){var r=[];
  ptasks().filter(overdue).forEach(function(t){var a=U(t.assignee),d=Math.round((today-t.due)/DAY);
    r.push({sev:3,title:'“'+t.title+'” is '+d+' day'+(d>1?'s':'')+' overdue',why:(a?'Assigned to '+a.name+'.':'Nobody is assigned.')+' Re-plan or reassign it.',task:t.id})});
  ptasks().filter(function(t){return isBlocked(t)&&t.due-today<=7*DAY}).forEach(function(t){var b=blockers(t)[0];
    r.push({sev:2,title:'“'+t.title+'” is blocked',why:'Waiting on “'+b.title+'”, and due '+fmt(t.due)+'.',task:t.id})});
  team().forEach(function(u){var l=loadOf(u);if(l>1)r.push({sev:3,title:u.name+' is at '+Math.round(l*100)+'% of fortnight capacity',why:openEffort(u.id)+'h of open work against '+cap2(u)+'h available. See the suggested redistribution.',view:'workload'})});
  proj().milestones.forEach(function(m){var s=msStats(m);if(s.st==='slip')r.push({sev:3,title:m.name+' will likely slip by about '+s.slipDays+' day'+(s.slipDays>1?'s':''),why:s.who?first(s.who)+' is the bottleneck for work due by '+fmt(m.due)+'.':'Open work due by '+fmt(m.due)+' exceeds team capacity.',view:'overview'});
    else if(s.st==='risk')r.push({sev:2,title:m.name+' is at risk',why:s.late?s.late+' overdue task'+(s.late>1?'s':'')+' in this milestone.':(s.who?first(s.who)+' has little slack before '+fmt(m.due)+'.':'Little slack before '+fmt(m.due)+'.'),view:'overview'})});
  ptasks().filter(function(t){return open(t)&&!t.assignee&&t.due-today<=14*DAY}).forEach(function(t){r.push({sev:2,title:'“'+t.title+'” has no owner',why:'Due '+fmt(t.due)+'. The team leader needs to assign it.',task:t.id})});
  team().forEach(function(u){var h=lastActive(u.id);if(openEffort(u.id)>0&&(!h||Date.now()-h>=3*DAY))r.push({sev:1,title:u.name+' has been quiet for '+(h?Math.floor((Date.now()-h)/DAY)+' days':'a while'),why:'Holding '+openEffort(u.id)+'h of open work. Worth a check-in.',view:'contrib'})});
  return r.sort(function(a,b){return b.sev-a.sev})}
function riskLevel(R){var c3=R.filter(function(x){return x.sev===3}).length;return c3>=2?{t:'High',c:'high'}:(c3>=1||R.length>=4)?{t:'Medium',c:'medium'}:{t:'Low',c:'low'}}
function lastActive(uid){var m=0;S.log.forEach(function(l){if(l.u===uid&&l.ts>m)m=l.ts});return m}
function logAct(u,type,t,pts){S.log.push({u:u,type:type,t:t?t.id:null,pts:pts,ts:Date.now()})}
function lp(l){return {complete:'completed',review:'reviewed',update:'posted an update on',reassign:'reassigned',assign:'was assigned'}[l.type]}

export function isoDay(n){return new Date(today+n*DAY-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)}
export function parseDay(v){var t=new Date(v+'T00:00:00').getTime();return isNaN(t)?null:t}

/** Summary numbers for one project (used by the Projects tab). */
export function projectStats(p){return withProject(p.id,function(){
  var ts=ptasks(),tot=ts.reduce(function(a,t){return a+t.effort},0),done=ts.filter(function(t){return !open(t)}).reduce(function(a,t){return a+t.effort},0);
  var R=risks(),lvl=riskLevel(R),ms=p.milestones.slice().sort(function(a,b){return a.due-b.due});
  var next=ms.find(function(m){return msStats(m).pct<100})||ms[ms.length-1];
  return {tasks:ts.length,open:ts.filter(open).length,tot:tot,done:done,pct:tot?Math.round(done/tot*100):0,lvl:lvl,signals:R.length,next:next,
    counts:{todo:ts.filter(function(t){return t.status==='todo'}).length,doing:ts.filter(function(t){return t.status==='doing'}).length,review:ts.filter(function(t){return t.status==='review'}).length,done:ts.filter(function(t){return t.status==='done'}).length}}})}

/** Replace the whole store with fresh sample data (keeps the same object reference). */
export function resetStore(){var n=seed();Object.keys(S).forEach(function(k){delete S[k]});Object.assign(S,n)}


/* ---------- Team recommendation ---------- */
/* Words in a project name/description that hint at a needed skill. */
var SKILL_HINTS={
  'React':['react','web','website','frontend','front-end','portal','dashboard','page','browser'],
  'Node.js':['backend','back-end','api','server','node','service','login','auth'],
  'Python':['python','data','analytics','analysis','script','automation','model'],
  'UI/UX':['ui','ux','design','wireframe','prototype','interface','user experience','usability','dashboard'],
  'Database':['database','sql','storage','records','schema','data'],
  'Testing':['test','testing','qa','quality','bug','validation'],
  'DevOps':['devops','deploy','deployment','ci','cloud','hosting','infrastructure','monitoring'],
  'Git':['git','github','version control','repository','repo','collaboration'],
  'Docs':['document','documentation','docs','report','presentation','guide','research','survey'],
  'Mobile':['mobile','android','ios','app','flutter'],
  'ML':['ml','machine learning','ai','predict','prediction','recommend','model','neural']
};
function suggestSkills(text){var t=' '+String(text||'').toLowerCase().replace(/[^a-z0-9+#/.\- ]/g,' ')+' ',out=[];
  SKILLS.forEach(function(k){var hit=(SKILL_HINTS[k]||[]).some(function(w){return t.indexOf(' '+w+' ')>-1||(w.length>3&&t.indexOf(' '+w)>-1)});if(hit)out.push(k)});return out}
/* Skills a project needs: the leader's list if set, otherwise the skills its tasks already ask for. */
function projectNeeds(p){if(p.needs&&p.needs.length)return p.needs.slice();var seen={};S.tasks.forEach(function(t){if(t.project===p.id)(t.skills||[]).forEach(function(k){seen[k]=1})});return Object.keys(seen)}
/* Average proficiency (0-100) across the needed skills. */
function matchPct(u,needs){if(!needs||!needs.length)return 0;return Math.round(needs.reduce(function(a,k){return a+((u.skills[k]||0)/3)},0)/needs.length*100)}
/* Greedy team builder: each pick is the person who adds the most coverage of still-weak needs; spare capacity breaks ties. */
function recommendTeam(needs,size,excludeIds){
  var pool=S.users.filter(function(u){return excludeIds.indexOf(u.id)<0}),best={},picked=[];
  needs.forEach(function(k){best[k]=0});
  while(picked.length<size&&pool.length){
    var top=null,topScore=-1;
    pool.forEach(function(u){var gain=needs.reduce(function(a,k){return a+Math.max(0,(u.skills[k]||0)/3-best[k])},0);
      var sc=gain+matchPct(u,needs)/1000-Math.min(loadOf(u),1.5)*0.05;if(sc>topScore){topScore=sc;top=u}});
    if(!top)break;
    picked.push(top.id);pool=pool.filter(function(u){return u.id!==top.id});
    needs.forEach(function(k){best[k]=Math.max(best[k],(top.skills[k]||0)/3)});
  }
  var rest=pool.slice().sort(function(a,b){return matchPct(b,needs)-matchPct(a,needs)}).map(function(u){return u.id});
  return {picked:picked,others:rest};
}

/* ---------- Milestone recommendation ---------- */
function isoOf(ts){return new Date(ts-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)}
/* Typical delivery phases. "when" says what in the project triggers the phase; rank decides what survives a tight milestone limit. */
var PHASES=[
  {key:'discovery',name:'Discovery and planning',w:1,rank:1,kw:['discovery','planning','plan','scope','requirement'],always:true,why:'Every project starts by agreeing scope, users and success criteria.'},
  {key:'research',name:'Research and data collection',w:1.2,rank:4,kw:['research','survey','interview','baseline','collection'],text:['research','survey','interview','study','audit','baseline'],why:'The description mentions research or data gathering that should finish before building.'},
  {key:'design',name:'Design and prototypes',w:1.5,rank:3,kw:['design','prototype','wireframe','ux','ui '],skills:['UI/UX','Mobile','React'],why:'The project needs UI, UX or front-end skills, so screens should be agreed before build.'},
  {key:'setup',name:'Repository and environment setup',w:0.7,rank:6,kw:['setup','repository','environment','ci '],skills:['DevOps','Git'],why:'DevOps or Git is required, so version control and environments come first.'},
  {key:'backend',name:'Data and backend foundation',w:1.5,rank:3,kw:['backend','database','data ','api','foundation','schema'],skills:['Database','Node.js','Python'],why:'Backend, data or Python skills are required, so the data layer must exist before features rely on it.'},
  {key:'model',name:'Model development',w:1.6,rank:3,kw:['model','machine learning','ml '],skills:['ML'],why:'Machine learning is required, so model work needs its own checkpoint.'},
  {key:'core',name:'Core features',w:3,rank:1,kw:['core','feature','build','implementation','development'],always:true,why:'The main build phase where most of the effort lands.'},
  {key:'testing',name:'Testing and QA',w:1.3,rank:2,kw:['test','qa','quality'],always:true,why:'Testing is needed before anything is shown to users.'},
  {key:'docs',name:'Documentation and handover',w:1,rank:5,kw:['documentation','handover','report','docs'],skills:['Docs'],why:'Docs are required, so reports and handover material get a deadline of their own.'},
  {key:'launch',name:'Launch and demo',w:1,rank:1,kw:['launch','demo','pilot','release','delivery','final'],always:true,why:'A clear finish line: ship, demo or hand over.'}
];
function recommendMilestones(p,endTs,max){
  var needs=projectNeeds(p),text=' '+((p.name||'')+' '+(p.desc||'')).toLowerCase()+' ',inferred=suggestSkills(text);
  var plan=PHASES.filter(function(ph){
    if(ph.always)return true;
    if(ph.skills&&ph.skills.some(function(k){return needs.indexOf(k)>-1||inferred.indexOf(k)>-1}))return true;
    return !!(ph.text&&ph.text.some(function(w){return text.indexOf(w)>-1}))});
  var total=plan.reduce(function(a,ph){return a+ph.w},0),start=Math.min(p.start,today),span=Math.max(endTs-start,DAY*plan.length*3),cum=0,floor=today+3*DAY,prev=0;
  var timed=plan.map(function(ph,i){cum+=ph.w;var due=Math.round((start+span*cum/total)/DAY)*DAY;due=Math.max(due,floor,prev+DAY);prev=due;return {key:ph.key,name:ph.name,why:ph.why,kw:ph.kw,due:due}});
  var have=p.milestones.map(function(m){return ' '+m.name.toLowerCase()+' '});
  var fresh=timed.filter(function(t){return !have.some(function(h){return t.kw.some(function(w){return h.indexOf(w)>-1})})});
  if(fresh.length>max){var rk={};PHASES.forEach(function(ph,i){rk[ph.key]=ph.rank*100+i});var keep=fresh.slice().sort(function(a,b){return rk[a.key]-rk[b.key]}).slice(0,Math.max(1,max));fresh=fresh.filter(function(t){return keep.indexOf(t)>-1})}
  return fresh.map(function(t){return {key:t.key,name:t.name,why:t.why,due:t.due}});
}
export {isoOf,recommendMilestones,SKILL_HINTS,suggestSkills,matchPct,recommendTeam,projectNeeds,ledCount,roleLabel,proj,projById,allMs,ptasks,plog,myProjects,canLead,withProject,getPref,setPref,STANCE,SKILLS,LVL,DAY,today,PR,STL,seed,save,U,T,MS,me,isLeader,onTeam,team,open,blockers,isBlocked,overdue,fmt,first,initials,ago,dueText,downstream,openEffort,cap2,loadOf,stateOf,fit,reason,rank,plan,recs,msStats,risks,riskLevel,lastActive,logAct,lp};

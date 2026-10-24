import React, {useState, useEffect, useReducer, useRef} from 'react';
import {isoOf, recommendMilestones, SKILL_HINTS, suggestSkills, matchPct, recommendTeam, projectNeeds, proj, projById, allMs, ptasks, plog, myProjects, canLead, withProject, getPref, setPref, STANCE, projectStats, SKILLS, LVL, DAY, today, PR, STL, seed, save, U, T, MS, me, isLeader, onTeam, team, open, blockers, isBlocked, overdue, fmt, first, initials, ago, dueText, downstream, openEffort, cap2, loadOf, stateOf, fit, reason, rank, plan, recs, msStats, risks, riskLevel, lastActive, logAct, lp, S, resetStore} from './store.js';
import {useApp} from './AppContext.js';
import {Ctx} from './AppContext.js';
import Shell from './components/Shell.jsx';
import AuthView from './views/AuthView.jsx';
import {isoDay, parseDay} from './store.js';

// Accounts that have actually signed in during this page session (in memory only, so a refresh clears it).
var signedIn=[];
const newDraft=function(){return {name:'',role:'member',cap:20,skills:{}}};

function App(){
  var authState=useState(false),authenticated=authState[0],setAuthenticated=authState[1];
  var bump=useReducer(function(x){return x+1},0)[1];
  var s1=useState('home'),view=s1[0],setView=s1[1];
  var s2=useState(false),menu=s2[0],setMenu=s2[1];
  var s3=useState(null),drawer=s3[0],setDrawer=s3[1];
  var s4=useState(false),modal=s4[0],setModal=s4[1];
  var s5=useState(false),mine=s5[0],setMine=s5[1];
  var s6=useState(null),sel=s6[0],setSel=s6[1];
  var s7=useState(3),slip=s7[0],setSlip=s7[1];
  var s8=useState(false),signup=s8[0],setSignup=s8[1];
  var s9=useState(newDraft),draft=s9[0],setDraft=s9[1];
  var s10=useState(null),td=s10[0],setTd=s10[1];
  var s11=useState(''),msg=s11[0],setMsg=s11[1];
  var s12=useState(null),detail=s12[0],setDetail=s12[1];
  var s13=useState(false),projModal=s13[0],setProjModal=s13[1];
  var s14=useState(null),pd=s14[0],setPd=s14[1];
  var timer=useRef(null);
  function toast(m){setMsg(m);clearTimeout(timer.current);timer.current=setTimeout(function(){setMsg('')},2600)}

  useEffect(function(){save()});
  useEffect(function(){
    function adoptLoginUser(data){
      var email=String(data.email||'').trim().toLowerCase();
      var name=String(data.name||'CogniFlow user').trim()||'CogniFlow user';
      var links={};
      try{links=JSON.parse(localStorage.getItem('CogniFlowLoginLinks-v1')||'{}')||{}}catch(e){}
      var linkedId=links[email],appUser=linkedId?U(linkedId):null;
      var skillMap={'Git':'Git','JavaScript':'React','HTML & CSS':'React','APIs':'Node.js','Project planning':'Docs','React':'React','Node.js':'Node.js','Python':'Python','Database':'Database','Testing':'Testing','DevOps':'DevOps','Documentation':'Docs','Presenting':'Docs','Flutter':'Mobile','UI design':'UI/UX','Figma':'UI/UX','UX research':'UI/UX'};
      var skills={};Object.keys(data.skills||{}).forEach(function(k){var target=skillMap[k];if(target){var level=Math.max(1,Math.min(3,Math.round((+data.skills[k]||2)*0.75)));skills[target]=Math.max(skills[target]||0,level)}});
      if(!appUser){
        appUser=S.users.find(function(x){return x.loginEmail===email})||null;
        if(!appUser){appUser={id:S.nextUser++,name:name,role:'member',cap:12,skills:skills,loginEmail:email};S.users.push(appUser)}
        appUser.loginEmail=email;links[email]=appUser.id;
        try{localStorage.setItem('CogniFlowLoginLinks-v1',JSON.stringify(links))}catch(e){}
      }
      appUser.name=name;appUser.skills=skills;appUser.loginEmail=email;
      // Give newly created login accounts a real workspace membership so the app opens on usable content.
      var home=S.projects.find(function(p){return p.id===1})||S.projects[0];
      if(home&&home.team.indexOf(appUser.id)<0&&home.leader!==appUser.id)home.team.push(appUser.id);
      S.me=appUser.id;if(signedIn.indexOf(appUser.id)<0)signedIn.push(appUser.id);
      var p=myProjects();if(!p.some(function(x){return x.id===S.cur}))S.cur=p.length?p[0].id:(home?home.id:S.cur);
      setDetail(null);setSignup(false);setView('home');setMenu(false);setDrawer(null);setAuthenticated(true);bump();
    }
    function onMessage(e){
      if(e.origin!==window.location.origin||!e.data||e.data.type!=='COGNIFLOW_AUTH_SUCCESS')return;
      adoptLoginUser(e.data.user||{});
    }
    window.addEventListener('message',onMessage);
    return function(){window.removeEventListener('message',onMessage)};
  },[]);
  useEffect(function(){
    var onKey=function(e){if(e.key==='Escape'){if(modal)setModal(false);else if(drawer)setDrawer(null);else if(menu)setMenu(false)}};
    var onClick=function(e){if(menu&&!e.target.closest('.menuwrap'))setMenu(false)};
    document.addEventListener('keydown',onKey);document.addEventListener('click',onClick);
    return function(){document.removeEventListener('keydown',onKey);document.removeEventListener('click',onClick)}
  },[modal,drawer,menu]);

  function pickProject(){var mp=myProjects();S.cur=mp.length?mp[0].id:null}
  function newProjectDraft(){return {name:'',desc:'',needs:[],ms:[{name:'Planning',due:isoDay(14)},{name:'Delivery',due:isoDay(28)}]}}
  function newTaskDraft(){return {title:'',ms:proj().milestones[0].id,prio:'Medium',effort:6,due:new Date(today+7*DAY-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10),skills:[],deps:[]}}
  function doAssign(id,uid){var t=T(id),prev=t.assignee;if(prev===uid)return;t.assignee=uid;t.interest=[];
    if(prev)logAct(S.me,'reassign',t,1);else logAct(uid,'assign',t,0);toast(first(U(uid))+' now owns “'+t.title+'”')}

  var A={
    nav:function(v){if(v==='projects')setDetail(null);setView(v||view);setMenu(false);setDrawer(null);window.scrollTo(0,0)},
    toggleMenu:function(){setMenu(function(m){return !m})},
    switchTo:function(id){if(signedIn.indexOf(id)<0){toast('That account is not signed in. Sign in with it first.');return}S.me=id;pickProject();setDetail(null);setSignup(false);setMenu(false);setDrawer(null);setView('home');toast('Signed in as '+first(U(id)));bump()},
    addAccount:function(){setMenu(false);setDrawer(null);setAuthenticated(false)},
    backAuth:function(){setSignup(false)},
    signOut:function(){signedIn=signedIn.filter(function(x){return x!==S.me});S.me=null;setAuthenticated(false);setMenu(false);setDrawer(null);setSignup(false);bump()},
    openTask:function(id){var t=T(id);if(t&&t.project&&t.project!==S.cur){S.cur=t.project;setDetail(null)}setDrawer(id)},
    openProject:function(id){S.cur=id;setDetail(id);setView('projects');setMenu(false);setDrawer(null);bump();window.scrollTo(0,0)},
    touch:function(){bump()},
    toast:toast,
    newProject:function(){setPd(newProjectDraft());setProjModal(true)},
    cancelProject:function(){setProjModal(false)},
    pdAddMs:function(){setPd(function(d){return Object.assign({},d,{ms:d.ms.concat([{name:'',due:isoDay(35)}])})})},
    pdRemoveMs:function(i){setPd(function(d){return Object.assign({},d,{ms:d.ms.filter(function(_,j){return j!==i})})})},
    pdNeed:function(k){setPd(function(d){var n=d.needs.slice(),j=n.indexOf(k);if(j>-1)n.splice(j,1);else n.push(k);return Object.assign({},d,{needs:n})})},
    saveProject:function(){var d=pd;if(!d.name.trim()){toast('Name the project first.');return}
      var ms=[];for(var i=0;i<d.ms.length;i++){var m=d.ms[i];if(!m.name.trim()){toast('Name every milestone, or remove the empty ones.');return}var due=parseDay(m.due);if(due===null){toast('Pick a date for every milestone.');return}ms.push({id:S.nextMs++,name:m.name.trim(),due:due})}
      ms.sort(function(a,b){return a.due-b.due});
      var np={id:S.nextProject++,name:d.name.trim(),desc:d.desc.trim(),leader:S.me,start:today,team:[S.me],needs:d.needs.slice(),milestones:ms};
      S.projects.push(np);S.cur=np.id;setProjModal(false);setDetail(np.id);setView('projects');toast('Project created. Open the Team box to get a team recommendation.');bump()},
    close:function(){setDrawer(null)},
    addMilestones:function(rows){var p=proj();if(!p||!isLeader()){toast('Only the team leader can add milestones.');return false}
      var out=[];for(var i=0;i<rows.length;i++){var r=rows[i],nm=String(r.name||'').trim(),due=parseDay(r.due);
        if(!nm){toast('Name every milestone you are adding.');return false}if(due===null){toast('Pick a date for “'+nm+'”.');return false}out.push({id:S.nextMs++,name:nm,due:due})}
      if(!out.length){toast('Nothing selected to add.');return false}
      out.forEach(function(m){p.milestones.push(m)});p.milestones.sort(function(a,b){return a.due-b.due});
      toast(out.length+' milestone'+(out.length>1?'s':'')+' added');bump();return true},
    /* Import an approved AI plan: milestones (reused by name), tasks with dependencies, owners (added to the team). */
    applyAiPlan:function(rows){var p=proj();if(!p||!isLeader()){toast('Only the team leader can approve an AI plan.');return false}
      var chosen=rows.filter(function(r){return r.on&&String(r.title||'').trim()});if(!chosen.length){toast('Nothing selected to add.');return false}
      for(var i=0;i<chosen.length;i++){if(parseDay(chosen[i].due)===null){toast('Pick a due date for “'+chosen[i].title+'”.');return false}}
      var msIds={},newMs=0;
      chosen.forEach(function(r){var key=r.ms.toLowerCase();if(msIds[key])return;
        var ex=p.milestones.find(function(m){return m.name.toLowerCase()===key});
        if(ex){msIds[key]=ex.id;return}
        var due=0;chosen.forEach(function(x){if(x.ms.toLowerCase()===key)due=Math.max(due,parseDay(x.due))});
        var nm={id:S.nextMs++,name:r.ms,due:due};p.milestones.push(nm);msIds[key]=nm.id;newMs++});
      p.milestones.sort(function(a,b){return a.due-b.due});
      var idMap={};chosen.forEach(function(r){idMap[r.key]=S.nextTask++});
      var added=0,joined=0;
      chosen.forEach(function(r){
        var deps=r.deps.filter(function(k){return idMap[k]!==undefined}).map(function(k){return idMap[k]});
        var uid=r.assignee!=null&&U(r.assignee)?r.assignee:null;
        if(uid&&p.team.indexOf(uid)<0&&p.leader!==uid){p.team.push(uid);joined++}
        var t={project:S.cur,id:idMap[r.key],title:r.title.trim(),ms:msIds[r.ms.toLowerCase()],skills:r.skills.slice(),prio:r.prio,effort:Math.max(1,+r.effort||1),due:parseDay(r.due),status:'todo',assignee:uid,deps:deps,interest:[]};
        S.tasks.push(t);if(uid)logAct(uid,'assign',t,0);added++});
      toast(added+' task'+(added>1?'s':'')+' added'+(newMs?', '+newMs+' new milestone'+(newMs>1?'s':''):'')+(joined?'; '+joined+' member'+(joined>1?'s':'')+' joined the team':''));bump();return true},
    approveTeam:function(ids,needs){var p=proj();if(!p||!isLeader()){toast('Only the team leader can approve a team.');return}
      p.needs=needs.slice();var n=0;ids.forEach(function(id){if(p.team.indexOf(id)<0&&p.leader!==id){p.team.push(id);n++}});
      toast(n?n+' member'+(n>1?'s':'')+' approved and added to the team':'No new members selected');bump()},
    addMember:function(id){var p=proj();if(!p||!isLeader()){toast('Only the team leader can add members.');return}
      if(p.team.indexOf(id)<0){p.team.push(id);toast(first(U(id))+' added to the team')}bump()},
    removeMember:function(id){var p=proj();if(!p||!isLeader()){toast('Only the team leader can remove members.');return}if(id===p.leader)return;
      var ix=p.team.indexOf(id);if(ix<0)return;var n=0;ptasks().forEach(function(t){if(t.assignee===id&&open(t)){t.assignee=null;n++;logAct(S.me,'reassign',t,1)}});
      p.team.splice(ix,1);toast(first(U(id))+' removed'+(n?'; '+n+' task'+(n>1?'s':'')+' returned to unassigned':''));bump()},
    terminateProject:function(id){var p=projById(id);if(!p||p.leader!==S.me){toast('Only this project’s team leader can terminate it.');return}
      var ids={};S.tasks.forEach(function(t){if(t.project===id)ids[t.id]=1});
      S.tasks=S.tasks.filter(function(t){return t.project!==id});S.log=S.log.filter(function(l){return !ids[l.t]});S.prefs=S.prefs.filter(function(x){return !ids[x.t]});
      S.projects=S.projects.filter(function(x){return x.id!==id});pickProject();setDetail(null);setView('projects');setDrawer(null);toast('“'+p.name+'” was terminated');bump()},
    setStatus:function(id,st){var t=T(id);if(!t)return;if(st!=='todo'&&isBlocked(t)){toast('Finish “'+blockers(t)[0].title+'” first.');return}
      if(t.assignee!==S.me&&!isLeader()){toast('Only the owner or the team leader can move this task.');return}
      t.status=st;logAct(S.me,'update',t,1);toast('Moved to '+STL[st]);bump()},
    progress:function(id){logAct(S.me,'update',T(id),1);toast('Progress update logged');bump()},
    approve:function(id){var t=T(id);if(t.assignee===S.me&&!isLeader()){toast('Someone else needs to review your work.');return}
      logAct(S.me,'review',t,3);if(t.assignee)logAct(t.assignee,'complete',t,t.effort);t.status='done';toast('Approved and completed');bump()},
    assign:function(id,uid){doAssign(id,uid);bump()},
    approveAll:function(){var p=plan();Object.keys(p).forEach(function(k){doAssign(+k,p[k])});toast('Suggestions approved');bump()},
    interest:function(id){var t=T(id),i=t.interest.indexOf(S.me);if(i>-1)t.interest.splice(i,1);else{t.interest.push(S.me);toast('Your interest is visible to the team leader')}bump()},
    teamToggle:function(id){var tm=proj().team,ix=tm.indexOf(id);
      if(ix>-1){var n=0;ptasks().forEach(function(t){if(t.assignee===id&&open(t)){t.assignee=null;n++;logAct(S.me,'reassign',t,1)}});tm.splice(ix,1);toast(first(U(id))+' removed'+(n?'; '+n+' task'+(n>1?'s':'')+' returned to unassigned':''))}
      else{tm.push(id);toast(first(U(id))+' added to the team')}bump()},
    applyRec:function(id,to){doAssign(id,to);bump()},
    toggleMine:function(){setMine(function(m){return !m})},
    selectNode:function(id){setSel(function(s){return s===id?null:id})},
    addTask:function(){setTd(newTaskDraft());setModal(true)},
    cancelTask:function(){setModal(false)},
    tdSkill:function(k){setTd(function(d){var sk=d.skills.slice(),j=sk.indexOf(k);if(j>-1)sk.splice(j,1);else sk.push(k);return Object.assign({},d,{skills:sk})})},
    tdDep:function(id,checked){setTd(function(d){var dp=d.deps.filter(function(x){return x!==id});if(checked)dp.push(id);return Object.assign({},d,{deps:dp})})},
    saveTask:function(){var d=td;if(!d.title.trim()){toast('Give the task a name first.');return}
      var due=new Date(d.due+'T00:00:00').getTime();if(isNaN(due)){toast('Pick a deadline.');return}
      S.tasks.push({project:S.cur,id:S.nextTask++,title:d.title.trim(),ms:+d.ms,skills:d.skills.slice(),prio:d.prio,effort:Math.max(1,+d.effort||1),due:due,status:'todo',assignee:null,deps:d.deps.slice(),interest:[]});
      setModal(false);setView('assign');toast('Task added. See the suggested owner.');bump()},
    setRole:function(r){setDraft(function(d){return Object.assign({},d,{role:r})})},
    cycleSkill:function(k){setDraft(function(d){var sk=Object.assign({},d.skills),v=((sk[k]||0)+1)%4;if(v)sk[k]=v;else delete sk[k];return Object.assign({},d,{skills:sk})})},
    create:function(){var dr=draft;if(!dr.name.trim()){toast('Enter your name first.');return}if(!Object.keys(dr.skills).length){toast('Pick at least one skill so we can match work to you.');return}
      var nu={id:S.nextUser++,name:dr.name.trim(),role:dr.role,cap:Math.min(60,Math.max(4,+dr.cap||20)),skills:Object.assign({},dr.skills)};
      S.users.push(nu);S.me=nu.id;pickProject();setDetail(null);setSignup(false);setView('home');toast('Welcome, '+first(nu)+'. Your skills are saved.');bump()}
  };

  var ctx={signedIn:signedIn,detail:detail,projModal:projModal,pd:pd,setPd:setPd,view:view,menu:menu,drawer:drawer,modal:modal,mine:mine,sel:sel,slip:slip,draft:draft,td:td,setSlip:setSlip,setDraft:setDraft,setTd:setTd,A:A};
  if(!authenticated)return <div className="login-gate"><iframe title="CogniFlow sign in" src="/login/index.html" /></div>;
  return <Ctx.Provider value={ctx}>
    {(S.me==null||signup)?<AuthView/>:<Shell/>}
    <div className="toast" role="status" aria-live="polite">{msg}</div>
  </Ctx.Provider>}

export default App;

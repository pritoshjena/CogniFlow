import React, {useState, useEffect, useReducer, useRef} from 'react';
import {isoOf, recommendMilestones, matchPct, recommendTeam, projectNeeds, proj, projById, allMs, ptasks, plog, myProjects, canLead, withProject, getPref, setPref, STANCE, projectStats, isoDay, parseDay, SKILLS, LVL, DAY, today, PR, STL, seed, save, U, T, MS, me, isLeader, onTeam, team, open, blockers, isBlocked, overdue, fmt, first, initials, ago, dueText, downstream, openEffort, cap2, loadOf, stateOf, fit, reason, rank, plan, recs, msStats, risks, riskLevel, lastActive, logAct, lp, S, resetStore} from '../store.js';
import {useApp} from '../AppContext.js';
import {Av, Logo, LoadBar, SkillChips, TaskCard, Feed, Ruler, LINK, LINK6} from '../components/common.jsx';

import WaitingView from './WaitingView.jsx';
import AiPlanBox from '../components/AiPlanBox.jsx';

function ProjectCard(p){var pr=p.p,A=useApp().A,st=projectStats(pr),L=U(pr.leader),members=pr.team.map(U).filter(Boolean);
  return <button className="pcard" onClick={function(){A.openProject(pr.id)}}>
    <span className="pc-head"><span className="pc-name">{pr.name}</span>{pr.id===S.cur?<span className="pill info">Viewing</span>:null}</span>
    <span className="pc-desc">{pr.desc||'No description yet.'}</span>
    <span className="seg-bar" aria-hidden="true"><i style={{width:st.pct+'%'}}/></span>
    <span className="pc-row"><span className="mono">{st.pct}% done</span><span className={'pill '+(st.lvl.c==='high'?'bad':st.lvl.c==='medium'?'warn':'good')}>{st.lvl.t} risk</span></span>
    <span className="pc-row sub"><span>{st.open} open task{st.open===1?'':'s'}</span><span>Next: {st.next?st.next.name+' · '+fmt(st.next.due):'none'}</span></span>
    <span className="pc-row"><span className="pc-av">{members.slice(0,5).map(function(u){return <Av key={u.id} u={u} sz="sm"/>})}{members.length>5?<span className="sub">+{members.length-5}</span>:null}</span><small>Led by {L?first(L):'—'}</small></span>
  </button>}

function MilestoneBox(p){var pr=p.p,st=p.st,L=p.L,A=useApp().A,leader=pr.leader===S.me;
  var last=pr.milestones.length?pr.milestones[pr.milestones.length-1].due:today;
  var defEnd=isoOf(Math.max(last,today+14*DAY));
  var s1=useState(null),panel=s1[0],setPanel=s1[1];
  var s2=useState(defEnd),end=s2[0],setEnd=s2[1];
  var s3=useState(5),max=s3[0],setMax=s3[1];
  var s4=useState(null),rows=s4[0],setRows=s4[1];
  var s5=useState({name:'',due:isoOf(today+14*DAY)}),nm=s5[0],setNm=s5[1];
  function openRec(){setEnd(defEnd);setRows(null);setPanel('rec')}
  function run(){var e=parseDay(end);if(e===null||e<=today+3*DAY){A.toast('Pick a project end date at least a few days from today.');return}
    var r=recommendMilestones(pr,e,Math.max(1,+max||1));setRows(r.map(function(x){return {key:x.key,name:x.name,why:x.why,due:isoOf(x.due),on:true}}))}
  function upd(i,k,v){setRows(function(rs){return rs.map(function(r,j){return j===i?Object.assign({},r,{[k]:v}):r})})}
  function approve(){var chosen=rows.filter(function(r){return r.on});if(A.addMilestones(chosen)){setPanel(null);setRows(null)}}
  function addOne(){if(A.addMilestones([nm])){setNm({name:'',due:isoOf(today+14*DAY)});setPanel(null)}}
  var picked=rows?rows.filter(function(r){return r.on}).length:0;
  return <section className="card"><div className="row between wrapr" style={{gap:10}}><h2 className="sec" style={{margin:0}}>Milestones ({pr.milestones.length})</h2>
      {leader?<div className="row" style={{gap:8}}><button className="btn blue sm" onClick={openRec}>Milestone recommendation</button><button className="btn sm" onClick={function(){setPanel(panel==='add'?null:'add')}}>Add milestone</button></div>:null}</div>
    {panel==='rec'?<div className="recpanel">
      <b>Plan the milestones</b><small style={{display:'block'}}>CogniFlow reads the project name, description and required skills ({projectNeeds(pr).join(', ')||'none set yet'}), picks the delivery phases that fit, and spaces them out up to your end date. Phases you already have are skipped.</small>
      <div className="row wrapr" style={{gap:10,marginTop:10,alignItems:'flex-end'}}><div className="field" style={{maxWidth:180}}><label htmlFor="ms-end">Project end date</label><input className="inp" id="ms-end" type="date" value={end} onChange={function(e){setEnd(e.target.value);setRows(null)}}/></div><div className="field" style={{maxWidth:150}}><label htmlFor="ms-max">Max milestones</label><input className="inp" id="ms-max" type="number" min="1" max="9" value={max} onChange={function(e){setMax(e.target.value);setRows(null)}}/></div><button className="btn blue" onClick={run}>Recommend milestones</button><button className="btn ghost" onClick={function(){setPanel(null)}}>Cancel</button></div>
      {rows?<div style={{marginTop:14}}>{rows.length?<><b>Recommended milestones</b><small style={{display:'block'}}>Rename or re-date anything, untick what you do not want, then approve.</small>
        <ul className="list">{rows.map(function(r,i){return <li key={r.key} style={{padding:'10px 0'}}><div className="row wrapr" style={{gap:10,alignItems:'flex-start'}}><input type="checkbox" style={{marginTop:9}} aria-label={'Include '+r.name} checked={r.on} onChange={function(e){upd(i,'on',e.target.checked)}}/><span className="grow" style={{flexBasis:220}}><input className="inp" aria-label={'Name of milestone '+(i+1)} value={r.name} onChange={function(e){upd(i,'name',e.target.value)}}/><small style={{display:'block',marginTop:4}}>{r.why}</small></span><input className="inp" style={{maxWidth:160}} type="date" aria-label={'Date of milestone '+(i+1)} value={r.due} onChange={function(e){upd(i,'due',e.target.value)}}/></div></li>})}</ul>
        <div className="row" style={{justifyContent:'flex-end',marginTop:10}}><button className="btn primary" disabled={!picked} onClick={approve}>Approve milestones ({picked})</button></div></>:<p className="empty">Your milestones already cover the usual phases for this project. Use Add milestone for anything custom.</p>}</div>:null}
    </div>:null}
    {panel==='add'?<div className="recpanel"><div className="row between"><b>Add a milestone</b><button className="btn ghost sm" onClick={function(){setPanel(null)}}>Close</button></div>
      <div className="row wrapr" style={{gap:10,marginTop:8,alignItems:'flex-end'}}><div className="field grow" style={{flexBasis:200}}><label htmlFor="ms-name">Milestone name</label><input className="inp" id="ms-name" value={nm.name} onChange={function(e){setNm({name:e.target.value,due:nm.due})}} placeholder="For example: Beta release"/></div><div className="field" style={{maxWidth:180}}><label htmlFor="ms-due">Due date</label><input className="inp" id="ms-due" type="date" value={nm.due} onChange={function(e){setNm({name:nm.name,due:e.target.value})}}/></div><button className="btn primary" onClick={addOne}>Add milestone</button></div></div>:null}
    <div style={{marginTop:12}}><Ruler/></div><small style={{display:'block',marginTop:10}}>{st.done} of {st.tot} estimated hours complete · started {fmt(pr.start)} · led by {L?L.name:'—'}</small></section>}

function TeamBox(p){var pr=p.p,A=useApp().A,leader=pr.leader===S.me;
  var s1=useState(null),panel=s1[0],setPanel=s1[1];
  var s2=useState([]),needs=s2[0],setNeeds=s2[1];
  var s3=useState(3),size=s3[0],setSize=s3[1];
  var s4=useState(null),res=s4[0],setRes=s4[1];
  var s5=useState([]),sel=s5[0],setSel=s5[1];
  var members=pr.team.map(U).filter(Boolean),pn=projectNeeds(pr);
  function openRec(){setNeeds(pn);setRes(null);setSel([]);setPanel('rec')}
  function toggleNeed(k){setNeeds(function(n){return n.indexOf(k)>-1?n.filter(function(x){return x!==k}):n.concat([k])});setRes(null)}
  function run(){if(!needs.length)return;var r=recommendTeam(needs,Math.max(1,+size||1),pr.team);setRes(r);setSel(r.picked.slice())}
  function tog(id){setSel(function(x){return x.indexOf(id)>-1?x.filter(function(y){return y!==id}):x.concat([id])})}
  function approve(){A.approveTeam(sel,needs);setPanel(null);setRes(null)}
  var chosen=sel.map(U).filter(Boolean),uncovered=needs.filter(function(k){return !chosen.some(function(u){return (u.skills[k]||0)>=2})});
  var cands=res?res.picked.concat(res.others):[];
  var addList=S.users.filter(function(u){return pr.team.indexOf(u.id)<0&&u.id!==pr.leader}).sort(function(a,b){return matchPct(b,pn)-matchPct(a,pn)});
  function matchPill(u){return pn.length?<span className="pill info" title={'Average proficiency across: '+pn.join(', ')}>{matchPct(u,pn)}% match</span>:null}
  return <section className="card"><div className="row between wrapr" style={{gap:10}}><h2 className="sec" style={{margin:0}}>Team ({members.length})</h2>
      {leader?<div className="row" style={{gap:8}}><button className="btn blue sm" onClick={openRec}>Team recommendation</button><button className="btn sm" onClick={function(){setPanel(panel==='add'?null:'add')}}>Add member</button></div>:null}</div>
    {pn.length?<small style={{display:'block',margin:'8px 0 0'}}>Skills this project needs: {pn.join(', ')}</small>:null}
    {panel==='rec'?<div className="recpanel">
      <b>Which skills should the team cover?</b>
      <div className="chips" style={{marginTop:8}}>{SKILLS.map(function(k){var on=needs.indexOf(k)>-1;return <button type="button" key={k} className={'skillchip'+(on?' l3':'')} aria-pressed={on} onClick={function(){toggleNeed(k)}}><span>{k}</span></button>})}</div>
      <div className="row wrapr" style={{gap:10,marginTop:12,alignItems:'flex-end'}}><div className="field" style={{maxWidth:150}}><label htmlFor="rec-size">People to add</label><input className="inp" id="rec-size" type="number" min="1" max="12" value={size} onChange={function(e){setSize(e.target.value);setRes(null)}}/></div><button className="btn blue" disabled={!needs.length} onClick={run}>Recommend team</button><button className="btn ghost" onClick={function(){setPanel(null)}}>Cancel</button></div>
      {!needs.length?<small style={{display:'block',marginTop:6}}>Select at least one skill.</small>:null}
      {res?<div style={{marginTop:14}}>
        {cands.length?<><b>Recommended team</b><small style={{display:'block'}}>Best fit is pre-selected. Tick or untick people, then approve.</small>
          <ul className="list">{cands.map(function(id){var u=U(id),rec=res.picked.indexOf(id)>-1,cov=needs.filter(function(k){return (u.skills[k]||0)>=2});
            return <li key={id} style={{padding:'10px 0'}}><label className="row wrapr" style={{gap:10,cursor:'pointer'}}><input type="checkbox" checked={sel.indexOf(id)>-1} onChange={function(){tog(id)}}/><Av u={u}/><span className="grow" style={{flexBasis:160}}><b>{u.name}</b> {rec?<span className="pill good">Recommended</span>:null}<div style={{marginTop:6}}><SkillChips u={u}/></div><small>Covers: {cov.length?cov.join(', '):'none strongly'}</small></span><span className="pill info">{matchPct(u,needs)}% match</span></label></li>})}</ul>
          {uncovered.length?<div className="notice">Not strongly covered by the selected people: {uncovered.join(', ')}.</div>:<small style={{display:'block'}}>Every required skill is covered at Intermediate level or better.</small>}
          <div className="row" style={{justifyContent:'flex-end',marginTop:10}}><button className="btn primary" disabled={!sel.length} onClick={approve}>Approve team ({sel.length})</button></div></>:<p className="empty">Everyone is already on this project.</p>}
      </div>:null}
    </div>:null}
    {panel==='add'?<div className="recpanel"><div className="row between"><b>Add a member</b><button className="btn ghost sm" onClick={function(){setPanel(null)}}>Close</button></div>
      {addList.length?<ul className="list">{addList.map(function(u){return <li key={u.id} style={{padding:'10px 0'}}><div className="row wrapr"><Av u={u}/><span className="grow" style={{flexBasis:160}}><b>{u.name}</b> {matchPill(u)}<div style={{marginTop:6}}><SkillChips u={u}/></div></span><button className="btn primary sm" onClick={function(){A.addMember(u.id)}}>Add</button></div></li>})}</ul>:<p className="empty">Everyone is already on this project.</p>}</div>:null}
    <ul className="list">{members.map(function(u){var l=loadOf(u),isL=u.id===pr.leader;return <li key={u.id} style={{padding:'10px 0'}}><div className="row wrapr"><Av u={u}/><span className="grow" style={{flexBasis:140}}><b>{u.name}</b> <span className="pill">{isL?'Leader':'Member'}</span> {matchPill(u)}<div style={{marginTop:6}}><SkillChips u={u}/></div></span><span className="row" style={{gap:8,minWidth:130}}><LoadBar l={l}/><span className="pct">{Math.round(l*100)}%</span></span>{leader&&!isL?<button className="btn sm" onClick={function(){A.removeMember(u.id)}}>Remove member</button>:null}</div></li>})}</ul>
    <small>Match % is the member’s average proficiency across the skills this project needs. Load counts hours on all projects and personal tasks.</small></section>}

function TerminateZone(p){var pr=p.p,A=useApp().A,s1=useState(false),ask=s1[0],setAsk=s1[1],s2=useState(''),txt=s2[0],setTxt=s2[1];
  if(pr.leader!==S.me)return null;
  var n=S.tasks.filter(function(t){return t.project===pr.id}).length;
  return <section className="card dangerzone"><h2 className="sec" style={{color:'var(--bad)'}}>Terminate project</h2>
    {!ask?<div className="row between wrapr" style={{gap:10}}><p className="sub" style={{margin:0}}>Only you, as this project’s team leader, can see and use this.</p><button className="btn red" onClick={function(){setAsk(true)}}>Terminate project</button></div>
    :<div className="stack" style={{gap:10}}><p style={{margin:0}}>This permanently deletes <b>{pr.name}</b>, its {n} task{n===1?'':'s'} and its activity for the whole team. It cannot be undone.</p>
      <div className="field"><label htmlFor="term-name">Type the project name to confirm</label><input className="inp" id="term-name" value={txt} onChange={function(e){setTxt(e.target.value)}} placeholder={pr.name}/></div>
      <div className="row" style={{gap:8}}><button className="btn red" disabled={txt.trim()!==pr.name} onClick={function(){A.terminateProject(pr.id)}}>Yes, terminate permanently</button><button className="btn" onClick={function(){setAsk(false);setTxt('')}}>Keep project</button></div></div>}
  </section>}

function ProjectDetail(p){var pr=p.p,A=useApp().A,st=projectStats(pr),L=U(pr.leader),R=risks(),leader=isLeader();
  var links=[['overview','Overview'],['board','Board'],['workload','Workload'],['deps','Dependencies'],['contrib','Contributions'],['risks','Risks']];
  if(leader)links.splice(1,0,['assign','Assign work'],['team','Team']);
  return <>
    <header className="pagehead"><div><button className="btn ghost sm" style={{paddingLeft:0}} onClick={function(){A.nav('projects')}}>← All projects</button><p className="eyebrow" style={{marginTop:6}}>Project</p><h1>{pr.name}</h1><p className="sub">{pr.desc||'No description yet.'}</p></div>
      <div className={'risk '+st.lvl.c}><span className="eyebrow">Delivery risk</span><strong>{st.lvl.t}</strong><span className="sub">{st.signals} open signal{st.signals===1?'':'s'}</span></div></header>
    <section className="card"><h2 className="sec">Open this project in</h2><div className="chips">{links.map(function(l){return <button key={l[0]} className="btn sm" onClick={function(){A.nav(l[0])}}>{l[1]}</button>})}</div><small style={{display:'block',marginTop:8}}>The other tabs now show this project.</small></section>
    <div className="statgrid">{[['To do',st.counts.todo],['In progress',st.counts.doing],['In review',st.counts.review],['Done',st.counts.done]].map(function(x){return <div className="stat" key={x[0]}><strong className="mono">{x[1]}</strong><span className="sub">{x[0]}</span></div>})}</div>
    <MilestoneBox p={pr} st={st} L={L}/>
    {leader?<AiPlanBox p={pr}/>:null}
    <TeamBox p={pr}/>
    <section className="card"><h2 className="sec">Top signals</h2>{R.length?<ul className="list">{R.slice(0,4).map(function(r,i){return <li key={i}><button className="att" onClick={function(){r.task?A.openTask(r.task):A.nav(r.view||'risks')}}><span className={'sev s'+r.sev}></span><span><strong>{r.title}</strong><small>{r.why}</small></span></button></li>})}</ul>:<p className="empty">Nothing is flagged. The project is moving cleanly.</p>}</section>
    <section className="card"><h2 className="sec">Recent activity</h2><Feed n={5}/></section>
    <TerminateZone p={pr}/>
  </>}

function NewProjectBar(){var A=useApp().A;
  return <section className="card newbar"><div className="row between wrapr" style={{gap:12}}><div><h2 className="sec" style={{marginBottom:2}}>Start a new project</h2><p className="sub" style={{margin:0}}>Create your own project, add members and milestones, and you become its team leader. In other people’s projects you stay a member.</p></div><button className="btn primary" onClick={A.newProject}>+ New project</button></div></section>}

export function ProjectsView(){var c=useApp(),A=c.A,mine=myProjects();
  if(!mine.length)return <>
    <header className="pagehead"><div><p className="eyebrow">Workspace</p><h1>Projects</h1><p className="sub">You are not on any project yet. Create your own, or wait to be added to someone else’s.</p></div></header>
    <NewProjectBar/>
    <WaitingView/>
  </>;
  if(c.detail&&c.detail===S.cur&&mine.some(function(x){return x.id===c.detail}))return <ProjectDetail p={projById(c.detail)}/>;
  var led=mine.filter(function(x){return x.leader===S.me}),inn=mine.filter(function(x){return x.leader!==S.me});
  function group(title,list){return list.length?<section><h2 style={{marginBottom:10}}>{title} <span className="pill">{list.length}</span></h2><div className="pgrid">{list.map(function(x){return <ProjectCard key={x.id} p={x}/>})}</div></section>:null}
  return <>
    <header className="pagehead"><div><p className="eyebrow">Workspace</p><h1>Projects</h1><p className="sub">Every project you lead or belong to. Open one to see its team, milestones, risks and progress.</p></div></header>
    <NewProjectBar/>
    {group(led.length&&inn.length?'Projects you lead':'Your projects',led.length?led:inn)}
    {led.length&&inn.length?group('Projects you are a member of',inn):null}
  </>}
export default ProjectsView;

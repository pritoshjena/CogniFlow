import React, {useState, useEffect, useReducer, useRef} from 'react';
import {proj, projById, allMs, ptasks, plog, myProjects, canLead, withProject, getPref, setPref, STANCE, projectStats, SKILLS, LVL, DAY, today, PR, STL, seed, save, U, T, MS, me, isLeader, onTeam, team, open, blockers, isBlocked, overdue, fmt, first, initials, ago, dueText, downstream, openEffort, cap2, loadOf, stateOf, fit, reason, rank, plan, recs, msStats, risks, riskLevel, lastActive, logAct, lp, S, resetStore} from '../store.js';
import {useApp} from '../AppContext.js';
import {requestAssignments} from '../aiClient.js';
import {Av, Logo, LoadBar, SkillChips, TaskCard, Feed, Ruler, LINK, LINK6} from '../components/common.jsx';

export function AssignRow(p){var t=p.t,top=p.top,why=p.why,A=useApp().A,rk=rank(t),intr=t.interest.map(U).filter(Boolean);
  var st=useState(null),choice=st[0],setChoice=st[1],val=choice!==null?choice:(top||(rk[0]&&rk[0].u.id));
  return <li style={{padding:'14px 0'}}>
    <div className="row wrapr" style={{alignItems:'flex-start'}}><span className={'dot p-'+t.prio} style={{marginTop:7}}></span>
      <span className="grow" style={{flexBasis:240}}><button className="btn ghost" style={LINK6} onClick={function(){A.openTask(t.id)}}>{t.title}</button><small style={{display:'block'}}>{MS(t.ms).name} · {t.effort}h · {dueText(t)}{t.deps.length?' · after '+t.deps.length+' task'+(t.deps.length>1?'s':''):''}</small></span>
      <span className="chips">{t.skills.map(function(s){return <span className="skill" key={s}>{s}</span>})}</span></div>
    <div className="row wrapr" style={{marginTop:10}}>
      <span className="row" style={{gap:6}}>{top?<><Av u={U(top)} sz="sm"/><span className="sub">Suggested: <b>{first(U(top))}</b>{why?<small style={{display:'block'}}>AI: {why}</small>:null}</span></>:null}</span>
      {intr.length?<span className="pill good">{intr.map(first).join(', ')} interested</span>:null}
      <select className="inp" style={{maxWidth:300,flex:'1 1 200px'}} id={'sel-'+t.id} aria-label="Choose assignee" value={val} onChange={function(e){setChoice(+e.target.value)}}>
        {rk.map(function(r){return <option key={r.u.id} value={r.u.id}>{r.u.name} · {r.f}% fit · {Math.round(r.l*100)}% loaded</option>})}</select>
      <button className="btn primary sm" onClick={function(){A.assign(t.id,+val)}}>Assign</button></div></li>}

export function AssignView(){var A=useApp().A,p=plan(),un=ptasks().filter(function(t){return open(t)&&!t.assignee}).sort(function(a,b){return PR[a.prio]-PR[b.prio]||a.due-b.due}),
  st=useState(null),ai=st[0],setAi=st[1],sb=useState(false),busy=sb[0],setBusy=sb[1];
  // AI picks (when asked for) override the built-in suggestion for the same task.
  var sug=Object.assign({},p);if(ai)Object.keys(ai.map).forEach(function(k){sug[k]=ai.map[k]});
  var n=Object.keys(sug).filter(function(k){return un.some(function(t){return t.id===+k})}).length;
  function askAi(){if(!un.length)return;setBusy(true);
    requestAssignments(proj(),un).then(function(r){var map={},why={};(r.recommendations||[]).forEach(function(x){if(x.assignment){var id=+x.taskId;map[id]=Number(x.assignment.memberId);why[id]=(x.assignment.reasons||[])[0]||''}});
      setAi({map:map,why:why});setBusy(false);A.toast('AI suggestions ready for '+Object.keys(map).length+' task'+(Object.keys(map).length===1?'':'s'))},
      function(e){setBusy(false);A.toast(e.message||'The AI service failed.')})}
  function approveAll(){Object.keys(sug).forEach(function(k){if(un.some(function(t){return t.id===+k}))A.assign(+k,sug[k])})}
  return <>
    <header className="pagehead"><div><p className="eyebrow">Team leader</p><h1>Assign work</h1><p className="sub">Suggestions weigh skill match first and current load second. Nothing is assigned until you approve it.</p></div>
      <div className="row"><button className="btn" onClick={A.addTask}>Add task</button><button className="btn blue" onClick={askAi} disabled={busy||!un.length}>{busy?'Asking AI…':ai?'Refresh AI suggestions':'Ask AI recommender'}</button><button className="btn primary" onClick={approveAll} disabled={!n}>Approve all {n} suggestion{n===1?'':'s'}</button></div></header>
    {ai?<div className="notice">Showing AI recommender suggestions (skill fit, workload, availability). Tasks it could not match keep the built-in suggestion.</div>:null}
    <section className="card"><h2 className="sec">Waiting for an owner ({un.length})</h2>{un.length?<ul className="list">{un.map(function(t){return <AssignRow key={t.id+(ai?'-ai':'')} t={t} top={sug[t.id]} why={ai&&ai.map[t.id]?ai.why[t.id]:''}/>})}</ul>:<p className="empty">Every open task has an owner.</p>}</section>
    <section className="card"><h2 className="sec">Need to move something already assigned?</h2><p className="sub">Open any task from the board and use Reassign. Every move is logged in contribution tracking.</p></section>
  </>}

export default AssignView;

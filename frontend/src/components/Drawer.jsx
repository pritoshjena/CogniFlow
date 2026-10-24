import React, {useState, useEffect, useReducer, useRef} from 'react';
import {proj, projById, allMs, ptasks, plog, myProjects, canLead, withProject, getPref, setPref, STANCE, projectStats, SKILLS, LVL, DAY, today, PR, STL, seed, save, U, T, MS, me, isLeader, onTeam, team, open, blockers, isBlocked, overdue, fmt, first, initials, ago, dueText, downstream, openEffort, cap2, loadOf, stateOf, fit, reason, rank, plan, recs, msStats, risks, riskLevel, lastActive, logAct, lp, S, resetStore} from '../store.js';
import {useApp} from '../AppContext.js';
import {Av, Logo, LoadBar, SkillChips, TaskCard, Feed, Ruler, LINK, LINK6} from '../components/common.jsx';

export function ReassignField(p){var t=p.t,A=useApp().A,rk=rank(t),st=useState(null),choice=st[0],setChoice=st[1],val=choice!==null?choice:(t.assignee||rk[0].u.id);
  return <div className="field"><label htmlFor="re-sel">Reassign</label><div className="row"><select className="inp" id="re-sel" value={val} onChange={function(e){setChoice(+e.target.value)}}>{rk.map(function(r){return <option key={r.u.id} value={r.u.id}>{r.u.name} · {r.f}% fit · {Math.round(r.l*100)}% loaded</option>})}</select><button className="btn sm" onClick={function(){A.assign(t.id,+val)}}>Save</button></div></div>}

export function Drawer(){var c=useApp(),A=c.A,t=T(c.drawer);if(!t)return null;
  var a=U(t.assignee),ds=downstream(t.id),b=blockers(t),leader=isLeader(),mine=t.assignee===S.me;
  var acts=[];
  if(open(t)&&(mine||leader)){
    if(t.status==='todo')acts.push(<button key="s" className="btn primary" disabled={isBlocked(t)} onClick={function(){A.setStatus(t.id,'doing')}}>Start work</button>);
    if(t.status==='doing')acts.push(<button key="p" className="btn" onClick={function(){A.progress(t.id)}}>Log progress update</button>,<button key="r" className="btn primary" onClick={function(){A.setStatus(t.id,'review')}}>Send for review</button>,<button key="b" className="btn" onClick={function(){A.setStatus(t.id,'todo')}}>Back to To do</button>);
    if(t.status==='review')acts.push(<button key="d" className="btn" onClick={function(){A.setStatus(t.id,'doing')}}>Back to In progress</button>)}
  if(t.status==='review'&&(t.assignee!==S.me||leader)&&onTeam(S.me)||(t.status==='review'&&leader))acts.push(<button key="a" className="btn primary" onClick={function(){A.approve(t.id)}}>Review and approve</button>);
  var hist=S.log.filter(function(l){return l.t===t.id}).sort(function(x,y){return y.ts-x.ts}).slice(0,5);
  return <>
    <div className="drawer-bg" onClick={A.close}></div>
    <aside className="drawer" role="dialog" aria-label="Task details">
      <div className="row between"><span className="row"><span className={'pill '+(t.prio==='High'?'bad':t.prio==='Medium'?'warn':'info')}>{t.prio}</span><span className="pill">{STL[t.status]}</span></span><button className="btn sm" onClick={A.close}>Close</button></div>
      <h2>{t.title}</h2>
      {isBlocked(t)?<div className="warnbox">Blocked until {b.map(function(x){return '“'+x.title+'”'}).join(' and ')} is done.</div>:null}
      {overdue(t)?<div className="warnbox">This task is overdue. Consider reassigning or splitting it.</div>:null}
      <dl className="kv"><dt>Milestone</dt><dd>{MS(t.ms).name}</dd><dt>Due</dt><dd className={overdue(t)?'due late':''}>{fmt(t.due)}</dd><dt>Estimate</dt><dd className="mono">{t.effort}h</dd><dt>Owner</dt><dd className="row"><Av u={a} sz="sm"/>{a?a.name:'Unassigned'}</dd><dt>Skills</dt><dd><span className="chips">{t.skills.map(function(s){return <span className="skill" key={s}>{s}</span>})}</span></dd></dl>
      {(function(){var pf=t.assignee?getPref(t.assignee,t.id):null;if(!pf||!(pf.stance||pf.note||pf.target))return null;
        return <div className="notice"><b>{a?first(a):'Owner'}’s preference</b>{pf.stance?': '+STANCE[pf.stance]:''}{pf.note?<small style={{display:'block'}}>“{pf.note}”</small>:null}{pf.target?<small style={{display:'block'}}>Own target {fmt(pf.target)} · official deadline {fmt(t.due)}</small>:null}</div>})()}
      {acts.length?<div className="row wrapr">{acts}</div>:null}
      {leader&&open(t)?<ReassignField key={t.id+'-'+t.assignee} t={t}/>:null}
      <div><h3 style={{marginBottom:6}}>Depends on</h3>{t.deps.length?t.deps.map(function(i){var x=T(i);return x?<div className="dep" key={i}><span className={'pill '+(x.status==='done'?'good':'warn')}>{STL[x.status]}</span>{x.title}</div>:null}):<small>Nothing. This task can start any time.</small>}</div>
      <div><h3 style={{marginBottom:6}}>Unblocks</h3>{ds.length?<><p className="sub" style={{marginBottom:4}}>{ds.length} task{ds.length>1?'s':''} wait on this one.</p>{ds.slice(0,6).map(function(x){return <div className="dep" key={x.id}>{x.title}</div>})}</>:<small>Nothing depends on this task.</small>}</div>
      {hist.length?<div><h3 style={{marginBottom:6}}>History</h3><ul className="list feed">{hist.map(function(l,i){var w=U(l.u);return <li style={{padding:'5px 0'}} key={i}><Av u={w} sz="sm"/><span className="grow">{w?first(w):''} {lp(l)}<small>{ago(l.ts)}</small></span></li>})}</ul></div>:null}
    </aside>
  </>}

export default Drawer;

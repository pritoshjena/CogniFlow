import React, {useState, useEffect, useReducer, useRef} from 'react';
import {proj, projById, allMs, ptasks, plog, myProjects, canLead, withProject, getPref, setPref, STANCE, projectStats, SKILLS, LVL, DAY, today, PR, STL, seed, save, U, T, MS, me, isLeader, onTeam, team, open, blockers, isBlocked, overdue, fmt, first, initials, ago, dueText, downstream, openEffort, cap2, loadOf, stateOf, fit, reason, rank, plan, recs, msStats, risks, riskLevel, lastActive, logAct, lp, S, resetStore} from '../store.js';
import {useApp} from '../AppContext.js';
import {Av, Logo, LoadBar, SkillChips, TaskCard, Feed, Ruler, LINK, LINK6} from '../components/common.jsx';

export function WorkloadView(){var A=useApp().A,R=recs(),leader=isLeader();
  return <>
    <header className="pagehead"><div><p className="eyebrow">Capacity</p><h1>Workload</h1><p className="sub">Open assigned effort against two weeks of each person’s weekly hours.</p></div></header>
    <section className="card"><ul className="list">{team().map(function(u){var l=loadOf(u),st=stateOf(l),ts=ptasks().filter(function(t){return t.assignee===u.id&&open(t)});
      return <li style={{padding:'14px 0'}} key={u.id}><div className="loadrow" style={{padding:0}}><Av u={u}/><span className="nm"><b>{u.name}</b><small style={{display:'block'}}>{u.cap}h per week</small></span><LoadBar l={l}/><span className="pct">{Math.round(l*100)}%</span><span className={'pill '+st[1]} style={{minWidth:92,justifyContent:'center'}}>{st[0]}</span></div>
        <small style={{display:'block',margin:'6px 0 0 42px'}}>{openEffort(u.id)}h open of {cap2(u)}h · {ts.length?ts.map(function(t){return t.title+' ('+t.effort+'h)'}).join(' · '):'no open tasks'}</small></li>})}</ul>
      <small>Gauge ticks mark 45% (underused below) and 100% (overloaded above). Hours include work on your other projects and personal tasks.</small></section>
    <section className="card"><h2 className="sec">Suggested redistribution</h2>
      {R.length?<ul className="list">{R.map(function(r){return <li style={{padding:'12px 0'}} className="row wrapr" key={r.t.id}>
        <span className="grow" style={{flexBasis:260}}>Move <b>“{r.t.title}”</b> ({r.t.effort}h) from <Av u={r.from} sz="sm"/> {first(r.from)} to <Av u={r.to} sz="sm"/> <b>{first(r.to)}</b><small style={{display:'block'}}>{r.f}% skill fit · {first(r.to)} would be at {Math.round(r.l*100)}% load</small></span>
        {leader?<button className="btn primary sm" onClick={function(){A.applyRec(r.t.id,r.to.id)}}>Apply</button>:<span className="pill">Leader decides</span>}</li>})}</ul>:<p className="empty">No one is overloaded, so there is nothing to move.</p>}</section>
  </>}

export default WorkloadView;

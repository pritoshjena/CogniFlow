import React, {useState, useEffect, useReducer, useRef} from 'react';
import {proj, projById, allMs, ptasks, plog, myProjects, canLead, withProject, getPref, setPref, STANCE, projectStats, SKILLS, LVL, DAY, today, PR, STL, seed, save, U, T, MS, me, isLeader, onTeam, team, open, blockers, isBlocked, overdue, fmt, first, initials, ago, dueText, downstream, openEffort, cap2, loadOf, stateOf, fit, reason, rank, plan, recs, msStats, risks, riskLevel, lastActive, logAct, lp, S, resetStore} from '../store.js';
import {useApp} from '../AppContext.js';
import {Av, Logo, LoadBar, SkillChips, TaskCard, Feed, Ruler, LINK, LINK6} from '../components/common.jsx';

export function OverviewView(){var A=useApp().A,R=risks(),lvl=riskLevel(R),tot=ptasks().reduce(function(a,t){return a+t.effort},0),done=ptasks().filter(function(t){return !open(t)}).reduce(function(a,t){return a+t.effort},0);
  var last=proj().milestones[proj().milestones.length-1],att=R.slice(0,5);
  return <>
    <header className="pagehead"><div><p className="eyebrow">Project</p><h1>{proj().name}</h1><p className="sub">{done} of {tot} estimated hours complete · {team().length} on the team · final delivery {fmt(last.due)}</p></div>
      <div className={'risk '+lvl.c}><span className="eyebrow">Delivery risk</span><strong>{lvl.t}</strong><span className="sub">{R.length} open signal{R.length===1?'':'s'}</span></div></header>
    <section className="card"><h2 className="sec">Delivery ruler</h2><Ruler/></section>
    <div className="grid2">
      <section className="card"><h2 className="sec">Needs attention</h2>
        {att.length?<ul className="list">{att.map(function(r,i){return <li key={i}><button className="att" onClick={function(){r.task?A.openTask(r.task):A.nav(r.view||'')}}><span className={'sev s'+r.sev}></span><span><strong>{r.title}</strong><small>{r.why}</small></span></button></li>})}</ul>:<p className="empty">Nothing is flagged. The project is moving cleanly.</p>}
        {R.length>5?<button className="btn ghost sm" onClick={function(){A.nav('risks')}}>See all {R.length} signals</button>:null}</section>
      <section className="card"><div className="row between"><h2 className="sec" style={{margin:0}}>Workload, next 14 days</h2><button className="btn ghost sm" onClick={function(){A.nav('workload')}}>Details</button></div>
        <div style={{marginTop:6}}>{team().map(function(u){var l=loadOf(u);return <div className="loadrow" style={{padding:'7px 0'}} key={u.id}><Av u={u} sz="sm"/><span className="nm">{first(u)}</span><LoadBar l={l}/><span className="pct">{Math.round(l*100)}%</span></div>})}</div>
        <small>Ticks mark 45% (underused below) and 100% of capacity.</small></section>
    </div>
    <section className="card"><h2 className="sec">Recent activity</h2><Feed n={6}/></section>
  </>}

export default OverviewView;

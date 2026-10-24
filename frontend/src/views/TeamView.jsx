import React, {useState, useEffect, useReducer, useRef} from 'react';
import {proj, projById, allMs, ptasks, plog, myProjects, canLead, withProject, getPref, setPref, STANCE, projectStats, SKILLS, LVL, DAY, today, PR, STL, seed, save, U, T, MS, me, isLeader, onTeam, team, open, blockers, isBlocked, overdue, fmt, first, initials, ago, dueText, downstream, openEffort, cap2, loadOf, stateOf, fit, reason, rank, plan, recs, msStats, risks, riskLevel, lastActive, logAct, lp, S, resetStore} from '../store.js';
import {useApp} from '../AppContext.js';
import {Av, Logo, LoadBar, SkillChips, TaskCard, Feed, Ruler, LINK, LINK6} from '../components/common.jsx';

export function TeamView(){var A=useApp().A,un=ptasks().filter(function(t){return open(t)&&!t.assignee});
  return <>
    <header className="pagehead"><div><p className="eyebrow">Team leader</p><h1>Choose your team</h1><p className="sub">Everyone who creates an account appears here with their skills. Only people you add receive work on this project.</p></div></header>
    <section className="card"><h2 className="sec">Registered people ({S.users.length})</h2><ul className="list">{S.users.map(function(u){var on=onTeam(u.id),m=un.filter(function(t){return fit(u,t)>=60}).length;
      return <li style={{padding:'14px 0'}} key={u.id}><div className="row wrapr" style={{alignItems:'flex-start'}}><Av u={u} sz="lg"/>
        <span className="grow" style={{flexBasis:220}}><b>{u.name}</b> <span className="pill">{u.id===proj().leader?'Leader':'Member'}</span><small style={{display:'block'}}>{u.cap}h per week · strong match for {m} of {un.length} unassigned tasks</small><div style={{marginTop:8}}><SkillChips u={u}/></div></span>
        {u.id===proj().leader?<span className="pill good">On team</span>:on?<button className="btn sm" onClick={function(){A.teamToggle(u.id)}}>Remove from team</button>:<button className="btn primary sm" onClick={function(){A.teamToggle(u.id)}}>Add to team</button>}</div></li>})}</ul></section>
  </>}

export default TeamView;

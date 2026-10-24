import React, {useState, useEffect, useReducer, useRef} from 'react';
import {proj, projById, allMs, ptasks, plog, myProjects, canLead, withProject, getPref, setPref, STANCE, projectStats, SKILLS, LVL, DAY, today, PR, STL, seed, save, U, T, MS, me, isLeader, onTeam, team, open, blockers, isBlocked, overdue, fmt, first, initials, ago, dueText, downstream, openEffort, cap2, loadOf, stateOf, fit, reason, rank, plan, recs, msStats, risks, riskLevel, lastActive, logAct, lp, S, resetStore} from '../store.js';
import {useApp} from '../AppContext.js';
import {Av, Logo, LoadBar, SkillChips, TaskCard, Feed, Ruler, LINK, LINK6} from '../components/common.jsx';

export function RisksView(){var A=useApp().A,R=risks(),lvl=riskLevel(R),L={3:'High',2:'Medium',1:'Low'};
  var body=[3,2,1].map(function(s){var rs=R.filter(function(r){return r.sev===s});if(!rs.length)return null;
    return <section className="card" key={s}><div className="row" style={{marginBottom:6}}><span className={'sev s'+s} style={{margin:0}}></span><h2>{L[s]} priority</h2><span className="pill">{rs.length}</span></div>
      <ul className="list">{rs.map(function(r,i){return <li key={i}><button className="att" onClick={function(){r.task?A.openTask(r.task):A.nav(r.view||'')}}><span><strong>{r.title}</strong><small>{r.why}</small></span></button></li>})}</ul></section>}).filter(Boolean);
  return <>
    <header className="pagehead"><div><p className="eyebrow">Early warning</p><h1>Risks</h1><p className="sub">Checked against today’s date, task deadlines, dependencies and each person’s capacity.</p></div><div className={'risk '+lvl.c}><span className="eyebrow">Overall</span><strong>{lvl.t}</strong></div></header>
    {body.length?body:<section className="card"><p className="empty">No risks detected.</p></section>}
  </>}

export default RisksView;

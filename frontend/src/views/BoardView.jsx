import React, {useState, useEffect, useReducer, useRef} from 'react';
import {proj, projById, allMs, ptasks, plog, myProjects, canLead, withProject, getPref, setPref, STANCE, projectStats, SKILLS, LVL, DAY, today, PR, STL, seed, save, U, T, MS, me, isLeader, onTeam, team, open, blockers, isBlocked, overdue, fmt, first, initials, ago, dueText, downstream, openEffort, cap2, loadOf, stateOf, fit, reason, rank, plan, recs, msStats, risks, riskLevel, lastActive, logAct, lp, S, resetStore} from '../store.js';
import {useApp} from '../AppContext.js';
import {Av, Logo, LoadBar, SkillChips, TaskCard, Feed, Ruler, LINK, LINK6} from '../components/common.jsx';

export function BoardView(){var c=useApp(),A=c.A,tasks=ptasks().filter(function(t){return !c.mine||t.assignee===S.me});
  return <>
    <header className="pagehead"><div><p className="eyebrow">Tasks</p><h1>Board</h1></div><div className="row"><button className={'btn '+(c.mine?'primary':'')+' sm'} onClick={A.toggleMine}>Only my tasks</button>{isLeader()?<button className="btn primary sm" onClick={A.addTask}>Add task</button>:null}</div></header>
    <div className="boardwrap"><div className="board">{['todo','doing','review','done'].map(function(s){var ts=tasks.filter(function(t){return t.status===s}).sort(function(a,b){return PR[a.prio]-PR[b.prio]||a.due-b.due});
      return <div className="col" key={s}><header><b>{STL[s]}</b><span className="pill">{ts.length}</span></header>{ts.length?ts.map(function(t){return <TaskCard key={t.id} t={t}/>}):<p className="empty">Nothing here</p>}</div>})}</div></div>
  </>}

export default BoardView;

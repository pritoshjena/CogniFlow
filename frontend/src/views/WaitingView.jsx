import React, {useState, useEffect, useReducer, useRef} from 'react';
import {proj, projById, allMs, ptasks, plog, myProjects, canLead, withProject, getPref, setPref, STANCE, projectStats, isoDay, parseDay, SKILLS, LVL, DAY, today, PR, STL, seed, save, U, T, MS, me, isLeader, onTeam, team, open, blockers, isBlocked, overdue, fmt, first, initials, ago, dueText, downstream, openEffort, cap2, loadOf, stateOf, fit, reason, rank, plan, recs, msStats, risks, riskLevel, lastActive, logAct, lp, S, resetStore} from '../store.js';
import {useApp} from '../AppContext.js';
import {Av, Logo, LoadBar, SkillChips, TaskCard, Feed, Ruler, LINK, LINK6} from '../components/common.jsx';

export function WaitingView(){var u=me();
  return <>
    <header className="pagehead"><div><p className="eyebrow">Almost there</p><h1>No projects yet</h1></div></header>
    <section className="card stack"><p>Thanks for signing up, {first(u)}. You can create your own project from this tab and lead it yourself, or wait for another team leader to add you to theirs.</p><div><span className="lb eyebrow">Skills the leader sees</span><div style={{marginTop:6}}><SkillChips u={u}/></div></div><p className="sub">Meanwhile, the Personal tab lets you plan your own tasks and milestones.</p></section>
  </>}
export default WaitingView;

import React, {useState, useEffect, useReducer, useRef} from 'react';
import {proj, projById, allMs, ptasks, plog, myProjects, canLead, withProject, getPref, setPref, STANCE, projectStats, SKILLS, LVL, DAY, today, PR, STL, seed, save, U, T, MS, me, isLeader, onTeam, team, open, blockers, isBlocked, overdue, fmt, first, initials, ago, dueText, downstream, openEffort, cap2, loadOf, stateOf, fit, reason, rank, plan, recs, msStats, risks, riskLevel, lastActive, logAct, lp, S, resetStore} from '../store.js';
import {useApp} from '../AppContext.js';
import {Av, Logo, LoadBar, SkillChips, TaskCard, Feed, Ruler, LINK, LINK6} from '../components/common.jsx';

export function AuthView(){var c=useApp(),A=c.A,d=c.draft,setDraft=c.setDraft;
  var set=function(k){return function(e){var v=e.target.value;setDraft(function(x){var n=Object.assign({},x);n[k]=v;return n})}};
  return <div className="wrap"><div className="top"><div className="brand"><Logo/><b>CogniFlow</b><span>Project management with contribution tracking</span></div>{S.me!=null?<button className="btn sm" onClick={A.backAuth}>Back to project</button>:null}</div>
    <div className="auth">
      <section className="card stack"><div><p className="eyebrow">Create account</p><h1>Tell us what you’re good at</h1><p className="sub">Your skills decide which tasks CogniFlow suggests to you. Your team leader still picks the final work.</p></div>
        <div className="field"><label htmlFor="d-name">Full name</label><input className="inp" id="d-name" value={d.name} onChange={set('name')} autoComplete="name" placeholder="For example: Priya Sharma"/></div>
        <div className="field"><span className="lb">I am a</span><div className="seg2"><button type="button" className={d.role==='member'?'on':''} onClick={function(){A.setRole('member')}}><b>Team member</b><small>Receive suggested work and log progress</small></button><button type="button" className={d.role==='leader'?'on':''} onClick={function(){A.setRole('leader')}}><b>Team leader</b><small>Choose the team and assign final work</small></button></div></div>
        <div className="field" style={{maxWidth:220}}><label htmlFor="d-cap">Hours available per week</label><input className="inp" id="d-cap" type="number" min="4" max="60" value={d.cap} onChange={set('cap')}/></div>
        <div className="field"><span className="lb">Skills · tap to cycle Beginner, Intermediate, Advanced, off</span><div className="chips">{SKILLS.map(function(s){var l=d.skills[s]||0;return <button type="button" key={s} className={'skillchip'+(l?' l'+l:'')} onClick={function(){A.cycleSkill(s)}}><span>{s}</span>{l?<><span className="dots">{'●'.repeat(l)+'○'.repeat(3-l)}</span><small>{LVL[l]}</small></>:null}</button>})}</div></div>
        <div className="row"><button className="btn primary" onClick={A.create}>Create account</button></div></section>
    </div></div>}

export default AuthView;

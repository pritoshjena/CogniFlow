import React, {useState, useEffect, useReducer, useRef} from 'react';
import {proj, projById, allMs, ptasks, plog, myProjects, canLead, withProject, getPref, setPref, STANCE, projectStats, SKILLS, LVL, DAY, today, PR, STL, seed, save, U, T, MS, me, isLeader, onTeam, team, open, blockers, isBlocked, overdue, fmt, first, initials, ago, dueText, downstream, openEffort, cap2, loadOf, stateOf, fit, reason, rank, plan, recs, msStats, risks, riskLevel, lastActive, logAct, lp, S, resetStore} from '../store.js';
import {useApp} from '../AppContext.js';
import {Av, Logo, LoadBar, SkillChips, TaskCard, Feed, Ruler, LINK, LINK6} from '../components/common.jsx';

export function Modal(){var c=useApp(),A=c.A,d=c.td,setTd=c.setTd;if(!c.modal||!d)return null;
  var set=function(k){return function(e){var v=e.target.value;setTd(function(x){var n=Object.assign({},x);n[k]=v;return n})}};
  return <>
    <div className="drawer-bg" onClick={A.cancelTask}></div>
    <div className="modal" role="dialog" aria-label="Add task">
      <div className="row between"><h2>Add task</h2><button className="btn sm" onClick={A.cancelTask}>Cancel</button></div>
      <div className="field"><label htmlFor="td-title">Task name</label><input className="inp" id="td-title" value={d.title} onChange={set('title')} placeholder="For example: Search and filter listings"/></div>
      <div className="fgrid">
        <div className="field"><label htmlFor="td-ms">Milestone</label><select className="inp" id="td-ms" value={d.ms} onChange={set('ms')}>{proj().milestones.map(function(m){return <option key={m.id} value={m.id}>{m.name}</option>})}</select></div>
        <div className="field"><label htmlFor="td-prio">Priority</label><select className="inp" id="td-prio" value={d.prio} onChange={set('prio')}>{['High','Medium','Low'].map(function(p){return <option key={p}>{p}</option>})}</select></div>
        <div className="field"><label htmlFor="td-eff">Estimated effort (hours)</label><input className="inp" id="td-eff" type="number" min="1" max="80" value={d.effort} onChange={set('effort')}/></div>
        <div className="field"><label htmlFor="td-due">Deadline</label><input className="inp" id="td-due" type="date" value={d.due} onChange={set('due')}/></div></div>
      <div className="field"><span className="lb">Skills needed</span><div className="chips">{SKILLS.map(function(s){var on=d.skills.indexOf(s)>-1;return <button type="button" key={s} className={'skillchip'+(on?' l3':'')} onClick={function(){A.tdSkill(s)}} aria-pressed={on}>{s}</button>})}</div></div>
      <div className="field"><span className="lb">Depends on (optional)</span><div className="stack" style={{gap:2,maxHeight:150,overflowY:'auto',border:'1px solid var(--line)',borderRadius:6,padding:8}}>{ptasks().filter(open).map(function(t){return <label className="dep" key={t.id}><input type="checkbox" checked={d.deps.indexOf(t.id)>-1} onChange={function(e){A.tdDep(t.id,e.target.checked)}}/> {t.title}</label>})}</div></div>
      <div className="row" style={{justifyContent:'flex-end'}}><button className="btn primary" onClick={A.saveTask}>Add task</button></div>
    </div>
  </>}

export default Modal;

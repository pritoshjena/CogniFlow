import React, {useState, useEffect, useReducer, useRef} from 'react';
import {proj, projById, allMs, ptasks, plog, myProjects, canLead, withProject, getPref, setPref, STANCE, projectStats, isoDay, parseDay, SKILLS, suggestSkills, LVL, DAY, today, PR, STL, seed, save, U, T, MS, me, isLeader, onTeam, team, open, blockers, isBlocked, overdue, fmt, first, initials, ago, dueText, downstream, openEffort, cap2, loadOf, stateOf, fit, reason, rank, plan, recs, msStats, risks, riskLevel, lastActive, logAct, lp, S, resetStore} from '../store.js';
import {useApp} from '../AppContext.js';
import {Av, Logo, LoadBar, SkillChips, TaskCard, Feed, Ruler, LINK, LINK6} from '../components/common.jsx';

export function ProjectModal(){var c=useApp(),A=c.A,d=c.pd,setPd=c.setPd;if(!c.projModal||!d)return null;
  var upd=function(k,v){setPd(function(x){var n=Object.assign({},x);n[k]=v;return n})};
  var setMs=function(i,k,v){setPd(function(x){var ms=x.ms.map(function(m,j){return j===i?Object.assign({},m,{[k]:v}):m});return Object.assign({},x,{ms:ms})})};
  var sug=suggestSkills(d.name+' '+d.desc).filter(function(k){return d.needs.indexOf(k)<0});
  return <>
    <div className="drawer-bg" onClick={A.cancelProject}></div>
    <div className="modal" role="dialog" aria-label="New project">
      <div className="row between"><h2>New project</h2><button className="btn sm" onClick={A.cancelProject}>Cancel</button></div>
      <div className="field"><label htmlFor="np-name">Project name</label><input className="inp" id="np-name" value={d.name} onChange={function(e){upd('name',e.target.value)}} placeholder="For example: Library Seat Finder"/></div>
      <div className="field"><label htmlFor="np-desc">Short description</label><input className="inp" id="np-desc" value={d.desc} onChange={function(e){upd('desc',e.target.value)}} placeholder="What is this project about?"/></div>
      <div className="field"><span className="lb">Milestones</span>
        <div className="stack" style={{gap:8}}>{d.ms.map(function(m,i){return <div className="row" key={i} style={{gap:8}}><input className="inp" aria-label={'Milestone '+(i+1)+' name'} value={m.name} onChange={function(e){setMs(i,'name',e.target.value)}} placeholder={'Milestone '+(i+1)}/><input className="inp" style={{maxWidth:170}} aria-label={'Milestone '+(i+1)+' date'} type="date" value={m.due} onChange={function(e){setMs(i,'due',e.target.value)}}/>{d.ms.length>1?<button className="btn ghost sm" aria-label={'Remove milestone '+(i+1)} onClick={function(){A.pdRemoveMs(i)}}>Remove</button>:null}</div>})}
          <div><button type="button" className="btn sm" onClick={A.pdAddMs}>Add milestone</button></div></div></div>
      <div className="field"><span className="lb">What does this project need? Pick the skills or roles required</span>
        <div className="chips">{SKILLS.map(function(k){var on=d.needs.indexOf(k)>-1;return <button type="button" key={k} className={'skillchip'+(on?' l3':'')} aria-pressed={on} onClick={function(){A.pdNeed(k)}}><span>{k}</span></button>})}</div>
        {sug.length?<small style={{display:'block',marginTop:8}}>Suggested from your name and description: {sug.map(function(k){return <button type="button" key={k} className="btn ghost sm" onClick={function(){A.pdNeed(k)}}>+ {k}</button>})}</small>:null}
        <small style={{display:'block',marginTop:6}}>You will pick the team from CogniFlow’s recommendation after the project is created.</small></div>
      <div className="row" style={{justifyContent:'flex-end'}}><button className="btn primary" onClick={A.saveProject}>Create project</button></div>
    </div>
  </>}
export default ProjectModal;

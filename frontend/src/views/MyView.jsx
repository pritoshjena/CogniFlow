import React, {useState, useEffect, useReducer, useRef} from 'react';
import {proj, projById, allMs, ptasks, plog, myProjects, canLead, withProject, getPref, setPref, STANCE, projectStats, SKILLS, LVL, DAY, today, PR, STL, seed, save, U, T, MS, me, isLeader, onTeam, team, open, blockers, isBlocked, overdue, fmt, first, initials, ago, dueText, downstream, openEffort, cap2, loadOf, stateOf, fit, reason, rank, plan, recs, msStats, risks, riskLevel, lastActive, logAct, lp, S, resetStore} from '../store.js';
import {useApp} from '../AppContext.js';
import {Av, Logo, LoadBar, SkillChips, TaskCard, Feed, Ruler, LINK, LINK6} from '../components/common.jsx';

export function MyRow(p){var t=p.t,A=useApp().A,quick=null;
  if(t.status==='todo'&&!isBlocked(t))quick=<button className="btn sm" onClick={function(){A.setStatus(t.id,'doing')}}>Start</button>;
  else if(t.status==='doing')quick=<button className="btn sm" onClick={function(){A.setStatus(t.id,'review')}}>Send for review</button>;
  return <li className="row" style={{padding:'10px 0',alignItems:'flex-start'}}><span className={'dot p-'+t.prio} style={{marginTop:7}}></span>
    <span className="grow"><button className="btn ghost" style={LINK} onClick={function(){A.openTask(t.id)}}>{t.title}</button><small style={{display:'block'}}>{t.effort}h · {dueText(t)}{isBlocked(t)?' · blocked by '+blockers(t)[0].title:''}</small></span>
    <span className={'pill '+(t.status==='review'?'warn':t.status==='doing'?'info':'')}>{STL[t.status]}</span>{quick}</li>}

export function SugRow(p){var t=p.t,u=p.u,A=useApp().A,on=t.interest.indexOf(u.id)>-1;
  return <li className="row" style={{padding:'10px 0',alignItems:'flex-start',flexWrap:'wrap'}}><span className="grow" style={{flexBasis:220}}><button className="btn ghost" style={LINK} onClick={function(){A.openTask(t.id)}}>{t.title}</button><small style={{display:'block'}}>{reason(u,t)} · {t.effort}h · {dueText(t)}</small></span>
    <span className="pill info">{fit(u,t)}% fit</span><button className="btn sm" onClick={function(){A.interest(t.id)}}>{on?'Interest sent':'I’d like this'}</button></li>}

export function MyView(){var u=me(),mine=ptasks().filter(function(t){return t.assignee===u.id&&open(t)}).sort(function(a,b){return a.due-b.due}),p=plan(),
  sug=ptasks().filter(function(t){return p[t.id]===u.id}),
  also=ptasks().filter(function(t){return open(t)&&!t.assignee&&p[t.id]!==u.id&&fit(u,t)>=50}),l=loadOf(u),st=stateOf(l),doneN=ptasks().filter(function(t){return t.assignee===u.id&&!open(t)}).length;
  return <>
    <header className="pagehead"><div><p className="eyebrow">My work</p><h1>Hi {first(u)}</h1><p className="sub">The platform suggests work that matches your skills. Your team leader makes the final assignment.</p></div></header>
    <section className="card"><div className="row wrapr"><h2 style={{marginRight:'auto'}}>Your load</h2><span className={'pill '+st[1]}>{st[0]}</span></div><div className="loadrow"><LoadBar l={l}/><span className="pct">{Math.round(l*100)}%</span></div><small>{openEffort(u.id)}h open of {cap2(u)}h in the next 14 days · {doneN} task{doneN===1?'':'s'} finished</small></section>
    <section className="card"><h2 className="sec">Assigned to you</h2>{mine.length?<ul className="list">{mine.map(function(t){return <MyRow key={t.id} t={t}/>})}</ul>:<p className="empty">Nothing assigned yet. Check the suggestions below.</p>}</section>
    <section className="card"><h2 className="sec">Suggested for you</h2>
      {sug.length?<ul className="list">{sug.map(function(t){return <SugRow key={t.id} t={t} u={u}/>})}</ul>:<p className="empty">No open work is waiting for a match with your skills right now.</p>}
      {also.length?<><h3 style={{margin:'16px 0 4px'}}>Also fits your skills</h3><ul className="list">{also.map(function(t){return <SugRow key={t.id} t={t} u={u}/>})}</ul></>:null}</section>
    <section className="card"><h2 className="sec">Your skills</h2><SkillChips u={u}/></section>
  </>}

export default MyView;

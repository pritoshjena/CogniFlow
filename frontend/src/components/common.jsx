import React, {useState, useEffect, useReducer, useRef} from 'react';
import {proj, projById, allMs, ptasks, plog, myProjects, canLead, withProject, getPref, setPref, STANCE, projectStats, SKILLS, LVL, DAY, today, PR, STL, seed, save, U, T, MS, me, isLeader, onTeam, team, open, blockers, isBlocked, overdue, fmt, first, initials, ago, dueText, downstream, openEffort, cap2, loadOf, stateOf, fit, reason, rank, plan, recs, msStats, risks, riskLevel, lastActive, logAct, lp, S, resetStore} from '../store.js';
import {useApp} from '../AppContext.js';

export var LINK={padding:0,minHeight:0,color:'var(--ink)',fontWeight:500,whiteSpace:'normal',textAlign:'left'};

export var LINK6=Object.assign({},LINK,{fontWeight:600});

export function Av(p){var u=p.u,sz=p.sz||'';
  return u?<span className={'av '+sz} style={{background:'var(--av'+((u.id%8)+1)+')'}} title={u.name}>{initials(u.name)}</span>
          :<span className={'av empty '+sz} title="Unassigned">?</span>}

export function Logo(){return <svg className="logo" viewBox="0 0 26 26" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--accent)"/><stop offset="1" stopColor="var(--teal)"/></linearGradient></defs><rect x="1" y="1" width="24" height="24" rx="6" fill="var(--accent)"/><path d="M6 17h5v-4h4V9h5" fill="none" stroke="var(--accent-ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}

export function LoadBar(p){var l=p.l,w=Math.min(l,1.3)/1.3*100,c=l>1?'bad':l<0.45?'muted':'good';
  return <span className="lbar"><i className={c} style={{width:w+'%'}}/><b style={{left:(0.45/1.3*100)+'%'}}/><b style={{left:(1/1.3*100)+'%'}}/></span>}

export function SkillChips(p){var u=p.u,k=Object.keys(u.skills);
  return k.length?<span className="chips">{k.map(function(s){return <span className="skill" key={s}>{s}<em>{'●'.repeat(u.skills[s])}</em></span>})}</span>:<small>No skills added</small>}

export function TaskCard(p){var t=p.t,u=U(t.assignee),b=isBlocked(t),o=overdue(t),A=useApp().A;
  return <button className="tcard" onClick={function(){A.openTask(t.id)}}>
    <span className="tc-top"><span className={'dot p-'+t.prio} title={t.prio+' priority'}></span><span className="tc-title">{t.title}</span></span>
    <span className="tc-meta"><span className="mono">{t.effort}h</span><span className={'due '+(o?'late':'')}>{dueText(t)}</span>{b?<span className="tag bad">Blocked</span>:null}<Av u={u} sz="sm"/></span>
  </button>}

export function Feed(p){var rows=plog().sort(function(a,b){return b.ts-a.ts}).slice(0,p.n);
  return <ul className="list feed">{rows.map(function(l,i){var u=U(l.u),t=l.t?T(l.t):null;if(!u)return null;
    return <li key={i}><Av u={u} sz="sm"/><span className="grow"><span><b>{first(u)}</b> {lp(l)}{t?' “'+t.title+'”':''}{l.type==='complete'?' ('+l.pts+'h)':''}</span><small>{ago(l.ts)}</small></span></li>})}</ul>}

export function Ruler(){var ms=proj().milestones,start=proj().start,end=ms[ms.length-1].due,span=end-start,prev=start;
  var tp=Math.min(100,Math.max(0,(today-start)/span*100));
  var segs=ms.map(function(m){var s=msStats(m),w=Math.max(8,(m.due-prev)/span*100);prev=m.due;
    var fc=s.st==='ok'?(s.pct===100?'Complete':'On track'):s.st==='risk'?'At risk'+(s.late?' · '+s.late+' overdue':s.who?' · '+first(s.who)+' is stretched':''):'Likely '+s.slipDays+' day'+(s.slipDays>1?'s':'')+' late'+(s.who?' · '+first(s.who)+' overloaded':'');
    return <div key={m.id} className={'seg '+s.st} style={{flex:w+' 1 0'}}><div className="seg-bar"><i style={{width:s.pct+'%'}}/></div><div className="seg-name">{m.name}</div><div className="seg-date mono">{fmt(m.due)} · {s.pct}% done</div><div className="seg-fc">{fc}</div></div>});
  return <div className="ruler"><div className="segs">{segs}</div><div className={'today'+(tp>88?' edge-r':'')} style={{left:tp+'%'}}><span>Today</span></div></div>}

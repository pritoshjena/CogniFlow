import React, {useState, useEffect, useReducer, useRef} from 'react';
import {proj, projById, allMs, ptasks, plog, myProjects, canLead, withProject, getPref, setPref, STANCE, projectStats, SKILLS, LVL, DAY, today, PR, STL, seed, save, U, T, MS, me, isLeader, onTeam, team, open, blockers, isBlocked, overdue, fmt, first, initials, ago, dueText, downstream, openEffort, cap2, loadOf, stateOf, fit, reason, rank, plan, recs, msStats, risks, riskLevel, lastActive, logAct, lp, S, resetStore} from '../store.js';
import {useApp} from '../AppContext.js';
import {Av, Logo, LoadBar, SkillChips, TaskCard, Feed, Ruler, LINK, LINK6} from '../components/common.jsx';

export function contribData(){var rows=team().map(function(u){var r={u:u,complete:0,review:0,update:0,reassign:0,n:{complete:0,review:0,update:0,reassign:0},last:lastActive(u.id)};
    plog().forEach(function(l){if(l.u===u.id&&r.n[l.type]!==undefined){r[l.type]+=l.pts;r.n[l.type]++}});r.total=r.complete+r.review+r.update+r.reassign;return r});
  var sum=rows.reduce(function(a,r){return a+r.total},0)||1;rows.forEach(function(r){r.share=r.total/sum});return {rows:rows.sort(function(a,b){return b.total-a.total}),sum:sum}}

export function ContribView(){var cd=contribData(),C={complete:'var(--accent)',review:'var(--teal)',update:'var(--ink-3)',reassign:'var(--warn)'};
  return <>
    <header className="pagehead"><div><p className="eyebrow">Transparency</p><h1>Contributions</h1><p className="sub">Every share comes from the activity log below. A completed task earns its estimated hours, a review earns 3, and an update or reassignment earns 1.</p></div></header>
    <section className="card"><div className="legend" style={{marginBottom:6}}><span style={{'--c':'var(--accent)'}}>Completed</span><span style={{'--c':'var(--teal)'}}>Reviews</span><span style={{'--c':'var(--ink-3)'}}>Updates</span><span style={{'--c':'var(--warn)'}}>Reassignments</span></div>
      {cd.rows.map(function(r){var low=r.share<0.1&&openEffort(r.u.id)>0;
        return <div className="contrib" key={r.u.id}><div className="row wrapr"><Av u={r.u}/><span className="grow" style={{flexBasis:160}}><b>{r.u.name}</b>{low?<> <span className="pill warn">Lower activity</span></>:null}<small style={{display:'block'}}>Last active {r.last?ago(r.last):'never'}</small></span><span className="mono" style={{fontSize:18,fontWeight:500}}>{Math.round(r.share*100)}%</span></div>
          <div className="stackbar" title="Share of team contribution">{['complete','review','update','reassign'].map(function(k){return <i key={k} style={{width:(r[k]/cd.sum*100)+'%',background:C[k]}}/>})}</div>
          <small>{r.n.complete} completed ({r.complete} pts) · {r.n.review} review{r.n.review===1?'':'s'} · {r.n.update} update{r.n.update===1?'':'s'} · {r.n.reassign} reassignment{r.n.reassign===1?'':'s'}</small></div>})}</section>
    <section className="card"><h2 className="sec">Activity log</h2><Feed n={14}/></section>
  </>}

export default ContribView;

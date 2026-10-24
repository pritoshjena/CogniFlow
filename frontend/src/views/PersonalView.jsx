import React, {useState, useEffect, useReducer, useRef} from 'react';
import {proj, projById, allMs, ptasks, plog, myProjects, canLead, withProject, getPref, setPref, STANCE, projectStats, isoDay, parseDay, SKILLS, LVL, DAY, today, PR, STL, seed, save, U, T, MS, me, isLeader, onTeam, team, open, blockers, isBlocked, overdue, fmt, first, initials, ago, dueText, downstream, openEffort, cap2, loadOf, stateOf, fit, reason, rank, plan, recs, msStats, risks, riskLevel, lastActive, logAct, lp, S, resetStore} from '../store.js';
import {useApp} from '../AppContext.js';
import {Av, Logo, LoadBar, SkillChips, TaskCard, Feed, Ruler, LINK, LINK6} from '../components/common.jsx';

const STANCES=['want','ok','avoid'];

function AddMilestone(){var A=useApp().A,s1=useState(''),name=s1[0],setName=s1[1],s2=useState(isoDay(14)),due=s2[0],setDue=s2[1];
  function add(){var d=parseDay(due);if(!name.trim()){A.toast('Name the milestone first.');return}if(d===null){A.toast('Pick a date.');return}
    S.pms.push({id:S.nextMs++,owner:S.me,name:name.trim(),due:d});setName('');A.toast('Milestone added');A.touch()}
  return <div className="fgrid" style={{alignItems:'end'}}>
    <div className="field"><label htmlFor="pm-name">Milestone name</label><input className="inp" id="pm-name" value={name} onChange={function(e){setName(e.target.value)}} placeholder="For example: Finish thesis draft"/></div>
    <div className="field"><label htmlFor="pm-due">Target date</label><input className="inp" id="pm-due" type="date" value={due} onChange={function(e){setDue(e.target.value)}}/></div>
    <div><button className="btn primary" onClick={add}>Add milestone</button></div></div>}

function AddTask(p){var A=useApp().A,mss=p.mss,
  s1=useState(''),title=s1[0],setTitle=s1[1],s2=useState(isoDay(7)),due=s2[0],setDue=s2[1],s3=useState(4),eff=s3[0],setEff=s3[1],s4=useState('Medium'),prio=s4[0],setPrio=s4[1],s5=useState(''),ms=s5[0],setMs=s5[1];
  function add(){var d=parseDay(due);if(!title.trim()){A.toast('Give the task a name first.');return}if(d===null){A.toast('Pick a deadline.');return}
    S.tasks.push({id:S.nextTask++,title:title.trim(),ms:ms?+ms:null,skills:[],prio:prio,effort:Math.max(1,+eff||1),due:d,status:'todo',assignee:S.me,deps:[],interest:[],project:null,personal:true,owner:S.me});
    setTitle('');A.toast('Personal task added');A.touch()}
  return <div className="stack">
    <div className="field"><label htmlFor="pt-title">Task name</label><input className="inp" id="pt-title" value={title} onChange={function(e){setTitle(e.target.value)}} placeholder="For example: Revise operating systems notes"/></div>
    <div className="fgrid">
      <div className="field"><label htmlFor="pt-ms">Milestone (optional)</label><select className="inp" id="pt-ms" value={ms} onChange={function(e){setMs(e.target.value)}}><option value="">None</option>{mss.map(function(m){return <option key={m.id} value={m.id}>{m.name}</option>})}</select></div>
      <div className="field"><label htmlFor="pt-prio">Priority</label><select className="inp" id="pt-prio" value={prio} onChange={function(e){setPrio(e.target.value)}}>{['High','Medium','Low'].map(function(x){return <option key={x}>{x}</option>})}</select></div>
      <div className="field"><label htmlFor="pt-eff">Estimated effort (hours)</label><input className="inp" id="pt-eff" type="number" min="1" max="80" value={eff} onChange={function(e){setEff(e.target.value)}}/></div>
      <div className="field"><label htmlFor="pt-due">Deadline</label><input className="inp" id="pt-due" type="date" value={due} onChange={function(e){setDue(e.target.value)}}/></div></div>
    <div><button className="btn primary" onClick={add}>Add task</button></div></div>}

function PrefRow(p){var t=p.t,A=useApp().A,pf=getPref(S.me,t.id)||{stance:null,note:'',target:null},pr=projById(t.project);
  function patch(x){setPref(S.me,t.id,x);A.touch()}
  return <li style={{padding:'14px 0'}}>
    <div className="row wrapr" style={{alignItems:'flex-start'}}><span className={'dot p-'+t.prio} style={{marginTop:7}}></span>
      <span className="grow" style={{flexBasis:240}}><button className="btn ghost" style={LINK6} onClick={function(){A.openTask(t.id)}}>{t.title}</button><small style={{display:'block'}}>{pr?pr.name:''} · {t.effort}h · {dueText(t)}</small></span>
      {pf.stance?<span className={'pill '+(pf.stance==='want'?'good':pf.stance==='avoid'?'warn':'info')}>{STANCE[pf.stance]}</span>:null}</div>
    <div className="seg2" style={{marginTop:10}} role="group" aria-label={'How do you feel about '+t.title}>{STANCES.map(function(x){return <button type="button" key={x} className={pf.stance===x?'on':''} aria-pressed={pf.stance===x} onClick={function(){patch({stance:pf.stance===x?null:x})}}><b>{STANCE[x]}</b><small>{x==='want'?'I would like to own this':x==='ok'?'No strong feeling':'Better with someone else'}</small></button>})}</div>
    <div className="fgrid" style={{marginTop:10}}>
      <div className="field"><label htmlFor={'pn-'+t.id}>Note to your team leader</label><input className="inp" id={'pn-'+t.id} value={pf.note||''} onChange={function(e){patch({note:e.target.value})}} placeholder="Anything that helps planning"/></div>
      <div className="field"><label htmlFor={'pd-'+t.id}>My own target date</label><input className="inp" id={'pd-'+t.id} type="date" value={pf.target?isoDayOf(pf.target):''} onChange={function(e){patch({target:e.target.value?parseDay(e.target.value):null})}}/></div></div>
  </li>}
function isoDayOf(ts){return new Date(ts-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)}

function PersonalTask(p){var t=p.t,A=useApp().A,m=t.ms?MS(t.ms):null;
  function set(st){t.status=st;A.toast(st==='done'?'Nice, task completed':'Moved to '+STL[st]);A.touch()}
  function del(){S.tasks.splice(S.tasks.indexOf(t),1);A.toast('Task deleted');A.touch()}
  return <li className="row" style={{padding:'10px 0',alignItems:'flex-start'}}><span className={'dot p-'+t.prio} style={{marginTop:7}}></span>
    <span className="grow"><b style={{fontWeight:500,textDecoration:t.status==='done'?'line-through':'none'}}>{t.title}</b><small style={{display:'block'}}>{t.effort}h · {dueText(t)}{m?' · '+m.name:''}</small></span>
    <span className={'pill '+(t.status==='doing'?'info':t.status==='done'?'good':'')}>{STL[t.status]==='In review'?'In progress':STL[t.status]}</span>
    {t.status==='todo'?<button className="btn sm" onClick={function(){set('doing')}}>Start</button>:null}
    {t.status!=='done'?<button className="btn sm" onClick={function(){set('done')}}>Done</button>:<button className="btn sm" onClick={function(){set('todo')}}>Reopen</button>}
    <button className="btn ghost sm" aria-label={'Delete '+t.title} onClick={del}>Delete</button></li>}

export function PersonalView(){var A=useApp().A,u=me(),
  mss=S.pms.filter(function(m){return m.owner===u.id}).sort(function(a,b){return a.due-b.due}),
  mine=S.tasks.filter(function(t){return t.personal&&t.owner===u.id}).sort(function(a,b){return (a.status==='done')-(b.status==='done')||a.due-b.due}),
  assigned=S.tasks.filter(function(t){return !t.personal&&t.assignee===u.id&&open(t)}).sort(function(a,b){return a.due-b.due});
  var dl=[];
  assigned.forEach(function(t){var pf=getPref(u.id,t.id),pr=projById(t.project);dl.push({ts:pf&&pf.target?pf.target:t.due,label:t.title,kind:(pr?pr.name:'Project')+(pf&&pf.target?' · my target':' · assigned'),task:t.id})});
  mine.filter(open).forEach(function(t){dl.push({ts:t.due,label:t.title,kind:'Personal task'})});
  mss.forEach(function(m){dl.push({ts:m.due,label:m.name,kind:'My milestone'})});
  dl.sort(function(a,b){return a.ts-b.ts});
  return <>
    <header className="pagehead"><div><p className="eyebrow">Workspace</p><h1>Personal</h1><p className="sub">Your own tasks, milestones and deadlines, plus your preferences on the work your team leaders give you. Only you can edit this page.</p></div></header>
    <section className="card"><h2 className="sec">My upcoming deadlines</h2>
      {dl.length?<ul className="list">{dl.slice(0,8).map(function(d,i){var late=d.ts<today;return <li key={i} className="row between" style={{padding:'8px 0',gap:10}}><span className="grow">{d.task?<button className="btn ghost" style={LINK} onClick={function(){A.openTask(d.task)}}>{d.label}</button>:<span>{d.label}</span>}<small style={{display:'block'}}>{d.kind}</small></span><span className={'mono sub due'+(late?' late':'')}>{late?'Overdue · ':''}{fmt(d.ts)}</span></li>})}</ul>:<p className="empty">No deadlines yet. Add a task or milestone below.</p>}</section>
    <section className="card"><h2 className="sec">My preferences on assigned work ({assigned.length})</h2>
      <p className="sub" style={{marginBottom:6}}>Tell your team leader how you feel about each task. They see this in the task details; the official deadline stays unchanged and your own target date is only for you and them to compare.</p>
      {assigned.length?<ul className="list">{assigned.map(function(t){return <PrefRow key={t.id} t={t}/>})}</ul>:<p className="empty">Nothing is assigned to you right now.</p>}</section>
    <div className="grid2">
      <section className="card"><h2 className="sec">My milestones ({mss.length})</h2>
        {mss.length?<ul className="list">{mss.map(function(m){var ts=mine.filter(function(t){return t.ms===m.id}),tot=ts.reduce(function(a,t){return a+t.effort},0),dn=ts.filter(function(t){return !open(t)}).reduce(function(a,t){return a+t.effort},0),pct=tot?Math.round(dn/tot*100):0;
          return <li key={m.id} style={{padding:'10px 0'}}><div className="row between"><b>{m.name}</b><button className="btn ghost sm" aria-label={'Delete milestone '+m.name} onClick={function(){S.pms.splice(S.pms.indexOf(m),1);S.tasks.forEach(function(t){if(t.ms===m.id&&t.personal)t.ms=null});A.toast('Milestone deleted');A.touch()}}>Delete</button></div><div className="seg-bar" style={{margin:'6px 0'}}><i style={{width:pct+'%'}}/></div><small className="mono">{fmt(m.due)} · {pct}% done · {ts.length} task{ts.length===1?'':'s'}</small></li>})}</ul>:<p className="empty">No personal milestones yet.</p>}
        <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid var(--line)'}}><AddMilestone/></div></section>
      <section className="card"><h2 className="sec">Add a personal task</h2><AddTask mss={mss}/></section>
    </div>
    <section className="card"><h2 className="sec">My personal tasks ({mine.length})</h2>{mine.length?<ul className="list">{mine.map(function(t){return <PersonalTask key={t.id} t={t}/>})}</ul>:<p className="empty">Nothing here yet. Add your first task above.</p>}<small style={{display:'block',marginTop:8}}>Open personal tasks count toward your workload hours.</small></section>
  </>}
export default PersonalView;

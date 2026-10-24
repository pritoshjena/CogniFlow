import React, {useState} from 'react';
import {S, T, U, DAY, today, PR, STL, open, overdue, isBlocked, fmt, first, ago, lp, dueText, loadOf, stateOf, myProjects, projectStats, withProject, risks, riskLevel, me, canLead} from '../store.js';
import {useApp} from '../AppContext.js';
import {Av, LoadBar} from '../components/common.jsx';

/* Inline icons keep the project free of extra dependencies. */
const I={
  list:'M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  check:'M20 6 9 17l-5-5',
  clock:'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  alert:'M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0',
  arrow:'M5 12h14m-6-6 6 6-6 6',
  plus:'M12 5v14M5 12h14'
};
function Ic(p){return <svg viewBox="0 0 24 24" width={p.s||18} height={p.s||18} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={I[p.n]}/></svg>}

function greeting(){var h=new Date().getHours();return h<12?'Good morning':h<17?'Good afternoon':'Good evening'}
function Metric(p){return <div className="ov-metric"><div className="ov-metric-top"><span>{p.label}</span><span className={'ov-ico '+p.tone}><Ic n={p.icon}/></span></div><strong className="mono">{p.value}</strong><small>{p.note}</small></div>}

export function HomeView(){
  var c=useApp(),A=c.A,u=me(),lead=myProjects().some(function(p){return p.leader===S.me});
  var s1=useState(lead?'team':'mine'),mode=s1[0],setMode=s1[1];
  var s2=useState(false),hide=s2[0],setHide=s2[1];
  var projs=myProjects(),ids=projs.map(function(p){return p.id});
  var inScope=function(t){return mode==='mine'?t.assignee===S.me:(ids.indexOf(t.project)>-1||(t.personal&&t.owner===S.me))};
  var tasks=S.tasks.filter(inScope);
  var done=tasks.filter(function(t){return !open(t)}),pend=tasks.filter(open);
  var late=pend.filter(overdue),blocked=pend.filter(isBlocked);
  var atRisk=pend.filter(function(t){return overdue(t)||isBlocked(t)});
  var week=pend.filter(function(t){return !overdue(t)&&t.due-today<=7*DAY}).length;
  var pct=tasks.length?Math.round(done.length/tasks.length*100):0;
  var cnt={done:done.length,review:pend.filter(function(t){return t.status==='review'}).length,doing:pend.filter(function(t){return t.status==='doing'}).length,todo:pend.filter(function(t){return t.status==='todo'}).length};
  var hrsAll=tasks.reduce(function(a,t){return a+t.effort},0),hrsDone=done.reduce(function(a,t){return a+t.effort},0);
  var segs=[['done','Completed',cnt.done],['review','In review',cnt.review],['doing','In progress',cnt.doing],['todo','To do',cnt.todo]];
  var acc=0,stops=segs.map(function(s){var a=acc,b=acc+(tasks.length?s[2]/tasks.length*100:0);acc=b;return 'var(--ov-'+s[0]+') '+a+'% '+b+'%'});
  var donut=tasks.length?'conic-gradient('+stops.join(',')+')':'var(--line)';

  var ids2=tasks.map(function(t){return t.id});
  var days=[];for(var i=6;i>=0;i--){var d0=today-i*DAY,n=S.log.filter(function(l){return l.type==='complete'&&l.ts>=d0&&l.ts<d0+DAY&&ids2.indexOf(l.t)>-1}).length;days.push({d:d0,n:n})}
  var vmax=Math.max.apply(null,days.map(function(x){return x.n}).concat([1])),vtot=days.reduce(function(a,x){return a+x.n},0);

  var prio=pend.slice().sort(function(a,b){return (overdue(b)-overdue(a))||(isBlocked(b)-isBlocked(a))||(PR[a.prio]-PR[b.prio])||(a.due-b.due)}).slice(0,5);
  var log=S.log.filter(function(l){return ids2.indexOf(l.t)>-1}).sort(function(a,b){return b.ts-a.ts}).slice(0,5);
  var seen={},people=[];projs.forEach(function(p){p.team.concat(p.leader).forEach(function(id){if(!seen[id]&&U(id)){seen[id]=1;people.push(U(id))}})});
  people.sort(function(a,b){return loadOf(b)-loadOf(a)});

  var top=null;projs.forEach(function(p){var R=withProject(p.id,risks);if(R.length&&(!top||R[0].sev>top.r.sev))top={p:p,r:R[0],n:R.length}});

  return <>
    <header className="pagehead"><div><p className="eyebrow">{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p><h1>{greeting()}, {first(u)}</h1><p className="sub">Everything across your {projs.length} project{projs.length===1?'':'s'} in one place: progress, pending work and what needs attention.</p></div>
      <div className="row wrapr" style={{gap:10}}>
        <div className="ov-seg" role="group" aria-label="Scope"><button className={mode==='team'?'on':''} onClick={function(){setMode('team')}}>All project work</button><button className={mode==='mine'?'on':''} onClick={function(){setMode('mine')}}>My tasks</button></div>
        <button className="btn" onClick={A.newProject}><Ic n="plus" s={15}/> New project</button></div></header>

    <div className="ov-metrics">
      <Metric label="Total tasks" value={tasks.length} icon="list" tone="acc" note={projs.length+' project'+(projs.length===1?'':'s')+' · '+hrsAll+'h estimated'}/>
      <Metric label="Completed" value={done.length} icon="check" tone="good" note={pct+'% complete · '+hrsDone+'h delivered'}/>
      <Metric label="Pending" value={pend.length} icon="clock" tone="warn" note={week+' due in the next 7 days'}/>
      <Metric label="At risk" value={atRisk.length} icon="alert" tone="bad" note={late.length+' overdue · '+blocked.length+' blocked'}/>
    </div>

    <div className="ov-grid a">
      <section className="card"><div className="row between"><div><h2 className="sec" style={{margin:0}}>Delivery overview</h2><small>Share of tasks by stage</small></div></div>
        <div className="ov-delivery"><div className="ov-donut" style={{background:donut}} role="img" aria-label={pct+' percent of tasks complete'}><div><strong className="mono">{pct}%</strong><small>complete</small></div></div>
          <div className="ov-legend">{segs.map(function(s){return <div key={s[0]}><i style={{background:'var(--ov-'+s[0]+')'}}/><span>{s[1]}</span><b className="mono">{s[2]}</b></div>})}
            <div className="ov-legend-risk"><i style={{background:'var(--bad)'}}/><span>At risk (overdue or blocked)</span><b className="mono">{atRisk.length}</b></div></div></div>
        <div className="ov-effort"><div className="row between"><small>Effort delivered</small><small className="mono">{hrsDone}h of {hrsAll}h</small></div><span className="seg-bar" aria-hidden="true"><i style={{width:(hrsAll?hrsDone/hrsAll*100:0)+'%'}}/></span></div></section>
      <section className="card"><div className="row between"><div><h2 className="sec" style={{margin:0}}>Team velocity</h2><small>Tasks completed, last 7 days</small></div><div className="ov-total"><strong className="mono">{vtot}</strong><small>completed</small></div></div>
        <div className="ov-bars" role="img" aria-label={vtot+' tasks completed in the last 7 days'}>{days.map(function(x,i){return <div className="ov-bar" key={i}><span className="mono">{x.n||''}</span><div className="ov-track"><i className={i===6?'now':''} style={{height:Math.max(x.n/vmax*100,3)+'%'}}/></div><small>{new Date(x.d).toLocaleDateString('en-GB',{weekday:'short'}).slice(0,2)}</small></div>})}</div></section>
    </div>

    <div className="ov-grid b">
      <section className="card"><div className="row between"><h2 className="sec" style={{margin:0}}>Active projects</h2><button className="btn ghost sm" onClick={function(){A.nav('projects')}}>View all</button></div>
        <div className="ov-plist">{projs.length?projs.slice(0,4).map(function(p){var st=projectStats(p),cl=st.lvl.c==='high'?'bad':st.lvl.c==='medium'?'warn':'good';
          return <button className="ov-prow" key={p.id} onClick={function(){A.openProject(p.id)}}><span className="ov-psym">{p.name.split(/\s+/).map(function(w){return w[0]}).slice(0,2).join('').toUpperCase()}</span>
            <span className="grow"><span className="row between"><b>{p.name}</b><span className={'pill '+cl}>{st.lvl.t} risk</span></span><span className="seg-bar" aria-hidden="true"><i style={{width:st.pct+'%'}}/></span><span className="row between"><small>{st.counts.done} of {st.tasks} tasks done</small><small className="mono">{st.pct}%</small></span></span></button>}):<p className="empty">No projects yet.</p>}</div></section>
      <section className="card"><div className="row between"><h2 className="sec" style={{margin:0}}>Team workload</h2>{S.cur&&projs.some(function(p){return p.id===S.cur})?<button className="btn ghost sm" onClick={function(){A.nav('workload')}}>Details</button>:null}</div>
        <div style={{marginTop:6}}>{people.slice(0,5).map(function(x){var l=loadOf(x),st=stateOf(l);return <div className="loadrow" style={{padding:'7px 0'}} key={x.id}><Av u={x} sz="sm"/><span className="nm" style={{flexBasis:90}}>{first(x)}</span><LoadBar l={l}/><span className={'pill '+st[1]}>{Math.round(l*100)}%</span></div>})}</div>
        <small>Open effort against fortnight capacity, across all projects.</small></section>
    </div>

    <div className="ov-grid c">
      <section className="card"><div className="row between"><h2 className="sec" style={{margin:0}}>Priority tasks</h2><small>Overdue and blocked first</small></div>
        {prio.length?<div className="ov-tablewrap"><table className="ov-table"><thead><tr><th>Task</th><th>Owner</th><th>Due</th><th>Priority</th><th>Status</th></tr></thead><tbody>{prio.map(function(t){var o=U(t.assignee),b=isBlocked(t);
          return <tr key={t.id} onClick={function(){A.openTask(t.id)}} tabIndex={0} onKeyDown={function(e){if(e.key==='Enter')A.openTask(t.id)}}><td><b>{t.title}</b><small>{t.project?S.projects.find(function(p){return p.id===t.project}).name:'Personal'}</small></td><td><span className="row" style={{gap:6}}><Av u={o} sz="sm"/>{o?first(o):'Unassigned'}</span></td><td><span className={overdue(t)?'late':''}>{dueText(t)}</span></td><td><span className="row" style={{gap:6}}><span className={'dot p-'+t.prio}/>{t.prio}</span></td><td><span className={'pill '+(b?'bad':t.status==='doing'?'info':'')}>{b?'Blocked':STL[t.status]}</span></td></tr>})}</tbody></table></div>:<p className="empty">Nothing pending. Everything in scope is done.</p>}</section>
      <section className="card"><h2 className="sec">Recent activity</h2>
        {log.length?<ul className="list feed">{log.map(function(l,i){var x=U(l.u),t=T(l.t);if(!x)return null;return <li key={i}><Av u={x} sz="sm"/><span className="grow"><span><b>{first(x)}</b> {lp(l)}{t?' “'+t.title+'”':''}</span><small>{ago(l.ts)}</small></span></li>})}</ul>:<p className="empty">No activity yet.</p>}</section>
    </div>

    {top&&!hide?<div className="ov-banner" role="alert"><span className="ov-ico bad"><Ic n="alert"/></span><div className="grow"><strong>{top.p.name} needs attention</strong><p>{top.r.title}. {top.n>1?(top.n-1)+' more signal'+(top.n>2?'s':'')+' in this project.':''}</p></div>
      <button className="btn sm" onClick={function(){S.cur=top.p.id;A.nav('risks')}}>Review risks <Ic n="arrow" s={14}/></button><button className="ov-x" aria-label="Dismiss" onClick={function(){setHide(true)}}>×</button></div>:null}
  </>}

export default HomeView;

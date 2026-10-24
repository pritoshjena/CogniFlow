import React, {useState, useEffect, useReducer, useRef} from 'react';
import {proj, projById, allMs, ptasks, plog, myProjects, canLead, withProject, getPref, setPref, STANCE, projectStats, SKILLS, LVL, DAY, today, PR, STL, seed, save, U, T, MS, me, isLeader, onTeam, team, open, blockers, isBlocked, overdue, fmt, first, initials, ago, dueText, downstream, openEffort, cap2, loadOf, stateOf, fit, reason, rank, plan, recs, msStats, risks, riskLevel, lastActive, logAct, lp, S, resetStore} from '../store.js';
import {useApp} from '../AppContext.js';
import {Av, Logo, LoadBar, SkillChips, TaskCard, Feed, Ruler, LINK, LINK6} from '../components/common.jsx';

export function TaskGraph(){var c=useApp(),A=c.A,sel=c.sel,tasks=ptasks(),depth={};
  var d=function(t){if(depth[t.id]!==undefined)return depth[t.id];depth[t.id]=0;var m=-1;t.deps.forEach(function(i){var x=T(i);if(x)m=Math.max(m,d(x))});return depth[t.id]=m+1};tasks.forEach(d);
  var W=180,H=46,GX=60,GY=14,cols={},pos={},key={},maxC=0;
  tasks.forEach(function(t){(cols[depth[t.id]]=cols[depth[t.id]]||[]).push(t);maxC=Math.max(maxC,depth[t.id])});
  var maxR=0;
  for(var cc=0;cc<=maxC;cc++){var arr=cols[cc]||[];
    arr.forEach(function(t){var ys=t.deps.map(function(i){return pos[i]?pos[i].row:null}).filter(function(v){return v!==null});key[t.id]=ys.length?ys.reduce(function(a,b){return a+b},0)/ys.length:t.id/100});
    arr.sort(function(a,b){return key[a.id]-key[b.id]});
    arr.forEach(function(t,i){pos[t.id]={x:8+cc*(W+GX),y:8+i*(H+GY),row:i}});maxR=Math.max(maxR,arr.length)}
  var hl={};if(sel){hl[sel]=1;downstream(sel).forEach(function(t){hl[t.id]=1})}
  var edges=[],nodes=[];
  tasks.forEach(function(t){t.deps.forEach(function(i){var a=pos[i],b=pos[t.id];if(!a||!b)return;var x1=a.x+W,y1=a.y+H/2,x2=b.x,y2=b.y+H/2,on=hl[i]&&hl[t.id];
    edges.push(<path key={i+'-'+t.id} className={'ge'+(sel?(on?' hl':' dim'):'')} d={'M'+x1+' '+y1+' C'+(x1+30)+' '+y1+' '+(x2-30)+' '+y2+' '+x2+' '+y2}/>)})});
  tasks.forEach(function(t){var p=pos[t.id],a=U(t.assignee),title=t.title.length>27?t.title.slice(0,26)+'…':t.title;
    nodes.push(<g key={t.id} className={'gn '+t.status+(isBlocked(t)?' blocked':'')+(sel===t.id?' sel':'')+(sel&&!hl[t.id]?' dim':'')} onClick={function(){A.selectNode(t.id)}} transform={'translate('+p.x+','+p.y+')'}><title>{t.title}</title><rect width={W} height={H} rx="6"/><text x="10" y="19">{title}</text><text className="s" x="10" y="36">{t.effort}h · {a?first(a):'unassigned'} · {fmt(t.due)}</text></g>)});
  var w=8+(maxC+1)*(W+GX)-GX+8,h=8+maxR*(H+GY)+8;
  return <svg width={w} height={h} viewBox={'0 0 '+w+' '+h} role="img" aria-label="Task dependency graph">{edges}{nodes}</svg>}

export function Impact(){var c=useApp(),A=c.A,sel=c.sel,slip=c.slip;
  if(!sel||!T(sel))return <p className="empty">Select a task in the graph to see what waits on it and what a delay would touch.</p>;
  var t=T(sel),ds=downstream(t.id),mss={};ds.forEach(function(x){mss[x.ms]=1});mss[t.ms]=1;
  var names=Object.keys(mss).map(function(k){return MS(+k)}).sort(function(a,b){return a.due-b.due});
  return <div className="stack"><div><b>“{t.title}”</b><small style={{display:'block'}}>{STL[t.status]} · {dueText(t)}</small></div>
    <div className="field"><span className="lb">If it slips by <b className="mono">{slip} day{slip>1?'s':''}</b></span><input className="rng" id="slip" type="range" min="1" max="10" value={slip} onChange={function(e){c.setSlip(+e.target.value)}} aria-label="Days of delay"/></div>
    {ds.length?<><p>{ds.length} task{ds.length>1?'s':''} wait on this, directly or further down the chain. They could move as late as:</p><ul className="list">{ds.sort(function(a,b){return a.due-b.due}).map(function(x){return <li className="row between" style={{padding:'6px 0',gap:10}} key={x.id}><span className="grow">{x.title}</span><span className="mono sub">{fmt(x.due)} → {fmt(x.due+slip*DAY)}</span></li>})}</ul></>:<p>Nothing depends on this task, so a delay only affects its own deadline.</p>}
    <p className="sub">Milestones touched: {names.map(function(m,i){return <React.Fragment key={m.id}>{i?', ':''}<b>{m.name}</b> ({fmt(m.due)})</React.Fragment>})}.</p><button className="btn sm" onClick={function(){A.openTask(t.id)}}>Open task</button></div>}

export function DepsView(){var A=useApp().A,bl=ptasks().filter(isBlocked).sort(function(a,b){return downstream(b.id).length-downstream(a.id).length});
  return <>
    <header className="pagehead"><div><p className="eyebrow">Sequence</p><h1>Dependencies</h1><p className="sub">Columns run left to right in the order work can start. Dashed red outlines are blocked.</p></div></header>
    <section className="card"><h2 className="sec">Blocked right now ({bl.length})</h2>
      {bl.length?<ul className="list">{bl.map(function(t){var b=blockers(t),n=downstream(t.id).length;return <li className="row wrapr" style={{padding:'10px 0'}} key={t.id}><span className="grow" style={{flexBasis:240}}><button className="btn ghost" style={LINK} onClick={function(){A.openTask(t.id)}}>{t.title}</button><small style={{display:'block'}}>Waiting on {b.map(function(x){return '“'+x.title+'”'}).join(', ')}</small></span><span className="pill bad">Blocked</span><span className="pill">{n} downstream</span></li>})}</ul>:<p className="empty">No task is blocked.</p>}</section>
    <div className="grid2" style={{gridTemplateColumns:'minmax(0,1.6fr) minmax(0,1fr)'}}>
      <section className="card" style={{minWidth:0}}><h2 className="sec">Task graph</h2><div className="gwrap"><TaskGraph/></div>
        <div className="legend" style={{marginTop:10}}><span style={{'--c':'var(--good)'}}>Done</span><span style={{'--c':'var(--accent)'}}>In progress</span><span style={{'--c':'var(--warn)'}}>In review</span><span style={{'--c':'var(--line-strong)'}}>To do</span></div></section>
      <section className="card"><h2 className="sec">Delay impact</h2><div id="impact"><Impact/></div></section>
    </div>
  </>}

export default DepsView;

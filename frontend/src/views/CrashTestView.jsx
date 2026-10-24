import React, {useEffect, useState} from 'react';
import {proj, ptasks, team, U, me, DAY, today, save, S, fit, open, logAct} from '../store.js';
import {useApp} from '../AppContext.js';

function dayStamp(ts){return new Date(ts).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}
function clone(){return ptasks().map(t=>({...t,skills:(t.skills||[]).slice(),deps:(t.deps||[]).slice()}));}
function descendants(id,tasks){var seen=new Set(),queue=[id];while(queue.length){var now=queue.shift();tasks.forEach(t=>{if(t.status!=='done'&&t.deps.includes(now)&&!seen.has(t.id)){seen.add(t.id);queue.push(t.id);}});}return Array.from(seen);}
function shiftChain(tasks,id,days){var affected=[id,...descendants(id,tasks)];affected.forEach(taskId=>{var t=tasks.find(x=>x.id===taskId);if(t&&t.status!=='done')t.due+=days*DAY;});return affected;}
function finish(tasks){var active=tasks.filter(t=>t.status!=='done');return active.length?Math.max(...active.map(t=>t.due)):today;}
function metrics(tasks,base){var baseById={};base.forEach(t=>baseById[t.id]=t);var changed=tasks.filter(t=>{var b=baseById[t.id];return b&&(t.due!==b.due||t.assignee!==b.assignee||JSON.stringify(t.deps)!==JSON.stringify(b.deps));});return {finish:finish(tasks),delta:Math.round((finish(tasks)-finish(base))/DAY),changed:changed.length,late:tasks.filter(t=>t.status!=='done'&&t.due<today).length,unassigned:tasks.filter(t=>t.status!=='done'&&!t.assignee).length};}
function taskLabel(t,all){return t.title+(t.assignee?' · '+(U(t.assignee)?.name||'member'):' · unassigned');}

export default function CrashTestView(){
  var c=useApp(),A=c.A,p=proj(),projectId=p?p.id:0,base=clone();
  var members=team();
  var openTasks=base.filter(t=>t.status!=='done');
  var [absenceOn,setAbsenceOn]=useState(true),[delayOn,setDelayOn]=useState(true),[dependencyOn,setDependencyOn]=useState(true);
  var [absentId,setAbsentId]=useState(''),[delayTaskId,setDelayTaskId]=useState(''),[delayDays,setDelayDays]=useState(5),[dependencyTaskId,setDependencyTaskId]=useState(''),[dependencyDays,setDependencyDays]=useState(3);
  var [activePlan,setActivePlan]=useState('combined'),[notice,setNotice]=useState(''),[preset,setPreset]=useState('worst');
  useEffect(()=>{if(members.length&&!members.some(u=>String(u.id)===String(absentId))){var busy=members.find(u=>base.some(t=>t.assignee===u.id&&t.status!=='done'))||members[0];setAbsentId(String(busy.id));}if(openTasks.length&&!openTasks.some(t=>String(t.id)===String(delayTaskId))){var high=openTasks.find(t=>t.prio==='High')||openTasks[0];setDelayTaskId(String(high.id));}if(openTasks.length&&!openTasks.some(t=>String(t.id)===String(dependencyTaskId))){var blocked=openTasks.find(t=>t.deps.length)||openTasks[0];setDependencyTaskId(String(blocked.id));}},[projectId,members.length,openTasks.length,absentId,delayTaskId,dependencyTaskId]);
  var absent=members.find(u=>String(u.id)===String(absentId));

  function usePreset(kind){
    setPreset(kind);
    if(kind==='people'){
      setAbsenceOn(true);setDelayOn(false);setDependencyOn(false);setActivePlan('rebalance');
    }else if(kind==='deadline'){
      setAbsenceOn(false);setDelayOn(true);setDependencyOn(false);setDelayDays(7);setActivePlan('fasttrack');
    }else if(kind==='dependency'){
      setAbsenceOn(false);setDelayOn(false);setDependencyOn(true);setDependencyDays(5);setActivePlan('fasttrack');
    }else if(kind==='worst'){
      setAbsenceOn(true);setDelayOn(true);setDependencyOn(true);setDelayDays(5);setDependencyDays(3);setActivePlan('combined');
    }
  }
  function buildShock(){
    var tasks=base.map(t=>({...t,skills:t.skills.slice(),deps:t.deps.slice()})),affected=new Set(),shockNotes=[];
    if(absenceOn&&absent){tasks.forEach(t=>{if(t.assignee===absent.id&&t.status!=='done'){t.assignee=null;affected.add(t.id);}});shockNotes.push(absent.name+' is unavailable; '+Array.from(affected).length+' open task(s) lose their owner.');}
    if(delayOn){var id=Number(delayTaskId),delta=Math.max(1,Math.min(60,Number(delayDays)||1)),chain=shiftChain(tasks,id,delta);chain.forEach(x=>affected.add(x));var target=tasks.find(t=>t.id===id);if(target)shockNotes.push('“'+target.title+'” slips by '+delta+' days, shifting '+chain.length+' task(s) in its dependency chain.');}
    if(dependencyOn){var id2=Number(dependencyTaskId),delta2=Math.max(1,Math.min(60,Number(dependencyDays)||1)),chain2=shiftChain(tasks,id2,delta2);chain2.forEach(x=>affected.add(x));var target2=tasks.find(t=>t.id===id2);if(target2)shockNotes.push('A dependency wait adds '+delta2+' days at “'+target2.title+'” and its downstream chain ('+chain2.length+' task(s)).');}
    return {tasks,affected:Array.from(affected),shockNotes};
  }
  var shock=buildShock();
  function recovery(mode){
    var tasks=shock.tasks.map(t=>({...t,skills:t.skills.slice(),deps:t.deps.slice()})),actions=[],moved=[],loads={};
    members.forEach(u=>{loads[u.id]=base.filter(t=>t.assignee===u.id&&t.status!=='done'&&!(absenceOn&&u.id===Number(absentId))).reduce((n,t)=>n+t.effort,0);});
    if((mode==='rebalance'||mode==='combined')&&absenceOn&&absent){
      var atRisk=tasks.filter(t=>t.status!=='done'&&!t.assignee&&base.some(b=>b.id===t.id&&b.assignee===absent.id)).sort((a,b)=>(a.prio==='High'?-1:0)-(b.prio==='High'?-1:0)||a.due-b.due);
      atRisk.forEach(t=>{var candidates=members.filter(u=>u.id!==absent.id).map(u=>{var projected=(loads[u.id]||0)+t.effort,capacity=Math.max(1,(u.cap||20)*2);var match=fit(u,t);return {u,match,projected,capacity,score:match*0.72+(1-Math.min(projected/capacity,1.5)/1.5)*28};}).sort((a,b)=>b.score-a.score);var eligible=candidates.find(x=>x.projected<=x.capacity&&x.match>=25)||candidates[0];if(eligible){t.assignee=eligible.u.id;loads[eligible.u.id]=(loads[eligible.u.id]||0)+t.effort;moved.push({task:t.title,to:eligible.u.name,fit:eligible.match});}});
      actions.push('Reassigned '+moved.length+' unavailable-owner task(s) using skill match and estimated capacity.');
    }
    if(mode==='fasttrack'||mode==='combined'){
      // Explicit, editable planning assumption: a focused recovery sprint can reclaim up to two days from the main delayed task.
      if(delayOn){var targetId=Number(delayTaskId),recover=Math.min(2,Math.max(0,Number(delayDays)||0));if(recover>0){var chain=shiftChain(tasks,targetId,-recover);actions.push('Fast-track assumption: reclaim '+recover+' day(s) on “'+(tasks.find(t=>t.id===targetId)?.title||'the delayed task')+'” and '+Math.max(0,chain.length-1)+' downstream task(s).');}}
      if(dependencyOn){var targetId2=Number(dependencyTaskId),recover2=Math.min(1,Math.max(0,Number(dependencyDays)||0));if(recover2>0){shiftChain(tasks,targetId2,-recover2);actions.push('Pair-review assumption: reclaim '+recover2+' day(s) from the dependency wait at “'+(tasks.find(t=>t.id===targetId2)?.title||'the selected task')+'”.');}}
    }
    if(!actions.length)actions.push('Keep the shock plan unchanged; no recovery action was selected.');
    return {mode,tasks,actions,moved,affected:shock.affected,stats:metrics(tasks,base)};
  }
  var plans=[
    {id:'hold',name:'Hold course',tag:'No intervention',body:'Shows the full impact of the selected disruptions with no recovery actions.',data:recovery('hold')},
    {id:'rebalance',name:'Rebalance the team',tag:'Protect ownership',body:'Reassigns tasks from an unavailable teammate to the best skill/capacity matches.',data:recovery('rebalance')},
    {id:'fasttrack',name:'Critical-path sprint',tag:'Recover schedule',body:'Models a focused recovery sprint that can reclaim up to two days from a delayed task. This is an assumption you can change, not a prediction.',data:recovery('fasttrack')},
    {id:'combined',name:'Combined recovery',tag:'Integrated response',body:'Combines capacity-aware reassignment with the explicit fast-track assumptions.',data:recovery('combined')}
  ];
  var recommendedPlan=(shock.shockNotes.length?plans.filter(x=>x.id!=='hold'):plans.filter(x=>x.id==='hold')).slice().sort((a,b)=>{
    // Transparent rule of thumb: penalize schedule slip and unassigned tasks most; keep edits modest.
    var score=x=>x.data.stats.delta + x.data.stats.unassigned*5 + x.data.stats.changed*0.03 + (x.id==='hold'?1.25:0);
    return score(a)-score(b);
  })[0]||plans[3];
  var selectedPlan=plans.find(x=>x.id===activePlan)||plans[3];
  function apply(){var d=selectedPlan.data;if(!window.confirm('Apply “'+selectedPlan.name+'” to the live project? This will change task dates and/or owners.'))return;var ids=new Set(base.map(t=>t.id));S.tasks.forEach(t=>{if(t.project===projectId&&ids.has(t.id)){var n=d.tasks.find(x=>x.id===t.id);if(n){t.due=n.due;t.assignee=n.assignee;t.deps=n.deps.slice();}}});var changed=d.tasks.find(t=>ids.has(t.id));if(changed)logAct(S.me,'update',changed,1);save();A.touch();A.toast('Recovery plan applied to the live project.');setNotice('Applied '+selectedPlan.name+' to the live project.');}
  var baselineStats=metrics(base,base),shockStats=metrics(shock.tasks,base),selected=selectedPlan.data;
  if(!p)return <section className="card"><h2 className="sec">No project selected</h2><p className="sub">Choose a project to break-test its plan.</p></section>;
  return <div className="ct-page">
    <header className="pagehead"><div><p className="eyebrow">Resilience lab · {p.name}</p><h1>Crash Test</h1><p className="sub">Inject unplanned disruptions to discover where the project breaks. CogniFlow traces the damage, compares recovery responses, and lets you approve a repair plan.</p></div><span className="pill warn">Stress-test mode</span></header>
    <div className="ct-hero"><div className="ct-hero-mark">!</div><div className="ct-hero-copy"><strong>Break the plan here—not in production.</strong><p>Unlike Time Machine's planned schedule alternatives, Crash Test injects failures that the team did not choose: an unavailable owner, a deadline shock, or a dependency bottleneck. Then it evaluates recovery responses.</p></div><button className="btn ghost sm ct-switch-link" onClick={()=>A.nav('time-machine')}>Explore planned futures →</button></div>
    <section className="card ct-preset-card"><div><h2 className="sec">Choose a stress-test preset</h2><p className="sub">Start with a common failure pattern, then adjust the details below.</p></div><div className="ct-presets">
      <button className={'ct-preset '+(preset==='people'?'active':'')} onClick={()=>usePreset('people')}><b>People outage</b><small>One teammate becomes unavailable.</small></button>
      <button className={'ct-preset '+(preset==='deadline'?'active':'')} onClick={()=>usePreset('deadline')}><b>Deadline shock</b><small>A critical task slips by seven days.</small></button>
      <button className={'ct-preset '+(preset==='dependency'?'active':'')} onClick={()=>usePreset('dependency')}><b>Dependency bottleneck</b><small>A prerequisite or external review takes longer.</small></button>
      <button className={'ct-preset '+(preset==='worst'?'active':'')} onClick={()=>usePreset('worst')}><b>Worst-case stack</b><small>Combine people, schedule and dependency failures.</small></button>
    </div></section>
    <div className="ct-layout">
      <section className="card"><h2 className="sec">Inject disruptions</h2><p className="sub">Combine events to test a realistic worst-case scenario.</p>
        <label className="ct-toggle"><input type="checkbox" checked={absenceOn} onChange={e=>{setAbsenceOn(e.target.checked);setPreset('custom')}}/><span><b>1. A teammate becomes unavailable</b><small>Simulate all their open tasks losing their current owner.</small></span></label>
        {absenceOn?<div className="field ct-nested"><label htmlFor="ct-person">Unavailable teammate</label><select id="ct-person" className="inp" value={absentId} onChange={e=>{setAbsentId(e.target.value);setPreset('custom')}}>{members.map(u=><option key={u.id} value={u.id}>{u.name} · {base.filter(t=>t.assignee===u.id&&t.status!=='done').length} open task(s)</option>)}</select></div>:null}
        <label className="ct-toggle"><input type="checkbox" checked={delayOn} onChange={e=>{setDelayOn(e.target.checked);setPreset('custom')}}/><span><b>2. A critical task slips</b><small>Delay a task and ripple the slip through all dependent tasks.</small></span></label>
        {delayOn?<div className="ct-nested ct-fields"><div className="field"><label htmlFor="ct-task">Task that slips</label><select id="ct-task" className="inp" value={delayTaskId} onChange={e=>{setDelayTaskId(e.target.value);setPreset('custom')}}>{openTasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></div><div className="field"><label htmlFor="ct-days">Delay (days)</label><input id="ct-days" className="inp" type="number" min="1" max="60" value={delayDays} onChange={e=>{setDelayDays(e.target.value);setPreset('custom')}}/></div></div>:null}
        <label className="ct-toggle"><input type="checkbox" checked={dependencyOn} onChange={e=>{setDependencyOn(e.target.checked);setPreset('custom')}}/><span><b>3. A dependency takes longer</b><small>Simulate a supplier, review, or prerequisite blocking downstream work.</small></span></label>
        {dependencyOn?<div className="ct-nested ct-fields"><div className="field"><label htmlFor="ct-deptask">Dependency bottleneck</label><select id="ct-deptask" className="inp" value={dependencyTaskId} onChange={e=>{setDependencyTaskId(e.target.value);setPreset('custom')}}>{openTasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></div><div className="field"><label htmlFor="ct-depdays">Extra wait (days)</label><input id="ct-depdays" className="inp" type="number" min="1" max="60" value={dependencyDays} onChange={e=>{setDependencyDays(e.target.value);setPreset('custom')}}/></div></div>:null}
        <div className="ct-shock-summary"><b>Combined shock</b>{shock.shockNotes.length?<ul>{shock.shockNotes.map((n,i)=><li key={i}>{n}</li>)}</ul>:<p>No disruptions selected. Enable one or more events to run a useful crash test.</p>}</div>
      </section>
      <section className="card"><h2 className="sec">Immediate impact</h2><p className="sub">The projected finish is based on the latest due date among open tasks.</p><div className="ct-kpis"><div className="ct-kpi"><small>Original forecast</small><strong>{dayStamp(baselineStats.finish)}</strong></div><div className="ct-kpi"><small>After disruption</small><strong>{dayStamp(shockStats.finish)}</strong><span className={'pill '+(shockStats.delta>0?'bad':shockStats.delta<0?'good':'')}>{shockStats.delta>0?'+':''}{shockStats.delta} days</span></div><div className="ct-kpi"><small>Tasks affected</small><strong>{shock.affected.length}</strong></div><div className="ct-kpi"><small>Unassigned open tasks</small><strong className={shockStats.unassigned?'ct-red':''}>{shockStats.unassigned}</strong></div></div><div className="ct-cascade"><div className="ct-cascade-head"><b>Disruption chain</b><span className="pill">{shock.affected.length} task(s)</span></div>{shock.affected.length?shock.affected.slice(0,8).map(id=>{var t=shock.tasks.find(x=>x.id===id),original=base.find(x=>x.id===id);return t?<div className="ct-chainrow" key={id}><span><b>{t.title}</b><small>{original?.assignee&&!t.assignee?'Owner lost':t.assignee?'Assigned to '+(U(t.assignee)?.name||'team member'):'Unassigned'}</small></span><span className={t.due>(original?.due||t.due)?'ct-date-late':''}>{dayStamp(original?.due||t.due)}{t.due!==(original?.due||t.due)?' → '+dayStamp(t.due):''}</span></div>:null}):<p className="empty">No cascade yet. Select disruptions to see the impact.</p>}{shock.affected.length>8?<small className="sub">Showing 8 of {shock.affected.length} affected tasks.</small>:null}</div></section>
    </div>
    <section className="card ct-plan-section"><div className="row between ct-wrap"><div><h2 className="sec">Compare recovery plans</h2><p className="sub">Each plan is a separate simulation. Select one to inspect its actions before applying it.</p></div><span className="pill info">4 strategies</span></div>
      <div className="ct-plans">{plans.map(pl=>{var d=pl.data;return <button key={pl.id} className={'ct-plan '+(activePlan===pl.id?'selected':'')} onClick={()=>setActivePlan(pl.id)}><span className="ct-plan-top"><span className="pill">{recommendedPlan.id===pl.id?'Best fit for this test':pl.tag}</span>{activePlan===pl.id?<span className="ct-selected-dot">✓</span>:null}</span><b>{pl.name}</b><small>{pl.body}</small><span className="ct-plan-finish">{dayStamp(d.stats.finish)}</span><span className={'pill '+(d.stats.delta>0?'bad':d.stats.delta<0?'good':'')}>{d.stats.delta>0?'+':''}{d.stats.delta} day(s) vs. original</span><span className="ct-plan-foot">{d.stats.unassigned} unassigned · {d.stats.changed} changed tasks</span></button>;})}</div>
      <div className="ct-selected-plan"><div className="row between ct-wrap"><div><h3>{selectedPlan.name}</h3><p className="sub">What this plan changes</p></div><button className="btn primary" onClick={apply} disabled={!shock.shockNotes.length}>Apply recovery plan</button></div><ul className="ct-actions">{selected.actions.map((a,i)=><li key={i}>{a}</li>)}</ul>{selected.moved.length?<div className="ct-reassign-table"><b>Proposed task handoffs</b>{selected.moved.map((m,i)=><div key={i}><span>{m.task}</span><span>{m.to} <small>{m.fit}% skill match</small></span></div>)}</div>:null}<p className="ct-caveat"><b>How plans are ranked:</b> a transparent rule of thumb favors less schedule slip and fewer unassigned tasks, with a small penalty for changing many tasks. It is not an AI prediction or a probability of success. Dates use current deadlines and dependency links; the fast-track recovery assumes focused work can reclaim up to two days. Review every assignment and deadline before applying.</p></div>
    </section>
    {notice?<p className="tm-message" role="status">{notice}</p>:null}
  </div>;
}

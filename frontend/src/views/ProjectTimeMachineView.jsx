import React, {useEffect, useState} from 'react';
import {proj, ptasks, team, U, me, DAY, today, fmt, downstream, S, save, logAct} from '../store.js';
import {useApp} from '../AppContext.js';

const keyFor = id => 'CogniFlowTimeMachine-v1-' + id;
const cloneTasks = () => ptasks().map(t => ({id:t.id,title:t.title,ms:t.ms,skills:(t.skills||[]).slice(),prio:t.prio,effort:t.effort,due:t.due,status:t.status,assignee:t.assignee,deps:(t.deps||[]).slice(),project:t.project}));
function dayStamp(ts){return new Date(ts).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}
function finishOf(tasks){var open=tasks.filter(t=>t.status!=='done');return open.length?Math.max.apply(null,open.map(t=>t.due)):today;}
function getDownstream(seed, tasks){var seen=new Set(),queue=[seed];while(queue.length){var id=queue.shift();tasks.forEach(t=>{if((t.deps||[]).includes(id)&&!seen.has(t.id)){seen.add(t.id);queue.push(t.id);}});}return Array.from(seen);}
function getOpenDownstream(seed,tasks){var seen=new Set(),queue=[seed];while(queue.length){var id=queue.shift();tasks.forEach(t=>{if(t.status!=='done'&&(t.deps||[]).includes(id)&&!seen.has(t.id)){seen.add(t.id);queue.push(t.id);}});}return Array.from(seen);}
function statsFor(snapshot, baseline){var finish=finishOf(snapshot),baseFinish=finishOf(baseline),byId={};baseline.forEach(t=>byId[t.id]=t);var changed=snapshot.filter(t=>{var b=byId[t.id];return b&&(t.due!==b.due||JSON.stringify((t.deps||[]).slice().sort())!==JSON.stringify((b.deps||[]).slice().sort())||t.assignee!==b.assignee)});return {finish,delta:Math.round((finish-baseFinish)/DAY),changed:changed.length,late:snapshot.filter(t=>t.status!=='done'&&t.due<today).length,open:snapshot.filter(t=>t.status!=='done').length};}

export default function ProjectTimeMachineView(){
  var c=useApp(),A=c.A,p=proj(),projectId=p?p.id:0,base=cloneTasks();
  var [scenarios,setScenarios]=useState(()=>{try{return JSON.parse(localStorage.getItem(keyFor(projectId))||'[]')}catch(e){return []}});
  var [scenarioName,setScenarioName]=useState('');
  var [taskId,setTaskId]=useState('');
  var [changeType,setChangeType]=useState('delay');
  var [days,setDays]=useState(3);
  var [depAction,setDepAction]=useState('add');
  var [depId,setDepId]=useState('');
  var [selectedScenario,setSelectedScenario]=useState('');
  var [notice,setNotice]=useState('');
  useEffect(()=>{try{setScenarios(JSON.parse(localStorage.getItem(keyFor(projectId))||'[]'))}catch(e){setScenarios([])}setSelectedScenario('');},[projectId]);
  useEffect(()=>{try{localStorage.setItem(keyFor(projectId),JSON.stringify(scenarios))}catch(e){}},[scenarios,projectId]);
  useEffect(()=>{if(base.length&&!base.some(t=>String(t.id)===String(taskId))){var preferred=base.find(t=>t.status!=='done')||base[0];setTaskId(String(preferred.id));}if(base.length>1&&(!base.some(t=>String(t.id)===String(depId))||String(depId)===String(taskId))){var other=base.find(t=>String(t.id)!==String(taskId));if(other)setDepId(String(other.id));}},[projectId,base.length,taskId,depId]);
  var selected=base.find(t=>String(t.id)===String(taskId));
  var depsForSelected=selected?base.filter(t=>t.id!==selected.id):[];
  var baselineFinish=finishOf(base);
  var milestoneFinish=p&&p.milestones.length?Math.max.apply(null,p.milestones.map(m=>m.due)):baselineFinish;
  var chosen=scenarios.find(s=>s.id===selectedScenario);

  function createScenario(){
    var target=base.find(t=>t.id===Number(taskId));if(!target){setNotice('Choose a task first.');return;}if(target.status==='done'){setNotice('Choose an open task so the simulation does not rewrite completed work.');return;}
    var next=base.map(t=>({...t,deps:t.deps.slice()}));var nt=next.find(t=>t.id===target.id),description='',affected=[];
    if(changeType==='delay'){
      var n=Number(days);if(!Number.isFinite(n)||n===0||n < -30||n>60){setNotice('Use a date shift from -30 to +60 days, excluding zero.');return;}
      var proposed=nt.due+n*DAY,activePrereqs=nt.deps.map(id=>next.find(x=>x.id===id)).filter(x=>x&&x.status!=='done');
      var earliest=activePrereqs.length?Math.max.apply(null,activePrereqs.map(x=>x.due))+Math.max(1,Math.ceil(nt.effort/8))*DAY:-Infinity;
      if(proposed<earliest){setNotice('That date would put this task before an unfinished prerequisite. Move the prerequisite first or choose a later date.');return;}
      nt.due=proposed;affected=[nt.id,...getOpenDownstream(nt.id,next)];affected.forEach(id=>{if(id!==nt.id){var t=next.find(x=>x.id===id);if(t&&t.status!=='done')t.due+=n*DAY;}});
      description=(n>0?'Move':'Pull forward')+' “'+nt.title+'” by '+Math.abs(n)+' day'+(Math.abs(n)===1?'':'s')+'; '+Math.max(0,affected.length-1)+' downstream task(s) '+(n>0?'shift later':'move earlier');
    }else{
      var dep=next.find(t=>t.id===Number(depId));if(!dep){setNotice('Choose a dependency task.');return;}
      if(dep.id===nt.id){setNotice('A task cannot depend on itself.');return;}
      if(depAction==='add'){
        if(nt.deps.includes(dep.id)){setNotice('That dependency already exists.');return;}
        if(getDownstream(nt.id,next).includes(dep.id)){setNotice('That change would create a dependency cycle. Choose a different predecessor.');return;}
        nt.deps.push(dep.id);
        var duration=Math.max(1,Math.ceil(nt.effort/8));var required=dep.due+duration*DAY;var delta=Math.max(0,required-nt.due);
        if(delta){nt.due+=delta;affected=[nt.id,...getOpenDownstream(nt.id,next)];affected.forEach(id=>{if(id!==nt.id){var t=next.find(x=>x.id===id);if(t&&t.status!=='done')t.due+=delta;}});}else affected=[nt.id,...getOpenDownstream(nt.id,next)];
        description='Add dependency: “'+nt.title+'” must wait for “'+dep.title+'”'+(delta?' (schedule shifts '+Math.ceil(delta/DAY)+' day(s))':' (no date shift required by this estimate)');
      }else{
        if(!nt.deps.includes(dep.id)){setNotice('The selected task does not currently depend on that task.');return;}
        nt.deps=nt.deps.filter(id=>id!==dep.id);affected=[nt.id,...getOpenDownstream(nt.id,next)];
        description='Remove dependency: “'+nt.title+'” no longer waits for “'+dep.title+'”. Dates are not automatically pulled forward.';
      }
    }
    var name=scenarioName.trim()||('Future '+(scenarios.length+1));
    var scenario={id:String(Date.now())+'-'+Math.random().toString(36).slice(2,7),name,createdAt:Date.now(),description,tasks:next,affectedIds:Array.from(new Set(affected)),stats:statsFor(next,base),projectId};
    setScenarios(prev=>[scenario,...prev].slice(0,12));setSelectedScenario(scenario.id);setScenarioName('');setNotice('Future saved. Compare it against the original plan below.');
  }
  function applyScenario(s){
    if(!s)return;
    if(!window.confirm('Apply “'+s.name+'” to the live project? This will change task due dates and dependencies.'))return;
    var ids=new Set(base.map(t=>t.id));S.tasks.forEach(t=>{if(ids.has(t.id)&&t.project===projectId){var n=s.tasks.find(x=>x.id===t.id);if(n){t.due=n.due;t.deps=n.deps.slice();}}});
    save();var sample=S.tasks.find(t=>ids.has(t.id));if(sample)logAct(S.me,'update',sample,1);A.touch();A.toast('Future applied to the live plan.');setNotice('Applied “'+s.name+'” to the live project.');
  }
  function removeScenario(id){setScenarios(prev=>prev.filter(s=>s.id!==id));if(selectedScenario===id)setSelectedScenario('');}
  var rows=[{name:'Original plan',tasks:base,stats:statsFor(base,base),description:'Current task dates and dependencies.'},...scenarios.map(s=>({name:s.name,tasks:s.tasks,stats:statsFor(s.tasks,base),description:s.description,id:s.id,scenario:s}))];
  var topChanged=chosen?chosen.tasks.filter(t=>{var b=base.find(x=>x.id===t.id);return b&&t.due!==b.due}).sort((a,b)=>b.due-a.due).slice(0,5):[];
  if(!p)return <section className="card"><h2 className="sec">No project selected</h2><p className="sub">Choose a project to simulate alternative futures.</p></section>;
  return <div className="tm-page">
    <header className="pagehead"><div><p className="eyebrow">Planning studio · {p.name}</p><h1>Project Time Machine</h1><p className="sub">Explore deliberate planning choices before committing to one. Move planned dates or change task sequencing, compare the resulting schedules, and apply a version only when you approve it.</p></div><span className="pill info">Plan alternatives</span></header>
    <div className="statgrid tm-metrics">
      <div className="stat"><span className="sub">Current forecast finish</span><strong>{dayStamp(baselineFinish)}</strong><small>{base.filter(t=>t.status!=='done').length} open tasks in this forecast</small></div>
      <div className="stat"><span className="sub">Current overdue tasks</span><strong className={base.filter(t=>t.status!=='done'&&t.due<today).length?'tm-red':''}>{base.filter(t=>t.status!=='done'&&t.due<today).length}</strong><small>Open tasks with a deadline before today</small></div>
      <div className="stat"><span className="sub">Saved futures</span><strong>{scenarios.length}</strong><small>Compare up to 12 local scenarios</small></div>
      <div className="stat"><span className="sub">Latest project milestone</span><strong>{dayStamp(milestoneFinish)}</strong><small>Current committed milestone date</small></div>
    </div>
    <div className="notice tm-note"><b>Time Machine is for intentional choices.</b> It compares schedules you choose to explore; it does not inject failures or create emergency recovery plans. Moving a task shifts its open dependency descendants by the same number of days. Adding a dependency estimates a minimum duration from effort (8 hours per day). These are transparent planning estimates, not guarantees. <button className="link tm-switch-link" onClick={()=>A.nav('crash-test')}>Testing an outage or delay? Open Crash Test →</button></div>
    <div className="grid2 tm-builder-grid">
      <section className="card"><h2 className="sec">Explore a planned alternative</h2><p className="sub">Start with a normal planning decision—such as bringing a task forward or changing what must happen first. This sandbox never changes the live schedule while you experiment.</p>
        <div className="field"><label htmlFor="tm-name">Scenario name</label><input id="tm-name" className="inp" value={scenarioName} onChange={e=>setScenarioName(e.target.value)} placeholder="e.g. Launch one week earlier" maxLength={64}/></div>
        <div className="field"><label htmlFor="tm-task">Task to change</label><select id="tm-task" className="inp" value={taskId} onChange={e=>setTaskId(e.target.value)}>{base.map(t=><option key={t.id} value={t.id}>{t.title}{t.status==='done'?' · done':''}</option>)}</select></div>
        <div className="field"><label htmlFor="tm-kind">Planned change</label><select id="tm-kind" className="inp" value={changeType} onChange={e=>setChangeType(e.target.value)}><option value="delay">Reschedule a task</option><option value="dependency">Change task sequence</option></select></div>
        {changeType==='delay'?<div className="field"><label htmlFor="tm-days">Planned date shift in days (negative = earlier)</label><input id="tm-days" className="inp" type="number" min="-30" max="60" value={days} onChange={e=>setDays(e.target.value)}/><small className="sub">Selected task and all downstream tasks move together.</small></div>:<>
          <div className="field"><label htmlFor="tm-action">Dependency action</label><select id="tm-action" className="inp" value={depAction} onChange={e=>setDepAction(e.target.value)}><option value="add">Add prerequisite</option><option value="remove">Remove prerequisite</option></select></div>
          <div className="field"><label htmlFor="tm-dependency">Prerequisite task</label><select id="tm-dependency" className="inp" value={depId} onChange={e=>setDepId(e.target.value)}>{depsForSelected.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></div>
          <small className="sub">Circular dependencies are blocked. Removing a dependency does not automatically pull deadlines earlier.</small>
        </>}
        <button className="btn primary tm-full" onClick={createScenario}>Create planned scenario</button>
        {notice?<p className="tm-message" role="status">{notice}</p>:null}
      </section>
      <section className="card"><div className="row between"><h2 className="sec">Impact preview</h2><span className="pill">Not applied</span></div>
        {selected?<><h3 className="tm-preview-title">{selected.title}</h3><div className="tm-preview-list"><div><span>Current deadline</span><b>{dayStamp(selected.due)}</b></div><div><span>Current status</span><b>{selected.status}</b></div><div><span>Effort estimate</span><b>{selected.effort} hours</b></div><div><span>Dependencies</span><b>{selected.deps.length}</b></div><div><span>Downstream tasks</span><b>{getOpenDownstream(selected.id,base).length}</b></div><div><span>Assigned to</span><b>{U(selected.assignee)?.name||'Unassigned'}</b></div></div><div className="tm-deps"><strong>Depends on</strong><div>{selected.deps.length?selected.deps.map(id=>base.find(t=>t.id===id)?.title).filter(Boolean).join(' · '):'No prerequisites recorded'}</div></div></>:<p className="empty">No tasks found in this project.</p>}
        <div className="tm-rule"><span className="tm-rule-dot"/><div><b>Safe by design</b><p>Saved futures live separately from the real schedule. You can compare, delete, or apply one deliberately.</p></div></div>
      </section>
    </div>
    <section className="card tm-compare"><div className="row between tm-wrap"><div><h2 className="sec">Compare futures</h2><p className="sub">Each saved version is compared against today's live plan.</p></div>{scenarios.length?<button className="btn ghost sm" onClick={()=>{setScenarios([]);setSelectedScenario('');setNotice('Saved futures cleared.')}}>Clear scenarios</button>:null}</div>
      <div className="tm-tablewrap"><table className="tm-table"><thead><tr><th>Plan</th><th>Forecast finish</th><th>vs. live plan</th><th>Changed tasks</th><th>Open overdue</th><th>Actions</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.id||'base'} className={r.id===selectedScenario?'tm-selected':''}><td><b>{r.name}</b><small>{r.description}</small></td><td>{dayStamp(r.stats.finish)}</td><td>{r.stats.delta===0?<span className="pill">No change</span>:<span className={'pill '+(r.stats.delta>0?'bad':'good')}>{r.stats.delta>0?'+':''}{r.stats.delta} day(s)</span>}</td><td>{r.stats.changed}</td><td>{r.stats.late}</td><td>{r.scenario?<div className="row tm-actions"><button className="btn sm" onClick={()=>setSelectedScenario(r.id)}>Inspect</button><button className="btn primary sm" onClick={()=>applyScenario(r.scenario)}>Apply</button><button className="btn ghost sm" onClick={()=>removeScenario(r.id)}>Delete</button></div>:<span className="sub">Baseline</span>}</td></tr>)}</tbody></table></div>
      <div className="tm-impact-chart" aria-label="Scenario finish-date comparison">
        <div className="tm-impact-heading"><div><h3>Schedule impact at a glance</h3><p className="sub">How much earlier or later each planned future finishes versus the live plan.</p></div><span className="pill">Relative finish date</span></div>
        {rows.map((r,i)=>{var d=r.stats.delta;var maxDelta=Math.max(1,...rows.map(x=>Math.abs(x.stats.delta)));var width=d===0?0:Math.max(5,Math.min(100,Math.abs(d)/maxDelta*100));return <div className="tm-impact-row" key={'impact-'+(r.id||'base')}><span className="tm-impact-name">{r.name}</span><div className="tm-impact-track"><span className={'tm-impact-bar '+(d>0?'later':d<0?'earlier':'same')} style={{width:width+'%'}}/></div><b className={d>0?'tm-impact-later':d<0?'tm-impact-earlier':''}>{d===0?'Baseline':(d>0?'+':'')+d+' day(s)'}</b></div>;})}
      </div>
      {chosen?<div className="tm-detail"><div className="row between tm-wrap"><div><h3>{chosen.name}</h3><p className="sub">{chosen.description}</p></div><span className="pill info">{chosen.affectedIds.length} task(s) in change chain</span></div><div className="tm-taskchips">{chosen.affectedIds.map(id=>{var t=chosen.tasks.find(x=>x.id===id);return t?<span key={id} className="tm-taskchip">{t.title}<b>{dayStamp(t.due)}</b></span>:null})}</div>{topChanged.length?<div className="tm-later"><b>Latest shifted tasks</b>{topChanged.map(t=><div key={t.id}><span>{t.title}</span><span>{dayStamp(base.find(x=>x.id===t.id)?.due||t.due)} → <b>{dayStamp(t.due)}</b></span></div>)}</div>:null}<button className="btn primary" onClick={()=>applyScenario(chosen)}>Apply this future to live project</button></div>:null}
      {!scenarios.length?<div className="empty tm-empty">No futures saved yet. Use the builder to create your first what-if scenario.</div>:null}
    </section>
  </div>;
}

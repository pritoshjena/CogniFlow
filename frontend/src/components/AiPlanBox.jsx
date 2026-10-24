import React, {useState, useEffect} from 'react';
import {S, U, isoOf, today, DAY, fmt, first, parseDay, projectNeeds} from '../store.js';
import {useApp} from '../AppContext.js';
import {aiHealth, requestPlan, rowsFromPlan} from '../aiClient.js';
import {Av} from './common.jsx';

var TL_PILL = {appears_feasible: ['good', 'Target looks feasible'], at_risk: ['warn', 'Target deadline at risk'], not_provided: ['', 'No target deadline']};
var shortDate = function (iso) { var t = parseDay(iso); return t === null ? iso : fmt(t); };

/** Leader-only panel on a project: ask the AI recommender for tasks, owners, milestones and a timeline, review, approve. */
export default function AiPlanBox(p) {
  var pr = p.p, A = useApp().A;
  var defEnd = isoOf(Math.max(pr.milestones.length ? pr.milestones[pr.milestones.length - 1].due : today, today + 21 * DAY));
  var [open, setOpen] = useState(false);
  var [end, setEnd] = useState(defEnd);
  var [max, setMax] = useState(8);
  var [everyone, setEveryone] = useState(pr.team.length < 2);
  var [busy, setBusy] = useState(false);
  var [err, setErr] = useState('');
  var [res, setRes] = useState(null);
  var [rows, setRows] = useState([]);
  var [health, setHealth] = useState(null); // null = unknown, false = offline, object = online

  useEffect(function () {
    if (!open) return;
    var alive = true;
    aiHealth().then(function (h) { if (alive) setHealth(h); }, function () { if (alive) setHealth(false); });
    return function () { alive = false; };
  }, [open]);

  function run() {
    var e = parseDay(end);
    if (e === null || e <= today + 2 * DAY) { A.toast('Pick a project end date at least a few days from today.'); return; }
    setBusy(true); setErr(''); setRes(null); setRows([]);
    requestPlan(pr, {endISO: end, maxTasks: max, everyone: everyone}).then(function (r) {
      setRes(r); setRows(rowsFromPlan(r)); setBusy(false);
    }, function (e2) { setErr(e2.message || 'The AI service failed.'); setBusy(false); });
  }
  function upd(key, k, v) { setRows(function (rs) { return rs.map(function (r) { return r.key === key ? Object.assign({}, r, {[k]: v}) : r; }); }); }
  function approve() {
    if (A.applyAiPlan(rows)) { setOpen(false); setRes(null); setRows([]); }
  }

  var picked = rows.filter(function (r) { return r.on; }).length;
  var pool = res ? res._pool.map(U).filter(Boolean) : [];
  var groups = [];
  rows.forEach(function (r) { var g = groups.find(function (x) { return x.name === r.ms; }); if (!g) { g = {name: r.ms, rows: []}; groups.push(g); } g.rows.push(r); });
  var tl = res && res.timeline, pill = tl && (TL_PILL[tl.targetDeadlineAssessment] || TL_PILL.not_provided);
  var gen = res && res.plan && res.plan.generatedBy;

  return <section className="card">
    <div className="row between wrapr" style={{gap: 10}}><h2 className="sec" style={{margin: 0}}>AI project plan</h2>
      <button className="btn blue sm" onClick={function () { setOpen(!open); }}>{open ? 'Close' : 'Generate with AI'}</button></div>
    <small style={{display: 'block', marginTop: 8}}>Drafts tasks, skill-matched owners, milestones and a deadline estimate from the project description{projectNeeds(pr).length ? ' and its required skills' : ''}. Nothing is saved until you approve it.</small>
    {open ? <div className="recpanel">
      <small style={{display: 'block', marginBottom: 8}}>{health === null ? 'Checking the AI service…' : health === false ? <span className="pill bad">AI service offline</span> : <span className="pill good">AI service online · {health.aiConfigured ? 'Gemini ' + health.model : 'rule-based mode (no Gemini key set)'}</span>}</small>
      <div className="row wrapr" style={{gap: 10, alignItems: 'flex-end'}}>
        <div className="field" style={{maxWidth: 180}}><label htmlFor="ai-end">Target end date</label><input className="inp" id="ai-end" type="date" value={end} onChange={function (e) { setEnd(e.target.value); }}/></div>
        <div className="field" style={{maxWidth: 140}}><label htmlFor="ai-max">Max tasks</label><input className="inp" id="ai-max" type="number" min="4" max="12" value={max} onChange={function (e) { setMax(e.target.value); }}/></div>
        <button className="btn blue" disabled={busy} onClick={run}>{busy ? 'Planning…' : res ? 'Regenerate' : 'Generate plan'}</button>
      </div>
      <label className="row" style={{gap: 8, marginTop: 10, cursor: 'pointer'}}><input type="checkbox" checked={everyone} onChange={function (e) { setEveryone(e.target.checked); }}/><small>Consider every CogniFlow member, not just this project’s team (chosen owners are added to the team on approval)</small></label>
      {err ? <div className="notice" role="alert" style={{marginTop: 10}}>{err}</div> : null}
      {res ? <div style={{marginTop: 14}}>
        <div className="row wrapr" style={{gap: 8}}><b>Draft plan</b>{gen ? <span className={'pill ' + (gen === 'gemini' ? 'good' : 'info')}>{gen === 'gemini' ? 'Gemini' : 'Rule-based'}{res.plan.cacheHit ? ' · cached' : ''}</span> : null}{pill ? <span className={'pill ' + pill[0]}>{pill[1]}</span> : null}</div>
        <p className="sub" style={{margin: '6px 0'}}>{res.plan.summary}</p>
        {tl ? <div className="statgrid" style={{marginBottom: 8}}>{[['Expected', tl.expectedDeadline, tl.expectedWorkingDays], ['Recommended', tl.recommendedDeadline, tl.recommendedWorkingDays], ['Conservative', tl.conservativeDeadline, tl.conservativeWorkingDays]].map(function (x) { return <div className="stat" key={x[0]}><strong className="mono">{shortDate(x[1])}</strong><span className="sub">{x[0]} · {x[2]} working days</span></div>; })}</div> : null}
        {(res.warnings || []).map(function (w, i) { return <div className="notice" key={i} style={{marginBottom: 6}}>{w}</div>; })}
        {pool.length < 2 ? <div className="notice" style={{marginBottom: 6}}>Only {pool.length} person {pool.length === 1 ? 'was' : 'were'} considered, so everything lands on them. Tick “every CogniFlow member” or build the team first.</div> : null}
        <small style={{display: 'block'}}>Rename, re-date, reassign or untick anything, then approve.</small>
        {groups.map(function (g) { var m = (res.milestones || []).find(function (x) { return x.name === g.name; });
          return <div key={g.name} style={{marginTop: 12}}><div className="row between wrapr"><b>{g.name}</b>{m ? <span className="pill">Due {shortDate(m.dueDate)}</span> : null}</div>
            <ul className="list">{g.rows.map(function (r) {
              return <li key={r.key} style={{padding: '10px 0'}}><div className="row wrapr" style={{gap: 10, alignItems: 'flex-start'}}>
                <input type="checkbox" style={{marginTop: 9}} aria-label={'Include ' + r.title} checked={r.on} onChange={function (e) { upd(r.key, 'on', e.target.checked); }}/>
                <span className="grow" style={{flexBasis: 220}}>
                  <input className="inp" aria-label="Task name" value={r.title} onChange={function (e) { upd(r.key, 'title', e.target.value); }}/>
                  <small style={{display: 'block', marginTop: 4}}>{r.effort}h · {r.prio} priority{r.deps.length ? ' · after ' + r.deps.join(', ') : ''}{r.skills.length ? ' · ' : ''}{r.skills.map(function (s) { return <span className="skill" key={s} style={{marginRight: 4}}>{s}</span>; })}</small>
                  {r.reasons.length ? <small style={{display: 'block', marginTop: 2}}>{r.reasons[0]}{r.confidence ? ' (' + r.confidence + ' confidence)' : ''}</small> : null}
                </span>
                <span className="stack" style={{gap: 6, flex: '0 0 190px'}}>
                  <select className="inp" aria-label="Owner" value={r.assignee == null ? '' : r.assignee} onChange={function (e) { upd(r.key, 'assignee', e.target.value === '' ? null : +e.target.value); }}>
                    <option value="">Unassigned</option>{pool.map(function (u) { return <option key={u.id} value={u.id}>{u.name}</option>; })}</select>
                  <input className="inp" type="date" aria-label="Due date" value={r.due || ''} onChange={function (e) { upd(r.key, 'due', e.target.value); }}/>
                </span></div></li>; })}</ul></div>; })}
        {res.plan.risks && res.plan.risks.length ? <small style={{display: 'block', marginTop: 8}}><b>Risks flagged:</b> {res.plan.risks.join(' · ')}</small> : null}
        <small style={{display: 'block', marginTop: 4}}>AI-generated plans and dates are estimates, not guarantees. You stay the approver.</small>
        <div className="row" style={{justifyContent: 'flex-end', marginTop: 10}}><button className="btn primary" disabled={!picked} onClick={approve}>Approve plan ({picked} task{picked === 1 ? '' : 's'})</button></div>
      </div> : null}
    </div> : null}
  </section>;
}

import React, {useState, useEffect, useReducer, useRef} from 'react';
import {proj, projById, allMs, ptasks, plog, myProjects, canLead, withProject, getPref, setPref, STANCE, projectStats, SKILLS, LVL, DAY, today, PR, STL, seed, save, U, T, MS, me, isLeader, onTeam, team, open, blockers, isBlocked, overdue, fmt, first, initials, ago, dueText, downstream, openEffort, cap2, loadOf, stateOf, fit, reason, rank, plan, recs, msStats, risks, riskLevel, lastActive, logAct, lp, S, resetStore, ledCount, roleLabel} from '../store.js';
import {useApp} from '../AppContext.js';
import {Av, Logo, LoadBar, SkillChips, TaskCard, Feed, Ruler, LINK, LINK6} from '../components/common.jsx';
import HomeView from '../views/HomeView.jsx';
import OverviewView from '../views/OverviewView.jsx';
import ProjectTimeMachineView from '../views/ProjectTimeMachineView.jsx';
import CrashTestView from '../views/CrashTestView.jsx';
import MyView from '../views/MyView.jsx';
import AssignView from '../views/AssignView.jsx';
import TeamView from '../views/TeamView.jsx';
import BoardView from '../views/BoardView.jsx';
import WorkloadView from '../views/WorkloadView.jsx';
import DepsView from '../views/DependenciesView.jsx';
import ContribView from '../views/ContributionsView.jsx';
import RisksView from '../views/RisksView.jsx';
import WaitingView from '../views/WaitingView.jsx';
import ProjectsView from '../views/ProjectsView.jsx';
import PersonalView from '../views/PersonalView.jsx';
import ProjectModal from './ProjectModal.jsx';
import Drawer from './Drawer.jsx';
import Modal from './Modal.jsx';

export function Shell(){var c=useApp(),A=c.A,u=me(),p=proj(),leader=isLeader(),onT=onTeam(u.id),active=!!p&&(onT||leader);
  var R=active?risks():[],sev3=R.filter(function(r){return r.sev===3}).length;
  var work=[['home','Overview'],['projects','Projects'],['personal','Personal']],items=[];
  if(active){items.push(['overview','Project overview'],['time-machine','Project Time Machine'],['crash-test','Crash Test']);
    if(leader)items.push(['assign','Assign work'],['team','Team']);else items.push(['my','My work']);
    items.push(['board','Board'],['workload','Workload'],['deps','Dependencies'],['contrib','Contributions'],['risks','Risks'])}
  var all=work.concat(items),view=c.view;if(!all.some(function(i){return i[0]===view}))view='home';
  var Views={home:HomeView,projects:ProjectsView,personal:PersonalView,overview:OverviewView,'time-machine':ProjectTimeMachineView,'crash-test':CrashTestView,my:MyView,assign:AssignView,team:TeamView,board:BoardView,workload:WorkloadView,deps:DepsView,contrib:ContribView,risks:RisksView},Body=Views[view];
  function navBtn(i){return <button key={i[0]} className={view===i[0]?'on':''} onClick={function(){A.nav(i[0])}}>{i[1]}{i[0]==='risks'&&sev3?<span className="cnt">{sev3}</span>:null}</button>}
  return <>
    <div className="wrap"><div className="top"><div className="brand"><Logo/><b>CogniFlow</b><span>{p?p.name:'Project management with contribution tracking'}</span></div>
      <div className="menuwrap"><button className="userbtn" onClick={A.toggleMenu} aria-haspopup="menu" aria-expanded={c.menu}><Av u={u} sz="sm"/><span className="who"><b>{u.name}</b><small>{roleLabel(u.id)}</small></span></button>
        {c.menu?<div className="menu"><h4>Signed-in accounts</h4>{S.users.filter(function(x){return c.signedIn.indexOf(x.id)>-1}).map(function(x){var n=S.projects.filter(function(q){return q.leader===x.id||q.team.indexOf(x.id)>-1}).length;return <button className={'mitem'+(x.id===u.id?' on':'')} key={x.id} onClick={function(){A.switchTo(x.id)}}><Av u={x} sz="sm"/><span><b>{x.name}</b><small>{n+' project'+(n===1?'':'s')+(ledCount(x.id)?' · leads '+ledCount(x.id):'')}</small></span></button>})}
          <div className="msep"></div><button className="mitem" onClick={A.addAccount}><b>Sign in with another account</b></button><button className="mitem" onClick={A.signOut}><b>Sign out</b></button></div>:null}</div></div>
      <div className="shell"><nav className="nav" aria-label="Views"><div className="grp">Workspace</div>{work.map(navBtn)}{active?<div className="grp">{p.name}</div>:null}{items.map(navBtn)}</nav>
        <main className="main"><Body/></main></div></div>
    <Drawer key={c.drawer}/>
    <Modal/>
    <ProjectModal/>
  </>}

export default Shell;

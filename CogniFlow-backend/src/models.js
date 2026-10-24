// Documents mirror the shapes the React app already uses (numeric ids, millisecond timestamps),
// so the API can hand the frontend exactly what its store expects.
import mongoose from 'mongoose';
const {Schema, model} = mongoose;
const num = {type: Number};

export const Counter = model('Counter', new Schema({_id: String, seq: {type: Number, default: 0}}));

export const User = model('User', new Schema({
  id: {type: Number, required: true, unique: true},
  name: {type: String, required: true, trim: true, maxlength: 80},
  email: {type: String, required: true, unique: true, lowercase: true, trim: true},
  passwordHash: {type: String, required: true},
  role: {type: String, default: 'member'},
  cap: {type: Number, default: 20, min: 1, max: 80},
  // Stored as a list because skill names such as "Node.js" are awkward as MongoDB field names.
  skills: [{_id: false, name: String, level: Number}]
}, {timestamps: true}));

export const Project = model('Project', new Schema({
  id: {type: Number, required: true, unique: true},
  name: {type: String, required: true, trim: true, maxlength: 120},
  desc: {type: String, default: '', maxlength: 2000},
  leader: {...num, required: true, index: true},
  start: num,
  team: [Number],
  needs: [String],
  milestones: [{_id: false, id: Number, name: String, due: Number}]
}, {timestamps: true}));

const taskSchema = new Schema({
  id: {type: Number, required: true, unique: true},
  project: {...num, default: null, index: true},   // null for personal tasks
  title: {type: String, required: true, trim: true, maxlength: 180},
  ms: {...num, default: null},
  skills: [String],
  prio: {type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium'},
  effort: {type: Number, min: 1, max: 240, default: 6},
  due: num,
  status: {type: String, enum: ['todo', 'doing', 'review', 'done'], default: 'todo'},
  assignee: {...num, default: null, index: true},
  deps: [Number],
  interest: [Number],
  personal: {type: Boolean, default: false},
  owner: {...num, default: null, index: true}
}, {timestamps: true});
export const Task = model('Task', taskSchema);

export const Pref = model('Pref', (() => {
  const s = new Schema({u: Number, t: Number, stance: {type: String, enum: ['want', 'ok', 'avoid', null], default: null}, note: {type: String, default: '', maxlength: 500}, target: {...num, default: null}});
  s.index({u: 1, t: 1}, {unique: true});
  return s;
})());

export const Log = model('Log', new Schema({u: Number, type: String, t: {...num, index: true}, pts: Number, ts: {type: Number, index: true}}));

export const Pm = model('Pm', new Schema({id: {type: Number, required: true, unique: true}, owner: {...num, index: true}, name: {type: String, maxlength: 120}, due: num}));

import test from 'node:test';
import assert from 'node:assert/strict';
import { createLab, operate, validateLab, chemistry } from '../src/lab-engine.js';
import { benchSafety, vesselSafety, stockSafety } from '../src/lab-safety.js';
import { REAGENTS } from '../src/lab-data.js';

const lab = () => ({ ...createLab(42), ideal: true });
const op = (s, action, args = {}) => operate(s, action, args).state;
const add = (s, reagent, ml = 10, concentration = 0.1, vessel = 'beaker') => op(s, 'add', { reagent, ml, concentration, vessel, tool: 'beaker', temperature: 25 });
const ids = s => benchSafety(s).notices.map(n => n.id);
const sample = () => ['salt','water','hcl','copper'].reduce((s,r) => add(s,r,50,1),lab());

test('old saves default to ventilation off without migration or chemistry changes', () => {
  const s = sample(); delete s.ventilationOn;
  assert.equal(validateLab(s),true);
  const before = structuredClone(s);
  assert.equal(benchSafety(s).ventilationOn,false);
  assert.deepEqual(s,before,'Rendering a report must be read-only');
  for (const value of ['on',1,null,{}]) assert.equal(validateLab({...s,ventilationOn:value}),false);
});

test('ventilation toggles are transactional, persistent and do not consume time, chemicals or random draws', () => {
  const s = sample(), before = structuredClone(s), after = op(s,'ventilation',{enabled:true});
  assert.deepEqual(s,before);
  assert.equal(after.ventilationOn,true); assert.equal(validateLab(JSON.parse(JSON.stringify(after))),true);
  assert.equal(after.log.length,s.log.length+1); assert.match(after.log.at(-1).text,/ventilation ON/);
  const {log,ventilationOn,...unchanged} = after, {log:oldLog,ventilationOn:oldOn,...old} = s;
  assert.deepEqual(unchanged,old);
  assert.deepEqual(chemistry(after.vessels.beaker),chemistry(s.vessels.beaker));
  assert.equal(op(after,'ventilation',{enabled:false}).ventilationOn,false);
  assert.throws(()=>op(s,'ventilation',{enabled:'false'}),/on or off/);
});

test('water and neutral salt do not invent a toxicity or vapour alert; neutralization removes acidity only', () => {
  let s = add(add(lab(),'water'),'salt');
  assert.deepEqual(ids(s),[]);
  s = add(s,'hcl'); assert.ok(ids(s).includes('acidic'));
  s = add(s,'naoh'); assert.ok(!ids(s).includes('acidic')); assert.ok(!ids(s).includes('alkaline'));
  assert.equal(s.gasMoles,0);
  assert.match(stockSafety('naoh',0.01).notices[0].detail,/not a volatile gas/);
});

test('acidic copper mixture has bench-wide warnings and heating activates a ventilation precaution', () => {
  let s = sample(); s.selected = 'flask';
  assert.ok(ids(s).includes('copper')); assert.ok(ids(s).includes('acidic'));
  assert.deepEqual(benchSafety(s).notices.find(n=>n.id==='copper').vessels,['Beaker A']);
  assert.equal(benchSafety(s).needsHood,false);
  s = op(s,'heat',{vessel:'beaker',seconds:180});
  const off = benchSafety(s); assert.ok(off.needsHood); assert.match(off.ventilationMessage,/OFF/);
  const on = benchSafety(op(s,'ventilation',{enabled:true}));
  assert.deepEqual(on.notices,off.notices,'Ventilation must not erase toxicity/contact/waste warnings');
  assert.match(on.ventilationMessage,/precautions still apply/);
});

test('silver precautions follow filtrate, retained precipitate and dry residue', () => {
  let s = add(add(lab(),'silver',15),'salt',10);
  s = op(s,'filter',{to:'beaker-b'});
  assert.ok(vesselSafety(s.vessels.filter).some(n=>n.id==='silver'));
  assert.ok(vesselSafety(s.vessels['beaker-b']).some(n=>n.id==='silver'));
  assert.ok(!vesselSafety(s.vessels.beaker).some(n=>n.id==='silver'));
  s = op(s,'dry',{vessel:'filter'});
  assert.ok(ids(s).includes('dust')); assert.equal(benchSafety(s).needsHood,true);
  s = op(s,'empty',{vessel:'filter'});
  assert.ok(ids(s).includes('waste')); assert.ok(ids(s).includes('silver'));
});

test('copper hydroxide remains flagged after precipitation and a mixed transfer', () => {
  let s = add(add(lab(),'copper'),'naoh',20);
  assert.ok(chemistry(s.vessels.beaker).copperSolid>0);
  s = op(s,'mix'); s = op(s,'pour',{from:'beaker',to:'flask'});
  const cu = benchSafety(s).notices.find(n=>n.id==='copper');
  assert.deepEqual(cu.vessels,['Erlenmeyer flask']);
  assert.match(cu.precaution,/Precipitation does not remove/);
});

test('unsupported mixtures retain known ingredient hazards without guessing their pH or products', () => {
  const s = add(add(add(lab(),'copper'),'silver'),'acetic');
  assert.equal(chemistry(s.vessels.beaker).pH,null);
  assert.ok(ids(s).includes('unresolved')); assert.ok(ids(s).includes('silver')); assert.ok(ids(s).includes('copper'));
  assert.ok(!ids(s).includes('acidic')); assert.ok(!ids(s).includes('released-gas'));
});

test('indicator formulation and phenolphthalein health prompts follow transferred dye', () => {
  let s = add(add(lab(),'water'),'phenol',0.1);
  s = op(s,'pour',{from:'beaker',to:'flask'});
  assert.ok(ids(s).includes('indicator')); assert.ok(ids(s).includes('phenol'));
  assert.deepEqual(benchSafety(s).notices.find(n=>n.id==='phenol').vessels,['Erlenmeyer flask']);
  assert.match(stockSafety('phenol').notices[0].detail,/unspecified/);
});

test('carbon dioxide warning distinguishes recorded generation from current air concentration', () => {
  let s = add(add(lab(),'bicarbonate'),'hcl');
  assert.ok(s.gasMoles>0);
  s = op(s,'empty');
  const report = benchSafety(s), gas = report.notices.find(n=>n.id==='released-gas');
  assert.match(gas.detail,/record of gas generation, not a current room-air concentration/);
  assert.match(gas.precaution,/open/);
  assert.ok(!JSON.stringify(report).includes('chlorine'));
  assert.equal(report.needsHood,false,'Cumulative gas generation is not an ongoing emission measurement');
});

test('drying retained alkaline material does not imply that missing pH means no handling precaution', () => {
  let s = add(lab(),'naoh');s = op(s,'filter',{to:'beaker-b'});s = op(s,'dry',{vessel:'filter'});
  assert.equal(chemistry(s.vessels.filter).pH,null);
  const dry = vesselSafety(s.vessels.filter).find(n=>n.id==='dry-residue');
  assert.match(dry.detail,/alkali/);assert.match(dry.precaution,/rewetting/);
});

test('all stocks have a review and assessment warnings disclose no unknown concentration or numeric pH', () => {
  for (const r of REAGENTS) assert.equal(stockSafety(r.id).name,r.name);
  const a = lab(), b = lab(); a.unknown = 0.075; b.unknown = 0.125;
  a.mode = b.mode = 'assessment';
  assert.deepEqual(benchSafety(add(a,'unknown')),benchSafety(add(b,'unknown')));
  assert.deepEqual(stockSafety('unknown',0.075),stockSafety('unknown',0.125));
  assert.ok(ids(add(a,'unknown')).includes('acidic'));
  assert.match(stockSafety('unknown').notices[0].detail,/intentionally undisclosed/);
});

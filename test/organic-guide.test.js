import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrganic, operateOrganic } from '../src/organic-engine.js';
import { organicGuide, organicGuideView } from '../src/organic-guide.js';

const context = { ventilationOn:true };
const guide = o => organicGuide(o,context);
const step = (o,id) => guide(o).steps.find(s=>s.id===id);
const op = (o,action,args={}) => operateOrganic(o,action,args,context).state;
function ready(parameters={}) {
  let o=createOrganic(74);
  o=op(o,'parameters',parameters);o=op(o,'dry-lots',{minutes:60});o=op(o,'kf-lots');o=op(o,'feed-gc');
  return op(o,'apparatus',{dry:true,stir:true,nitrogen:true,vacuum:true,trap:true,calibrated:true});
}
function charged(parameters={}) {
  let o=ready(parameters);o=op(o,'charge-fame');o=op(o,'advance',{minutes:60,temperature:50,pressure:50});
  o=op(o,'charge-soa');o=op(o,'advance',{minutes:30,temperature:50,pressure:50});return op(o,'catalyst',{mass:.136});
}
function isolate(o) {
  o=op(o,'advance',{minutes:60,temperature:30,pressure:1013});o=op(o,'neutralize');o=op(o,'separate',{solvent:10});
  o=op(o,'dry-product',{minutes:90});return op(o,'dry-product',{minutes:60});
}

test('SOI guide follows every actual gate through a saved complete run',()=>{
  assert.equal(guide(createOrganic()).current.id,'feed');
  let o=ready();assert.equal(organicGuide(o,{ventilationOn:false}).current.id,'setup');assert.equal(guide(o).current.id,'condition');
  o=op(o,'charge-fame');assert.equal(guide(o).current.id,'condition');
  o=op(o,'advance',guide(o).current.settings);assert.equal(guide(o).current.id,'blend');
  o=op(o,'charge-soa');o=op(o,'advance',guide(o).current.settings);assert.equal(guide(o).current.id,'catalyst');
  o=op(o,'catalyst',{mass:.136});assert.equal(guide(o).current.id,'endpoint');assert.match(guide(o).current.instruction,/initial/);
  o=op(o,'sample');
  for(let i=0;i<5;i++){o=op(o,'advance',{minutes:60,temperature:110,pressure:1});assert.match(step(o,'endpoint').instruction,/fresh/);o=op(o,'sample');}
  assert.equal(guide(o).current.id,'cool');assert.equal(step(o,'endpoint').status,'Recorded');
  o=op(o,'advance',guide(o).current.settings);assert.equal(guide(o).current.id,'isolate');
  o=op(o,'neutralize');assert.equal(guide(o).current.id,'isolate');o=op(o,'separate',{solvent:10});assert.equal(guide(o).current.id,'dry');
  o=op(o,'dry-product',guide(o).current.settings);assert.equal(guide(o).current.id,'dry');o=op(o,'dry-product',guide(o).current.settings);assert.equal(guide(o).current.id,'qc');
  o=op(o,'qc');assert.equal(guide(o).current.id,'materials');o=op(o,'materials');assert.equal(guide(o).current.id,'friction');o=op(o,'friction');assert.equal(guide(o).current.id,'report');
  assert.equal(guide(o).complete,false);
  const complete=organicGuide(o,{...context,notes:[{organic:structuredClone(o)}]});assert.equal(complete.complete,true);assert.equal(complete.recorded,13);
  assert.equal(organicGuide(o,{ventilationOn:false}).current.id,'setup');
});

test('guide viewing, previews and progress never mutate chemistry or resample readings',()=>{
  const o=charged(),before=structuredClone(o);
  for(const s of guide(o).steps)assert.match(organicGuideView(o,context,s.id),/Opening controls or loading settings performs no chemistry/);
  assert.deepEqual(o,before);
  assert.match(organicGuideView(o,context,'report'),/Return to next step/);
});

test('changed, wet or unresolved feeds cannot appear qualified in the guide',()=>{
  let o=ready();assert.equal(step(o,'feed').settled,true);
  o=op(o,'dry-lots',{minutes:1});assert.equal(guide(o).current.id,'feed');assert.ok(step(o,'feed').checks.every(c=>!c.passed));
  o=op(o,'kf-lots');o=op(o,'feed-gc',{resolved:false});assert.equal(step(o,'feed').settled,false);
  o=createOrganic();o=op(o,'kf-lots');o=op(o,'feed-gc');assert.ok(step(o,'feed').checks.slice(1).every(c=>!c.passed));
});

test('early work-up and failed synthesis retain review flags without trapping the guide',()=>{
  let o=charged({exchangeRate:0});o=op(o,'sample');o=op(o,'advance',{minutes:60,temperature:110,pressure:1});o=op(o,'sample');
  assert.equal(guide(o).current.id,'endpoint');assert.equal(step(o,'endpoint').settled,false);
  o=isolate(o);assert.equal(step(o,'endpoint').status,'Review');assert.match(step(o,'endpoint').warning,/unconfirmed/);
  o=op(o,'qc');assert.equal(guide(o).current.id,'materials');assert.match(step(o,'qc').warning,/unqualified/);assert.match(step(o,'report').note,/Decision: A/);
});

test('changed product invalidates final QC, materials, friction and a saved guide completion',()=>{
  let o=isolate(charged());o=op(o,'qc');o=op(o,'materials');o=op(o,'friction');const notes=[{organic:structuredClone(o)}];
  o=op(o,'dry-product',{minutes:60});assert.equal(guide(o).current.id,'dry','The QC aliquot changed mass; constant mass must be checked again');
  o=op(o,'dry-product',{minutes:60});assert.equal(guide(o).current.id,'qc');
  assert.match(step(o,'qc').warning,/stale/);
  for(const id of ['qc','materials','friction'])assert.equal(step(o,id).settled,false,id);
  assert.equal(organicGuide(o,{...context,notes}).complete,false);
});

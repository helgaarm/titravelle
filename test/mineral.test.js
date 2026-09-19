import test from 'node:test';
import assert from 'node:assert/strict';
import {createMineral,operateMineral,validMineral,mineralComplete,mineralConclusion,mineralComparison,mineralReport,mineralCSV} from '../src/mineral-engine.js';
import {MINERAL_STEPS,TARGETS,INSTRUMENTS,MINERAL_STUDIES} from '../src/mineral-data.js';
import {mineralView} from '../src/mineral-ui.js';
import {createLab,validateLab,operate} from '../src/lab-engine.js';
import {openStation,restartLab,LAB_MATERIALS} from '../src/lab-workspace.js';
import {benchSafety} from '../src/lab-safety.js';
const op=(s,action,args={})=>operateMineral(s,action,args,{ventilationOn:true});
const record=s=>op(s,'record',{reviewed:true,interpretation:'Compare appearance with the controls; a negative screen does not establish absence.'});
function prepared(seed=3,nugget=false){return record(op(createMineral(seed),'split',{nugget}));}
function route(s,id,skip=false){
  s=op(s,'select',{route:id});
  while(s.runs[id].index<MINERAL_STEPS[id].length){const step=MINERAL_STEPS[id][s.runs[id].index];s=op(s,skip&&step.optional?'skip':'step');s=record(s);}
  return op(s,'conclude',{compared:true,confidence:'Inconclusive',reason:'Recovery and test specificity limit the claim.'});
}
function complete(seed=3){let s=prepared(seed,true);for(const id of ['A','B','C','D'])s=route(s,id);return s;}
test('mineral unknowns are deterministic, varied, conserved and remain blind before confirmation',()=>{
  assert.deepEqual(createMineral(31),createMineral(31));
  const samples=Array.from({length:30},(_,i)=>prepared(i+1,true));
  for(const id of ['Ag','Au','Pt']){assert.ok(samples.some(s=>s.hidden.ppm[id]===0));assert.ok(samples.some(s=>s.hidden.ppm[id]>0));}
  for(const s of samples){assert.equal(validMineral(s),true);for(const id of TARGETS){const sum=Object.values(s.portions).reduce((a,p)=>a+p.initial[id],0);assert.ok(Math.abs(sum-s.hidden.ppm[id]*.1)<1e-7);}assert.ok(!mineralView(s).includes('id="mn-truth"'));assert.ok(!mineralReport(s).includes('ground truth'));}
  const s=samples.find(s=>s.hidden.ppm.Au>0);const values=Object.values(s.portions).map(p=>p.initial.Au/p.grams);assert.ok(Math.max(...values)>Math.min(...values)*2);
  const uniform=prepared(31);for(const id of TARGETS)assert.ok(Math.abs(uniform.portions.A.initial[id]/15-uniform.portions.Original.initial[id]/20)<1e-9);
});
test('guided chemistry requires independent aliquots, ventilation, complete observations and controls',()=>{
  let s=createMineral(4),before=structuredClone(s);
  assert.throws(()=>op(s,'step'),/divide/);assert.throws(()=>op(s,'instrument'),/divide/);assert.deepEqual(s,before);
  s=op(s,'split');assert.throws(()=>op(s,'step'),/Record/);assert.throws(()=>op(s,'record',{reviewed:true}),/Complete/);s=record(s);
  before=structuredClone(s);assert.throws(()=>operateMineral(s,'step',{},{}),/fume hood/);assert.deepEqual(s,before);
  assert.throws(()=>op(s,'step',{route:'Original'}),/four/);assert.throws(()=>op(s,'step',{route:'E'}),/four/);
  assert.throws(()=>op(s,'select',{route:'constructor'}),/four/);
  assert.throws(()=>op(s,'skip'),/required/);assert.throws(()=>op(s,'conclude',{compared:true,confidence:'Probable',reason:'I guessed.'}),/Complete/);
  assert.throws(()=>op(s,'instrument',{method:'ms'}),/all four/);
  s=route(s,'A');assert.throws(()=>op(s,'step'),/complete/);assert.throws(()=>op(s,'conclude',{confidence:'Probable',reason:'Ignored controls'}),/Compare/);
});
test('every route conserves target inventory, retains fractions and leaves references untouched',()=>{
  let s=prepared(22,true);const originals=structuredClone([s.portions.Original,s.portions.E]);
  for(const id of ['A','B','C','D']){
    s=op(s,'select',{route:id});
    for(const st of MINERAL_STEPS[id]){const old=structuredClone(s);s=op(s,'step');assert.equal(validMineral(s),true,`${id}/${st.id}`);assert.equal(old.pending,null);s=record(s);assert.equal(validMineral(s),true);}
    s=op(s,'conclude',{compared:true,confidence:'Weak indication',reason:'Compared the matrix and controls.'});
  }
  assert.equal(mineralComplete(s),true);assert.deepEqual([s.portions.Original,s.portions.E],originals);
  assert.ok(s.portions.A.fractions.tests.Ag>=0);assert.ok(s.portions.B.fractions.retained.Ag>=0);
  assert.ok(s.portions.C.fractions.probes.Pt>=0);assert.equal(s.journal.length,21);
  assert.ok(s.journal.every(row=>row.draft.interpretation));
  for(const id of ['A','B','C','D'])assert.ok(Object.values(s.runs[id].assays).every(a=>a.blank&&a.positive&&a.sample&&a.spike));
});
test('blank contamination, positive-control failure and matrix suppression cannot produce accepted negatives',()=>{
  for(const conditions of [{blank:.6,reagent:1,suppression:1},{blank:0,reagent:.1,suppression:1},{blank:0,reagent:1,suppression:.1}]){
    let s=prepared(3);s.runs.B.conditions=conditions;s=route(s,'B');assert.equal(s.runs.B.conclusion.confidence,'Inconclusive');
  }
  let s=prepared(3);s.runs.B.conditions={blank:0,reagent:1,suppression:1};s=route(s,'B');
  const conclusion=mineralConclusion(s,'B');s.hidden.ppm.Au=123456;assert.deepEqual(mineralConclusion(s,'B'),conclusion,'Interpretation uses observed controls, not a hidden answer');
});
test('optional observations can be omitted, REE dye remains non-specific and readonly views never resample',()=>{
  let s=prepared(7);for(const id of ['A','B','C','D'])s=route(s,id,true);
  assert.ok(s.runs.D.skipped.includes('radiation'));assert.ok(s.runs.D.skipped.includes('arsenazo'));assert.ok(!s.runs.D.assays.arsenazo);
  const before=structuredClone(s);mineralView(s);mineralReport(s);mineralCSV(s);mineralComparison(s);assert.deepEqual(s,before);
  assert.ok(['Weak indication','Not detected','Inconclusive'].includes(s.runs.D.conclusion.confidence));
});
test('clean known positive and absent fixtures produce distinct responses without inventing elemental specificity',()=>{
  for(const present of [false,true]){
    let s=createMineral(20);s.hidden.matrix=0;s.hidden.encapsulation=.9;
    for(const id of TARGETS)s.hidden.ppm[id]=present?3000:0;
    for(const r of Object.values(s.runs))r.conditions={blank:0,reagent:1,suppression:1};
    s=record(op(s,'split'));
    for(const id of ['A','B','C','D'])s=route(s,id);
    assert.equal(s.runs.A.conclusion.confidence,present?'Strong qualitative evidence':'Not detected');
    assert.equal(s.runs.B.conclusion.confidence,present?'Strong qualitative evidence':'Not detected');
    assert.equal(s.runs.C.conclusion.confidence,present?'Probable':'Not detected');
    assert.equal(s.runs.D.conclusion.confidence,present?'Weak indication':'Not detected');
    assert.equal(s.runs.A.assays.chloride.sample.score,present?3:0);
    assert.equal(s.runs.A.assays.thiosulfate.sample.precipitate,'No visible solid');
    if(!present){s=op(s,'instrument',{method:'ms',source:'A',fraction:'solution'});assert.ok(s.instruments.at(-1).readings.every(r=>r.value===null),'A prepared negative solution can still be analysed');}
  }
});
test('instrumental comparison distinguishes method limits, selected grains, fractions and model truth',()=>{
  let s=complete(4);assert.equal(mineralComparison(s).length,0);
  for(const method of Object.keys(INSTRUMENTS))s=op(s,'instrument',{method,source:'Original',fraction:'bulk',grain:0});
  assert.equal(validMineral(s),true);assert.equal(s.revealed,true);assert.equal(mineralComparison(s).length,4);
  assert.ok(s.instruments.find(r=>r.method==='sem').readings.every(r=>!r.detected));
  assert.ok(s.instruments.find(r=>r.method==='fire').readings.filter(r=>['Ce','La','Nd','Y'].includes(r.element)).every(r=>r.limit===null));
  assert.ok(s.portions.Original.instrumentWithdrawn<s.portions.Original.grams);
  assert.throws(()=>op(s,'instrument',{method:'ms',source:'Original',fraction:'solution'}),/preserved/);
  assert.throws(()=>op(s,'instrument',{method:'constructor'}),/instrument/);
  assert.throws(()=>op(s,'instrument',{method:'ms',source:'constructor'}),/tracked sample/);
  assert.throws(()=>op(s,'instrument',{method:'sem',source:'A',fraction:'solution'}),/solid/);
  assert.match(mineralReport(s),/ground truth/);assert.match(mineralReport(s),/original bulk model/);
  assert.match(mineralView(s,{panel:'report'}),/id="mn-truth"/);
});
test('saved mineral runs reject malformed or nonconserving state and escape typed notes',()=>{
  const s=complete(11);assert.equal(validMineral(JSON.parse(JSON.stringify(s))),true);
  for(const mutate of [x=>x.portions.A.fractions.solid.Ag++,x=>x.runs.A.index=99,x=>x.route='Original',x=>x.runs.D.radiation.sample='<img onerror=alert(1)>',x=>x.hidden.ppm.Au=-1,x=>x.revealed=true,x=>x.runs.A.assays.chloride.sample.signal=NaN]){const bad=structuredClone(s);mutate(bad);assert.equal(validMineral(bad),false);}
  s.journal[0].draft.interpretation='<img src=x onerror=alert(1)>';s.journal[1].draft.interpretation='=HYPERLINK("x")';
  assert.ok(!mineralView(s,{panel:'report'}).includes('<img src=x'));assert.match(mineralView(s,{panel:'report'}),/&lt;img/);assert.match(mineralCSV(s),/'=HYPERLINK/);
  assert.equal(validMineral({...s,route:'constructor'}),false);
  s.journal[1].draft.interpretation='\t=HYPERLINK("x")';assert.ok(mineralCSV(s).includes("'\t=HYPERLINK"));
});
test('mineral equipment and stocks belong to the shared lab, with persistence, hazards and reset',()=>{
  for(const study of MINERAL_STUDIES){let lab=restartLab(createLab(9),study.id);assert.equal(lab.station,'mineral');assert.equal(validateLab(lab),true);assert.equal(benchSafety(lab).needsHood,true);}
  let lab=openStation(createLab(30),'mineral');lab.mineral=complete(3);const saved=structuredClone(lab.mineral);
  lab=openStation(lab,'aqueous');assert.deepEqual(lab.mineral,saved);assert.equal(validateLab(lab),true);
  for(const material of LAB_MATERIALS.filter(r=>r.scope==='mineral')){const next=operate(lab,'add-material',{vessel:'beaker',material:material.id,mass:.1,volume:.1,form:material.form}).state;assert.equal(validateLab(next),true);}
  lab.notes=[{title:'Mineral report',date:new Date().toISOString(),draft:{conclusion:'Retain this.'},measurements:[],log:[],mineralReport:mineralReport(lab.mineral)}];
  const fresh=restartLab(lab,null);assert.equal(fresh.mineral,undefined);assert.deepEqual(fresh.notes,lab.notes);assert.equal(fresh.study,null);
});

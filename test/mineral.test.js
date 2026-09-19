import test from 'node:test';
import assert from 'node:assert/strict';
import {createMineral,operateMineral,validMineral,mineralComplete,mineralConclusion,mineralComparison,mineralReport,mineralCSV,mineralPresentation,mineralConclusionDraft,editMineralConclusionDraft,mineralSnapshotReport,mineralNotebookNotes} from '../src/mineral-engine.js';
import {MINERAL_STEPS,TARGETS,INSTRUMENTS,MINERAL_STUDIES} from '../src/mineral-data.js';
import {mineralView} from '../src/mineral-ui.js';
import {createLab,validateLab,operate} from '../src/lab-engine.js';
import {openStation,restartLab,LAB_MATERIALS} from '../src/lab-workspace.js';
import {benchSafety} from '../src/lab-safety.js';
import {MINERAL_PORTIONS,mineralProtocol,mineralBench} from '../src/mineral-protocol.js';
import {mineralPreparationView,mineralWorkbenchView} from '../src/mineral-workbench.js';
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

test('mineral conclusion drafts remain independent, unsubmitted and compatible with older saves',()=>{
  const original=prepared(12),before=structuredClone(original);
  let s=editMineralConclusionDraft(original,'A',{reason:'Compare A with B before deciding.',confidence:'Probable',compared:true});
  s=editMineralConclusionDraft(s,'B',{reason:'B has a different control response.',confidence:'Inconclusive'});
  assert.deepEqual(original,before);
  const {runs,...rest}=s,{runs:oldRuns,...oldRest}=original;assert.deepEqual(rest,oldRest);
  for(const id of ['A','B','C','D']){const {conclusionDraft,...run}=runs[id],{conclusionDraft:oldDraft,...oldRun}=oldRuns[id];assert.deepEqual(run,oldRun);}
  s=op(s,'select',{route:'B'});s=op(s,'select',{route:'A'});
  assert.deepEqual(mineralConclusionDraft(s),{confidence:'Probable',reason:'Compare A with B before deciding.',compared:true});
  assert.equal(mineralConclusionDraft(s,'B').reason,'B has a different control response.');
  assert.equal(mineralComplete(s),false);assert.equal(validMineral(JSON.parse(JSON.stringify(s))),true);
  assert.match(mineralReport(s),/Unsubmitted conclusion drafts/);assert.doesNotMatch(mineralReport(s,{includeDrafts:false}),/Compare A with B before deciding/);
  const legacy=structuredClone(s);for(const r of Object.values(legacy.runs))delete r.conclusionDraft;
  assert.equal(validMineral(legacy),true);assert.deepEqual(mineralConclusionDraft(legacy),{confidence:'',reason:'',compared:false});
  assert.equal(validMineral(editMineralConclusionDraft(legacy,'A',{reason:'Old save can be edited.'})),true);
  for(const bad of [null,[],{confidence:'certain',reason:'x',compared:false},{confidence:'',reason:'x'.repeat(3001),compared:false},{confidence:'',reason:42,compared:false},{confidence:'',reason:'',compared:'yes'},{confidence:'',reason:'',compared:false,other:'x'}]){const saved=structuredClone(s);saved.runs.A.conclusionDraft=bad;assert.equal(validMineral(saved),false);}
  assert.throws(()=>editMineralConclusionDraft(s,'constructor',{reason:'x'}),/aliquots/);
  assert.throws(()=>editMineralConclusionDraft(s,'A',{confidence:'certain'}),/confidence/);
  let lab=openStation(createLab(8),'mineral');lab.mineral=s;lab=openStation(lab,'aqueous');assert.equal(validateLab(lab),true);assert.equal(lab.mineral.runs.A.conclusionDraft.reason,runs.A.conclusionDraft.reason);
  assert.equal(restartLab(lab,null).mineral,undefined);
});

test('conclusion submission preserves rejected drafts and commits exactly once with safe rendering',()=>{
  let s=prepared(3);while(s.runs.A.index<5)s=record(op(s,'step'));
  const reason='<img src=x onerror=alert(1)> My own reasoning.';
  s=editMineralConclusionDraft(s,'A',{confidence:'Probable',reason,compared:true});const before=structuredClone(s);
  for(const args of [{confidence:''},{reason:''},{compared:false}])assert.throws(()=>op(s,'conclude',{...mineralConclusionDraft(s),...args}),/Compare/);
  assert.deepEqual(s,before);assert.doesNotMatch(mineralView(s),/<img src=x/);assert.match(mineralView(s),/&lt;img/);
  const done=op(s,'conclude',mineralConclusionDraft(s));assert.deepEqual(done.runs.A.learner,{confidence:'Probable',reason});
  assert.deepEqual(mineralConclusionDraft(done),{confidence:'',reason:'',compared:false});assert.equal(validMineral(done),true);
  assert.throws(()=>op(done,'conclude',mineralConclusionDraft(s)),/already/);assert.throws(()=>editMineralConclusionDraft(done,'A',{reason:'Replace'}),/already/);
  assert.deepEqual(s,before,'The pre-operation checkpoint retains the unfinished draft for Undo');
});

test('mineral modes hide generated guidance and answers while retaining evidence and safety',()=>{
  let s=prepared(4);const pending=op(s,'step');
  s=complete(4);s=op(s,'instrument',{method:'ms'});const before=structuredClone(s);
  for(const mode of ['guided','student','free','assessment','professor']){
    const presentation=mineralPresentation(mode),view=mineralView(s,{mode}),reportView=mineralView(s,{mode,panel:'report'}),report=mineralReport(s,{mode}),stepView=mineralView(pending,{mode});
    assert.equal(stepView.includes('class="mn-advice"'),mode==='guided');
    assert.match(mineralView(prepared(4),{mode}),/Virtual fume hood OFF/);assert.match(stepView,/id="mn-record-form"/);assert.match(stepView,/id="mn-run"/);
    assert.match(view,/Your conclusion/);assert.match(view,/mn-vial-card/);assert.match(report,/Recovery and test specificity limit the claim/);
    assert.equal(view.includes('mn-model-feedback'),mode!=='assessment');
    assert.equal(reportView.includes('id="mn-instrument-form"'),mode!=='assessment');
    assert.equal(reportView.includes('id="mn-truth"'),mode!=='assessment');
    assert.equal(report.includes('## Simulator ground truth'),mode!=='assessment');
    assert.equal(presentation.equations,mode!=='assessment');
    for(const row of s.journal.filter(r=>r.equation))assert.equal(report.includes(row.equation),mode!=='assessment');
    assert.match(report,/Recorded observations/);assert.match(report,/ICP-MS/);assert.match(reportView,/ICP-MS/);
    if(mode==='assessment'){assert.doesNotMatch(stepView,/class="mn-equation"/);for(const r of Object.values(s.runs)){assert.ok(!report.includes(r.conclusion.reason));assert.ok(!reportView.includes(r.conclusion.result));}}
  }
  assert.deepEqual(s,before);
  const unfinished=prepared(1);assert.throws(()=>op(unfinished,'instrument',{method:'ms'}),/all four/);
  assert.doesNotMatch(mineralView(unfinished,{mode:'professor',panel:'report'}),/id="mn-truth"/);
});

test('assessment notebook exports use immutable safe copies and do not expose older model reports',()=>{
  const s=op(complete(5),'instrument',{method:'ms'}),full=mineralReport(s),safe=mineralReport(s,{mode:'assessment'});
  const notes=[{mode:'guided',mineralReport:full,mineralAssessmentReport:safe},{mode:'assessment',mineralReport:full},{title:'Other experiment',draft:{conclusion:'User text'}}];
  const before=structuredClone(notes),exported=mineralNotebookNotes(notes,'assessment');
  assert.equal(mineralSnapshotReport(notes[0],'assessment'),safe);assert.equal(mineralSnapshotReport(notes[1],'assessment'),null,'Legacy Assessment snapshots previously contained full answers');
  assert.equal(mineralSnapshotReport(notes[0],'professor'),full);
  assert.doesNotMatch(JSON.stringify(exported),/## Simulator ground truth/);assert.match(exported[0].mineralReport,/Recorded observations/);
  assert.equal(exported[2].draft.conclusion,'User text');assert.deepEqual(notes,before);assert.deepEqual(mineralNotebookNotes(notes,'guided'),notes);
});

function setupApparatus(s,{charge=1,mix=true,exposure=1,sampleFraction=.1,omit=[]}={}){
  const p=mineralProtocol(s.route,s.runs[s.route].index);
  s=op(s,'bench-load',{apparatus:p.apparatus,source:p.source});
  s=op(s,'bench-settings',{exposure,sampleFraction});
  if(p.reagent)s=op(s,'bench-add',{reagent:p.reagent,charge});
  if(p.assay)for(const lane of ['blank','positive','sample','spike'])if(!omit.includes(lane))s=op(s,'bench-control',{lane});
  if(p.mix&&mix)s=op(s,'bench-mix');
  if(p.apparatus==='filter')s=op(s,'bench-filter');
  if(p.apparatus==='microscope')s=op(s,'bench-focus');
  if(['counter','photometer'].includes(p.apparatus))s=op(s,'bench-background');
  return s;
}
test('hands-on sample preparation requires homogenisation, tare and six separate transfers',()=>{
  let s=createMineral(22);const initial=structuredClone(s);
  assert.match(mineralPreparationView(s),/Analytical balance/);
  assert.throws(()=>op(s,'split',{fromBench:true}),/six/);
  assert.throws(()=>op(s,'bench-weigh',{portion:'A'}),/Homogenise/);assert.deepEqual(s,initial);
  s=op(s,'bench-homogenise');assert.throws(()=>op(s,'bench-weigh',{portion:'A'}),/Tare/);
  for(const portion of Object.keys(MINERAL_PORTIONS)){s=op(s,'bench-tare');s=op(s,'bench-weigh',{portion});assert.equal(validMineral(s),true);assert.equal(s.preparation.tared,false);}
  assert.equal(s.split,false);assert.equal(s.preparation.weighed.length,6);assert.equal(s.seed,initial.seed);
  s=op(s,'bench-nugget',{nugget:true});assert.match(mineralPreparationView(s),/id="mn-nugget" type="checkbox" checked/);
  const before=structuredClone(s);mineralPreparationView(s);assert.deepEqual(s,before);
  s=op(s,'split',{fromBench:true,nugget:true});assert.equal(validMineral(s),true);assert.equal(Object.values(s.portions).reduce((sum,p)=>sum+p.grams,0),100);
  assert.throws(()=>op(s,'bench-weigh',{portion:'A'}),/Record/);
});

test('every mineral analysis can be performed using apparatus, reagents, fractions and controls',()=>{
  let s=prepared(15,true);const references=structuredClone([s.portions.Original,s.portions.E]);
  for(const route of ['A','B','C','D']){
    s=op(s,'select',{route});
    for(const step of MINERAL_STEPS[route]){
      const before=structuredClone(s);s=setupApparatus(s);assert.equal(validMineral(s),true,route+'/'+step.id);
      assert.deepEqual(s.portions,before.portions,'Setup reserves the labelled fraction; treatment alone changes its target inventory');
      const staged=structuredClone(s);mineralWorkbenchView(s);mineralWorkbenchView(s,{hood:true});assert.deepEqual(s,staged);
      s=op(s,'bench-run');assert.ok(s.pending.procedure.length>=2);assert.equal(validMineral(s),true,route+'/'+step.id+' run');
      assert.equal(s.runs[route].bench.completed,true);assert.throws(()=>op(s,'bench-run'),/Record/);
      s=record(s);assert.equal(validMineral(s),true);
    }
    s=op(s,'conclude',{compared:true,confidence:'Inconclusive',reason:'Inspect the actions, sample and control responses.'});
  }
  assert.deepEqual([s.portions.Original,s.portions.E],references);assert.equal(mineralComplete(s),true);
  assert.ok(s.journal.slice(1).every(r=>r.procedure?.length));assert.match(mineralReport(s),/Performed apparatus operations/);
  assert.equal(validMineral(JSON.parse(JSON.stringify(s))),true);
});

test('apparatus rejects incompatible loading, missing preparation and bad settings atomically',()=>{
  let s=prepared(4);const p=mineralProtocol('A',0),original=structuredClone(s);
  assert.throws(()=>op(s,'bench-load',{apparatus:'rack',source:p.source}),/digestion vessel/);
  assert.throws(()=>op(s,'bench-load',{apparatus:p.apparatus,source:'E:solid'}),/Load A/);assert.deepEqual(s,original);
  assert.throws(()=>op(s,'bench-run'),/load/i);s=op(s,'bench-load',{apparatus:p.apparatus,source:p.source});
  const before=structuredClone(s);
  assert.throws(()=>operateMineral(s,'bench-add',{reagent:p.reagent,charge:1}),/fume hood/);
  assert.throws(()=>op(s,'bench-add',{reagent:'aqueous:salt',charge:1}),/supports/);
  assert.throws(()=>op(s,'bench-add',{reagent:p.reagent,charge:Infinity}),/charge/);
  assert.throws(()=>op(s,'bench-settings',{exposure:10,sampleFraction:.1}),/settings/);assert.deepEqual(s,before);
  s=op(s,'bench-add',{reagent:p.reagent,charge:1});s=record(op(s,'bench-run'));
  const filter=mineralProtocol('A',1);s=op(s,'bench-load',{apparatus:filter.apparatus,source:filter.source});s=op(s,'bench-add',{reagent:filter.reagent,charge:1});
  assert.throws(()=>op(s,'bench-run'),/Seat the filter/);s=op(s,'bench-filter');s=record(op(s,'bench-run'));
  const assay=mineralProtocol('A',2);s=op(s,'bench-load',{apparatus:assay.apparatus,source:assay.source});s=op(s,'bench-add',{reagent:assay.reagent,charge:1});
  assert.throws(()=>op(s,'bench-run'),/Pipette a sample/);
  s=op(s,'bench-reset');assert.equal(mineralBench(s).loaded,false);
});

test('hands-on dose, mixing, exposure, portion size and missing controls change analytical evidence',()=>{
  let initial=createMineral(8);initial.hidden.matrix=0;initial.hidden.encapsulation=.9;initial.hidden.ppm.Ag=3000;
  for(const r of Object.values(initial.runs))r.conditions={blank:0,reagent:1,suppression:1};initial=record(op(initial,'split'));
  const good=record(op(setupApparatus(initial),'bench-run'));
  const poor=record(op(setupApparatus(initial,{charge:.25,mix:false,exposure:.5}),'bench-run'));
  assert.ok(poor.portions.A.fractions.solution.Ag<good.portions.A.fractions.solution.Ag*.1);assert.equal(validMineral(poor),true);
  let filtered=record(op(setupApparatus(good),'bench-run'));
  const small=record(op(setupApparatus(filtered,{sampleFraction:.05}),'bench-run'));
  const large=record(op(setupApparatus(filtered,{sampleFraction:.2}),'bench-run'));
  assert.ok(Math.abs(small.portions.A.fractions.tests.Ag-filtered.portions.A.fractions.solution.Ag*.1)<1e-8,'Sample and spike consume separate 5% portions');
  assert.ok(Math.abs(large.portions.A.fractions.tests.Ag-small.portions.A.fractions.tests.Ag*4)<1e-8);
  assert.ok(large.runs.A.assays.chloride.sample.target>small.runs.A.assays.chloride.sample.target);
  let missing=record(op(setupApparatus(filtered,{omit:['positive','spike']}),'bench-run'));
  missing=record(op(setupApparatus(missing,{omit:['positive','spike']}),'bench-run'));
  missing=record(op(setupApparatus(missing),'bench-run'));
  missing=op(missing,'conclude',{compared:true,confidence:'Inconclusive',reason:'No positive control was prepared.'});
  assert.equal(missing.runs.A.conclusion.confidence,'Inconclusive');assert.match(missing.runs.A.conclusion.reason,/positive control/);
  for(const state of [small,large,missing])assert.equal(validMineral(state),true);
  const corrupt=structuredClone(missing);corrupt.runs.A.bench.source='<img>';assert.equal(validMineral(corrupt),false);
  const old=structuredClone(initial);delete old.preparation;assert.equal(validMineral(old),true);
});

test('instrument preparation gates, zeroed absorbance and omitted stages preserve evidence meaning',()=>{
  let s=op(prepared(18),'select',{route:'D'});
  s=record(op(setupApparatus(s),'bench-run'));
  s=setupApparatus(s,{exposure:.5});
  s=op(s,'bench-settings',{exposure:1.5,sampleFraction:.1});
  assert.throws(()=>op(s,'bench-run'),/background/);
  s=op(s,'bench-background');s=record(op(s,'bench-run'));
  assert.equal(s.runs.D.radiation.seconds,90);assert.equal(s.runs.D.radiation.background,36);
  s=record(op(setupApparatus(s),'bench-run'));s=record(op(setupApparatus(s),'bench-run'));
  const before=structuredClone(s),plan=mineralProtocol('D',4);
  s=op(s,'bench-load',{apparatus:plan.apparatus,source:plan.source});
  assert.throws(()=>op(s,'bench-background'),/reagent blank/);
  s=op(s,'bench-add',{reagent:plan.reagent,charge:1});s=op(s,'bench-control',{lane:'sample'});
  assert.throws(()=>op(s,'bench-run'),/Zero/);
  s=setupApparatus(op(s,'bench-reset'));s=op(s,'bench-run');
  assert.equal(s.runs.D.assays.arsenazo.blank.absorbance,0);
  assert.equal(s.runs.D.assays.arsenazo.sample.zeroed,true);assert.equal(validMineral(s),true);
  const malformed=structuredClone(s);malformed.runs.D.assays.arsenazo.sample.absorbance='<img>';
  assert.equal(validMineral(malformed),false);
  const skipped=op(before,'skip');assert.match(mineralWorkbenchView(skipped),/not performed/);assert.doesNotMatch(mineralWorkbenchView(skipped),/mb-completed/);
});

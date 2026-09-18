import test from 'node:test';
import assert from 'node:assert/strict';
import { LAB_MATERIALS, LAB_STATIONS, LAB_TOOLS, openStation, stationOf, restartLab } from '../src/lab-workspace.js';
import { createLab, operate, validateLab } from '../src/lab-engine.js';
import { operateOrganic } from '../src/organic-engine.js';
import { filterShelf, shelfView } from '../src/lab-shelf.js';
import { benchSafety } from '../src/lab-safety.js';

test('shared inventory distinguishes stock forms and filters across both chemistry areas',()=>{
  assert.equal(LAB_MATERIALS.length,63);
  assert.equal(new Set(LAB_MATERIALS.map(r=>r.catalogId)).size,63);
  assert.equal(filterShelf(LAB_MATERIALS,'H2O').length,3); // two water entries and the hydrated copper salt
  assert.equal(filterShelf(LAB_MATERIALS,'H2O','all','aqueous')[0].catalogId,'aqueous:water');
  assert.equal(filterShelf(LAB_MATERIALS,'H2O','all','organic')[0].catalogId,'organic:water');
  assert.equal(filterShelf(LAB_MATERIALS,'methoxide','Catalysts','aqueous').length,0);
  assert.match(shelfView(LAB_MATERIALS,{query:'copper',selected:'organic:methoxide'}),/Selection retained outside this filter/);
  for(const material of LAB_MATERIALS)assert.ok(LAB_STATIONS.some(([id])=>id===material.station));
  for(const tool of LAB_TOOLS)assert.ok(LAB_STATIONS.some(([id])=>id===tool.station));
});
test('opening all equipment preserves aqueous samples, readings, draft, seed and active guide',()=>{
  let s=createLab(70);s=operate(s,'add',{vessel:'beaker',reagent:'copper',ml:10,concentration:.1,tool:'pipette'}).state;
  s=operate(s,'measure',{vessel:'beaker',kind:'mass'}).state;s.draft.conclusion='My observations';
  const before=structuredClone(s);
  for(const [station] of LAB_STATIONS)s=openStation(s,station);
  const {station,organic,electro,...unchanged}=s;assert.deepEqual(unchanged,before);
  assert.equal(organic.time,0);assert.equal(organic.inputMass,0);assert.equal(organic.samples.length,0);
  assert.equal(validateLab(JSON.parse(JSON.stringify(s))),true);
  assert.throws(()=>openStation(s,'unsupported'),/Choose available/);
  assert.throws(()=>operate(s,'add',{vessel:'beaker',reagent:'methoxide',ml:1,concentration:.1,tool:'pipette'}));
});
test('old aqueous and SOI saves reopen correctly; selected equipment persists independently of guide',()=>{
  const aqueous=createLab(71);assert.equal(stationOf(aqueous),'aqueous');
  const soi={...aqueous,study:'soi18'};assert.equal(stationOf(soi),'prepare');
  let s=openStation(soi,'aqueous');assert.equal(stationOf(JSON.parse(JSON.stringify(s))),'aqueous');
  assert.equal(s.study,'soi18');s=openStation(s,'analysis');assert.equal(stationOf(s),'analysis');
  assert.equal(validateLab(s),true);assert.equal(validateLab({...s,station:'wrong'}),false);
});
test('organic work and ventilation survive tool switches and aqueous operations',()=>{
  let s=openStation(createLab(72),'prepare');
  for(const [a,args] of [['dry-lots',{minutes:60}],['kf-lots',{}],['feed-gc',{}],['apparatus',{dry:true,stir:true,nitrogen:true,vacuum:true,trap:true,calibrated:true}],['charge-fame',{}]])s.organic=operateOrganic(s.organic,a,args,{ventilationOn:true}).state;
  const organic=structuredClone(s.organic);
  s=openStation(s,'aqueous');assert.equal(benchSafety(s).needsHood,true);assert.ok(benchSafety(s).notices.some(n=>n.id==='organic-run'));
  s=operate(s,'ventilation',{enabled:true}).state;
  s=operate(s,'add',{vessel:'beaker',reagent:'salt',ml:10,concentration:.1,tool:'pipette'}).state;
  s=openStation(s,'reaction');assert.deepEqual(s.organic,organic);assert.equal(s.ventilationOn,true);
  assert.ok(s.vessels.beaker.volume>0);assert.equal(validateLab(s),true);
});

test('restart without an experiment clears both work areas and drafts while preserving saved work',()=>{
  let s=openStation(createLab(73),'prepare');s.study='soi18';s.mode='assessment';s.ideal=true;
  s=operate(s,'add',{vessel:'beaker',reagent:'salt',ml:10,concentration:.1,tool:'pipette'}).state;
  s=operate(s,'measure',{vessel:'beaker',kind:'mass'}).state;s=operate(s,'ventilation',{enabled:true}).state;
  s.organic=operateOrganic(s.organic,'dry-lots',{minutes:60},{ventilationOn:true}).state;
  s.draft.conclusion='Working conclusion';
  s.notes.push({title:'Saved research',date:'2026-09-18T00:00:00Z',draft:structuredClone(s.draft),measurements:structuredClone(s.measurements),log:structuredClone(s.log),organic:structuredClone(s.organic)});
  s.customStudies.push({id:'custom-test',title:'Own investigation',objective:'Own question',question:'What changes?',steps:['Observe.'],analysis:'Compare readings.'});
  const before=structuredClone(s),fresh=restartLab(s,null);
  assert.deepEqual(s,before,'Restart must leave the undo source intact');
  assert.equal(fresh.study,null);assert.equal(fresh.mode,'free');assert.equal(fresh.station,'aqueous');assert.equal(fresh.organic,undefined);
  assert.deepEqual(fresh.vessels,createLab(1).vessels);assert.equal(fresh.time,0);assert.deepEqual(fresh.log,[]);assert.deepEqual(fresh.measurements,[]);
  assert.ok(Object.values(fresh.draft).every(v=>v===''));assert.deepEqual(fresh.notes,s.notes);assert.deepEqual(fresh.customStudies,s.customStudies);
  assert.equal(fresh.ventilationOn,true);assert.equal(fresh.ideal,true);assert.ok(validateLab(JSON.parse(JSON.stringify(fresh))));
  fresh.notes[0].draft.conclusion='Independent snapshot';assert.deepEqual(s,before);
  const reopened=openStation(fresh,'reaction');assert.equal(reopened.study,null);assert.equal(reopened.organic.inputMass,0);
});

test('free exploration remains unselected on repeat and can start a guided standard or custom experiment',()=>{
  const s=restartLab(createLab(74),null),again=restartLab(s);
  assert.equal(again.study,null);assert.equal(again.mode,'free');assert.equal(again.draft.objective,'');
  for(const id of ['soi18','titration']){
    const experiment=restartLab(s,id);assert.equal(experiment.study,id);assert.equal(experiment.mode,'guided');assert.ok(experiment.draft.objective);
    assert.equal(experiment.station,id==='soi18'?'prepare':'aqueous');assert.ok(validateLab(experiment));assert.equal(restartLab(experiment).study,id);
  }
  s.customStudies.push({id:'custom-restart',title:'Custom',objective:'Observe salt',question:'What dissolves?',steps:['Mix.'],analysis:'Record.'});
  assert.equal(restartLab(s,'custom-restart').draft.objective,'Observe salt');
  const before=structuredClone(s);assert.throws(()=>restartLab(s,'missing'),/available experiment/);assert.deepEqual(s,before);
});

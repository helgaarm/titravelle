import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrganic,operateOrganic,organicMetrics,organicReport,validOrganic,organicRandom } from '../src/organic-engine.js';
import { MW,FAMES,massOf,ORGANIC_STOCKS } from '../src/organic-data.js';
import { molecularFormula,finalDecision,gcAnalysis,frictionAnalysis,tCritical,compareReplicates,organicEndpoint } from '../src/organic-analysis.js';
import { filterShelf } from '../src/lab-shelf.js';
import { createLab,validateLab } from '../src/lab-engine.js';
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const op=(o,a,args={})=>{const s=operateOrganic(o,a,args,{ventilationOn:true}).state;near(organicMetrics(s).balanceError,0,1e-8);assert.ok(validOrganic(s),`invalid after ${a}`);return s;};
const standard={dry:true,stir:true,nitrogen:true,vacuum:true,trap:true,calibrated:true};
function ready(parameters={}){let o=createOrganic(74);o=op(o,'parameters',parameters);o=op(o,'dry-lots',{minutes:60});o=op(o,'kf-lots');o=op(o,'feed-gc');o=op(o,'apparatus',standard);return o;}
function charged(parameters={}){let o=ready(parameters);o=op(o,'charge-fame');o=op(o,'advance',{minutes:60,temperature:50,pressure:50});o=op(o,'charge-soa');o=op(o,'advance',{minutes:30,temperature:50,pressure:50});return op(o,'catalyst',{mass:.136});}
function isolated(parameters={},hours=4){let o=charged(parameters);o=op(o,'sample');for(let n=0;n<hours;n++){o=op(o,'advance',{minutes:60,temperature:110,pressure:1});o=op(o,'sample');}o=op(o,'advance',{minutes:60,temperature:30,pressure:1013});o=op(o,'neutralize');o=op(o,'separate',{solvent:10});o=op(o,'dry-product',{minutes:90});o=op(o,'dry-product',{minutes:60});return op(o,'qc');}

test('SOI stoichiometry balances atoms and distinguishes mean mass, exact mass and adducts',()=>{
  near(MW.soa+8*MW.fame,MW.product+8*MW.methylAcetate);
  assert.deepEqual(molecularFormula(),{C:156,H:294,O:19});assert.deepEqual(molecularFormula(0,8),{C:12,H:22,O:11});
  near(MW.product,2474.049,1e-6);assert.ok(MW.product-massOf(molecularFormula(),true)>1);
  near(massOf(molecularFormula(8),true)-massOf(molecularFormula(7),true),massOf({C:16,H:32},true));
});
test('feed qualification rejects impure, wet or unresolved lots; purification/drying invalidate measurements',()=>{
  let o=ready();o=op(o,'feed-gc',{resolved:false});assert.throws(()=>op(o,'charge-fame'),/feed gate/);
  o=ready();o=op(o,'lots',{soaMass:1.371,fameMass:5.43,purity:98,soaWater:.1,fameWater:.1,methanol:.2,ffa:.02});o=op(o,'feed-gc');assert.throws(()=>op(o,'charge-fame'),/feed gate/);
  o=op(o,'purify-feed',{recovery:.95,carryover:.1});assert.equal(o.feedGC,null);o=op(o,'feed-gc');assert.throws(()=>op(o,'charge-fame'),/KF/);
  o=op(o,'dry-lots',{minutes:60});o=op(o,'kf-lots');o=op(o,'feed-gc');o=op(o,'charge-fame');assert.ok(o.charged.fame);
});
test('GC response correction normalizes moles without treating mass spectra as isomer separation',()=>{
  const o=createOrganic(),g=gcAnalysis(o,o.lots.fame.composition,()=>.5);
  near(g.rows.reduce((n,r)=>n+r.molePct,0),100);near(g.purity,99.7);
  const den=g.rows.reduce((n,r)=>n+r.area/r.responseFactor,0);for(const r of g.rows)near(r.molePct,100*r.area/r.responseFactor/den);
  assert.equal(gcAnalysis(o,o.lots.fame.composition,()=>.5,false).purity,null);
  assert.equal(FAMES[0].mm,FAMES[1].mm);
});
test('sequential substitution is not instantaneous and conserves sucrose cores and acyl exchange mass',()=>{
  let o=charged({degradationRate:0,hydrolysisRate:0});const core=o.initialCore;
  near(organicMetrics(o).ds,0);near(organicMetrics(o).totalEsterDS,8);
  o=op(o,'advance',{minutes:60,temperature:110,pressure:1});const m=organicMetrics(o);
  assert.ok(m.ds>1&&m.ds<7.5);assert.ok(o.distribution.filter(s=>s.n>1e-7).length>3);near(m.cores,core);
  near(m.bound,o.generatedAcetate);near(m.acetate+m.bound,8*core);
  o=op(o,'advance',{minutes:180,temperature:110,pressure:1});assert.ok(organicMetrics(o).ds>7.9);
});
test('stirring and vacuum failures alter conversion; trap capture changes recovery, not stoichiometry',()=>{
  const initial=charged();let good=op(initial,'advance',{minutes:240,temperature:110,pressure:1});
  let bad=op(initial,'apparatus',{...standard,stir:false,vacuum:false,trap:false});bad=op(bad,'advance',{minutes:240,temperature:110,pressure:1});
  assert.ok(organicMetrics(good).ds>organicMetrics(bad).ds+1);assert.equal(bad.pressure,1013);
  let untrapped=op(initial,'apparatus',{...standard,trap:false});untrapped=op(untrapped,'advance',{minutes:240,temperature:110,pressure:1});
  near(organicMetrics(good).ds,organicMetrics(untrapped).ds);assert.ok(good.trap.mass>untrapped.trap.mass);assert.ok(untrapped.escapedMass>good.escapedMass);
});
test('moisture consumes methoxide but conserves basic equivalents as hydroxide until acids react',()=>{
  let o=charged();const mass=MW.water*.0003;o.pool.water+=mass/MW.water;o.inputMass+=mass;
  const base=o.pool.methoxide+o.pool.hydroxide,meth=o.pool.methoxide;
  o=op(o,'advance',{minutes:1,temperature:50,pressure:50});assert.ok(o.pool.methoxide<meth);assert.ok(o.pool.hydroxide>0);assert.ok(o.pool.methoxide+o.pool.hydroxide<=base+1e-12);
});
test('hot, long exposure can degrade material; abrupt vacuum loses tracked material',()=>{
  let o=charged({degradationRate:.01});o=op(o,'advance',{minutes:240,temperature:150,pressure:1});assert.ok(organicMetrics(o).degradedWt>5);assert.ok(o.deviations.length);
  let sudden=charged();sudden.pressure=1013;sudden=op(sudden,'advance',{minutes:1,temperature:110,pressure:1,abrupt:true});assert.ok(sudden.wasteMass>0);assert.match(sudden.deviations[0],/foaming/);
});
test('neutralization uses remaining base equivalents and separation cannot recover more product than supplied',()=>{
  let o=charged();o=op(o,'advance',{minutes:240,temperature:110,pressure:1});assert.throws(()=>op(o,'neutralize'),/Cool/);
  o=op(o,'advance',{minutes:60,temperature:30,pressure:1013});const eq=organicMetrics(o).baseEquivalents,oldInput=o.inputMass;
  o=op(o,'neutralize');near(o.inputMass-oldInput,eq*MW.acid);near(organicMetrics(o).baseEquivalents,0);
  const target=organicMetrics(o).targetMass;o=op(o,'separate',{solvent:10});near(organicMetrics(o).targetMass,target*o.parameters.productRecovery);assert.ok(o.wasteMass>0);
});
test('independent purity measures, aliquot losses and stale-QC detection remain separate',()=>{
  let o=isolated(),q=o.samples.at(-1),m=organicMetrics(o);
  assert.ok(q.gc.purity>99);assert.ok(q.hplc.octaArea>95);assert.ok(m.chemicalPurity<m.octaFamilyPurity);assert.ok(m.allTargetMoleculeFraction<o.lots.fame.composition[0]);
  assert.ok(o.aliquotMass>.01);assert.ok(finalDecision(o).qualified);assert.equal(finalDecision(o).code,null,'Missing performance is incomplete, not C');
  o=op(o,'dry-product',{minutes:30});assert.equal(finalDecision(o).qualified,false);assert.equal(finalDecision(o).code,null,'Old QC cannot qualify a changed batch');
});
test('endpoint requires consecutive current measurements and stalled chemistry is not completion',()=>{
  let o=charged();o=op(o,'sample');assert.equal(organicEndpoint(o).confirmed,false);
  for(let i=0;i<5;i++){o=op(o,'advance',{minutes:60,temperature:110,pressure:1});o=op(o,'sample');}
  assert.equal(organicEndpoint(o).confirmed,true);o=op(o,'advance',{minutes:30,temperature:110,pressure:1});assert.equal(organicEndpoint(o).confirmed,false);
});
test('complete scenarios permit A, B, C and D without forcing success or superiority',()=>{
  const failed=isolated({exchangeRate:0});assert.equal(finalDecision(failed).code,'A');
  const dirty=isolated({fameCarryover:1,saltCarryover:1});assert.equal(finalDecision(dirty).code,'B');
  let c=isolated();c=op(c,'materials');c=op(c,'friction',{replicates:8});assert.equal(finalDecision(c).code,'C');
  let d=isolated({frictionEffect:-.025});d=op(d,'materials');d=op(d,'friction',{replicates:8});assert.equal(finalDecision(d).code,'D');assert.match(finalDecision(d).attribution,/assumed/);
});
test('Welch intervals use independent coupons and multiplicity correction with credible small-sample quantiles',()=>{
  near(tCritical(5),2.5705818356,1e-7);near(tCritical(10),2.228138852,1e-7);
  const a=[1,2,3,4,5],b=[2,3,4,5,6],one=compareReplicates(a,b),many=compareReplicates(a,b,14);near(one.difference,-1);assert.ok(many.low<one.low);assert.ok(many.high>one.high);
  const o=createOrganic(),r=frictionAnalysis(o,{replicates:4},()=>organicRandom(o));assert.equal(r.rows.length,42);assert.equal(r.comparisons.length,14);assert.deepEqual(r.comparisons[0].replicates,[4,4]);
  assert.ok(r.rows.filter(x=>x.id==='bare').every(x=>x.coupons.every(c=>c.curve.every(p=>p.retained===0))));
});
test('reports and render-only metrics do not resample or mutate results; unknown environmental properties stay unknown',()=>{
  let o=isolated();o=op(o,'materials');const before=structuredClone(o),report=organicReport(o);organicMetrics(o);organicReport(o);assert.deepEqual(o,before);
  assert.equal(o.materials.environment.aquaticToxicity,null);assert.equal(o.materials.environment.logP,null);assert.equal(o.materials.fusionEnthalpy,null);assert.match(report,/not physical measurements/);assert.match(report,/Mass|mass balance/);
});
test('organic snapshots survive validation while malformed and impossible mass states are rejected',()=>{
  const o=isolated(),s=createLab();s.study='soi18';s.organic=o;assert.ok(validateLab(JSON.parse(JSON.stringify(s))));assert.ok(validateLab(createLab()));
  for(const mutate of [x=>x.pool.water=NaN,x=>x.distribution[0].n=-1,x=>x.feedGC.rows=null,x=>x.samples[0].nmr=null,x=>x.inputMass+=1,x=>x.pressure=-1]){const x=structuredClone(o);mutate(x);assert.equal(validOrganic(x),false);}
  const before=structuredClone(o);assert.throws(()=>op(o,'advance',{minutes:Infinity,temperature:110,pressure:1}));assert.deepEqual(o,before);
});
test('chemical shelf searches names/formulas with category intersection and no-match handling',()=>{
  assert.ok(filterShelf(ORGANIC_STOCKS,'C19H38O2').length>1);assert.equal(filterShelf(ORGANIC_STOCKS,'methoxide','Catalysts').length,1);assert.equal(filterShelf(ORGANIC_STOCKS,'methoxide','Controls').length,0);assert.equal(filterShelf(ORGANIC_STOCKS,'does-not-exist').length,0);
});

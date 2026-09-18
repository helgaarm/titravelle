import test from 'node:test';
import assert from 'node:assert/strict';
import { EC, IONS, PREDICTIONS, ELECTRODES } from '../src/electro-data.js';
import { createElectro, electroPreset, operateElectro, validElectro, importVessel, metalInventory } from '../src/electro-engine.js';
import { electroPreview, nernst, solution, emptyIons, metalMass, circuit, pressureBar, electroSafety } from '../src/electro-model.js';
import { electroCalculations, advancedElectro, electroCSV, electroReport } from '../src/electro-analysis.js';
import { createLab, operate, validateLab } from '../src/lab-engine.js';
import { openStation, restartLab } from '../src/lab-workspace.js';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
const context={ideal:true,ventilationOn:true},op=(e,a,args={})=>operateElectro(e,a,args,context).state;
const predict=e=>op(e,'predictions',Object.fromEntries(PREDICTIONS.map(([id])=>[id,'Uncertain'])));
function prepared(name='water'){let e=electroPreset(name,84);e=op(e,'standard-wires');return predict(e);}
function run(e,seconds=60){return op(op(e,'power',{enabled:true}),'advance',{seconds});}

test('Nernst signs, reference potentials and water decomposition are consistent',()=>{
  near(nernst(.340,2,100),.28084065,1e-7);
  const e=prepared(),p=electroPreview(e);near(p.decomposition,1.229,1e-9);assert.match(p.overall,/2 H2O.*O2.*2 H2/);
  near(p.deltaG,4*EC.F*1.229,1e-7);
  const saline=op(e,'add-solute',{stock:'salt',concentration:.1});const cl=electroPreview(saline).anode.reactions.find(r=>r.id==='chlorine');assert.ok(cl.E>cl.E0);
});
test('prediction gate, manual wiring, open circuits and short circuits are transactional',()=>{
  let e=electroPreset('water');assert.throws(()=>op(e,'power',{enabled:true}),/predictions/);
  e=predict(e);const before=structuredClone(e);assert.throws(()=>op(e,'wire',{from:'plus',to:'plus'}));assert.deepEqual(e,before);
  e=run(e);near(e.charge,0);assert.match(circuit(e).status,/Open/);
  e=op(e,'power',{enabled:false});e=op(e,'standard-wires');assert.equal(circuit(e).ammeter,true);assert.equal(circuit(e).meterSign,1);
  e=op(e,'wire',{from:'plus',to:'minus'});e=run(e);near(e.charge,0);assert.equal(circuit(e).short,true);
});
test('CV, current limiting, CC compliance and reversed leads use circuit physics',()=>{
  let e=prepared();e=op(e,'configure',{voltage:6,limit:.05});e=run(e,10);near(e.charge,.5,1e-8);assert.match(electroPreview(e).regulation,/current limit/);
  e=prepared();e=op(e,'configure',{mode:'cc',current:.05,limit:.2,voltage:6});e=run(e,10);near(e.charge,.5,1e-8);
  e=prepared();e=op(e,'configure',{mode:'cc',current:1,limit:1,voltage:.5});e=run(e,10);near(e.charge,0);
  e=prepared('copper');e.wires=[['plus','right'],['left','minus'],['v-plus','left'],['v-minus','right']];assert.equal(circuit(e).anode,'right');assert.equal(circuit(e).meterSign,-1);e=run(e);assert.ok(e.electrodes.right.baseRemaining<5);assert.ok(metalMass(e.electrodes.left)>5);
});
test('live supply adjustments preserve samples and history and reject invalid changes atomically',()=>{
  const before=run(op(prepared(),'configure',{mode:'cc',current:.05,limit:.2,voltage:6}),10);
  let e=op(before,'supply',{voltage:8,current:.1,limit:.2});
  assert.equal(e.power,true);near(e.time,before.time);near(e.charge,before.charge);assert.deepEqual(e.records,before.records);assert.deepEqual(e.ions,before.ions);
  e=op(e,'advance',{seconds:10});near(e.charge-before.charge,1,1e-7);assert.ok(validElectro(e));
  for(const args of [{voltage:31},{current:-1},{limit:NaN},{sampleInterval:1.5},{leftArea:50}])assert.throws(()=>op(e,'supply',args));
  assert.equal(e.config.voltage,8);assert.equal(e.config.current,.1);
  const stopped=op(e,'power',{enabled:false}),adjusted=op(stopped,'supply',{voltage:4});assert.equal(adjusted.power,false);near(adjusted.time,stopped.time);near(adjusted.charge,stopped.charge);
});
test('water splitting integrates charge and gas stoichiometry with separate collection loss',()=>{
  const e=run(prepared(),120);near(e.gases.H2,e.charge/(2*EC.F));near(e.gases.O2,e.charge/(4*EC.F));near(e.gases.H2/e.gases.O2,2);
  near(e.collected.H2,e.gases.H2*.96);near(e.energy,e.records.slice(1).reduce((s,r,i)=>s+e.records[i].current*e.records[i].voltage,0),.1);
  assert.equal(e.records.length,121);assert.ok(validElectro(e));
});
test('copper transfer follows Faraday and conserves electrode plus solution inventory',()=>{
  const e=run(prepared('copper'),600),expected=e.charge*IONS.Cu.mm/(2*EC.F);
  near(5-metalMass(e.electrodes.left),expected);near(metalMass(e.electrodes.right)-5,expected);near(e.ions.left.Cu,.02);
  near(metalInventory(e).Cu,e.initialMetals.Cu);assert.ok(validElectro(e));assert.ok(electroCalculations(e).massComparison.every(m=>Math.abs(m.error)<1e-5));
});
test('transport, concentration, stirring and area change deposition share',()=>{
  let e=prepared('plating');e=op(e,'configure',{voltage:10,limit:1,stirring:false});e=op(e,'power',{enabled:true});
  const p=electroPreview(e),cu=p.cathode.reactions.find(r=>r.id==='Cu'),h=p.cathode.reactions.find(r=>r.id==='hydrogen');assert.ok(cu.current<cu.limit);assert.ok(h.share>.1);
  const stirred=structuredClone(e);stirred.config.stirring=true;assert.ok(electroPreview(stirred).cathode.reactions.find(r=>r.id==='Cu').current>cu.current);
  const large=structuredClone(e);large.config.rightArea=30;assert.ok(electroPreview(large).cathode.reactions.find(r=>r.id==='Cu').limit>cu.limit);
  e=op(e,'advance',{seconds:100});assert.ok(e.gases.H2>0);assert.ok(electroCalculations(e).deposition.find(r=>r.id==='Cu').efficiency<100);assert.ok(validElectro(e));
});
test('chloride competes dynamically with oxygen and hazards persist after power off',()=>{
  let e=prepared();e=op(e,'add-solute',{stock:'salt',concentration:1});e=op(e,'electrode',{side:'left',material:'graphite',mass:5});e=run(e,120);
  assert.ok(e.gases.Cl2>0);assert.ok(e.gases.O2>0);near(2*e.gases.Cl2*EC.F+4*e.gases.O2*EC.F,e.charge,1e-7);assert.ok(validElectro(e));
  const recorded=electroCalculations(e).recorded;
  e=op(e,'power',{enabled:false});assert.ok(electroSafety(e,false).some(n=>n.id==='electro-chlorine'));assert.ok(electroSafety(e,false).some(n=>n.id==='electro-hood'));
  const after=electroCalculations(e);assert.deepEqual(after.recorded,recorded);assert.ok(after.recorded.some(r=>r.id==='chlorine'&&r.amount>0));assert.ok(after.lastOperatingReading.current>0);
  near(after.recorded.filter(r=>r.direction==='oxidation').reduce((n,r)=>n+r.charge,0),e.charge,1e-7);
});
test('aqueous charge balance, ionic strength and supported precipitation have limits',()=>{
  const water=solution(emptyIons(),100);near(water.pH,7,1e-8);assert.ok(water.conductivity>0);
  const basic=solution({...emptyIons(),Na:.01},100);near(basic.pH,13,1e-6);
  const acid=solution({...emptyIons(),SO4:.01},100);assert.ok(acid.pH<1.1);
  const copper=solution({...emptyIons(),Cu:.001,SO4:.001,Na:.004},100);assert.ok(copper.solid.Cu>.0009);assert.ok(copper.ionicStrength>0);
  const silver=solution({...emptyIons(),Ag:.001,NO3:.001,Na:.001,Cl:.001},100);assert.ok(silver.agcl>.00099);
});
test('divided water cell develops different pH while conserving spectator ions',()=>{
  let e=prepared();e=op(e,'configure',{separator:'cation',voltage:5,limit:.1});const na=e.ions.left.Na+e.ions.right.Na,sulfate=e.ions.left.SO4+e.ions.right.SO4;
  e=run(e,120);const p=electroPreview(e);assert.ok(p.solutions.left.pH<7);assert.ok(p.solutions.right.pH>7);
  near(e.ions.left.Na+e.ions.right.Na,na);near(e.ions.left.SO4+e.ions.right.SO4,sulfate);assert.ok(validElectro(e));
});
test('galvanic Zn/Cu cell delivers energy and keeps metal balance',()=>{
  let e=createElectro();e=op(e,'configure',{separator:'bridge',mode:'galvanic',load:30});e=op(e,'fill',{volume:200});
  e=op(e,'electrode',{side:'left',material:'zinc',mass:5});e=op(e,'electrode',{side:'right',material:'copper',mass:5});
  e=op(e,'add-solute',{stock:'zinc-sulfate',concentration:.1,side:'left'});e=op(e,'add-solute',{stock:'copper',concentration:.1,side:'right'});e=op(predict(e),'standard-wires');
  e=run(e,120);const p=electroPreview(e);assert.ok(p.current>0);assert.ok(p.voltage<0);assert.ok(e.energy>0);assert.ok(validElectro(e));
});
test('finite reactant inventory prevents over-deposition and negative concentrations',()=>{
  let e=createElectro();e=op(e,'fill',{volume:10});e=op(e,'add-solute',{stock:'copper',concentration:.00001});e=op(e,'add-solute',{stock:'sodium-sulfate',concentration:.1});
  e=op(e,'configure',{voltage:30,limit:5,leftArea:100,rightArea:100,diffusion:.0001,diffusionLayer:.001});e=op(predict(e),'standard-wires');e=run(e,60);
  assert.ok(e.electrodes.right.deposits.Cu<=1e-7+1e-12);assert.ok(e.ions.left.Cu>=0);assert.ok(validElectro(e));
});
test('sealed-cell pressure protection stops charge and cannot be immediately restarted',()=>{
  let e=prepared();e=op(e,'configure',{sealed:true,headspace:1,voltage:10,limit:1});e=run(e,600);
  assert.equal(e.power,false);assert.ok(pressureBar(e)>=2);assert.ok(e.time<600);assert.match(e.stopReason,/Pressure/);assert.throws(()=>op(e,'power',{enabled:true}),/protection/);
});
test('unsupported alloy or chloride corrosion is explained instead of fabricated',()=>{
  for(const material of ['stainless','gold','silver']){let e=prepared();e=op(e,'electrode',{side:'left',material,mass:5});if(material!=='stainless')e=op(e,'add-solute',{stock:'salt',concentration:.1});e=run(e,10);near(e.charge,0);assert.ok(electroPreview(e).unsupported);}
  assert.ok(ELECTRODES.length>=10);
});
test('real vessel aliquot transfer conserves source analytical totals and does not mutate on failure',()=>{
  let s=createLab(5);s=operate(s,'add',{vessel:'beaker',reagent:'copper',concentration:.1,ml:25,tool:'pipette'}).state;s=operate(s,'mix',{vessel:'beaker'}).state;
  const v=s.vessels.beaker,before=structuredClone(v),e=createElectro(),r=importVessel(e,v,10);
  near(r.state.ions.left.Cu+r.vessel.totals.Cu,v.totals.Cu);near(r.state.volume+r.vessel.volume,v.volume);assert.deepEqual(v,before);assert.equal(e.volume,0);assert.ok(validElectro(r.state));
  const bad=structuredClone(v);bad.totals.Ac=.01;assert.throws(()=>importVessel(e,bad,10),/not supported/);assert.equal(e.volume,0);
});
test('advanced BV is signed, CV conserves metal, and studies do not consume the live batch',()=>{
  const e=prepared('plating'),before=structuredClone(e),bv=advancedElectro(e,{type:'bv'});assert.ok(bv.points[0].current<0);assert.ok(bv.points.at(-1).current>0);
  const cv=advancedElectro(e,{type:'cv'});near(cv.balanceError,0,1e-7);assert.ok(cv.points.some(p=>p.faradaic<0));assert.ok(cv.points.some(p=>p.faradaic>0));assert.ok(cv.points.some(p=>Math.abs(p.capacitive)>1e-8));
  const curve=advancedElectro(e,{type:'polarization',maximum:5});assert.equal(curve.points.length,61);assert.ok(curve.points.at(-1).current>curve.points[0].current);assert.deepEqual(e,before);
});
test('views and exports are deterministic; persisted electrochemistry survives shared navigation and reset',()=>{
  let s=restartLab(createLab(9),'electro-water');s.electro=run(op(predict(s.electro),'standard-wires'),30);const before=structuredClone(s.electro);
  electroCalculations(s.electro);electroReport(s.electro);electroCSV(s.electro);assert.deepEqual(s.electro,before);
  assert.match(electroCSV(s.electro),/concentrations_json/);s=openStation(s,'aqueous');s=openStation(s,'prepare');assert.deepEqual(s.electro,before);assert.ok(validateLab(JSON.parse(JSON.stringify(s))));
  const fresh=restartLab(s,null);assert.equal(fresh.electro,undefined);
  for(const mutate of [e=>e.ions.left.Na=-1,e=>e.gases.H2=NaN,e=>e.electrodes.left.material='fake',e=>e.config.limit=8,e=>e.ions.left.Cu+=1,e=>e.records[0].charge=NaN]){const bad=structuredClone(before);mutate(bad);assert.equal(validElectro(bad),false);}
});

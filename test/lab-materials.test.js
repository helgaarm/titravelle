import test from 'node:test';
import assert from 'node:assert/strict';
import {createLab,operate,chemistry,appearance,validateLab,predictEquations} from '../src/lab-engine.js';
import {DISPENSABLE_MATERIALS,DRY_MATERIALS,defaultForm,materialRows,hasMaterials} from '../src/lab-materials.js';
import {benchSafety} from '../src/lab-safety.js';
import {vesselArtwork} from '../src/lab-glassware.js';
import {EQUIPMENT_BY_ID} from '../src/lab-data.js';
import {describeTransfer,transferScene} from '../src/lab-transfer.js';
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const fresh=()=>({...createLab(25),ideal:true});
const op=(s,a,args={})=>{const next=operate(s,a,args).state;assert.equal(validateLab(next),true,`Invalid after ${a}`);return next;};
const material=(s,id,mass=1,volume=1,vessel='beaker',form=defaultForm(id))=>op(s,'add-material',{material:id,mass,volume,form,vessel});
const water=(s,ml=10,vessel='beaker')=>op(s,'add',{reagent:'water',ml,concentration:.1,tool:'beaker',vessel});

test('all shelf solids and liquids can be weighed into a standard vessel independently of the reactor',()=>{
  assert.equal(DRY_MATERIALS.length,12);
  for(const r of DISPENSABLE_MATERIALS.filter(r=>r.id!=='nitrogen')){
    let s=material(fresh(),r.id);near(s.vessels.beaker.mass,1);near(s.vessels.beaker.volume,1);
    assert.equal(s.organic,undefined);assert.equal(s.study,'indicators');
    s=op(s,'tare');s=op(s,'measure',{kind:'mass'});near(s.measurements.at(-1).value,0);
  }
});
test('weighed salts dissolve within conservative water limits and connect to aqueous chemistry',()=>{
  let s=material(fresh(),'dry-salt',.5844,.2);assert.equal(appearance(s.vessels.beaker).pureSolid,true);
  s=water(s,20);assert.equal(hasMaterials(s.vessels.beaker),false);near(s.vessels.beaker.totals.Na,.01);near(s.vessels.beaker.totals.Cl,.01);near(chemistry(s.vessels.beaker).pH,7);
  const reversed=material(water(fresh(),20),'dry-salt',.5844,.2);assert.deepEqual(reversed.vessels.beaker.totals,s.vessels.beaker.totals);
  let b=material(water(fresh(),20),'dry-bicarbonate',.08401,.05);near(b.vessels.beaker.totals.C,.001);
  b=op(b,'add',{vessel:'beaker',reagent:'hcl',ml:10,concentration:.1,tool:'pipette'});near(b.gasMoles,.001);assert.ok(b.log.at(-1).text.includes('Bubbles'));
  let saturated=material(water(fresh(),1),'dry-salt',1,1);near(materialRows(saturated.vessels.beaker)[0].mass,.65);assert.equal(chemistry(saturated.vessels.beaker).pH,null);
  saturated=water(saturated,10);assert.equal(hasMaterials(saturated.vessels.beaker),false);near(saturated.vessels.beaker.totals.Na,1/58.44);
});
test('mixed material portions conserve mass, volume, water and every ingredient across repeated transfers',()=>{
  let s=water(fresh(),20);s=material(s,'fame',2,2);s=material(s,'sand',1,.5);s=op(s,'mix');
  const before=structuredClone(s.vessels.beaker);
  s=op(s,'transfer-mass',{from:'beaker',to:'beaker-b',mass:11.5});
  const a=s.vessels.beaker,b=s.vessels['beaker-b'];near(a.mass+b.mass,before.mass);near(a.volume+b.volume,before.volume);near(a.waterMass+b.waterMass,before.waterMass);
  for(const [key,p] of Object.entries(before.materials))near(a.materials[key].mass+b.materials[key].mass,p.mass);
  s=op(s,'mix',{vessel:'beaker-b'});s=op(s,'transfer',{from:'beaker-b',to:'flask',ml:5,tool:'pipette'});
  near(['beaker','beaker-b','flask'].reduce((sum,id)=>sum+s.vessels[id].mass,0),23);
  s=op(s,'empty',{vessel:'beaker-b'});near(s.wasteMass+s.vessels.beaker.mass+s.vessels.flask.mass,23);
});
test('dry solids use mass transfer; settled partial sampling, overfill and invalid masses fail transactionally',()=>{
  let s=material(fresh(),'sugar',5,3);const before=structuredClone(s);
  assert.throws(()=>operate(s,'transfer',{from:'beaker',to:'flask',ml:1,tool:'pipette'}),/dry solid/);
  assert.throws(()=>operate(s,'transfer-mass',{from:'beaker',to:'flask',mass:1}),/Mix/);
  assert.throws(()=>operate(s,'add-material',{material:'sand',mass:1,volume:250,form:'solid'}),/capacity/);
  for(const mass of [NaN,Infinity,-1,0])assert.throws(()=>operate(s,'add-material',{material:'sand',mass,volume:1,form:'solid'}));
  assert.deepEqual(s,before);
  s=op(s,'transfer-mass',{from:'beaker',to:'flask',mass:5});near(s.vessels.beaker.mass,0);near(s.vessels.flask.mass,5);
  const scene=transferScene(describeTransfer(before,s,{from:'beaker',to:'flask',ml:3,tool:'beaker'},'transfer'),.5);
  assert.match(scene,/sl-solid-stream/);assert.ok(!scene.includes('NaN'));
});
test('water/methanol and schematic water/FAME phases stay distinct without fabricated reaction predictions',()=>{
  let s=material(water(fresh(),20),'methanol',1,1.27);assert.match(appearance(s.vessels.beaker).text,/Water-miscible/);assert.equal(chemistry(s.vessels.beaker).pH,null);assert.ok(predictEquations(s.vessels.beaker).warning);
  s=material(water(fresh(),20),'fame',2,2);let look=appearance(s.vessels.beaker);assert.ok(look.layerFraction>0);
  assert.match(vesselArtwork(s.vessels.beaker,EQUIPMENT_BY_ID.beaker,look),/sl-material-layers/);
  s=op(s,'mix');assert.equal(appearance(s.vessels.beaker).layerFraction,0);s=op(s,'wait',{seconds:10});assert.ok(appearance(s.vessels.beaker).layerFraction>0);
  s=material(s,'methanol');assert.equal(appearance(s.vessels.beaker).layerFraction,0,'Cosolvents invalidate the schematic binary layering rule');
});
test('material warnings follow transfers and unknown reactions cannot be measured or heated as water',()=>{
  let s=material(water(fresh(),20),'methoxide');assert.match(chemistry(s.vessels.beaker).warning,/methanol and sodium hydroxide/);
  assert.throws(()=>operate(s,'measure',{kind:'ph'}),/conversion/);assert.throws(()=>operate(s,'measure',{kind:'temperature'}),/heat-capacity/);
  assert.throws(()=>operate(s,'heat',{seconds:60}),/heat capacities/);assert.throws(()=>operate(s,'filter',{to:'flask'}),/unsupported/);
  s=op(s,'pour',{from:'beaker',to:'flask'});assert.ok(benchSafety(s).notices.some(n=>n.id==='material-methoxide'&&n.vessels.includes('Erlenmeyer flask')));
  assert.equal(benchSafety(s).needsHood,true);s=op(s,'ventilation',{enabled:true});assert.ok(benchSafety(s).notices.some(n=>n.id==='material-methoxide'));
});
test('material saves reject corrupt identities, masses and volumes; old saves and read-only drawings stay stable',()=>{
  const s=material(fresh(),'sugar');assert.equal(validateLab(JSON.parse(JSON.stringify(s))),true);assert.equal(validateLab(createLab()),true);
  const before=JSON.stringify(s);appearance(s.vessels.beaker);chemistry(s.vessels.beaker);predictEquations(s.vessels.beaker);assert.equal(JSON.stringify(s),before);
  for(const patch of [{mass:NaN},{mass:2},{volume:2},{form:'gas'},{id:'not-known'}]){
    const bad=structuredClone(s);Object.assign(bad.vessels.beaker.materials['sugar:solid'],patch);assert.equal(validateLab(bad),false);
  }
});
test('nitrogen can be applied to an empty standard vessel without adding fictional gas mass',()=>{
  let s=op(fresh(),'nitrogen',{enabled:true});near(s.vessels.beaker.mass,0);assert.ok(benchSafety(s).notices.some(n=>n.id==='nitrogen-flow'));
  s=op(s,'nitrogen',{enabled:false});assert.equal(benchSafety(s).notices.some(n=>n.id==='nitrogen-flow'),false);
});
test('mass transfer of an aqueous precipitate includes the solid and delivers the requested mass',()=>{
  let s=fresh();for(const reagent of ['salt','silver'])s=op(s,'add',{vessel:'beaker',reagent,ml:10,concentration:.1,tool:'pipette'});
  const before=structuredClone(s.vessels.beaker);
  assert.throws(()=>operate(s,'transfer-mass',{from:'beaker',to:'flask',mass:5}),/Mix/);
  s=op(s,'mix');s=op(s,'transfer-mass',{from:'beaker',to:'flask',mass:5});near(s.vessels.flask.mass,5);near(s.vessels.flask.totals.Ag,before.totals.Ag/4);
  s=op(s,'transfer-mass',{from:'beaker',to:'flask',mass:s.vessels.beaker.mass});near(s.vessels.flask.mass,before.mass);near(s.vessels.flask.totals.Ag,before.totals.Ag);
});

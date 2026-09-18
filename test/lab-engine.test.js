import test from 'node:test';
import assert from 'node:assert/strict';
import { createLab, operate, chemistry, phases, appearance, validateLab, measurementsCSV } from '../src/lab-engine.js';
import { CONSTANTS as K } from '../src/lab-data.js';
import { calculate, checkEquation } from '../src/lab-analysis.js';

const near = (a,b,eps=1e-9) => assert.ok(Math.abs(a-b)<=eps,`${a} differs from ${b}`);
const lab = (ideal=true) => { const s=createLab(45); s.ideal=ideal;return s; };
const op = (s,action,args={}) => operate(s,action,args).state;
const add = (s,reagent,ml=10,concentration=0.1,vessel='beaker') => op(s,'add',{reagent,ml,concentration,vessel,tool:ml<=25?'pipette':'cylinder',temperature:25});
const total = s => Object.values(s.vessels).reduce((n,v)=>n+v.mass,0)+s.gasMoles*44.01+s.wasteMass+s.evaporatedMass;

test('acid/base stocks, four indicators, and weak acid charge balance use concentration',()=>{
  for(const [r,ph] of [['hcl',1],['naoh',13],['water',7]]) {
    const s=add(lab(),r);near(chemistry(s.vessels.beaker).pH,ph,1e-6);
  }
  const weak=add(lab(),'acetic');near(chemistry(weak.vessels.beaker).pH,2.875,0.002);
  const low=add(lab(),'hcl',10,0.01);near(chemistry(low.vessels.beaker).pH,2,1e-6);
  const names={universal:'Red',phenol:'Colourless',methyl:'Red',bromothymol:'Yellow'};
  for(const [dye,name] of Object.entries(names)){const s=add(add(lab(),'hcl'),dye,0.1);assert.equal(appearance(s.vessels.beaker).name,name);}
});
test('equivalence, overshoot, dilution, and parcel transfers conserve solute and mass',()=>{
  let s=add(add(lab(),'hcl',25),'naoh',25);near(chemistry(s.vessels.beaker).pH,7,1e-6);
  s=add(s,'naoh',0.1);assert.ok(chemistry(s.vessels.beaker).pH>10);
  const before=total(s), chloride=s.vessels.beaker.totals.Cl;
  s=op(s,'transfer',{from:'beaker',to:'flask',ml:10,tool:'pipette'});
  near(total(s),before);near(s.vessels.beaker.totals.Cl+s.vessels.flask.totals.Cl,chloride);
  const concentration=s.vessels.flask.totals.Cl/(s.vessels.flask.volume/1000);
  s=add(s,'water',10,0.1,'flask');near(s.vessels.flask.totals.Cl/(s.vessels.flask.volume/1000),concentration/2);
});
test('100 mL dilution has the expected concentration; overfilling cannot be silently repaired',()=>{
  let s=add(lab(),'salt',10,1,'volumetric');s=op(s,'mark',{vessel:'volumetric'});
  near(s.vessels.volumetric.volume,100);near(s.vessels.volumetric.totals.Na/0.1,0.1);
  assert.throws(()=>op(s,'mark',{vessel:'volumetric'}),/already/);
});
test('unknown titration uses a hidden generated stock and a physical finite burette',()=>{
  let s=lab();s=op(s,'rinse',{reagent:'naoh'});s=op(s,'fill-burette',{reagent:'naoh',concentration:0.1});
  s=add(s,'unknown',25,0.1,'flask');const equivalence=s.unknown*25/0.1;
  s=op(s,'transfer',{from:'burette',to:'flask',ml:equivalence,tool:'burette'});
  near(chemistry(s.vessels.flask).pH,7,1e-6);near(s.vessels.burette.volume,50-equivalence);
  s=op(s,'endpoint');near(s.endpoints[0].value,equivalence,0.005);
  s=op(s,'transfer',{from:'burette',to:'flask',ml:0.2,tool:'burette'});assert.ok(chemistry(s.vessels.flask).pH>10);
  const wet=op(lab(),'fill-burette',{reagent:'naoh',concentration:0.1});near(wet.vessels.burette.totals.Na/0.05,0.099);
});
test('AgCl precipitation satisfies Ksp and spectator ions remain dissolved',()=>{
  const s=add(add(lab(),'salt',10),'silver',15),v=s.vessels.beaker,c=chemistry(v);
  near(c.ions.Ag*c.ions.Cl,K.agclKsp,1e-17);assert.ok(c.solid>0.0009999 && c.solid<0.001);
  near(c.dissolved.Na,0.001);near(c.dissolved.NO3,0.0015);
  assert.ok(appearance(v).text.includes('white solid'));assert.ok(!appearance(v).text.includes('AgCl'));
});
test('filtration, washing, drying, and balance distinguish wet and dry mass with conservation',()=>{
  let s=lab();s=op(s,'tare',{vessel:'filter'});s=add(add(s,'salt',10),'silver',15);
  const initial=total(s);s=op(s,'filter',{vessel:'beaker',to:'beaker-b'});near(total(s),initial);
  s=op(s,'measure',{vessel:'filter',kind:'mass'});const wet=s.measurements.at(-1).value;
  for(let n=0;n<3;n++)s=op(s,'wash',{to:'beaker-b'});
  near(total(s),initial+15,1e-9);s=op(s,'dry',{vessel:'filter'});near(total(s),initial+15,1e-9);
  s=op(s,'measure',{vessel:'filter',kind:'mass'});const dry=s.measurements.at(-1).value;
  assert.ok(wet>dry);near(dry,0.14332,0.0002);assert.equal(s.vessels.filter.dry,true);
});
test('unwashed residue includes salts and realistic filtration loses recoverable precipitate',()=>{
  const prepare=ideal=>{let s=add(add(lab(ideal),'salt',10),'silver',15);s.ideal=ideal;return op(s,'filter',{vessel:'beaker',to:'beaker-b'});};
  let s=prepare(true);const solid=phases(s.vessels.filter).solidMass;s=op(s,'dry',{vessel:'filter'});assert.ok(s.vessels.filter.mass>solid+0.001);
  let ideal=add(add(lab(),'salt',10),'silver',15),real=structuredClone(ideal);real.ideal=false;
  ideal=op(ideal,'filter',{vessel:'beaker',to:'beaker-b'});real=op(real,'filter',{vessel:'beaker',to:'beaker-b'});
  assert.ok(phases(real.vessels.filter).solid<phases(ideal.vessels.filter).solid);near(total(real),total(ideal));
});
test('calorimetry conserves reaction heat and supports delayed readings and heating/cooling',()=>{
  let s=add(add(lab(),'hcl',50,1,'cup'),'naoh',50,1,'beaker');s=op(s,'transfer',{from:'beaker',to:'cup',ml:50,tool:'cylinder'});
  const v=s.vessels.cup,rise=v.temperature-25;near((100*K.cp+20)*rise,0.05*K.neutralizationJ,1e-7);
  const hot=v.temperature;s=op(s,'wait',{seconds:120});assert.ok(s.vessels.cup.temperature<hot);assert.equal(s.time,120);
  s=op(s,'heat',{vessel:'cup',seconds:60});assert.ok(s.vessels.cup.temperature>hot);
  const t=s.vessels.cup.temperature;s=op(s,'cool',{vessel:'cup',seconds:120});assert.ok(s.vessels.cup.temperature<t);
});
test('CO2 escaping is tracked in a mass ledger and is not regenerated on observation',()=>{
  let s=add(add(lab(),'bicarbonate',10),'hcl',10);near(s.gasMoles,0.001);near(total(s),20.5);
  const before=JSON.stringify(s);for(let n=0;n<10;n++){chemistry(s.vessels.beaker);appearance(s.vessels.beaker);}assert.equal(JSON.stringify(s),before);
  s=add(s,'water',10);near(s.gasMoles,0.001);near(total(s),30.5);
});
test('random readings are sampled only explicitly; calibration, mixing and tare are consequential',()=>{
  let s=add(lab(),'water',20);s.ideal=false;s=op(s,'measure',{kind:'ph'});assert.ok(s.measurements.at(-1).value>7.25);
  s=op(op(s,'calibrate'),'mix');s=op(s,'measure',{kind:'ph'});near(s.measurements.at(-1).value,7,0.021);
  const before=JSON.stringify(s.measurements);chemistry(s.vessels.beaker);assert.equal(JSON.stringify(s.measurements),before);
  s=op(s,'measure',{kind:'mass'});assert.ok(s.measurements.at(-1).value>100);
  s=op(s,'tare');s=op(s,'measure',{kind:'mass'});near(s.measurements.at(-1).value,0,0.00011);
});
test('invalid operations are atomic and unsupported combinations withhold results',()=>{
  const s=add(lab(),'water',20),before=JSON.stringify(s);
  assert.throws(()=>op(s,'transfer',{from:'beaker',to:'flask',ml:50,tool:'cylinder'}));
  assert.equal(JSON.stringify(s),before);assert.throws(()=>add(s,'hcl',NaN));
  const copper=add(add(s,'copper'),'acetic');assert.equal(chemistry(copper.vessels.beaker).pH,null);
  const silver=add(add(lab(),'silver'),'naoh');assert.match(chemistry(silver.vessels.beaker).warning,/hydroxide/);
});
test('saved state validation rejects corrupted numbers and accepts completed workflows',()=>{
  let s=add(lab(),'salt',10);s=op(s,'measure',{kind:'mass'});assert.equal(validateLab(s),true);
  for(const bad of [NaN,-1,Infinity]){const v=structuredClone(s);v.vessels.beaker.totals.Na=bad;assert.equal(validateLab(v),false);}
  const v=structuredClone(s);v.draft=null;assert.equal(validateLab(v),false);
});
test('equation checker handles charge, atoms, coefficients and unknown species without eval',()=>{
  assert.equal(checkEquation('H+ + OH-','H2O').balanced,true);
  assert.equal(checkEquation('Ag+ + Cl-','AgCl').balanced,true);
  assert.equal(checkEquation('2 HCl + 2 NaOH','2 NaCl + 2 H2O').balanced,true);
  assert.equal(checkEquation('H+','H2O').balanced,false);
  assert.throws(()=>checkEquation('window','H2O'));
});
test('calculation tools respect units and CSV protects fields with spreadsheet prefixes',()=>{
  near(calculate('dilution',[0.1,100,1]),10);near(calculate('titration',[0.1,22,25]),0.088);
  near(calculate('precipitate',[0.001,0.002,0]),0.14332);near(calculate('heat',[100,5,20]),2192);
  near(calculate('enthalpy',[2865,0.05,0]),-57.3);assert.throws(()=>calculate('titration',[1,1,0]));
  assert.ok(measurementsCSV([{note:'=BAD(),"test"'}]).includes("'=BAD(),\"\"test\"\""));
});
test('fresh aliquots have separate measurement trials while preserving earlier readings',()=>{
  let s=op(add(lab(),'water',10),'measure',{kind:'ph'});
  s=op(s,'empty');s=op(add(s,'hcl',10),'measure',{kind:'ph'});
  assert.equal(s.measurements[0].trial,0);assert.equal(s.measurements[1].trial,1);
  assert.equal(s.measurements.length,2);assert.equal(s.vessels.beaker.trial,1);
});
test('pouring transfers an entire uncertain fill without requiring hidden exact volume',()=>{
  let s=add(lab(false),'water',50),mass=s.vessels.beaker.mass;
  s=op(s,'pour',{from:'beaker',to:'cup'});near(s.vessels.cup.mass,mass);near(s.vessels.beaker.volume,0);
});

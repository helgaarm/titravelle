import test from 'node:test';
import assert from 'node:assert/strict';
import { createLab,operate,chemistry,predictEquations,appearance,validateLab } from '../src/lab-engine.js';
import { COPPER } from '../src/lab-copper.js';
import { equationsAsText,formatEquation } from '../src/lab-reactions.js';
import { checkEquation } from '../src/lab-analysis.js';

const lab=()=>({...createLab(12),ideal:true});
const op=(s,action,args={})=>operate(s,action,args).state;
const add=(s,reagent,ml=10,concentration=0.1,vessel='beaker')=>op(s,'add',{reagent,ml,concentration,vessel,tool:ml<=25?'pipette':'beaker',temperature:25});
const near=(a,b,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const sample=()=>['salt','water','hcl','copper'].reduce((s,r)=>add(s,r,50,1),lab());
const amounts=s=>Object.fromEntries(Object.keys(s.vessels.beaker.totals).map(id=>[id,Object.values(s.vessels).reduce((n,v)=>n+v.totals[id],0)]));
const mass=s=>Object.values(s.vessels).reduce((sum,v)=>sum+v.mass,0)+s.wasteMass+s.evaporatedMass+s.gasMoles*44.01;

function balance(v) {
  const c=chemistry(v),sp=c.speciation.aqueous,get=id=>sp.find(s=>s.id===id).concentration,V=v.volume/1000;
  assert.equal(c.warning,'');assert.ok(c.speciation.converged);
  near(sp.reduce((n,s)=>n+s.moles*s.copperAtoms,0)+c.copperSolid,v.totals.Cu);
  near((get('Cl-')+get('CuCl+')+2*get('CuCl2')+3*get('CuCl3-')+4*get('CuCl4--'))*V,v.totals.Cl);
  near((get('SO4--')+get('HSO4-')+get('CuSO4'))*V,v.totals.SO4);
  near(sp.reduce((n,s)=>n+s.charge*s.concentration,0),0);
  near(get('H+')*get('OH-'),1e-14,1e-25);
  near(get('CuCl+')/(get('Cu++')*get('Cl-') || 1),v.totals.Cl?10**0.2:0,1e-8);
  near(get('CuSO4')/(get('Cu++')*get('SO4--')),10**2.36,1e-8);
  near(get('HSO4-')/(get('H+')*get('SO4--')),10**1.99,1e-8);
  if(c.copperSolid>1e-12)near(Math.log10(c.speciation.ionProduct),8.674-28,1e-8);
  else assert.ok(c.speciation.ionProduct<=COPPER.ksp*(1+1e-8));
  return c;
}

test('the supplied 50 mL salt/water/HCl/CuSO4 mixture has balanced totals, complexes, and an acidic estimate',()=>{
  const s=sample(),v=s.vessels.beaker,c=balance(v),r=predictEquations(v);
  near(v.volume,200);near(v.totals.Cu,0.05);near(v.totals.Cl,0.1);near(v.totals.SO4,0.05);
  assert.ok(c.pH>0.8 && c.pH<1);near(c.copperSolid,0);assert.ok(c.speciation.ionicStrength>0.5);
  // Sulfate protonation consumes some analytical acid; Cl bound in complexes
  // cannot be used as the free ligand concentration.
  assert.ok(c.ions.H<0.25);assert.ok(c.ions.Cl<0.5);assert.ok(c.ions.Cu<0.25);
  assert.match(r.mixture.quality,/qualitative/);assert.ok(r.equilibria.every(e=>e.balanced));
  assert.ok(r.equilibria.some(e=>e.title==='Sulfate protonation'));
  assert.ok(r.equilibria.some(e=>e.equation.includes('CuCl₄²⁻')));
  assert.equal(s.gasMoles,0);assert.match(appearance(v).text,/no visible solid/);
  assert.ok(!r.reactions.some(e=>e.id==='neutralize'));
});

test('calculated copper speciation is independent of the order of mixing',()=>{
  const forward=sample();let reverse=lab();
  for(const r of ['copper','hcl','water','salt'])reverse=add(reverse,r,50,1);
  near(chemistry(forward.vessels.beaker).pH,chemistry(reverse.vessels.beaker).pH);
  assert.deepEqual(forward.vessels.beaker.totals,reverse.vessels.beaker.totals);
  const a=chemistry(forward.vessels.beaker).speciation.aqueous,b=chemistry(reverse.vessels.beaker).speciation.aqueous;
  a.forEach((s,i)=>near(s.concentration,b[i].concentration));
});

test('copper sulfate hydrolysis acidifies water and chloride additions redistribute copper',()=>{
  let s=add(lab(),'copper');let c=balance(s.vessels.beaker);
  assert.ok(c.pH>4 && c.pH<6);assert.equal(c.copperSolid,0);
  s=add(s,'salt',10,1);c=balance(s.vessels.beaker);
  const cl=c.speciation.aqueous.find(x=>x.id==='CuCl+');assert.ok(cl.moles>0.00001);
});

test('hydroxide precipitation respects the 1:2 ratio, finite solubility, and acid redissolution',()=>{
  let s=add(add(lab(),'copper'),'naoh',10),c=balance(s.vessels.beaker);
  assert.ok(c.copperSolid>0.00045 && c.copperSolid<0.0005);
  s=add(s,'naoh',10);c=balance(s.vessels.beaker);
  assert.ok(c.copperSolid>0.00099 && c.copperSolid<0.001);
  assert.equal(appearance(s.vessels.beaker).solidColour,'#6ab9d7');assert.match(appearance(s.vessels.beaker).text,/blue solid/);
  assert.ok(predictEquations(s.vessels.beaker).reactions.find(r=>r.id==='copperPrecipitate').molecular.length);
  // 0.5 mmol excess acid in 55 mL is below 0.01 M, even before sulfate uptake.
  s=add(s,'hcl',25);c=balance(s.vessels.beaker);assert.equal(c.copperSolid,0);assert.ok(c.pH>2 && c.pH<3);
  assert.ok(predictEquations(s.vessels.beaker).reactions.some(r=>r.id==='copperDissolve'));
  assert.match(appearance(s.vessels.beaker).text,/blue liquid; no visible solid/);
});

test('excess acid prevents copper hydroxide precipitation; excess hydroxide complexes remain balanced',()=>{
  let s=add(add(add(lab(),'hcl',20),'copper'),'naoh',10);assert.equal(balance(s.vessels.beaker).copperSolid,0);
  s=add(add(lab(),'copper',1,0.01),'naoh',25,1);const c=balance(s.vessels.beaker);
  assert.ok(c.pH>13);assert.ok(c.speciation.aqueous.find(x=>x.id==='Cu(OH)4--').moles>0);
  assert.ok(predictEquations(s.vessels.beaker).equilibria.every(e=>e.balanced));
});

test('transfers, filtration, and washing conserve copper, ligands, and sample mass',()=>{
  for(const ideal of [true,false]) {
    let s={...add(add(lab(),'copper'),'naoh',20),ideal};const original=amounts(s),originalMass=mass(s);
    s=op(s,'mix');s=op(s,'transfer',{from:'beaker',to:'flask',ml:5,tool:'pipette'});
    s=op(s,'filter',{vessel:'beaker',to:'beaker-b'});
    assert.ok(chemistry(s.vessels.filter).copperSolid>0);
    s=op(s,'wash',{to:'beaker-b'});
    for(const id of Object.keys(original))near(amounts(s)[id],original[id]);near(mass(s),originalMass+5);
    for(const v of Object.values(s.vessels))if(v.volume && v.totals.Cu>1e-14)balance(v);
    const before=structuredClone(s);assert.throws(()=>op(s,'dry',{vessel:'filter'}),/Copper residue drying/);assert.deepEqual(s,before);
    assert.equal(validateLab(s),true);
  }
});

test('settled transfers leave copper precipitate behind instead of moving all copper as liquid',()=>{
  let s=add(add(lab(),'copper'),'naoh',20);const solid=chemistry(s.vessels.beaker).copperSolid;
  s=op(s,'transfer',{from:'beaker',to:'flask',ml:10,tool:'pipette'});
  assert.ok(s.vessels.flask.totals.Cu<1e-7);near(chemistry(s.vessels.beaker).copperSolid,solid,1e-7);
});

test('stored mixtures need no reaction history to gain current copper analysis; reads are stable',()=>{
  const s=sample(),v=s.vessels.beaker;delete v.reactionHistory;delete v.reactionHistoryComplete;delete v.stock;
  assert.equal(validateLab(s),true);const copy=structuredClone(s),r=predictEquations(v);
  for(let i=0;i<4;i++){chemistry(v);predictEquations(v);appearance(v);}assert.deepEqual(s,copy);
  assert.ok(r.mixture);assert.equal(r.reactions.length,0);assert.ok(r.notices.some(n=>n.includes('no reaction history')));
  assert.deepEqual(predictEquations(JSON.parse(JSON.stringify(v))),r);
  const notebook=equationsAsText(r,'Beaker A');assert.match(notebook,/Total Cu\(II\)/);assert.match(notebook,/qualitative estimate/);assert.match(notebook,/CuCl⁺/);
});

test('the extended checker balances copper complexes and rejects wrong charge or ligand stoichiometry',()=>{
  assert.equal(checkEquation('Cu++ + 2 OH-','Cu(OH)2').balanced,true);
  assert.equal(checkEquation('CuSO4 + 2 NaOH','Cu(OH)2 + Na2SO4').balanced,true);
  assert.equal(checkEquation('Cu++ + 4 Cl-','CuCl4--').balanced,true);
  assert.equal(checkEquation('Cu++ + 2 Cl-','CuCl+').balanced,false);
  assert.equal(checkEquation('2 Cu++ + 2 H2O','Cu2(OH)2++ + 2 H+').balanced,true);
  assert.equal(formatEquation({left:'Cu(OH)2 + 2 H+',right:'Cu++ + 2 H2O'}),'Cu(OH)₂(s) + 2 H⁺(aq) → Cu²⁺(aq) + 2 H₂O(l)');
});

test('remaining competing copper mixtures name the missing chemistry without fabricated predictions',()=>{
  for(const reagent of ['acetic','bicarbonate','silver']) {
    const s=add(add(lab(),'copper'),reagent),c=chemistry(s.vessels.beaker),r=predictEquations(s.vessels.beaker);
    assert.equal(c.pH,null);assert.match(c.warning,/competing complexes/);assert.equal(r.reactions.length,0);assert.equal(r.equilibria.length,0);
  }
});

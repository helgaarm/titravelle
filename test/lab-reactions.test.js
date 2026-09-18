import test from 'node:test';
import assert from 'node:assert/strict';
import { createLab, operate, predictEquations, phases, validateLab } from '../src/lab-engine.js';
import { REACTION_RULES, MOLECULAR_FORMS, equationsAsText } from '../src/lab-reactions.js';
import { checkEquation } from '../src/lab-analysis.js';
import { CONSTANTS as K } from '../src/lab-data.js';

const lab = () => ({...createLab(23),ideal:true});
const op = (s,action,args={}) => operate(s,action,args).state;
const add = (s,reagent,ml=10,vessel='beaker') => op(s,'add',{reagent,ml,vessel,concentration:0.1,tool:ml<=25?'pipette':'cylinder',temperature:25});
const report = (s,id='beaker') => predictEquations(s.vessels[id]);
const reaction = (s,id,vessel='beaker') => report(s,vessel).reactions.find(r=>r.id===id);
const near = (actual,expected,eps=1e-10) => assert.ok(Math.abs(actual-expected)<eps,`${actual} != ${expected}`);

test('all generated reaction and molecular equations conserve every element and charge',()=>{
  for(const r of Object.values(REACTION_RULES)) assert.equal(checkEquation(r.net.left,r.net.right).balanced,true,r.title);
  for(const m of Object.values(MOLECULAR_FORMS)) assert.equal(checkEquation(m.equation.left,m.equation.right).balanced,true);
  for(const stock of ['water','acetic','bicarbonate','silver']) {
    const result=report(add(lab(),stock));
    assert.ok(result.equilibria.every(e=>e.balanced));
  }
});

test('neutralization calculates limiting amount in either addition order, including titration increments',()=>{
  for(const pair of [['hcl','naoh'],['naoh','hcl']]) {
    let s=add(add(lab(),pair[0],20),pair[1],5);
    let r=reaction(s,'neutralize');near(r.moles,0.0005);assert.equal(r.molecular.length,1);
    assert.match(r.equation,/H⁺\(aq\) \+ OH⁻\(aq\) → H₂O\(l\)/);
    s=add(s,pair[1],20);r=reaction(s,'neutralize');near(r.moles,0.002);assert.equal(r.steps,2);
    s=add(s,pair[1],5);assert.equal(reaction(s,'neutralize').steps,2);
  }
});

test('salt and dilution do not fabricate a historical neutralization from sodium and chloride',()=>{
  for(const stock of ['salt','hcl','naoh','acetic','bicarbonate']) {
    const s=add(add(lab(),stock),'water',20);
    assert.equal(report(s).reactions.length,0,stock);
  }
  assert.equal(report(lab()).equilibria.length,0);
});

test('silver precipitation uses Ksp rather than complete conversion and identifies molecular stock pair',()=>{
  let s=add(add(lab(),'salt'),'silver');const r=reaction(s,'precipitate');
  near(r.moles,0.001-Math.sqrt(K.agclKsp)*0.020);
  assert.match(r.molecular[0].equation,/NaNO₃/);assert.equal(r.molecular[0].spectators,'Na⁺ and NO₃⁻');
  assert.ok(report(s).equilibria.find(e=>e.title.includes('Silver chloride')));
  s=add(add(lab(),'hcl'),'silver');assert.match(reaction(s,'precipitate').molecular[0].equation,/HNO₃/);
});

test('water dissolves existing AgCl without counting the original solid again',()=>{
  let s=add(add(lab(),'salt'),'silver');const original=phases(s.vessels.beaker).solid;
  s=add(s,'water',20);near(reaction(s,'precipitate').moles,original);
  near(reaction(s,'dissolve').moles,original-phases(s.vessels.beaker).solid);
});

test('below-Ksp mixtures withhold precipitation',()=>{
  const s=lab(),v=s.vessels.beaker;v.volume=100;v.mass=100;v.waterMass=100;
  v.totals.Ag=v.totals.Cl=v.totals.Na=v.totals.NO3=1e-8;
  const result=report(s);assert.equal(result.reactions.length,0);
  assert.ok(result.notices.some(n=>n.includes('No AgCl solid')));
});

test('weak acid neutralization and reverse protonation follow equilibrium, not raw total acetate',()=>{
  let s=add(add(lab(),'acetic',20),'naoh',5);
  const first=reaction(s,'weak');assert.ok(first.moles>0.00046 && first.moles<0.0005);assert.equal(first.molecular.length,1);
  s=add(s,'hcl',5);assert.ok(reaction(s,'protonate').moles>0.00046);
  const r=reaction(add(add(lab(),'naoh',5),'acetic',20),'weak');near(r.moles,first.moles);
});

test('both acid-bicarbonate paths persist after carbon dioxide has escaped',()=>{
  for(const [stock,id] of [['hcl','gas'],['acetic','weakGas']]) {
    for(const pair of [[stock,'bicarbonate'],['bicarbonate',stock]]) {
      const s=add(add(lab(),pair[0]),pair[1]);const r=reaction(s,id);
      near(r.moles,0.001);near(s.vessels.beaker.totals.C,0);near(r.moles,s.gasMoles);
      assert.match(r.equation,/CO₂\(g\)/);assert.equal(r.molecular.length,1);
    }
  }
});

test('multiple supported reactions can occur during one addition',()=>{
  const s=add(add(add(lab(),'silver'),'hcl'),'naoh',5);
  assert.ok(reaction(s,'neutralize'));assert.ok(reaction(s,'precipitate'));
});

test('transferring reacted solution does not replay its history; transferring reactants records new reaction',()=>{
  let s=add(add(lab(),'hcl'),'naoh');
  s=op(s,'transfer',{from:'beaker',to:'flask',ml:10,tool:'pipette'});
  near(reaction(s,'neutralize').moles,0.001);assert.equal(report(s,'flask').reactions.length,0);
  s=add(add(lab(),'hcl'),'naoh',10,'flask');
  s=op(s,'transfer',{from:'beaker',to:'flask',ml:5,tool:'pipette'});
  near(reaction(s,'neutralize','flask').moles,0.0005);assert.equal(reaction(s,'neutralize','flask').molecular.length,1);
  s=add(add(lab(),'salt'),'silver');s=op(s,'mix');
  s=op(s,'transfer',{from:'beaker',to:'flask',ml:10,tool:'pipette'});
  assert.equal(report(s,'flask').reactions.length,0);
  assert.ok(report(s,'flask').equilibria.some(e=>e.title.includes('Silver chloride')));
});

test('unsupported mixtures and dry residues never receive aqueous reaction predictions',()=>{
  for(const s of [add(add(lab(),'copper'),'acetic'),add(add(lab(),'silver'),'naoh')]) {
    const r=report(s);assert.ok(r.warning);assert.equal(r.reactions.length,0);assert.equal(r.equilibria.length,0);
  }
  let s=add(add(lab(),'salt'),'silver');s=op(s,'filter',{to:'flask'});s=op(s,'dry',{vessel:'filter'});
  const r=report(s,'filter');assert.equal(r.equilibria.length,0);assert.ok(r.notices.some(n=>n.includes('dry residue')));
});

test('read-only prediction does not change a sample, random sequence, or measurements',()=>{
  const s=add(add(lab(),'hcl'),'naoh');const copy=structuredClone(s);
  for(let i=0;i<10;i++)report(s);
  assert.deepEqual(s,copy);assert.equal(validateLab(s),true);
  const saved=JSON.parse(JSON.stringify(s));assert.deepEqual(report(saved),report(s));
  assert.match(equationsAsText(report(s),'Beaker A'),/not current inventory/);
});

test('old saves retain contents without inferring missing reaction history; malformed new history is rejected',()=>{
  let s=add(lab(),'salt');
  for(const v of Object.values(s.vessels)){delete v.stock;delete v.reactionHistory;delete v.reactionHistoryComplete;}
  assert.equal(validateLab(s),true);assert.equal(report(s).reactions.length,0);assert.ok(report(s).notices.some(n=>n.includes('no reaction history')));
  s=add(s,'silver');assert.equal(validateLab(s),true);assert.ok(reaction(s,'precipitate'));assert.equal(reaction(s,'precipitate').molecular.length,0);
  const invalid=structuredClone(s);invalid.vessels.beaker.reactionHistory[0].id='invented';assert.equal(validateLab(invalid),false);
  const invalidAmount=structuredClone(s);invalidAmount.vessels.beaker.reactionHistory[0].moles=-1;assert.equal(validateLab(invalidAmount),false);
  const badForm=structuredClone(s);badForm.vessels.beaker.reactionHistory[0].molecular=['neutralize'];assert.equal(validateLab(badForm),false);
});

test('emptying resets history; failed overfill leaves all chemistry and history untouched',()=>{
  let s=add(add(lab(),'hcl'),'naoh');const copy=structuredClone(s);
  assert.throws(()=>op(s,'add',{reagent:'hcl',ml:250,vessel:'beaker',concentration:0.1,tool:'beaker',temperature:25}),/capacity/);
  assert.deepEqual(s,copy);s=op(s,'empty');assert.equal(report(s).reactions.length,0);assert.equal(s.vessels.beaker.stock,null);
});

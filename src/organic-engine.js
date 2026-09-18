import { MW, FAMES, DEFAULT_PARAMETERS, PARAMETER_INFO } from './organic-data.js';
import { gcAnalysis, sampleAnalysis, materialAnalysis, frictionAnalysis, finalDecision, reportText } from './organic-analysis.js';

const copy=x=>structuredClone(x), sum=a=>a.reduce((s,x)=>s+x,0), clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const bounded=(x,a,b,label)=>{if(!Number.isFinite(x)||x<a||x>b)throw Error(`${label} must be between ${a} and ${b}.`);return x;};
export function organicRandom(o) { o.seed=(1664525*o.seed+1013904223)>>>0;return o.seed/4294967296; }
const mwFame=o=>sum(o.lots.fame.composition.map((p,i)=>p*FAMES[i].mm));
export const stateMolarMass=(o,j,k)=>MW.sugar+(8-j-k)*(MW.acid-MW.water)+j*(mwFame(o)-MW.methanol);
export function poolMass(o) {
  const p=o.pool, f=mwFame(o), weights={fame:f,water:MW.water,methanol:MW.methanol,methylAcetate:MW.methylAcetate,acid:MW.acid,ffa:f-14.027,methoxide:MW.methoxide,hydroxide:MW.hydroxide,sodiumAcetate:MW.sodiumAcetate,soap:f-14.027-1.008+22.98976928,solvent:1,degraded:1};
  return sum(Object.entries(p).map(([id,n])=>n*weights[id]))+sum(o.distribution.map(s=>s.n*stateMolarMass(o,s.j,s.k)));
}
export function createOrganic(seed=19) {
  return {version:1,seed:seed>>>0,time:0,revision:0,stage:'Feed qualification',parameters:{...DEFAULT_PARAMETERS},
    lots:{soa:{mass:1.371,water:.0020565,methanol:0,ffa:0},fame:{mass:5.430,water:.004344,methanol:.01086,ffa:.001086,composition:[.997,.0008,.0005,.0004,.0003,.0004,.0003,.0002,.0001]}},
    lotRevision:0,feedGC:null,kf:{},drying:[],apparatus:{dry:false,stir:false,nitrogen:false,vacuum:false,trap:false,calibrated:false},
    charged:{fame:false,soa:false,catalyst:false},conditionMinutes:0,blendMinutes:0,initialCore:0,catalystCharge:0,
    temperature:25,pressure:1013,targetTemperature:50,targetPressure:100,neutralized:false,
    distribution:Array.from({length:9},(_,j)=>Array.from({length:9-j},(_,k)=>({j,k,n:0}))).flat(),
    pool:Object.fromEntries(['fame','water','methanol','methylAcetate','acid','ffa','methoxide','hydroxide','sodiumAcetate','soap','solvent','degraded'].map(k=>[k,0])),
    inputMass:0,trap:{mass:0,methylAcetate:0,methanol:0,water:0,solvent:0},escapedMass:0,wasteMass:0,aliquotMass:0,generatedAcetate:0,
    profile:[],samples:[],analyses:[],operations:[],deviations:[],purifications:[],dryMasses:[],crudeMass:null,materials:null,friction:null,environment:null};
}
export function organicMetrics(o) {
  const cores=sum(o.distribution.map(x=>x.n)), bound=sum(o.distribution.map(x=>x.j*x.n)), oh=sum(o.distribution.map(x=>x.k*x.n)), acetate=sum(o.distribution.map(x=>(8-x.j-x.k)*x.n));
  const mass=poolMass(o), distribution=Array.from({length:9},(_,j)=>sum(o.distribution.filter(x=>x.j===j).map(x=>x.n))), octa=o.distribution.find(x=>x.j===8&&x.k===0).n;
  const targetMass=octa*stateMolarMass(o,8,0), totalSucroseMass=sum(o.distribution.map(x=>x.n*stateMolarMass(o,x.j,x.k)));
  const inorganic=o.pool.methoxide*MW.methoxide+o.pool.hydroxide*MW.hydroxide+o.pool.sodiumAcetate*MW.sodiumAcetate+o.pool.soap*(mwFame(o)-14.027-1.008+22.98976928);
  return {mass,cores,bound,oh,acetate,distribution,octa,ds:cores?bound/cores:0,totalEsterDS:cores?8-oh/cores:0,residualAcetate:cores?100*acetate/(8*cores):100,
    octaMolePct:cores?100*octa/cores:0,targetMass,totalSucroseMass,octaFamilyPurity:mass?100*targetMass/mass:0,allTargetMoleculeFraction:o.lots.fame.composition[0]**8,chemicalPurity:mass?100*octa*o.lots.fame.composition[0]**8*MW.product/mass:0,fameWt:mass?100*o.pool.fame*mwFame(o)/mass:0,waterWt:mass?100*o.pool.water*MW.water/mass:0,inorganicWt:mass?100*inorganic/mass:0,
    degradedWt:mass?100*o.pool.degraded/mass:0,fattyPurity:100*o.lots.fame.composition[0],theoretical:o.initialCore*MW.product,
    yieldPct:o.initialCore?100*targetMass/(o.initialCore*MW.product):0,grossYieldPct:o.initialCore?100*mass/(o.initialCore*MW.product):0,
    balanceError:o.inputMass-mass-o.trap.mass-o.escapedMass-o.wasteMass-o.aliquotMass,baseEquivalents:o.pool.methoxide+o.pool.hydroxide,
    activity:o.catalystCharge?o.pool.methoxide/o.catalystCharge/(1+o.pool.methanol/Math.max(o.initialCore,1e-12)):0,
    phase:o.temperature<55?'Viscous suspension (assumed)':o.temperature<85?'Partially dissolved mixture (assumed)':'Mixed melt (assumed)',viscosity:Math.exp(8.5-.045*o.temperature)*(1+(cores?octa/cores:0))};
}
function deactivate(o) {
  const p=o.pool;
  let n=Math.min(p.methoxide,p.water);p.methoxide-=n;p.water-=n;p.hydroxide+=n;p.methanol+=n;
  for(const acid of ['ffa','acid'])for(const base of ['methoxide','hydroxide']){
    n=Math.min(p[acid],p[base]);p[acid]-=n;p[base]-=n;p[acid==='ffa'?'soap':'sodiumAcetate']+=n;p[base==='methoxide'?'methanol':'water']+=n;
  }
}
function removeFraction(o,fraction,destination) {
  const before=poolMass(o);for(const s of o.distribution)s.n*=1-fraction;for(const k of Object.keys(o.pool))o.pool[k]*=1-fraction;
  o[destination]+=before-poolMass(o);
}
function evaporate(o,dt) {
  const factor=Math.max(0,(o.temperature-20)/60)*(o.apparatus.vacuum?Math.min(15,5/Math.sqrt(o.pressure)):0.01);
  for(const [key,rate,mm] of [['methylAcetate',18,MW.methylAcetate],['methanol',12,MW.methanol],['water',6,MW.water],['solvent',9,1]]){
    const removed=o.pool[key]*(1-Math.exp(-rate*factor*dt));o.pool[key]-=removed;
    const captured=removed*(o.apparatus.trap?o.parameters.trapEfficiency:0);o.trap[key]+=captured;o.trap.mass+=captured*mm;o.escapedMass+=(removed-captured)*mm;
  }
}
function tick(o,dt) {
  const p=o.pool,par=o.parameters;
  if(!o.apparatus.nitrogen){const ingress=.0005*dt;p.water+=ingress/MW.water;o.inputMass+=ingress;}
  deactivate(o);
  const tempFactor=Math.exp(45000/8.314*(1/383.15-1/(o.temperature+273.15)));
  const core=o.initialCore||1e-12,activity=organicMetrics(o).activity;
  const forward=par.exchangeRate*tempFactor*activity*(o.apparatus.stir?1:.025)*Math.min(1,p.fame/(core*.25));
  const reverse=par.reverseRate*tempFactor*activity*p.methylAcetate/(core*8);
  const hydro=par.hydrolysisRate*(1+p.hydroxide/core)*p.water/core*tempFactor;
  const degradation=par.degradationRate*Math.exp((o.temperature-110)/13)*(o.apparatus.nitrogen?1:4);
  const delta=o.distribution.map(()=>0), index=(j,k)=>o.distribution.findIndex(s=>s.j===j&&s.k===k);
  for(let i=0;i<o.distribution.length;i++){
    const s=o.distribution[i];if(!s.n)continue;
    const a=8-s.j-s.k, rates=[forward*a,reverse*s.j,hydro*a,hydro*s.j,degradation],total=sum(rates);
    if(!total)continue;
    const extent=s.n*(1-Math.exp(-total*dt));
    for(let r=0;r<5;r++){
      let n=extent*rates[r]/total;if(!n)continue;
      if(r===0){n=Math.min(n,p.fame);p.fame-=n;p.methylAcetate+=n;o.generatedAcetate+=n;delta[index(s.j+1,s.k)]+=n;}
      if(r===1){n=Math.min(n,p.methylAcetate);p.methylAcetate-=n;p.fame+=n;o.generatedAcetate-=n;delta[index(s.j-1,s.k)]+=n;}
      if(r===2){n=Math.min(n,p.water);p.water-=n;p.acid+=n;delta[index(s.j,s.k+1)]+=n;}
      if(r===3){n=Math.min(n,p.water);p.water-=n;p.ffa+=n;delta[index(s.j-1,s.k+1)]+=n;}
      if(r===4)p.degraded+=n*stateMolarMass(o,s.j,s.k);
      delta[i]-=n;
    }
  }
  o.distribution.forEach((s,i)=>s.n=Math.max(0,s.n+delta[i]));deactivate(o);evaporate(o,dt);
}
function point(o) {const m=organicMetrics(o);return {time:o.time,temperature:o.temperature,pressure:o.pressure,indicatedPressure:o.pressure*(o.apparatus.calibrated?1:1.1),pressureUncertainty:.02+.02*o.pressure,ds:m.ds,octa:m.octaMolePct,acetate:m.residualAcetate,generated:o.generatedAcetate*MW.methylAcetate,collected:o.trap.methylAcetate*MW.methylAcetate,degraded:m.degradedWt,mass:m.mass};}
function record(o,text) {o.operations.push({time:o.time,text,results:point(o),apparatus:copy(o.apparatus),ventilationOn:o.ventilationOn===true});o.operations=o.operations.slice(-500);}
function requireUncharged(o) {if(Object.values(o.charged).some(Boolean))throw Error('Start a new run to change starting lots or model assumptions.');}
export function operateOrganic(original,action,args={},context={}) {
  const o=copy(original), p=o.pool;let message='';
  o.ventilationOn=context.ventilationOn===true;
  if(action==='lots'){
    requireUncharged(o);const purity=bounded(args.purity,0,100,'FAME isomer mole-%')/100;
    o.lots.fame.composition=[purity,...Array(8).fill((1-purity)/8)];
    for(const id of ['soa','fame']){
      const mass=bounded(args[`${id}Mass`],.1,20,'Starting mass (g)'),water=bounded(args[`${id}Water`],0,5,'Water wt-%');
      o.lots[id]={...o.lots[id],mass,water:mass*water/100,methanol:id==='fame'?mass*bounded(args.methanol,0,5,'Methanol wt-%')/100:0,ffa:id==='fame'?mass*bounded(args.ffa,0,5,'Free acid wt-%')/100:0};
    }
    o.lotRevision++;o.feedGC=null;o.kf={};message='Starting lots updated. Repeat GC and Karl Fischer before qualifying the feed.';
  }else if(action==='parameters'){
    requireUncharged(o);for(const [id,[label,min,max]] of Object.entries(PARAMETER_INFO))if(args[id]!==undefined)o.parameters[id]=bounded(args[id],min,max,label);
    o.lotRevision++;o.feedGC=null;o.kf={};message='Unvalidated teaching assumptions updated and recorded; analytical qualifications invalidated.';
  }else if(action==='feed-gc'){
    o.feedGC={...gcAnalysis(o,o.lots.fame.composition,()=>organicRandom(o),args.resolved!==false),revision:o.lotRevision};message=o.feedGC.resolved?`Feed GC: ${o.feedGC.purity.toFixed(3)} ± ${o.feedGC.uncertainty.toFixed(3)} mole-% desired isomer. ${o.feedGC.purity-o.feedGC.uncertainty>=99.5?'Qualified':'Not qualified'} at the conservative lower bound.`:'GC peaks coelute: branching-position purity cannot be quantified or qualified.';
  }else if(action==='purify-feed'){
    requireUncharged(o);const recovery=bounded(args.recovery,.1,1,'Desired-isomer recovery'),carryover=bounded(args.carryover,0,1,'Impurity carryover');
    const lot=o.lots.fame,oldMass=lot.mass,oldMM=mwFame(o),organic=oldMass-lot.water-lot.methanol-lot.ffa;
    const amounts=lot.composition.map((x,i)=>x*(i===0?recovery:carryover));const fraction=sum(amounts);if(!fraction)throw Error('No ester would be recovered.');
    lot.composition=amounts.map(x=>x/fraction);lot.mass=organic*fraction*mwFame(o)/oldMM+lot.water+lot.methanol+lot.ffa;
    o.lotRevision++;o.feedGC=null;o.kf={};record(o,`Feed separation assumption: desired recovery ${recovery}, impurity carryover ${carryover}. Removed ${(oldMass-lot.mass).toFixed(5)} g; real isomer separation is unvalidated.`);
    message='Feed separated with specified recoveries. Re-run GC; selective isomer recovery is an assumption, not a proven method.';
  }else if(action==='dry-lots'){
    requireUncharged(o);const minutes=bounded(args.minutes,1,240,'Drying duration (min)'),before=copy(o.lots);
    for(const lot of Object.values(o.lots)){const water=lot.water*(1-Math.exp(-minutes/18)),methanol=lot.methanol*(1-Math.exp(-minutes/9));lot.water-=water;lot.methanol-=methanol;lot.mass-=water+methanol;}
    o.time+=minutes;o.lotRevision++;o.feedGC=null;o.kf={};o.drying.push({method:'Hypothetical separate vacuum drying; assumed rate constants',minutes,before,after:copy(o.lots)});
    message='Separate lots dried with recorded moisture and mass losses. Verify both with Karl Fischer and recheck GC.';
  }else if(action==='kf-lots'){
    for(const [id,lot] of Object.entries(o.lots))o.kf[id]={water:Math.max(0,100*lot.water/lot.mass+(organicRandom(o)-.5)*o.parameters.waterUncertainty),uncertainty:o.parameters.waterUncertainty,revision:o.lotRevision};
    message='Karl Fischer measurements recorded for both lots; results include expanded uncertainty.';
  }else if(action==='apparatus'){
    for(const id of Object.keys(o.apparatus)){if(typeof args[id]!=='boolean')throw Error('Choose each apparatus setting.');o.apparatus[id]=args[id];}
    message='Reactor, stirring, nitrogen, vacuum, trap and pressure-calibration settings recorded.';
  }else if(action==='charge-fame'||action==='charge-soa'){
    const id=action==='charge-fame'?'fame':'soa';if(o.charged[id])throw Error('This lot is already charged. Start another run for a new batch.');
    if(!o.feedGC?.resolved||o.feedGC.revision!==o.lotRevision||o.feedGC.purity-o.feedGC.uncertainty<99.5)throw Error('High-purity feed gate: run resolved GC and obtain a lower uncertainty bound ≥99.5 mole-%. Purify the feed if needed.');
    for(const key of ['soa','fame']){const reading=o.kf[key];if(!reading||reading.revision!==o.lotRevision||reading.water+reading.uncertainty>=(key==='soa'?.05:.03))throw Error('Dry and measure both lots: upper KF bounds must be <0.05 wt-% (sucrose) and <0.03 wt-% (FAME).');}
    if(!o.apparatus.dry)throw Error('Prepare a dry reactor before charging.');
    if(id==='soa'&&(!o.charged.fame||o.conditionMinutes<30))throw Error('Charge and condition the methyl ester for 30 simulated minutes first.');
    const lot=o.lots[id],solute=lot.mass-lot.water-lot.methanol-lot.ffa;o.inputMass+=lot.mass;p.water+=lot.water/MW.water;p.methanol+=lot.methanol/MW.methanol;p.ffa+=lot.ffa/(mwFame(o)-14.027);
    if(id==='fame')p.fame+=solute/mwFame(o);else{o.initialCore=solute/MW.soa;o.distribution.find(s=>!s.j&&!s.k).n=o.initialCore;}
    o.charged[id]=true;o.revision++;o.stage='Charge & condition';message=`Charged ${lot.mass.toFixed(5)} g of qualified ${id==='fame'?'methyl ester':'sucrose octaacetate'} lot, including measured contaminants.`;
  }else if(action==='catalyst'){
    if(!o.charged.soa||o.blendMinutes<30||o.charged.catalyst)throw Error('Blend both substrates for 30 minutes before the single catalyst charge.');
    const mass=bounded(args.mass,.001,1,'Sodium methoxide mass (g)');o.catalystCharge=mass/MW.methoxide;p.methoxide+=o.catalystCharge;o.inputMass+=mass;o.charged.catalyst=true;deactivate(o);o.revision++;o.stage='Reaction & endpoint';
    message=`Catalyst added: ${mass.toFixed(4)} g. Effective methoxide ${(p.methoxide*1000).toFixed(3)} mmol; hydroxide ${(p.hydroxide*1000).toFixed(3)} mmol remains basic. Methanol inhibits the exchange model; it is not counted as a neutralizing acid.`;
  }else if(action==='advance'){
    if(!o.charged.fame)throw Error('Charge the methyl ester first.');
    const minutes=bounded(args.minutes,1,360,'Elapsed time (min)'),temperature=bounded(args.temperature,20,160,'Reactor setpoint (°C)'),pressure=bounded(args.pressure,.1,1013,'Pressure setpoint (mbar)');
    o.targetTemperature=temperature;o.targetPressure=pressure;
    if(args.abrupt&&o.apparatus.vacuum&&o.pressure/pressure>50&&o.temperature>40){const mass=poolMass(o);removeFraction(o,.08,'wasteMass');o.deviations.push(`Abrupt vacuum step: foaming/entrainment scenario lost ${(mass-poolMass(o)).toFixed(4)} g.`);o.pressure=pressure;}
    const steps=Math.ceil(minutes*2),dt=minutes/steps/60;
    for(let i=0;i<steps;i++){
      o.temperature+=clamp(temperature-o.temperature,-2*dt*60,2*dt*60);
      o.pressure=o.apparatus.vacuum?Math.exp(Math.log(o.pressure)+clamp(Math.log(pressure/o.pressure),-.2*dt*60,.2*dt*60)):1013;
      tick(o,dt);o.time+=dt*60;
      if(!o.charged.soa&&o.temperature>=45&&o.apparatus.stir&&o.pressure<200)o.conditionMinutes+=dt*60;
      if(o.charged.soa&&!o.charged.catalyst&&o.temperature>=45&&o.apparatus.stir)o.blendMinutes+=dt*60;
      if(i%10===0||i===steps-1)o.profile.push(point(o));
    }
    o.profile=o.profile.slice(-3000);o.revision++;
    const m=organicMetrics(o);message=`Advanced ${minutes} min: ${o.temperature.toFixed(1)} °C, ${o.pressure.toFixed(2)} mbar, fatty DS ${m.ds.toFixed(3)}/8, octa-fatty fraction ${m.octaMolePct.toFixed(2)} mol-% of surviving sucrose species. ${context.ventilationOn?'':'Local exhaust is OFF.'}`;
    if(m.degradedWt>.5&&!o.deviations.includes('Degradation exceeds 0.5 wt-% in the assumed model.'))o.deviations.push('Degradation exceeds 0.5 wt-% in the assumed model.');
  }else if(action==='neutralize'){
    if(!o.charged.catalyst||o.neutralized)throw Error('Neutralize a catalyzed batch once.');
    if(o.temperature>40||o.pressure<900)throw Error('Cool to ≤40 °C and gradually return to ≥900 mbar under nitrogen before work-up.');
    const eq=p.methoxide+p.hydroxide;p.acid+=eq;o.inputMass+=eq*MW.acid;deactivate(o);o.neutralized=true;o.crudeMass=poolMass(o);o.revision++;o.stage='Work-up & isolation';
    message=`Added exactly ${(eq*1000).toFixed(4)} mmol (${(eq*MW.acid).toFixed(5)} g) acetic acid for remaining methoxide/hydroxide; sodium salts, methanol and water remain for removal.`;
  }else if(action==='separate'){
    if(!o.neutralized||o.temperature>40)throw Error('Cool and neutralize before separation.');
    const solvent=bounded(args.solvent,1,100,'Solvent mass (g)');p.solvent+=solvent;o.inputMass+=solvent;
    const before=poolMass(o),par=o.parameters;
    for(const s of o.distribution)s.n*=s.j===8&&s.k===0?par.productRecovery:par.intermediateRecovery;
    p.fame*=par.fameCarryover;for(const key of ['methoxide','hydroxide','sodiumAcetate','soap'])p[key]*=par.saltCarryover;
    p.ffa*=.2;p.acid*=.1;p.degraded*=.4;
    const after=poolMass(o);o.wasteMass+=before-after;o.purifications.push({time:o.time,before,after,solvent,productRecovery:par.productRecovery,fameCarryover:par.fameCarryover,saltCarryover:par.saltCarryover});o.revision++;
    message=`Scenario chromatographic fraction collected; ${(before-after).toFixed(4)} g to separated waste. Selectivity/recovery is assumed and must be established experimentally. Solvent still needs evaporation.`;
  }else if(action==='dry-product'){
    if(!o.neutralized||!o.purifications.length)throw Error('Neutralize and separate before final drying.');
    const minutes=bounded(args.minutes,1,240,'Drying time (min)'),before=poolMass(o);if(!o.apparatus.vacuum||!o.apparatus.trap)throw Error('Connect vacuum and the cold trap for final drying.');
    for(let i=0;i<minutes;i++){o.temperature+=clamp(45-o.temperature,-2,2);o.pressure=Math.exp(Math.log(o.pressure)+clamp(Math.log(1/o.pressure),-.2,.2));tick(o,1/60);o.time++;}
    o.revision++;o.dryMasses.push({time:o.time,minutes,before,mass:poolMass(o),water:organicMetrics(o).waterWt,temperature:o.temperature,pressure:o.pressure});o.stage='Independent quality checks';message=`Drying recorded: ${before.toFixed(5)} → ${poolMass(o).toFixed(5)} g. Repeat to test constant mass, then run final QC.`;
  }else if(['sample','qc'].includes(action)){
    if(!o.charged.soa)throw Error('Charge a sucrose-containing sample first.');if(action==='qc'&&!o.neutralized)throw Error('Neutralize before final product QC.');
    const aliquot=bounded(args.aliquot??.005,.001,.05,'Analytical aliquot (g)'),m=organicMetrics(o);if(m.mass<aliquot*2)throw Error('Insufficient material for a representative aliquot.');
    const reading=sampleAnalysis(o,m,()=>organicRandom(o));reading.revision=o.revision;reading.final=action==='qc';reading.aliquot=aliquot;
    removeFraction(o,aliquot/m.mass,'aliquotMass'); // A representative sample preserves concentrations; measurement remains current.
    o.samples.push(reading);o.samples=o.samples.slice(-100);message=`${action==='qc'?'Final QC suite':'Reaction sample'} recorded with ${aliquot.toFixed(3)} g removed. Instrument estimates and uncertainty are stored, not regenerated on display.`;
  }else if(action==='materials'){
    if(!o.samples.some(s=>s.final&&s.revision===o.revision))throw Error('Obtain current final QC before characterizing the isolated material.');
    o.materials={...materialAnalysis(o,organicMetrics(o),()=>organicRandom(o)),revision:o.revision};o.stage='Materials & controls';message='Synthetic DSC/TGA, wetting, morphology, coating retention and environmental sensitivity data recorded. Property assumptions are not experimental discoveries.';
  }else if(action==='friction'){
    if(!o.materials||o.materials.revision!==o.revision)throw Error('Run current material characterization first.');
    o.friction={...frictionAnalysis(o,args,()=>organicRandom(o)),revision:o.revision};message='All six controls tested under matched conditions with independent coupon replicates. Statistical conclusions apply only to the synthetic scenario.';
  }else throw Error('Unknown organic laboratory operation.');
  record(o,message);return {state:o,message};
}
export const organicReport=o=>reportText(o,organicMetrics(o),finalDecision(o));
function validOrganicData(o) {
  if(!o||o.version!==1||!Number.isInteger(o.seed)||o.seed<0||o.seed>4294967295)return false;
  const walk=(v,depth=0)=>depth<20&&(typeof v==='number'?Number.isFinite(v):Array.isArray(v)?v.length<=5000&&v.every(x=>walk(x,depth+1)):v&&typeof v==='object'?Object.values(v).every(x=>walk(x,depth+1)):v===null||['string','boolean'].includes(typeof v));
  if(!walk(o))return false;
  const template=createOrganic(1);
  for(const key of ['pool','trap','lots','charged','apparatus','parameters','kf'])if(!o[key]||typeof o[key]!=='object')return false;
  for(const key of ['time','revision','lotRevision','temperature','pressure','inputMass','wasteMass','escapedMass','aliquotMass','initialCore','catalystCharge','conditionMinutes','blendMinutes'])if(typeof o[key]!=='number'||o[key]<0)return false;
  if(o.temperature>200||o.pressure<.01||o.pressure>1100)return false;
  if(!Object.keys(template.pool).every(k=>typeof o.pool[k]==='number'&&o.pool[k]>=0))return false;
  if(!Object.keys(template.trap).every(k=>typeof o.trap[k]==='number'&&o.trap[k]>=0))return false;
  if(!Object.keys(template.apparatus).every(k=>typeof o.apparatus[k]==='boolean')||!Object.keys(template.charged).every(k=>typeof o.charged[k]==='boolean'))return false;
  for(const [k,[,min,max]] of Object.entries(PARAMETER_INFO))if(typeof o.parameters[k]!=='number'||o.parameters[k]<min||o.parameters[k]>max)return false;
  for(const id of ['soa','fame'])if(!o.lots[id]||!['mass','water','methanol','ffa'].every(k=>typeof o.lots[id][k]==='number'&&o.lots[id][k]>=0))return false;
  if(Object.values(o.lots).some(l=>l.mass<=0||l.water+l.methanol+l.ffa>=l.mass))return false;
  if(!Array.isArray(o.lots.fame.composition)||o.lots.fame.composition.length!==FAMES.length||o.lots.fame.composition.some(x=>typeof x!=='number'||x<0)||Math.abs(sum(o.lots.fame.composition)-1)>1e-8)return false;
  if(!Array.isArray(o.distribution)||o.distribution.length!==45||!o.distribution.every((s,i)=>s.j===template.distribution[i].j&&s.k===template.distribution[i].k&&typeof s.n==='number'&&s.n>=0))return false;
  if(!['profile','samples','analyses','operations','deviations','purifications','dryMasses','drying'].every(k=>Array.isArray(o[k])))return false;
  const numeric=(v,keys)=>v&&keys.every(k=>typeof v[k]==='number'&&Number.isFinite(v[k]));
  const gc=g=>g&&typeof g.resolved==='boolean'&&numeric(g,['uncertainty'])&&(g.purity===null||typeof g.purity==='number')&&Array.isArray(g.rows)&&g.rows.length===FAMES.length&&g.rows.every(r=>typeof r.name==='string'&&numeric(r,['rt','responseFactor','area','molePct'])&&Array.isArray(r.spectrum));
  if(o.feedGC!==null&&!gc(o.feedGC))return false;
  if(!o.profile.every(p=>numeric(p,['time','temperature','pressure','ds','generated','collected'])))return false;
  if(!o.operations.every(r=>typeof r.text==='string'&&numeric(r,['time'])&&numeric(r.results,['mass','ds','temperature','pressure'])))return false;
  for(const s of o.samples){
    if(!numeric(s,['revision','time'])||typeof s.final!=='boolean'||!gc(s.gc)||!numeric(s.nmr,['ds','uncertainty','residualAcetate','acetateUncertainty'])||!Array.isArray(s.nmr.proton)||!Array.isArray(s.nmr.carbon)||!numeric(s.hplc,['ds','dsUncertainty','octaArea','uncertainty'])||!Array.isArray(s.hplc.rows)||!Array.isArray(s.ms)||!numeric(s.metrics,['octaMolePct','degradedWt']))return false;
    if(!['water','residualFame','inorganic'].every(k=>numeric(s[k],['value','uncertainty'])))return false;
    if(!s.ms.every(p=>p.formula&&numeric(p,['fatty','hydroxyl','neutralExact','protonated','sodiumAdduct'])))return false;
  }
  if(o.materials&&(!Array.isArray(o.materials.dsc)||!o.materials.wetting||!Array.isArray(o.materials.coatings)||!o.materials.morphology||!o.materials.environment||!Array.isArray(o.materials.environment.hydrolysis)))return false;
  if(o.friction&&(!Array.isArray(o.friction.rows)||!Array.isArray(o.friction.comparisons)||!o.friction.rows.every(r=>Array.isArray(r.coupons)&&r.coupons.every(c=>Array.isArray(c.curve)&&Array.isArray(c.cycles)))))return false;
  return Math.abs(organicMetrics(o).balanceError)<1e-5;
}
export function validOrganic(o) {try{return validOrganicData(o);}catch{return false;}}

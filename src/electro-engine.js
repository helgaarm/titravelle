import { EC, IONS, ELECTRODE, ELECTROLYTES, STANDARD_WIRES, TERMINALS, PREDICTIONS } from './electro-data.js';
import { emptyIons, metalMass, electroPreview, compartments, gasVolume, clamp, pressureBar } from './electro-model.js';
const copy=x=>structuredClone(x);
const bound=(v,min,max,label)=>{if(!Number.isFinite(v)||v<min||v>max)throw Error(`${label}: enter ${min}–${max}.`);return v;};
const freshElectrode=material=>({material,initialMass:5,baseRemaining:5,deposits:{},lost:{}});
export function createElectro(seed=38) {
  return {version:1,seed:seed>>>0,time:0,volume:0,temperature:25,power:false,charge:0,energy:0,
    config:{mode:'cv',voltage:3,current:.1,limit:.5,load:20,leftArea:10,rightArea:10,spacing:2,separator:'none',membraneResistance:2,stirring:true,heating:false,plateTemperature:25,
      kineticScale:1,diffusion:7e-6,diffusionLayer:.02,collection:.96,sealed:false,headspace:50,sampleInterval:1},
    electrodes:{left:freshElectrode('platinum'),right:freshElectrode('platinum')},ions:{left:emptyIons(),right:emptyIons()},
    wires:[],gases:{H2:0,O2:0,Cl2:0},collected:{H2:0,O2:0,Cl2:0},reactionCharge:{},initialMetals:emptyIons(),
    predictions:Object.fromEntries(PREDICTIONS.map(([id])=>[id,''])),predictionHistory:[],stock:[],records:[],operations:[],baseline:null,advanced:null,stopReason:''};
}
function random(e){e.seed=(1664525*e.seed+1013904223)>>>0;return e.seed/4294967296-.5;}
function electrodeInventory(e,id){return Object.values(e.electrodes).reduce((n,x)=>n+(ELECTRODE[x.material].ion===id?x.baseRemaining/IONS[id].mm:0)+(x.deposits[id]||0),0);}
export function metalInventory(e){return Object.fromEntries(Object.entries(IONS).filter(([,d])=>d.mm).map(([id])=>[id,e.ions.left[id]+e.ions.right[id]+electrodeInventory(e,id)]));}
function captureInitial(e){e.initialMetals={...emptyIons(),...metalInventory(e)};e.baseline=null;}
function requireIdle(e){if(e.power)throw Error('Switch the cell power off before changing the cell or wires.');}
function requireFresh(e){requireIdle(e);if(e.charge>1e-10||e.time>0)throw Error('Start a new cell trial before replacing its electrolyte or electrodes. Save a notebook snapshot first if needed.');}
export function electroPreset(name='water',seed=38) {
  let e=createElectro(seed);e.volume=200;
  const stock=name==='water'?'sodium-sulfate':'copper';
  const material=name==='copper'?'copper':'platinum';e.electrodes.left=freshElectrode(material);e.electrodes.right=freshElectrode(name==='water'?'platinum':'copper');
  e=operateElectro(e,'add-solute',{stock,concentration:.1}).state;
  e.config.voltage=name==='copper'?1:3;e.stock[0].source='Guided experiment starting stock';return e;
}
export function importVessel(e,v,mL) {
  requireFresh(e);bound(mL,.1,v.volume,'Aliquot volume (mL)');
  if(!v.mixed||v.dry)throw Error('Mix a liquid vessel before transferring an aliquot to the cell.');
  if(Object.values(v.materials||{}).some(p=>p.mass>1e-12))throw Error('Dissolution/speciation of these weighed materials is unresolved. Prepare a supported cell electrolyte with the shared stock controls.');
  if((v.totals.Ac||0)>1e-12||(v.totals.C||0)>1e-12||Object.keys(v.indicators).length)throw Error('Organic/indicator/carbonate electrode reactions are not supported; this sample cannot be assigned quantitative electrolysis results.');
  if(e.volume+mL>1000)throw Error('Cell capacity is 1000 mL.');
  const result=copy(e),source=copy(v),fraction=mL/v.volume;
  for(const id of Object.keys(IONS)){const mol=(source.totals[id]||0)*fraction;if(id in source.totals)source.totals[id]-=mol;
    if(result.config.separator==='none')result.ions.left[id]+=mol;else{result.ions.left[id]+=mol/2;result.ions.right[id]+=mol/2;}}
  source.volume-=mL;source.mass*=1-fraction;source.waterMass*=1-fraction;source.stock=null;
  source.reactionHistory=[];source.reactionHistoryComplete=false;
  result.temperature=(result.temperature*result.volume+v.temperature*mL)/(result.volume+mL);result.volume+=mL;
  result.stock.push({source:`Aliquot from ${v.id}`,volume:mL,ions:Object.fromEntries(Object.keys(IONS).map(id=>[id,(v.totals[id]||0)*fraction]))});captureInitial(result);
  return {state:result,vessel:source,message:`Transferred ${mL} mL from ${v.id} into the electrochemistry cell. Analytical totals retained; electrode speciation uses the stated electrochemistry model.`};
}
function moveIons(e,p,dt){
  if(e.config.separator==='none'||p.current===0)return;
  const a=e.ions[p.wiring.anode],c=e.ions[p.wiring.cathode],eq=p.current*dt/EC.F,options=[];
  for(const [id,d] of Object.entries(IONS)){
    if(e.config.separator==='cation'&&d.z<0||e.config.separator==='anion'&&d.z>0)continue;
    const source=d.z>0?a:c,target=d.z>0?c:a;
    if(source[id]>0)options.push({id,z:Math.abs(d.z),source,target,weight:source[id]*d.lambda});
  }
  let remaining=eq;
  for(let pass=0;pass<3&&remaining>1e-15;pass++){
    const active=options.filter(x=>x.source[x.id]>1e-15),weight=active.reduce((n,x)=>n+x.weight,0);if(!weight)break;
    const requested=remaining;
    for(const x of active){const n=Math.min(x.source[x.id],requested*x.weight/weight/x.z);x.source[x.id]-=n;x.target[x.id]+=n;remaining-=n*x.z;}
  }
  if(remaining>eq*.01){e.power=false;e.stopReason='Supporting-ion transport depleted. Current stopped; proton/water transport through this separator is not modeled.';}
}
function consumeElectrode(electrode,id,moles){
  const coat=Math.min(electrode.deposits[id]||0,moles);electrode.deposits[id]=(electrode.deposits[id]||0)-coat;
  const base=moles-coat;electrode.baseRemaining=Math.max(0,electrode.baseRemaining-base*IONS[id].mm);electrode.lost[id]=(electrode.lost[id]||0)+moles;
}
function tick(e,p,dt){
  const pool=side=>e.ions[e.config.separator==='none'?'left':side];
  for(const [oxidation,side,rows] of [[true,p.wiring.anode,p.anode.reactions],[false,p.wiring.cathode,p.cathode.reactions]]){
    // Normalize solver roundoff so both electrodes receive precisely the integrated charge.
    const total=rows.reduce((n,r)=>n+r.current,0);
    for(const r of rows){const q=total?p.current*dt*r.current/total:0,mol=q/(r.n*EC.F);if(!q)continue;
      const key=`${side}:${oxidation?'oxidation':'reduction'}:${r.id}`;e.reactionCharge[key]=(e.reactionCharge[key]||0)+q;
      if(IONS[r.id]?.mm){if(oxidation){consumeElectrode(e.electrodes[side],r.id,mol);pool(side)[r.id]+=mol;}else{pool(side)[r.id]=Math.max(0,pool(side)[r.id]-mol);e.electrodes[side].deposits[r.id]=(e.electrodes[side].deposits[r.id]||0)+mol;}}
      else {const gas={hydrogen:'H2',oxygen:'O2',chlorine:'Cl2'}[r.id];e.gases[gas]+=mol;e.collected[gas]+=mol*e.config.collection;if(gas==='Cl2')pool(side).Cl=Math.max(0,pool(side).Cl-2*mol);}
    }
  }
  moveIons(e,p,dt);e.charge+=p.current*dt;e.energy+=Math.abs(p.current*p.voltage)*dt;
  const loss=p.current*(p.ohmic+Math.max(0,p.overpotential)),roomLoss=.12*(e.temperature-25),heater=e.config.heating?clamp(2*(e.config.plateTemperature-e.temperature),-30,30):0;
  e.temperature+=dt*(loss-roomLoss+heater)/(Math.max(1,e.volume)*4.184+40);e.time+=dt;
  if(e.temperature>=80||pressureBar(e)>=2){e.power=false;e.stopReason=e.temperature>=80?'Temperature protection: 80 °C. Boiling/aerosol chemistry is outside this model.':'Pressure protection: 2 bar absolute. The virtual sealed-cell run has stopped.';}
}
export function recordElectro(e,ideal=false){
  const p=electroPreview(e),s=p.solutions,noise=(scale)=>ideal?0:random(e)*2*scale;
  const measured={leftMass:metalMass(e.electrodes.left)+noise(.001),rightMass:metalMass(e.electrodes.right)+noise(.001)};
  if(!e.baseline)e.baseline={...measured};
  const row={time:e.time,voltage:p.voltage,current:p.current,charge:e.charge,energy:e.energy,temperature:e.temperature,
    leftPH:s.left.pH,rightPH:s.right.pH,conductivity:(s.left.conductivity+s.right.conductivity)/2,leftMass:metalMass(e.electrodes.left),rightMass:metalMass(e.electrodes.right),
    hydrogen:gasVolume(e.gases.H2,e.temperature),oxygen:gasVolume(e.gases.O2,e.temperature),chlorine:gasVolume(e.gases.Cl2,e.temperature),
    concentrations:{left:{...s.left.free},right:{...s.right.free}},partial:{anode:p.anode.reactions.map(r=>({id:r.id,current:r.current})),cathode:p.cathode.reactions.map(r=>({id:r.id,current:r.current}))},
    measured:{...measured,voltage:p.wiring.meterSign?p.voltage*p.wiring.meterSign+noise(.01):null,ammeter:p.wiring.ammeter?p.current+noise(.001):null,current:Math.max(0,p.current+noise(.001)),temperature:e.temperature+noise(.2),leftPH:s.left.pH+noise(.02),rightPH:s.right.pH+noise(.02),conductivity:Math.max(0,(s.left.conductivity+s.right.conductivity)/2*(1+noise(.02))),
      hydrogen:Math.max(0,gasVolume(e.collected.H2,e.temperature)+noise(.02)),oxygen:Math.max(0,gasVolume(e.collected.O2,e.temperature)+noise(.02)),chlorine:Math.max(0,gasVolume(e.collected.Cl2,e.temperature)+noise(.02))}};
  e.records.push(row);if(e.records.length>7200)e.records.shift();return row;
}
export function operateElectro(original,action,args={},context={}) {
  const e=copy(original);let message='Electrochemistry settings recorded.';
  if(action==='supply'){
    const ranges={voltage:[0,30],current:[0,5],limit:[0,5],load:[.1,10000],sampleInterval:[1,60]};
    for(const key of Object.keys(args))if(key!=='mode'&&!(key in ranges))throw Error('Only electrical supply settings can be changed during a run.');
    for(const [key,[min,max]] of Object.entries(ranges))if(key in args)e.config[key]=bound(args[key],min,max,key);
    if('mode' in args){if(!['cv','cc','galvanic'].includes(args.mode))throw Error('Choose CV, CC or galvanic mode.');e.config.mode=args.mode;}
    if(!Number.isInteger(e.config.sampleInterval))throw Error('Use a whole-number sampling interval.');
    message=`Supply set to ${e.config.voltage} V with a ${e.config.limit} A current limit. Output ${e.power?'ON':'OFF'}; elapsed time and recorded charge are unchanged.`;
  }else if(action==='configure'){
    requireIdle(e);
    const ranges={voltage:[0,30],current:[0,5],limit:[0,5],load:[.1,10000],leftArea:[.1,100],rightArea:[.1,100],spacing:[.1,20],membraneResistance:[0,500],plateTemperature:[20,80],kineticScale:[.001,1000],diffusion:[1e-7,1e-4],diffusionLayer:[.001,.2],collection:[0,1],headspace:[1,1000],sampleInterval:[1,60]};
    for(const [key,[min,max]] of Object.entries(ranges))if(key in args)e.config[key]=bound(args[key],min,max,key);
    for(const key of ['stirring','heating','sealed'])if(key in args){if(typeof args[key]!=='boolean')throw Error(`Choose ${key}.`);e.config[key]=args[key];}
    if(args.mode){if(!['cv','cc','galvanic'].includes(args.mode))throw Error('Choose CV, CC or galvanic mode.');e.config.mode=args.mode;}
    if(args.separator&&args.separator!==e.config.separator){requireFresh(e);if(!['none','porous','bridge','cation','anion'].includes(args.separator))throw Error('Choose a supported separator.');
      const total=Object.fromEntries(Object.keys(IONS).map(id=>[id,e.ions.left[id]+e.ions.right[id]]));e.config.separator=args.separator;
      for(const id of Object.keys(IONS)){e.ions.left[id]=total[id]*(args.separator==='none'?1:.5);e.ions.right[id]=args.separator==='none'?0:total[id]/2;}}
    if('temperature' in args&&Math.abs(args.temperature-e.temperature)>1e-9){requireFresh(e);e.temperature=bound(args.temperature,5,70,'Initial temperature');}
    if(!Number.isInteger(e.config.sampleInterval))throw Error('Use a whole-number sampling interval.');
    e.stopReason='';
  }else if(action==='electrode'){
    requireFresh(e);if(!['left','right'].includes(args.side)||!ELECTRODE[args.material])throw Error('Choose a side and electrode material.');
    const electrode=freshElectrode(args.material);electrode.initialMass=electrode.baseRemaining=bound(args.mass,.01,100,'Electrode mass (g)');e.electrodes[args.side]=electrode;captureInitial(e);
  }else if(action==='fill'){
    requireFresh(e);if(e.volume>0)throw Error('The cell already contains liquid. Add a solute or start a new cell trial.');
    e.volume=bound(args.volume,10,1000,'Cell volume (mL)');captureInitial(e);message=`Added ${e.volume} mL of distilled water to the cell.`;
  }else if(action==='add-solute'){
    requireFresh(e);if(!e.volume)throw Error('Fill the cell with water or transfer an aliquot first.');
    const stock=ELECTROLYTES.find(s=>s.id===args.stock);if(!stock)throw Error('Choose a supported electrolyte from the shared shelf.');
    const concentration=bound(args.concentration,0,1,'Added analytical concentration (mol/L)'),side=args.side||'both';
    if(!['both','left','right'].includes(side))throw Error('Choose a compartment.');
    const sides=e.config.separator==='none'?['left']:side==='both'?['left','right']:[side];
    for(const half of sides)for(const [id,z] of Object.entries(stock.ions))e.ions[half][id]+=z*concentration*(e.volume/(e.config.separator==='none'?1:2))/1000;
    e.stock.push({id:stock.id,name:stock.name,concentration,side,volume:e.volume,source:'Cell preparation: concentration increment at fixed final volume'});captureInitial(e);message=`Added ${stock.name}; analytical concentration increment ${concentration} mol/L. Final volume held fixed by the preparation model.`;
  }else if(action==='wire'){
    requireIdle(e);const terminals=TERMINALS.map(([id])=>id);if(!terminals.includes(args.from)||!terminals.includes(args.to)||args.from===args.to)throw Error('Choose two different circuit terminals.');
    if(!e.wires.some(([a,b])=>a===args.from&&b===args.to||a===args.to&&b===args.from))e.wires.push([args.from,args.to]);
  }else if(action==='remove-wire'){requireIdle(e);if(!Number.isInteger(args.index)||!e.wires[args.index])throw Error('Choose an existing wire.');e.wires.splice(args.index,1);
  }else if(action==='standard-wires'){requireIdle(e);e.wires=copy(STANDARD_WIRES);
  }else if(action==='predictions'){
    for(const [id] of PREDICTIONS){const value=String(args[id]??'').trim();if(!value||value.length>2000)throw Error('Record all seven predictions, or mark them as uncertain.');e.predictions[id]=value;}
    e.predictionHistory.push({time:e.time,values:copy(e.predictions)});message='Predictions recorded for comparison with the simulated measurements.';
  }else if(action==='power'){
    if(typeof args.enabled!=='boolean')throw Error('Choose power ON or OFF.');
    if(args.enabled&&PREDICTIONS.some(([id])=>!e.predictions[id]))throw Error('Record your predictions first, or explicitly mark them as uncertain.');
    if(args.enabled&&!e.volume)throw Error('Fill the electrolysis cell before applying power.');
    if(args.enabled&&(pressureBar(e)>=2||e.temperature>=80))throw Error('Resolve the pressure or temperature protection condition before re-enabling output.');
    e.power=args.enabled;e.stopReason='';if(e.power&&!e.records.length)recordElectro(e,context.ideal);message=`Cell output ${e.power?'ON':'OFF'}. ${electroPreview(e).wiring.status}.`;
  }else if(action==='advance'){
    const seconds=bound(args.seconds,1,3600,'Advance duration (s)');if(!Number.isInteger(seconds))throw Error('Use whole seconds.');if(!e.volume)throw Error('Fill the cell first.');
    if(!e.records.length)recordElectro(e,context.ideal);
    for(let i=0;i<seconds;i++){const p=electroPreview(e);tick(e,p,1);if(e.time%e.config.sampleInterval===0||i===seconds-1||e.stopReason)recordElectro(e,context.ideal);if(e.stopReason)break;}
    message=`Cell time ${e.time} s; integrated charge ${e.charge.toFixed(4)} C. ${e.stopReason||''}`;
  }else if(action==='measure'){if(!e.volume)throw Error('Fill the cell before measuring.');recordElectro(e,context.ideal);message='Instrument readings stored; reopening the view does not resample them.';
  }else throw Error('Unsupported electrochemistry operation.');
  e.operations.push({time:e.time,action,args:copy(args),ventilationOn:context.ventilationOn===true,message});e.operations=e.operations.slice(-500);return {state:e,message};
}
export function validElectro(e){
  try{
    const finiteTree=value=>typeof value==='number'?Number.isFinite(value):Array.isArray(value)?value.every(finiteTree):value&&typeof value==='object'?Object.values(value).every(finiteTree):true;
    if(!finiteTree(e))return false;
    if(!e||e.version!==1||!Number.isInteger(e.seed)||e.seed<0||e.seed>4294967295||typeof e.power!=='boolean')return false;
    for(const id of ['time','volume','temperature','charge','energy'])if(!Number.isFinite(e[id])||e[id]<0)return false;
    if(e.volume>1000||e.temperature>200||!Array.isArray(e.wires)||e.wires.length>40)return false;
    for(const [a,b] of e.wires)if(a===b||![a,b].every(id=>TERMINALS.some(([v])=>v===id)))return false;
    for(const side of ['left','right']){const x=e.electrodes[side];if(!ELECTRODE[x.material]||!Number.isFinite(x.baseRemaining)||x.baseRemaining<0||!Number.isFinite(x.initialMass)||x.initialMass<=0)return false;
      for(const [id,n] of Object.entries(x.deposits))if(!IONS[id]?.mm||!Number.isFinite(n)||n<0)return false;
      for(const id of Object.keys(IONS))if(!Number.isFinite(e.ions[side][id])||e.ions[side][id]<-1e-12||e.ions[side][id]>100)return false;
    }
    for(const id of ['H2','O2','Cl2'])if(!Number.isFinite(e.gases[id])||e.gases[id]<0||!Number.isFinite(e.collected[id])||e.collected[id]<0||e.collected[id]>e.gases[id]+1e-12)return false;
    if(!['cv','cc','galvanic'].includes(e.config.mode)||!['none','porous','bridge','cation','anion'].includes(e.config.separator))return false;
    for(const id of ['voltage','current','limit','load','leftArea','rightArea','spacing','membraneResistance','plateTemperature','kineticScale','diffusion','diffusionLayer','collection','headspace','sampleInterval'])if(!Number.isFinite(e.config[id]))return false;
    for(const id of ['stirring','heating','sealed'])if(typeof e.config[id]!=='boolean')return false;
    const configured=copy(e);configured.power=false;configured.time=0;configured.charge=0;operateElectro(configured,'configure',{...e.config});
    if(!Array.isArray(e.records)||e.records.length>7200||!e.records.every(r=>Number.isFinite(r.time)&&r.time>=0&&r.time<=e.time&&Number.isFinite(r.charge)&&r.charge>=0&&r.charge<=e.charge+1e-7&&r.measured&&r.concentrations))return false;
    if(!Array.isArray(e.operations)||!Array.isArray(e.stock)||!Array.isArray(e.predictionHistory)||!PREDICTIONS.every(([id])=>typeof e.predictions[id]==='string'))return false;
    for(const [id,n] of Object.entries(metalInventory(e)))if(!Number.isFinite(e.initialMetals[id])||Math.abs(n-e.initialMetals[id])>1e-7)return false;
    for(const [key,q] of Object.entries(e.reactionCharge))if(!/^(left|right):(oxidation|reduction):(hydrogen|oxygen|chlorine|Cu|Zn|Ag|Ni|Fe|Al)$/.test(key)||!Number.isFinite(q)||q<0)return false;
    for(const direction of ['oxidation','reduction']){const sum=Object.entries(e.reactionCharge).filter(([key])=>key.includes(`:${direction}:`)).reduce((n,[,q])=>n+q,0);if(Math.abs(sum-e.charge)>1e-6)return false;}
    return true;
  }catch{return false;}
}

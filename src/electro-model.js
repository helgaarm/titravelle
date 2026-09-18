import { EC, IONS, ELECTRODE } from './electro-data.js';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const emptyIons=()=>Object.fromEntries(Object.keys(IONS).map(id=>[id,0]));
export const metalMass=e=>e.baseRemaining+Object.entries(e.deposits).reduce((s,[id,n])=>s+n*IONS[id].mm,0);
export const gasVolume=(mol,temperature=25,pressure=EC.pressure)=>mol*EC.R*(temperature+273.15)/pressure*1e6;
export const nernst=(E0,n,Q,T=298.15)=>E0-EC.R*T/(n*EC.F)*Math.log(Math.max(1e-30,Q));
export function solution(ions,volume,temperature=25) {
  const L=Math.max(volume/1000,1e-12),totals=Object.fromEntries(Object.entries(ions).map(([id,n])=>[id,n/L]));
  let agcl=0;
  if(totals.Ag&&totals.Cl){const b=totals.Ag+totals.Cl;agcl=Math.max(0,2*(totals.Ag*totals.Cl-1.8e-10)/(b+Math.sqrt((totals.Ag-totals.Cl)**2+4*1.8e-10)));}
  const at=pH=>{
    const H=10**(-pH),OH=EC.kw/H,free={...totals,Ag:Math.max(0,totals.Ag-agcl),Cl:Math.max(0,totals.Cl-agcl)},solid={};
    let charge=H-OH;
    for(const [id,data] of Object.entries(IONS)){
      if(data.ksp){free[id]=Math.min(totals[id],data.ksp/OH**data.z);solid[id]=Math.max(0,totals[id]-free[id])*L;}
      if(id!=='SO4')charge+=data.z*free[id];
    }
    const sulfate=totals.SO4*EC.sulfateKa/(H+EC.sulfateKa),bisulfate=totals.SO4-sulfate;
    charge-=2*sulfate+bisulfate;free.SO4=sulfate;
    return {H,OH,free,solid,bisulfate,charge};
  };
  let lo=-2,hi=16;for(let k=0;k<65;k++){const mid=(lo+hi)/2;if(at(mid).charge>0)lo=mid;else hi=mid;}
  const pH=(lo+hi)/2,r=at(pH);
  let ionicStrength=.5*(r.H+r.OH+r.bisulfate),conductivity=(349.6*r.H+198*r.OH+50*r.bisulfate)/1000;
  for(const [id,c] of Object.entries(r.free)){ionicStrength+=.5*IONS[id].z**2*c;conductivity+=IONS[id].lambda*c/1000;}
  // Limiting ionic conductivities, with an explicit assumed linear temperature factor.
  conductivity*=Math.max(.1,1+.02*(temperature-25));
  return {...r,pH,ionicStrength,conductivity,agcl:agcl*L,totals,volume,temperature};
}
export function circuit(e) {
  const connected=(start,end,withAmmeter=true)=>{
    const edges=[...e.wires,...(withAmmeter?[['a-plus','a-minus']]:[])],seen=new Set([start]),queue=[start];
    while(queue.length){const n=queue.shift();for(const [a,b] of edges){const next=a===n?b:b===n?a:null;if(next&&!seen.has(next)){seen.add(next);queue.push(next);}}}
    return seen.has(end);
  };
  if(connected('plus','minus')||connected('left','right'))return {status:'Short circuit — supply tripped',closed:false,short:true,anode:'left',cathode:'right',meterSign:0};
  const normal=connected('plus','left')&&connected('minus','right'),reverse=connected('plus','right')&&connected('minus','left');
  const anode=reverse?'right':'left',cathode=reverse?'left':'right';
  const meterSign=connected('v-plus',anode)&&connected('v-minus',cathode)?1:connected('v-plus',cathode)&&connected('v-minus',anode)?-1:0;
  return {status:normal||reverse?'Closed circuit':'Open circuit',closed:normal||reverse,short:false,anode,cathode,meterSign,
    ammeter:!connected('plus',anode,false)||!connected('minus',cathode,false)};
}
export function compartments(e) {
  if(e.config.separator==='none'){const s=solution(e.ions.left,e.volume,e.temperature);return {left:s,right:s};}
  return {left:solution(e.ions.left,e.volume/2,e.temperature),right:solution(e.ions.right,e.volume/2,e.temperature)};
}
function availableMetal(electrode,id){return (electrode.deposits[id]||0)+(ELECTRODE[electrode.material].ion===id?electrode.baseRemaining/IONS[id].mm:0);}
export function candidates(e,side,oxidation,s) {
  const surface=e.electrodes[side],material=ELECTRODE[surface.material],T=e.temperature+273.15,A=e.config[`${side}Area`];
  const rows=[],add=(id,label,n,E0,Q,i0,limit=Infinity,stoich={})=>rows.push({id,label,n,E0,Q,E:nernst(E0,n,Q,T),i0:i0*e.config.kineticScale,A,limit,stoich});
  if(oxidation){
    add('oxygen','2 H₂O → O₂ + 4 H⁺ + 4 e⁻',4,1.229,1/s.H**4,material.oxygenI0,Infinity,{H2O:-2,O2:1,'H+':4});
    if(s.free.Cl>1e-12)add('chlorine','2 Cl⁻ → Cl₂ + 2 e⁻',2,1.358,s.free.Cl**2,1e-5,
      Math.min(EC.F*e.config.diffusion*A*s.free.Cl/(1000*e.config.diffusionLayer),EC.F*s.free.Cl*s.volume/1000),{'Cl-':-2,Cl2:1});
    for(const [id,data] of Object.entries(IONS))if(data.mm&&availableMetal(surface,id)>1e-14){
      let passivation=id==='Al'?1e-5:((id==='Fe'||id==='Ni')&&s.pH>4)?.01:(id==='Cu'&&s.pH>7)?.02:1;
      add(id,`${id} → ${id}${data.z===1?'+':data.z+'+'} + ${data.z} e⁻`,data.z,data.E,1/Math.max(s.free[id],1e-10),.003*passivation,
        availableMetal(surface,id)*data.z*EC.F,{[id]:-1,[`${id}${data.z}+`]:1});
    }
  }else{
    add('hydrogen','2 H⁺ + 2 e⁻ → H₂',2,0,1/s.H**2,material.hydrogenI0,Infinity,{'H+':-2,H2:1});
    for(const [id,data] of Object.entries(IONS))if(data.mm&&id!=='Al'&&s.free[id]>1e-14){
      const layer=e.config.diffusionLayer/(e.config.stirring?4:1);
      const limit=Math.min(data.z*EC.F*e.config.diffusion*A*s.free[id]/(1000*layer),data.z*EC.F*s.free[id]*s.volume/1000);
      add(id,`${id}${data.z===1?'+':data.z+'+'} + ${data.z} e⁻ → ${id}`,data.z,data.E,1/s.free[id],.003*Math.sqrt(s.free[id]),limit,{[`${id}${data.z}+`]:-1,[id]:1});
    }
  }
  return rows;
}
function partialCurrent(r,potential,oxidation,T) {
  const eta=(oxidation?1:-1)*(potential-r.E);
  if(eta<=0)return 0;
  // Lumped one-electron activation barrier; stoichiometric n remains in Nernst/Faraday.
  const x=clamp(EC.F*eta/(2*EC.R*T),0,45),kinetic=2*r.A*r.i0*Math.sinh(x);
  return Number.isFinite(r.limit)?kinetic*r.limit/(kinetic+r.limit):kinetic;
}
function electrodeAt(rows,I,oxidation,T) {
  const equilibrium=oxidation?Math.min(...rows.map(r=>r.E)):Math.max(...rows.map(r=>r.E));
  let lo=oxidation?equilibrium:equilibrium-8,hi=oxidation?equilibrium+8:equilibrium;
  for(let k=0;k<28;k++){const mid=(lo+hi)/2,total=rows.reduce((s,r)=>s+partialCurrent(r,mid,oxidation,T),0);if((total<I)===oxidation)lo=mid;else hi=mid;}
  const E=I>1e-14?(lo+hi)/2:equilibrium;
  const reactions=rows.map(r=>{const current=I>1e-14?partialCurrent(r,E,oxidation,T):0;const fraction=Number.isFinite(r.limit)?clamp(current/r.limit,0,1-1e-12):0;
    const concentrationEta=-EC.R*T/(r.n*EC.F)*Math.log(1-fraction);
    return {...r,current,share:I>0?current/I:0,eta:Math.abs(E-r.E),concentrationEta};});
  return {E,reactions,dominant:[...reactions].sort((a,b)=>b.current-a.current|| (oxidation?a.E-b.E:b.E-a.E))[0]};
}
export function electroPreview(e,{ignorePower=false,voltage=e.config.voltage}={}) {
  const wiring=circuit(e),s=compartments(e),anode=e.electrodes[wiring.anode],T=e.temperature+273.15;
  const a=candidates(e,wiring.anode,true,s[wiring.anode]),c=candidates(e,wiring.cathode,false,s[wiring.cathode]);
  const sa=s[wiring.anode],sc=s[wiring.cathode],pathArea=Math.min(e.config.leftArea,e.config.rightArea);
  const resistance=e.volume>0 ? e.config.spacing/pathArea*(1/Math.max(sa.conductivity,1e-10)+1/Math.max(sc.conductivity,1e-10))/2+(e.config.separator==='none'?0:e.config.membraneResistance)+.05 : 1e12;
  const unsupported=anode.material==='stainless'?'Stainless-steel anode corrosion products require an alloy/film model. Quantitative current is withheld.':
    (['gold','silver'].includes(anode.material)&&sa.totals.Cl>1e-9)?'Chloride-dependent corrosion/passivation of this anode is unresolved. Quantitative current is withheld.':
    (sa.free.Ag>0&&sa.pH>10)||(sc.free.Ag>0&&sc.pH>10)?'Alkaline silver oxide chemistry is not represented. Quantitative current is withheld.':'';
  const at=I=>{const ar=electrodeAt(a,I,true,T),cr=electrodeAt(c,I,false,T);return {anode:ar,cathode:cr,required:ar.E-cr.E+I*resistance};};
  const initial=at(0),Ecell=initial.cathode.E-initial.anode.E;
  let current=0,result=initial,regulation='OFF';
  const ready=(e.power||ignorePower)&&wiring.closed&&!unsupported&&e.volume>0&&metalMass(anode)>1e-9&&metalMass(e.electrodes[wiring.cathode])>1e-9;
  if(ready){
    const target=e.config.mode==='cc'?Math.min(e.config.current,e.config.limit):e.config.limit,full=at(target);
    const demand=I=>{const r=at(I);return {...r,excess:r.required+(e.config.mode==='galvanic'?I*e.config.load:0)-(e.config.mode==='galvanic'?0:voltage)};};
    const f=full.required+(e.config.mode==='galvanic'?target*e.config.load:0)-(e.config.mode==='galvanic'?0:voltage);
    if(target>0&&f<=0){current=target;result=full;regulation=e.config.mode==='galvanic'?'Load / current protection':e.config.mode==='cc'?'CC target':'CV → current limit';}
    else if(target>0&&initial.required<(e.config.mode==='galvanic'?0:voltage)){let lo=0,hi=target;for(let k=0;k<22;k++){const mid=(lo+hi)/2;if(demand(mid).excess>0)hi=mid;else lo=mid;}current=(lo+hi)/2;result=at(current);regulation=e.config.mode==='cc'?'Voltage compliance limit':e.config.mode==='galvanic'?'Galvanic load':'CV';}
    if(current<1e-8){current=0;result=initial;regulation='Below onset / open load';}
  }
  const terminalVoltage=current>0?(e.config.mode==='galvanic'?-current*e.config.load:result.required):(e.power?voltage:0);
  const dominantAnode=result.anode.dominant,dominantCathode=result.cathode.dominant;
  const pairE=dominantCathode.E-dominantAnode.E,n=lcm(dominantCathode.n,dominantAnode.n);
  return {wiring,solutions:s,resistance,current,voltage:terminalVoltage,regulation,unsupported,...result,
    Ecell:pairE,openCircuit:Ecell,decomposition:Math.max(0,-pairE),deltaG:-n*EC.F*pairE,n,
    ohmic:current*resistance,overpotential:result.anode.E-dominantAnode.E+dominantCathode.E-result.cathode.E,
    overall:overallReaction(dominantAnode,dominantCathode),power:Math.abs(current*terminalVoltage)};
}
function lcm(a,b){let x=a,y=b;while(y){[x,y]=[y,x%y];}return a*b/x;}
export function overallReaction(anode,cathode) {
  const n=lcm(anode.n,cathode.n),species={};for(const r of [anode,cathode])for(const [s,v] of Object.entries(r.stoich))species[s]=(species[s]||0)+v*n/r.n;
  const side=sign=>Object.entries(species).filter(([,v])=>Math.sign(v)===sign).map(([s,v])=>`${Math.abs(v)===1?'':Math.abs(v)+' '}${s}`).join(' + ');
  return Object.values(species).every(v=>v===0)?'Metal transfers between electrodes; no net dissolved-species change for equal partial currents.':`${side(-1)} → ${side(1)}`;
}
export function electroSafety(e,ventilationOn=false) {
  const p=electroPreview(e),notes=[],push=(id,title,detail,hood=false)=>notes.push({id:`electro-${id}`,title,detail,precaution:'Virtual scenario only. Use the institution-approved procedure and controls for any physical work; this model does not establish safe exposure or operating conditions.',hood,vessels:['Electrochemistry cell']});
  if(e.volume>0)push('gas','Electrolysis may produce hydrogen and oxygen','Hydrogen is flammable and oxygen supports combustion. Keep the gases separate; ignition and recombination are not simulated.',true);
  if(p.solutions.left.totals.Cl>1e-9||p.solutions.right.totals.Cl>1e-9||e.gases.Cl2>0)push('chlorine','Chloride: possible toxic chlorine-containing products','Chlorine competes at the anode. Dissolution, hypochlorite formation, crossover and later chlorine chemistry are not quantified; a small displayed gas yield does not remove the hazard.',true);
  if(Object.values(e.ions).some(pool=>Object.entries(pool).some(([id,n])=>IONS[id].mm&&n>1e-12)))push('metal','Metal-containing electrolyte and waste','Copper, zinc, nickel, silver and other dissolved metals require appropriate contact precautions and waste collection.');
  if(Object.values(p.solutions).some(s=>s.pH<2||s.pH>11))push('corrosive','Corrosive acidity or alkalinity','Electrode reactions and ion transport can create strongly acidic or alkaline compartments.');
  if(e.temperature>45)push('hot','Hot electrolyte / apparatus','Electrical losses and the hotplate can heat the liquid. Boiling and aerosols are outside this model.',true);
  if(p.current/Math.min(e.config.leftArea,e.config.rightArea)>.1)push('current','High current density','High current per unit area increases gas evolution, polarization, heating and rough-deposit risk.');
  if(e.config.sealed)push('pressure','Closed gas space: pressure hazard',`Calculated absolute pressure ${pressureBar(e).toFixed(2)} bar. Gas-generating real experiments require approved pressure protection; never use this display to rate a vessel.`);
  if(p.wiring.short)push('short','Short circuit: output tripped','The external wires bypass the electrolyte. No electrolysis current is integrated.');
  if(p.unsupported)push('limits','Electrode chemistry unresolved',p.unsupported,true);
  if(e.volume>0&&!ventilationOn)push('hood','Local exhaust is OFF','Use the shared fume-hood switch. The setting is not an air-quality measurement.',true);
  return notes;
}
export function pressureBar(e){return 1+ (e.config.sealed?Object.values(e.gases).reduce((s,n)=>s+n,0)*EC.R*(e.temperature+273.15)/(e.config.headspace*1e-6)/1e5:0);}

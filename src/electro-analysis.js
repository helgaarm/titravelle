import { EC, IONS, ELECTRODE, STANDARD_WIRES, ELECTRO_SOURCES } from './electro-data.js';
import { electroPreview, metalMass, gasVolume, clamp, nernst, compartments, pressureBar, overallReaction } from './electro-model.js';
import { metalInventory } from './electro-engine.js';
const f=(v,d=5)=>Number.isFinite(v)?Number(v.toPrecision(d)).toString():'Not determined';
function recordedReactions(e){
  return Object.entries(e.reactionCharge).filter(([,q])=>q>1e-14).map(([key,q])=>{
    const [side,direction,id]=key.split(':'),metal=IONS[id],oxidation=direction==='oxidation';
    const n=metal?.z||({hydrogen:2,oxygen:4,chlorine:2}[id]);
    const ion=metal?`${id}${n===1?'+':n+'+'}`:null,stoich=metal?(oxidation?{[id]:-1,[ion]:1}:{[ion]:-1,[id]:1}):id==='hydrogen'?{'H+':-2,H2:1}:id==='oxygen'?{H2O:-2,O2:1,'H+':4}:{'Cl-':-2,Cl2:1};
    const label=metal?(oxidation?`${id} → ${ion} + ${n} e⁻`:`${ion} + ${n} e⁻ → ${id}`):id==='hydrogen'?'2 H⁺ + 2 e⁻ → H₂':id==='oxygen'?'2 H₂O → O₂ + 4 H⁺ + 4 e⁻':'2 Cl⁻ → Cl₂ + 2 e⁻';
    return {side,direction,id,n,label,stoich,charge:q,amount:q/(n*EC.F),share:e.charge?q/e.charge:0};
  }).sort((a,b)=>b.charge-a.charge);
}
export function electroCalculations(e){
  const p=electroPreview(e),last=e.records.at(-1),T=e.temperature+273.15;
  const recorded=recordedReactions(e),anode=recorded.find(r=>r.direction==='oxidation'),cathode=recorded.find(r=>r.direction==='reduction');
  const metrics=[
    ['Terminal voltage',p.voltage,'V',`V = E_anode − E_cathode + IR = ${f(p.anode.E)} − (${f(p.cathode.E)}) + ${f(p.current)} × ${f(p.resistance)} V. At zero current the display is the powered supply setpoint (or zero when off). Galvanic delivery has negative terminal voltage in this wiring convention.`],
    ['Current',p.current,'A',`${p.regulation}. Solve ΣI_anode(Ea) = ΣI_cathode(Ec) = I with the voltage balance and the ${e.config.limit} A supply limit. CC target ${e.config.current} A; voltage compliance ${e.config.voltage} V.`],
    ['Integrated charge',e.charge,'C',`Q = Σ I_k Δt_k; one-second integration, ${e.time} s total. Variable current uses the integral, not final I × total time. Mean current = ${e.time?f(e.charge/e.time):'—'} A.`],
    ['Electrical energy',e.energy/3600,'Wh',`W = Σ |V_k I_k| Δt_k = ${f(e.energy)} J; divide by 3600 J/Wh. ${e.config.mode==='galvanic'?'Delivered to the load.':'Supplied to the cell.'}`],
    ['Decomposition voltage',p.decomposition,'V',`E_cell = E_cathode,eq − E_anode,eq = ${f(p.Ecell)} V. V_decomp = max(0, −E_cell) = ${f(p.decomposition)} V for the dominant pair. Kinetics and resistance are additional.`],
    ['Reaction free energy',p.deltaG/1000,'kJ/mol reaction',`ΔG = −n F E_cell = −${p.n} × ${EC.F} × (${f(p.Ecell)}) = ${f(p.deltaG)} J per mole of the displayed balanced reaction. It is not measured heat.`],
    ['Solution + separator resistance',p.resistance,'Ω',`R = ℓ/(2A) × (1/κ_left + 1/κ_right) + R_separator + 0.05 Ω contacts. ℓ=${e.config.spacing} cm; A=${Math.min(e.config.leftArea,e.config.rightArea)} cm²; κ=${f(p.solutions.left.conductivity)}, ${f(p.solutions.right.conductivity)} S/cm.`],
    ['Ohmic voltage loss',p.ohmic,'V',`IR = ${f(p.current)} A × ${f(p.resistance)} Ω = ${f(p.ohmic)} V.`],
    ['Electrode polarization',p.overpotential,'V',`η_a + |η_c| = (${f(p.anode.E)} − ${f(p.anode.dominant.E)}) + (${f(p.cathode.dominant.E)} − ${f(p.cathode.E)}). Effective polarization includes the limiting-current approximation; do not add the diagnostic concentration terms again.`],
    ['Temperature',e.temperature,'°C',`C_th ΔT/Δt = I(IR + η_total) − 0.12(T−25) + P_plate. C_th = 4.184 × ${e.volume} + 40 J/K. Reversible entropic heat and boiling are omitted.`],
    ['Absolute gas-space pressure',pressureBar(e),'bar',e.config.sealed?`P = 1 bar + n_gas RT/V_headspace. n=${f(Object.values(e.gases).reduce((n,x)=>n+x,0))} mol; R=${EC.R}; T=${f(T)} K; headspace=${e.config.headspace} mL. All evolved gas retained in the idealized sealed headspace.`:'Vented model: P = 1 bar. Gas volume reporting uses 101325 Pa; no room exposure prediction.'],
  ];
  for(const side of ['left','right']){
    const s=p.solutions[side],mass=metalMass(e.electrodes[side]),baseline=e.baseline?.[`${side}Mass`];
    metrics.push([`${side} pH`,s.pH,'',`pH = −log10[H⁺]. Solve charge balance including H₂O, HSO₄⁻/SO₄²⁻, supported hydroxide precipitation and AgCl. [H⁺]=${f(s.H)} mol/L; Kw=10⁻¹⁴ and equilibrium constants held at 25 °C. Ideal activities; no Cu chloride-complex model.`],
      [`${side} conductivity`,s.conductivity*1000,'mS/cm',`κ = Σ λ_i c_i / 1000 × [1 + 0.02(T−25)] S/cm. Limiting ionic molar conductivities in S cm²/mol and concentrations in mol/L; assumed temperature correction. Concentrated mixtures deviate from this dilute-solution estimate.`],
      [`${side} ionic strength`,s.ionicStrength,'mol/L',`I_s = ½ Σ c_i z_i² = ${f(s.ionicStrength)} mol/L, including H⁺, OH⁻ and bisulfate. This is distinct from electric current.`],
      [`${side} current density`,p.current/e.config[`${side}Area`]*1000,'mA/cm²',`j = I/A = ${f(p.current)} A / ${e.config[`${side}Area`]} cm²; multiply by 1000 for mA/cm². Geometric wetted area; roughness not resolved.`],
      [`${side} electrode mass`,mass,'g',`m = remaining substrate + Σ n_deposit M. Initial ${e.electrodes[side].initialMass} g; modeled change ${f(mass-e.electrodes[side].initialMass)} g. Stored balance ${last?f(last.measured[`${side}Mass`]):'not measured'} g; measured change ${last&&baseline!==undefined?f(last.measured[`${side}Mass`]-baseline):'not measured'} g. Balance uncertainty ±0.001 g per reading.`]);
  }
  const deposition=[];
  for(const side of ['left','right'])for(const [id,data] of Object.entries(IONS))if(data.mm){
    for(const direction of ['reduction','oxidation']){const q=e.reactionCharge[`${side}:${direction}:${id}`]||0;if(!q)continue;
      const theoretical=e.charge*data.mm/(data.z*EC.F),actual=q*data.mm/(data.z*EC.F),efficiency=e.charge?q/e.charge*100:0;
      deposition.push({side,id,direction,q,theoretical,actual,efficiency,formula:`m_100% = Q_total M/(zF) = ${f(e.charge)} × ${data.mm}/(${data.z} × ${EC.F}) = ${f(theoretical)} g. m_partial = ${f(q)} × ${data.mm}/(${data.z} × ${EC.F}) = ${f(actual)} g. Current efficiency = 100 Q_partial/Q_total = ${f(efficiency)}%.`});
    }
  }
  const gases=Object.entries({H2:2,O2:4,Cl2:2}).map(([id,z])=>{
    const theoretical=e.charge/(z*EC.F),actual=e.gases[id],volume=gasVolume(actual,e.temperature),key={H2:'hydrogen',O2:'oxygen',Cl2:'chlorine'}[id],measured=last?.measured[key];
    return {id,z,theoretical,actual,volume,measured,efficiency:theoretical?100*actual/theoretical:0,error:volume&&measured!==undefined?100*(measured-volume)/volume:null,
      formula:`n_100% = Q/(zF) = ${f(e.charge)}/(${z} × ${EC.F}) = ${f(theoretical)} mol. Actual n = integrated partial charge/(zF) = ${f(actual)} mol. V = nRT/P × 10⁶ = ${f(volume)} mL at ${f(T)} K, 101325 Pa. Collector captures ${100*e.config.collection}% before ±0.02 mL reading uncertainty. Dry gas; water vapour and dissolution omitted.`};
  });
  const inventory=metalInventory(e);
  const massComparison=['left','right'].map(side=>{const predicted=metalMass(e.electrodes[side])-e.electrodes[side].initialMass,measured=last&&e.baseline?last.measured[`${side}Mass`]-e.baseline[`${side}Mass`]:null;
    return {side,predicted,measured,error:Math.abs(predicted)>1e-12&&measured!==null?100*(measured-predicted)/Math.abs(predicted):null};});
  return {preview:p,metrics,deposition,gases,massComparison,recorded,recordedOverall:anode&&cathode?overallReaction(anode,cathode):'No charge transferred yet.',lastOperatingReading:e.records.findLast(r=>r.current>1e-8)||null,balance:Object.entries(inventory).filter(([id,n])=>n||e.initialMetals[id]).map(([id,n])=>({id,initial:e.initialMetals[id]*IONS[id].mm,current:n*IONS[id].mm,error:(n-e.initialMetals[id])*IONS[id].mm})),
    surface:p.cathode.dominant.limit<Infinity&&p.cathode.dominant.current/p.cathode.dominant.limit>.8?'Transport-limited: rough or uneven deposit risk in this teaching model.':p.cathode.reactions.find(r=>r.id==='hydrogen')?.share>.1?'Competing gas: porous or poorly adherent coating risk.':'Lower transport stress in this scenario; coating smoothness and adhesion are not quantitatively predicted.'};
}
export function advancedElectro(e,args){
  const bounded=(v,a,b,label)=>{if(!Number.isFinite(v)||v<a||v>b)throw Error(`${label}: ${a}–${b}.`);return v;};
  const type=args.type||'polarization',points=[];
  if(!e.volume)throw Error('Prepare an electrolyte before running a model study.');
  if(type==='polarization'){
    const max=bounded(args.maximum??5,.1,30,'Maximum voltage');
    const cell=structuredClone(e);cell.wires=structuredClone(STANDARD_WIRES);cell.power=true;cell.config.mode='cv';
    for(let k=0;k<=60;k++){const p=electroPreview(cell,{ignorePower:true,voltage:max*k/60});points.push({voltage:max*k/60,current:p.current,eta:p.cathode.dominant.eta,logCurrent:p.current>1e-12?Math.log10(p.current/e.config.rightArea):null,required:p.required});}
    return {type,points,parameters:{...e.config,maximum:max},equation:'For each voltage solve the same competing-reaction and IR equations with a standard circuit and fixed initial composition. No elapsed time or material consumption.',note:'Steady polarization study of the configured model; not a measured curve. Tafel axes use log10(j / [A cm⁻²]) and cathodic polarization.'};
  }
  const id=args.ion||'Cu',data=IONS[id];if(!data?.mm||id==='Al')throw Error('Choose a supported metal couple for the advanced electrode trial.');
  const area=e.config.rightArea,T=e.temperature+273.15,bulk=compartments(e).right.free[id];if(bulk<1e-12)throw Error(`Prepare an electrolyte containing dissolved ${id} before studying this couple.`);
  const exchange=bounded(args.exchange??.001,1e-9,.1,'Exchange current density (A/cm²)'),alpha=bounded(args.alpha??.5,.1,.9,'Transfer coefficient'),capacitance=bounded(args.capacitance??20,0,1000,'Double-layer capacitance (µF/cm²)');
  const Eeq=nernst(data.E,data.z,1/bulk,T),bv=eta=>area*exchange*(Math.exp(clamp(alpha*data.z*EC.F*eta/(EC.R*T),-40,40))-Math.exp(clamp(-(1-alpha)*data.z*EC.F*eta/(EC.R*T),-40,40)));
  if(type==='bv'){
    for(let k=0;k<=100;k++){const eta=-.3+.6*k/100,current=bv(eta);points.push({eta,current,logCurrent:Math.abs(current)>1e-12?Math.log10(Math.abs(current)/area):null});}
    return {type,points,parameters:{id,area,T,exchange,alpha,Eeq},equation:'I = A i₀ [exp(α n F η/RT) − exp(−(1−α)nFη/RT)]. Positive current is oxidation. This isolated reversible couple has no series resistance or diffusion cap.',note:'Kinetic sensitivity model. The user-specified exchange current is an assumption, not a material constant inferred from its name.'};
  }
  if(type!=='cv')throw Error('Choose polarization, Butler–Volmer or cyclic voltammetry.');
  const start=bounded(args.start??Eeq+.2,-2,2,'Start potential vs SHE'),vertex=bounded(args.vertex??Eeq-.4,-2,2,'Vertex potential vs SHE'),rate=bounded(args.rate??.05,.005,1,'Scan rate (V/s)'),cycles=bounded(args.cycles??1,1,3,'Cycles');
  if(!Number.isInteger(cycles)||Math.abs(start-vertex)<.02)throw Error('Use 1–3 whole cycles and distinct scan endpoints.');
  const leg=Math.abs(start-vertex)/rate,duration=2*leg*cycles,steps=Math.min(1800,Math.max(100,Math.ceil(duration/.1))),dt=duration/steps,volume=e.volume/1000;
  let dissolved=bulk*volume,metal=(ELECTRODE[e.electrodes.right.material].ion===id?e.electrodes.right.baseRemaining/data.mm:0)+(e.electrodes.right.deposits[id]||0),potential=start,faradaicCharge=0,charge=0;
  const initialMetal=metal,initialDissolved=dissolved,Ru=electroPreview(e).resistance,C=capacitance*1e-6*area;
  for(let k=0;k<=steps;k++){
    const time=k*dt,phase=(time/leg)%2,applied=phase<=1?start+(vertex-start)*phase:vertex+(start-vertex)*(phase-1);
    const concentration=Math.max(1e-15,dissolved/volume),eq=nernst(data.E,data.z,1/concentration,T),delta=Math.min(.1,Math.sqrt(Math.PI*e.config.diffusion*(dt+time%leg)));
    const diffusionLimit=data.z*EC.F*e.config.diffusion*area*concentration/(1000*delta);
    const at=E=>{const kinetic=bv(E-eq),faradaic=kinetic<0?-Math.min(-kinetic,diffusionLimit,dissolved*data.z*EC.F/dt):Math.min(kinetic,metal*data.z*EC.F/dt);return {faradaic,capacitive:C*(E-potential)/dt};};
    let lo=applied-5,hi=applied+5;for(let j=0;j<55;j++){const mid=(lo+hi)/2,r=at(mid);if(mid+(r.faradaic+r.capacitive)*Ru>applied)hi=mid;else lo=mid;}
    const next=(lo+hi)/2,r=at(next),current=r.faradaic+r.capacitive;
    if(k>0){const n=r.faradaic*dt/(data.z*EC.F);metal=Math.max(0,metal-n);dissolved=Math.max(0,dissolved+n);faradaicCharge+=r.faradaic*dt;charge+=current*dt;}
    potential=next;points.push({time,voltage:applied,interfacePotential:potential,current,faradaic:r.faradaic,capacitive:r.capacitive,charge,faradaicCharge,metalMass:metal*data.mm});
  }
  return {type,points,parameters:{id,area,T,exchange,alpha,capacitance,start,vertex,rate,cycles,Ru,bulk},
    balanceError:(metal+dissolved-initialMetal-initialDissolved)*data.mm,
    equation:'E_interface = E_applied − (I_F + I_C)R_u; I_C = A C_dl ΔE_interface/Δt; I_F is reversible Butler–Volmer current capped by available metal and nFADC/δ. δ = min(0.1 cm, √(πDt_since_turn)). Integrate only I_F for metal conversion.',
    note:'Independent finite-inventory virtual half-cell trial. Does not consume the workbench cell. Approximate diffusion layer and an ideal reference vs SHE; not a full diffusion PDE, potentiostat, solvent-window or corrosion simulation. No safety interpretation of scan limits.'};
}
export function electroCSV(e){
  const columns=['time','voltage','current','charge','energy','temperature','leftPH','rightPH','conductivity','leftMass','rightMass','hydrogen','oxygen','chlorine'];
  const q=x=>`"${String(x).replaceAll('"','""')}"`;
  return [columns.concat(['measured_json','concentrations_json']).join(','),...e.records.map(r=>columns.map(k=>r[k]).concat([q(JSON.stringify(r.measured)),q(JSON.stringify(r.concentrations))]).join(','))].join('\r\n');
}
export function electroReport(e,ventilationOn=false){
  const a=electroCalculations(e),json=x=>JSON.stringify(x,null,2);
  return `# Electrochemistry investigation · Titravelle\n\nFormula-based accounting with assumed kinetics and synthetic measurements. Not a validated physical procedure.\n\n## Objective and predictions\nInvestigate how electrode materials, electrolyte and electrical settings determine reaction pathways; compare measured gas and electrode changes with integrated charge and Faraday’s law.\n\n${json(e.predictionHistory)}\n\n## Apparatus, starting chemicals and settings\n${json({stock:e.stock,volume:e.volume,electrodes:e.electrodes,config:e.config,wires:e.wires,ventilationOn})}\n\n## Recorded reactions and last powered measurement\n${json({reactions:a.recorded,overall:a.recordedOverall,lastPoweredReading:a.lastOperatingReading})}\n\n## Current-state half reactions and reaction competition\n${json({anode:a.preview.anode,cathode:a.preview.cathode,overall:a.preview.overall})}\n\n## Calculations, variables, units and assumptions\n${a.metrics.map(([name,value,unit,calculation])=>`- ${name}: ${f(value)} ${unit}\n  ${calculation}`).join('\n')}\n\n## Faraday mass and gas comparison\n${json({deposition:a.deposition,massComparison:a.massComparison,gases:a.gases,metalBalance:a.balance,surface:a.surface})}\n\n## Recorded measurements\n${json(e.records)}\n\n## Advanced model study\n${json(e.advanced)}\n\n## Interpretation and limitations\nCompare each prediction with stored measurements. Current efficiency is reaction-specific; charge into gas production does not deposit metal. Gas collection losses and instrument uncertainty are distinct from Faradaic efficiency. Diffuse ionic conductivities, ideal activities, fixed 25 °C equilibrium constants, lumped kinetics, assumed passive films, approximate mass transport, dry ideal gases and simplified heat loss limit numerical accuracy. Coating quality is qualitative. Chlorine hydrolysis/hypochlorite, dissolved gas, alloy corrosion, spatial pH/diffusion fields and further redox pathways are not quantified. Carbon and noble-metal corrosion are omitted or explicitly withheld.\n\n## Procedure and protection stops\n${json({stopReason:e.stopReason,operations:e.operations})}\n\n## Sources\n${ELECTRO_SOURCES.map(([name,url])=>`- ${name}: ${url}`).join('\n')}\n`;
}

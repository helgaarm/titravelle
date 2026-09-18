import { FAMES, MW, CONTROLS, massOf } from './organic-data.js';
const sum=a=>a.reduce((s,x)=>s+x,0),mean=a=>sum(a)/a.length,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sd=a=>a.length>1?Math.sqrt(sum(a.map(x=>(x-mean(a))**2))/(a.length-1)):0;
const normal=random=>Math.sqrt(-2*Math.log(Math.max(1e-10,random())))*Math.cos(2*Math.PI*random());
export const molecularFormula=(j=8,k=0)=>({C:28+16*j-2*k,H:38+32*j-2*k,O:19-k});
export function gcAnalysis(o,composition,random,resolved=true) {
  const u=o.parameters.gcUncertainty, amounts=composition.map(p=>Math.max(0,p+(random()-.5)*u/100/4)),total=sum(amounts);
  const rows=FAMES.map((f,i)=>({id:f.id,name:f.name,rt:resolved?f.rt:(f.carbons===18?18.2:f.rt),responseFactor:f.response,area:amounts[i]*f.response*1e6,molePct:100*amounts[i]/total,
    spectrum:[{mz:74,intensity:100,assignment:'Illustrative saturated FAME fragment; not isomer-specific'},{mz:87,intensity:55,assignment:'Illustrative common fragment'},{mz:Math.round(f.mm),intensity:15,assignment:'Nominal molecular ion; positional isomers overlap'}]}));
  return {rows,purity:resolved?rows[0].molePct:null,uncertainty:u,resolved,method:'Synthetic GC-FID response correction: (area / molar response factor) / sum(area / factor). Retention times and fragment intensities are training assumptions, not a reference library.',identity:resolved?'Assumed resolved, authentic-standard-matched peaks. MS alone cannot identify branching position.':'C18 peaks coelute. Desired-isomer mole-% is not identifiable; the feed cannot qualify.'};
}
export function sampleAnalysis(o,m,random) {
  const coreStates=Array.from({length:9},(_,j)=>({j,n:m.distribution[j],label:j===0?'Sucrose octaacetate / zero fatty sites':`${j} fatty sites; remaining acetate/OH tracked separately`}));
  const mm=j=>MW.soa+j*(MW.fame-MW.methylAcetate);
  const rows=coreStates.map(r=>({...r,area:Math.pow(r.n*mm(r.j),1.08)*(1+r.j*.012)*(1+(random()-.5)*.004)}));
  const fameArea=Math.pow(o.pool.fame*MW.fame,1.08)*.9,unassigned=Math.pow(o.pool.degraded,1.08),den=sum(rows.map(r=>r.area))+fameArea+unassigned;
  const area=den?100*rows[8].area/den:0;
  const nmrDS=clamp(m.ds+normal(random)*.004,0,8),hplcDS=clamp(m.ds+normal(random)*.006,0,8);
  const ms=o.distribution.filter(s=>s.n>m.cores*.00001).map(s=>{const formula=molecularFormula(s.j,s.k),exact=massOf(formula,true);return {fatty:s.j,hydroxyl:s.k,formula,neutralExact:exact,protonated:exact+1.007276466621,sodiumAdduct:exact+22.9892207,relative:100*s.n/Math.max(m.octa,...o.distribution.map(x=>x.n))};});
  const gc=gcAnalysis(o,o.lots.fame.composition,random,o.feedGC?.resolved!==false);
  return {time:o.time,temperature:o.temperature,pressure:o.pressure,generatedAcetate:o.generatedAcetate,metrics:{...m},gc,
    nmr:{ds:nmrDS,uncertainty:.008,residualAcetate:Math.max(0,m.residualAcetate+normal(random)*.02),acetateUncertainty:.04,hydroxylDS:m.oh/(m.cores||1),
      proton:[['Sucrose region',3.3,5.7,14],['Bound acetate methyl',1.9,2.2,3*m.acetate/(m.cores||1)],['Terminal iso methyl groups',.8,1,6*m.ds*o.lots.fame.composition[0]],['Alpha-carbonyl CH₂',2.1,2.5,2*m.ds],['Branched methine',1.4,1.8,m.ds*o.lots.fame.composition[0]],['Other chain CH₂ envelope',1.1,1.7,26*m.ds]],
      carbon:[['Ester carbonyl',169,175],['Sucrose carbons',60,105],['Chain/branch carbons',20,40],['Acetate methyl',19,22]],
      note:'Broad assignment windows and normalized integrals are schematic. Bound acetate is integrated separately from free methyl acetate/acetic acid. 13C, COSY, HSQC and HMBC are assignment checklists, not calculated full spectra.'},
    hplc:{rows:rows.map(r=>({...r,areaPct:den?100*r.area/den:0})),octaArea:area,octaSucroseArea:sum(rows.map(r=>r.area))?100*rows[8].area/sum(rows.map(r=>r.area)):0,uncertainty:o.parameters.areaUncertainty,ds:hplcDS,dsUncertainty:.012,freeFameArea:den?100*fameArea/den:0,unassignedArea:den?100*unassigned/den:0,note:'ELSD response is nonlinear and component-dependent in this assumed calibration. Area-% is not mass-% or mole-%. Corrected DS is among identified sucrose species.'},
    ms,water:{value:Math.max(0,m.waterWt+normal(random)*o.parameters.waterUncertainty/2),uncertainty:o.parameters.waterUncertainty},
    residualFame:{value:Math.max(0,m.fameWt+normal(random)*.01),uncertainty:.02},inorganic:{value:Math.max(0,m.inorganicWt+normal(random)*.002),uncertainty:.004},
    note:'Synthetic, representative analytical aliquot. All measurements share the same assumed underlying batch; agreement does not independently validate the chemical model.'};
}
// Student-t quantiles support small independent coupon samples (not distance points).
function logGamma(z) {
  const c=[676.5203681218851,-1259.1392167224028,771.3234287776531,-176.6150291621406,12.507343278686905,-.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];
  if(z<.5)return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);
  z--;let x=.9999999999998099;for(let i=0;i<c.length;i++)x+=c[i]/(z+i+1);const t=z+7.5;return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x);
}
function betaFraction(a,b,x) {
  const tiny=1e-30;let c=1,d=1-(a+b)*x/(a+1);if(Math.abs(d)<tiny)d=tiny;d=1/d;let h=d;
  for(let m=1;m<=200;m++){let aa=m*(b-m)*x/((a+2*m-1)*(a+2*m));d=1+aa*d;if(Math.abs(d)<tiny)d=tiny;c=1+aa/c;if(Math.abs(c)<tiny)c=tiny;d=1/d;h*=d*c;aa=-(a+m)*(a+b+m)*x/((a+2*m)*(a+2*m+1));d=1+aa*d;if(Math.abs(d)<tiny)d=tiny;c=1+aa/c;if(Math.abs(c)<tiny)c=tiny;d=1/d;const delta=d*c;h*=delta;if(Math.abs(delta-1)<1e-12)break;}return h;
}
function beta(x,a,b) {if(x<=0)return 0;if(x>=1)return 1;const bt=Math.exp(logGamma(a+b)-logGamma(a)-logGamma(b)+a*Math.log(x)+b*Math.log1p(-x));return x<(a+1)/(a+b+2)?bt*betaFraction(a,b,x)/a:1-bt*betaFraction(b,a,1-x)/b;}
export function tCritical(df,alpha=.05) {let lo=0,hi=10000;for(let i=0;i<85;i++){const t=(lo+hi)/2,tail=beta(df/(df+t*t),df/2,.5);if(tail>alpha)lo=t;else hi=t;}return (lo+hi)/2;}
export function compareReplicates(a,b,comparisons=1) {
  const va=sd(a)**2/a.length,vb=sd(b)**2/b.length,se=Math.sqrt(va+vb),difference=mean(a)-mean(b),df=(va+vb)**2/(va*va/(a.length-1)+vb*vb/(b.length-1));
  const half=se?tCritical(df,.05/comparisons)*se:0,pooled=Math.sqrt(((a.length-1)*sd(a)**2+(b.length-1)*sd(b)**2)/(a.length+b.length-2));
  return {difference,low:difference-half,high:difference+half,df:Number.isFinite(df)?df:1,effectSize:pooled?difference/pooled:null,replicates:[a.length,b.length],multiplicity:comparisons};
}
export function materialAnalysis(o,m,random) {
  const p=o.parameters,transition=p.meltPoint-3*m.degradedWt,heat=Array.from({length:41},(_,i)=>{const t=-20+i*5;return {temperature:t,first:30*Math.exp(-(((t-transition)/7)**2)),cooling:-24*Math.exp(-(((t-transition+12)/9)**2)),second:27*Math.exp(-(((t-transition-2)/7)**2)),massPercent:100-100/(1+Math.exp(-(t-p.degradationOnset)/10))};});
  const angles=Array.from({length:6},()=>p.contactAngle+normal(random)*2.2),advancing=mean(angles)+7,receding=mean(angles)-12;
  const coatings=['Untreated','Cold applied','Melt applied','Conditioned / slow cooled'].map((method,i)=>({method,retainedMass:i?[1.1,1.7,2.1][i-1]:0,penetration:i?[.01,.04,.06][i-1]:0,adhesion:i?[.4,.65,.72][i-1]:0,roughness:i?[80,45,60][i-1]:30,continuity:i?[.75,.9,.94][i-1]:0}));
  return {dsc:heat,transition,dscPeakAreaArbitraryUnits:30*7*Math.sqrt(Math.PI),fusionEnthalpy:null,glassTransition:null,state:transition>25?'Waxy / partly ordered (assumed)':'Viscous (assumed)',
    tga:{assumedOnset:p.degradationOnset,processingRegion:'Not established: a synthetic onset cannot establish a safe processing temperature.',repeatedHeatingLoss:heat.filter(x=>x.temperature===130).map(x=>100-x.massPercent)[0]},
    wetting:{droplets:angles,mean:mean(angles),sd:sd(angles),advancing,receding,hysteresis:advancing-receding,rolloff:clamp(14+(advancing-receding)*.4,0,90)},
    morphology:{roughnessNm:60,domainSizeNm:400,coverage:.94,claim:'Illustrative morphology from assumed parameters; terminal branching has not been shown to cause these domains.'},coatings,
    environment:{hydrolysis:[0,7,30,90,180].map(days=>({days,cleavedPct:100*(1-2**(-days/p.degradationHalfLife))})),products:'Formal complete ester hydrolysis gives sucrose and the fatty acids; subsequent biodegradation products are not established.',logP:null,bioaccumulation:null,aquaticToxicity:null,biodegradation:null,note:'Fluorine-free design does not establish environmental safety. No validated SOI-18 fate, logP, BCF or ecotoxicity model is available here.'},
    note:'Synthetic characterization from explicit assumed transition, wetting and wear properties. Not molecular-property prediction, structural proof or real safety data.'};
}
export function frictionAnalysis(o,args,random) {
  const n=args.replicates??6,load=args.load??20,velocity=args.velocity??5,distance=args.distance??1000,water=args.water??3,grain=args.grain??'rounded';
  for(const [v,min,max,label] of [[n,3,30,'replicates'],[load,1,100,'load'],[velocity,.1,20,'velocity'],[distance,10,20000,'distance'],[water,0,20,'liquid-water content']])if(!Number.isFinite(v)||v<min||v>max)throw Error(`Check ${label}: ${min}–${max}.`);
  if(!Number.isInteger(n)||!['rounded','fresh','icy'].includes(grain))throw Error('Use whole-number replicates and a listed grain type.');
  const temperatures=[-15,-10,-5,-2,-1,0,1],cycles=[1,10,50,100],rows=[],comparisons=[];
  for(const temperature of temperatures)for(const [id,label] of CONTROLS){
    const coupons=Array.from({length:n},(_,replicate)=>{
      const bias=normal(random)*o.parameters.frictionNoise,baseline=.045+Math.abs(temperature+5)*.001+water*.0005+(grain==='fresh'?.006:grain==='icy'?.003:0)+.00007*load+.0003*velocity;
      const shift=({soi:o.parameters.frictionEffect,linear:0,mixed:0,ester:.004,wax:-.003,bare:.02})[id];
      const wear=o.parameters.wearRate*(.9+.2*random()),curve=Array.from({length:11},(_,i)=>{const d=distance*i/10,retained=id==='bare'?0:Math.exp(-wear*d/1000);return {distance:d,retained:100*retained,mu:Math.max(.001,baseline+(id==='bare'?shift:shift*retained+.01*(1-retained))+bias+normal(random)*.0005)};});
      return {replicate:replicate+1,curve,mean:mean(curve.map(x=>x.mu)),cycles:cycles.map(c=>({cycle:c,retainedPct:id==='bare'?0:100*Math.exp(-wear*c),mu:Math.max(.001,baseline+(id==='bare'?shift:shift*Math.exp(-wear*c)+.01*(1-Math.exp(-wear*c)))+bias)}))};
    });
    const values=coupons.map(c=>c.mean),s=sd(values),half=tCritical(n-1)*s/Math.sqrt(n);
    rows.push({id,label,temperature,coupons,mean:mean(values),sd:s,low:mean(values)-half,high:mean(values)+half});
  }
  for(const temperature of temperatures){const a=rows.find(r=>r.id==='soi'&&r.temperature===temperature);for(const id of ['linear','mixed']){const b=rows.find(r=>r.id===id&&r.temperature===temperature);comparisons.push({temperature,control:id,...compareReplicates(a.coupons.map(c=>c.mean),b.coupons.map(c=>c.mean),14)});}}
  return {conditions:{replicates:n,load,velocity,distance,water,grain},rows,comparisons,improved:temperatures.some(t=>comparisons.filter(c=>c.temperature===t).every(c=>c.high<0)),
    note:'Synthetic matched coupon experiment. Independent coupon means are the replicates; repeated distance/cycle readings are not extra replicates. Welch intervals for 14 prespecified comparisons use a Bonferroni familywise 95% bound. +1 °C labels ambient wet-test conditions; equilibrium snow/ice itself is near 0 °C. Any advantage depends on the assumed friction shift.'};
}
export function finalDecision(o) {
  const q=o.samples.filter(s=>s.final&&s.revision===o.revision).at(-1),material=o.materials?.revision===o.revision,performance=o.friction?.revision===o.revision;
  const constant=o.dryMasses.length>=2&&Math.abs(o.dryMasses.at(-1).mass-o.dryMasses.at(-2).mass)<.001;
  const criteria=q?[
    ['Fatty isomer purity ≥98.0 mole-%',q.gc.resolved&&q.gc.purity-q.gc.uncertainty>=98,`${q.gc.purity?.toFixed(3)??'unresolved'} ± ${q.gc.uncertainty} mole-%`],
    ['Fatty DS ≥7.9, two techniques',q.nmr.ds-q.nmr.uncertainty>=7.9&&q.hplc.ds-q.hplc.dsUncertainty>=7.9,`qNMR ${q.nmr.ds.toFixed(3)} ± ${q.nmr.uncertainty}; HPLC ${q.hplc.ds.toFixed(3)} ± ${q.hplc.dsUncertainty}`],
    ['Octa-fatty ester ≥95 area-%',q.hplc.octaArea-q.hplc.uncertainty>=95,`${q.hplc.octaArea.toFixed(3)} ± ${q.hplc.uncertainty} area-%`],
    ['Bound acetate ≤0.5 mol-% of sites',q.nmr.residualAcetate+q.nmr.acetateUncertainty<=.5,`${q.nmr.residualAcetate.toFixed(3)} ± ${q.nmr.acetateUncertainty} mol-%`],
    ['Free methyl ester <0.5 wt-%',q.residualFame.value+q.residualFame.uncertainty<.5,`${q.residualFame.value.toFixed(3)} ± ${q.residualFame.uncertainty} wt-%`],
    ['Water <0.05 wt-%',q.water.value+q.water.uncertainty<.05,`${q.water.value.toFixed(4)} ± ${q.water.uncertainty} wt-%`],
    ['Inorganic material <0.1 wt-%',q.inorganic.value+q.inorganic.uncertainty<.1,`${q.inorganic.value.toFixed(4)} ± ${q.inorganic.uncertainty} wt-%`],
    ['No substantial unresolved degradation',q.metrics.degradedWt<.5,`${q.metrics.degradedWt.toFixed(3)} wt-% modeled unresolved pool (<0.5 project criterion)`],
    ['Constant mass demonstrated',constant,constant?'Two dry masses differ by <1 mg':'Repeat controlled drying and weighing'],
    ['Structural consistency',q.ms.some(p=>p.fatty===8&&p.hydroxyl===0)&&Math.abs(q.nmr.ds-q.hplc.ds)<.04,'Synthetic NMR + MS + residue GC; not independent validation of the model']
  ]:[];
  const qualified=criteria.length>0&&criteria.every(c=>c[1]);
  let code=null,conclusion='Incomplete — obtain current isolated-product QC, characterization and all six friction controls.';
  if(q&&q.metrics.octaMolePct<1){code='A';conclusion='Synthesis failed in this scenario.';}
  else if(q&&!qualified){code='B';conclusion='Target-like material formed, but batch quality specification failed or remains unconfirmed.';}
  else if(qualified&&material&&performance){code=o.friction.improved?'D':'C';conclusion=code==='D'?'High-purity scenario material with a statistically supported synthetic friction improvement.':'High-purity scenario material; the comparative data do not establish exceptional friction performance.';}
  return {code,conclusion,qualified,criteria,preferred:q?{isomer:q.gc.resolved&&q.gc.purity-q.gc.uncertainty>=99,ds:q.nmr.ds-q.nmr.uncertainty>=7.95,octa:q.hplc.octaArea-q.hplc.uncertainty>=98,acetate:q.nmr.residualAcetate+q.nmr.acetateUncertainty<=.2,fame:q.residualFame.value+q.residualFame.uncertainty<.2}:null,
    attribution:code==='D'?'The assumed SOI friction shift and wear retention drive this model. A molecular or surface cause cannot be established from a single synthetic batch; vary those properties independently before testing correlation.':'No superiority claim is justified from a material name or contact angle alone.'};
}
export function organicEndpoint(o) {
  const samples=o.samples.filter(s=>!s.final),last=samples.at(-1),previous=samples.at(-2);
  const evolution=previous&&last&&last.time>previous.time?(last.generatedAcetate-previous.generatedAcetate)/(last.time-previous.time):null;
  const checks=[['Bound acetate within specification',Boolean(last&&last.nmr.residualAcetate+last.nmr.acetateUncertainty<=.5)],['Octa-fatty ester predominates among sucrose peaks',Boolean(last&&last.hplc.octaSucroseArea-last.hplc.uncertainty>=95)],['Little additional substitution between samples',Boolean(previous&&last.time-previous.time>=30&&Math.abs(last.nmr.ds-previous.nmr.ds)<.03)],['Net acetate displacement has slowed',Boolean(evolution!==null&&Math.abs(evolution)<o.initialCore*.0002)],['Degradation remains limited',Boolean(last&&last.metrics.degradedWt<.5)]];
  return {confirmed:checks.every(x=>x[1])&&last?.revision===o.revision,checks,note:'Two current reaction samples at least 30 min apart are required. Low volatile evolution alone can also mean inactive catalyst. These numerical endpoint tolerances are teaching assumptions.'};
}
export function reportText(o,m,decision) {
  const json=x=>JSON.stringify(x,null,2),q=o.samples.filter(s=>s.final).at(-1);
  return `# SOI-18 · simulated research notebook\n\nAll numerical results below are from an unvalidated teaching scenario, not physical measurements or demonstrated material properties.\n\n## Decision\n${decision.code??'INCOMPLETE'} — ${decision.conclusion}\n${decision.attribution}\n\n## 1. Reaction and identity\nC28H38O19 + 8 C19H38O2 ⇌ C156H294O19 + 8 C3H6O2\nAverage target molar mass: ${MW.product.toFixed(3)} g/mol. Monoisotopic neutral: ${massOf(molecularFormula(),true).toFixed(6)} Da; [M+Na]+ ${(massOf(molecularFormula(),true)+22.9892207).toFixed(6)} m/z. Isomers are isobaric.\nFatty substitution DS, total ester DS, fatty-isomer purity and chemical mass purity are distinct.\n\n## 2. Exact lots and assumptions\n${json(o.lots)}\n${json(o.parameters)}\n\n## 3. Apparatus and hazards\n${json(o.apparatus)}\nMethoxide is corrosive/moisture-reactive; methanol is toxic/flammable; methyl acetate and work-up solvents are flammable. Vacuum glass, trap, pump protection and nitrogen oxygen-displacement need approved controls.\n\n## 4. Feed analysis and drying\n${json({GC:o.feedGC,KF:o.kf,drying:o.drying})}\n\n## 5. Temperature, pressure, time, conversion and volatile curves\n${json(o.profile)}\n\n## 6. Catalyst and mass balance\n${json({catalystChargeG:o.catalystCharge*MW.methoxide,remainingMethoxideMmol:o.pool.methoxide*1000,remainingHydroxideMmol:o.pool.hydroxide*1000,inputG:o.inputMass,reactorG:m.mass,trap:o.trap,escapedG:o.escapedMass,wasteG:o.wasteMass,analyticalAliquotsG:o.aliquotMass,balanceErrorG:m.balanceError,methylAcetateGeneratedG:o.generatedAcetate*MW.methylAcetate,theoreticalMethylAcetateG:o.initialCore*8*MW.methylAcetate,collectedOverTheoreticalPct:o.initialCore?100*o.trap.methylAcetate/(o.initialCore*8):0,collectedOverGeneratedPct:o.generatedAcetate?100*o.trap.methylAcetate/o.generatedAcetate:0})}\n\n## 7. Purification, constant mass and yield\n${json({steps:o.purifications,dryMasses:o.dryMasses,crudeMass:o.crudeMass,isolatedMass:m.mass,targetMass:m.targetMass,theoreticalFromDryCharge:m.theoretical,nominalTarget:5,grossYieldPct:m.grossYieldPct,targetCorrectedYieldPct:m.yieldPct,distribution:o.distribution})}\n\n## 8. GC-FID/GC-MS and impurity population\n${json(q?.gc??null)}\n\n## 9. q1H NMR, 13C assignment windows, OH and independent DS\n${json(q?.nmr??null)}\nCOSY/HSQC/HMBC require measured coupling/correlation data; no invented correlations are provided.\n\n## 10. HPLC/ELSD and LC-MS/MALDI assignments\n${json({hplc:q?.hplc,ms:q?.ms})}\n\n## 11. Acceptance criteria and preferred targets\n${json(decision)}\n\n## 12. DSC/TGA, wetting, microscopy and UHMWPE interaction\n${json(o.materials)}\n\n## 13. Snow/ice tribology, controls, statistics and abrasion\n${json(o.friction)}\n\n## 14. Environmental screen\n${json(o.materials?.environment??{status:'Not performed'})}\nUnknown toxicity, logP, bioaccumulation and biodegradation remain unknown. No environmental-safety conclusion follows from fluorine-free design.\n\n## 15. Deviations and next experiment\n${json(o.deviations)}\n${!decision.qualified?'Investigate the failed criteria, compare sequential samples and review purification recovery.':'Repeat independent batches and vary branching, coating structure and wear separately. Validate kinetic, analytical-response, separation and tribology assumptions using real reference data.'}\n\n## 16. Stage-by-stage results and procedure\n${json(o.operations)}\n\n## Provenance\nProtocol targets supplied by the user. Rate, selectivity, response, retention, thermal and surface values are explicitly assumed. General acyl-exchange precedent: https://patents.google.com/patent/EP0647652A2/en ; mass convention: https://goldbook.iupac.org/terms/view/12495 . Original interface and explanations; no source layouts or spectra copied.\n`;
}

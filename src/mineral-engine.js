import {TARGETS,ROUTES,LANES,LANE_NAMES,OBS_FIELDS,CONFIDENCE,MINERAL_STEPS,MINERALS,INSTRUMENTS} from './mineral-data.js';
const copy=x=>structuredClone(x), zero=()=>Object.fromEntries(TARGETS.map(id=>[id,0]));
const rng=s=>{s.seed=(1664525*s.seed+1013904223)>>>0;return s.seed/4294967296;};
const total=(m,id)=>Object.values(m).reduce((sum,row)=>sum+row[id],0);
const sumREE=x=>['Ce','La','Nd','Y'].reduce((sum,id)=>sum+x[id],0);
const text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=3000;
const emptyConclusionDraft=()=>({confidence:'',reason:'',compared:false});
const validConclusionDraft=d=>d!==null&&typeof d==='object'&&!Array.isArray(d)&&Object.keys(d).length===3&&Object.keys(d).every(k=>['confidence','reason','compared'].includes(k))&&(d.confidence===''||CONFIDENCE.includes(d.confidence))&&typeof d.reason==='string'&&d.reason.length<=3000&&typeof d.compared==='boolean';
export function mineralPresentation(mode='guided'){
  const assessment=mode==='assessment';
  return {guidance:mode==='guided',equations:!assessment,feedback:!assessment,confirmation:!assessment,truth:!assessment};
}
export function mineralConclusionDraft(s,route=s.route){
  if(!Object.hasOwn(ROUTES,route))throw Error('Choose one of the four analytical aliquots.');
  return {...(s.runs[route].conclusionDraft??emptyConclusionDraft())};
}
export function editMineralConclusionDraft(s,route,patch){
  if(!Object.hasOwn(ROUTES,route))throw Error('Choose one of the four analytical aliquots.');
  if(s.runs[route].conclusion)throw Error('This route already has a recorded conclusion.');
  const draft={...mineralConclusionDraft(s,route),...patch};
  if(!validConclusionDraft(draft))throw Error('Use an available confidence, a reasoning draft up to 3000 characters, and a control-comparison checkbox.');
  return {...s,runs:{...s.runs,[route]:{...s.runs[route],conclusionDraft:draft}}};
}
export function createMineral(seed=17,route='A'){
  const s={version:1,seed:seed>>>0,code:`MC-${seed>>>0}`,time:0,route:Object.hasOwn(ROUTES,route)?route:'A',split:false,nugget:false,portions:{},runs:{},journal:[],pending:null,instruments:[],revealed:false};
  const weights=MINERALS.map((name,i)=>({name,weight:i<9?.2+rng(s):rng(s)<.5?0:.002+rng(s)*.18}));
  const norm=weights.reduce((a,r)=>a+r.weight,0);
  const minerals=weights.map(r=>({name:r.name,fraction:r.weight/norm}));
  const part=name=>minerals.find(r=>r.name===name).fraction;
  const pick=levels=>levels[Math.floor(rng(s)*levels.length)];
  const ppm={Ag:pick([0,0,.2,3,30,300]),Au:pick([0,0,.05,.5,5,50]),Pt:pick([0,0,.05,.5,5,200,1500]),Ce:(part('monazite')*.28+part('allanite')*.08)*1e6,La:(part('monazite')*.14+part('allanite')*.04)*1e6,Nd:(part('monazite')*.12+part('allanite')*.03)*1e6,Y:part('xenotime')*.45e6};
  s.hidden={ppm,minerals,radioactive:rng(s)<.55,otherRadioactive:rng(s)<.15,encapsulation:.15+rng(s)*.75,matrix:.2+rng(s)*.8};
  for(const id of Object.keys(ROUTES))s.runs[id]={index:0,assays:{},skipped:[],exam:null,radiation:null,conclusion:null,learner:null,conclusionDraft:emptyConclusionDraft(),conditions:{blank:rng(s)<.12?.6:0,reagent:rng(s)<.10?.12:1,suppression:rng(s)<.18?.22:1},stage:'Untreated concentrate'};
  return s;
}
function divide(s,nugget){
  s.nugget=nugget;s.split=true;
  const masses={Original:20,A:15,B:15,C:15,D:15,E:20};
  for(const [id,grams] of Object.entries(masses))s.portions[id]={grams,initial:zero(),fractions:{solid:zero(),solution:zero(),retained:zero(),tests:zero(),probes:zero()},instrumentWithdrawn:0};
  for(const element of TARGETS){
    const amount=s.hidden.ppm[element]*100/1000;
    for(const [id,p] of Object.entries(s.portions))p.initial[element]=amount*masses[id]/100*(nugget&&['Au','Pt'].includes(element)?.1:1);
    if(nugget&&['Au','Pt'].includes(element))for(let n=0;n<3;n++){
      const position=rng(s)*100;let cumulative=0;
      const id=Object.keys(masses).find(id=>(cumulative+=masses[id])>position)||'E';s.portions[id].initial[element]+=amount*.9/3;
    }
    for(const p of Object.values(s.portions))p.fractions.solid[element]=p.initial[element];
  }
}
function move(p,from,to,recovery){for(const id of TARGETS){const amount=p.fractions[from][id]*(typeof recovery==='number'?recovery:recovery[id]||0);p.fractions[from][id]-=amount;p.fractions[to][id]+=amount;}}
const targetFor=route=>({A:'Ag',B:'Au',C:'Pt',D:'REE'})[route];
const score=x=>x<.15?0:x<.65?1:x<1.8?2:3;
function response(id,value,remaining=0){
  const level=score(value),solid=['chloride','ammonium','oxalate'].includes(id);
  let colour='colourless',precipitate='None visible',description='No visible test response.';
  if(id==='chloride'&&level){colour='white';precipitate=level===1?'Faint white cloud':'White curdy precipitate';description=precipitate+'. Identity requires confirmation.';}
  if(id==='ammonium'&&level){colour='yellow';precipitate=level===1?'Barely visible yellow particles':'Yellow crystalline precipitate';description=precipitate+'. Other platinum-group ions may complicate interpretation.';}
  if(id==='oxalate'&&level){colour='white';precipitate=level===1?'Faint pale cloud':'Pale/white precipitate';description=precipitate+'. This is a poorly selective group test.';}
  if(id==='tin'&&level){colour=level===1?'pink':level===2?'purple':'brown';description=level===1?'Faint reddish-purple response.':level===2?'Violet/purple colloidal response.':'Dark brown to nearly black colloidal response.';}
  if(id==='arsenazo'){colour=level?'blue':'pink';description=level?'Blue-violet dye response. Several metal ions can contribute.':'Reagent background colour only.';}
  if(id==='thiosulfate'){colour=remaining>=.15?'white':'colourless';precipitate=remaining>=.15?'Residual pale solid':'No visible solid';description=value>=.15?`White cloud decreases; ${remaining>=.15?'some solid remains.':'the test portion becomes clear.'}`:'No convincing dissolution response to compare.';}
  return {signal:Math.min(value,5),score:level,colour,precipitate,description,solid,remaining,...(id==='arsenazo'?{absorbance:Number((.035+Math.min(value,3)*.36).toFixed(3))}:{})};
}
function assay(s,route,id,spike){
  const p=s.portions[route],r=s.runs[route],c=r.conditions,kind=targetFor(route);
  const thresholds={chloride:2,tin:.3,ammonium:120,oxalate:500,arsenazo:300};
  const results={};
  let target=0,matrix=0;
  if(id!=='thiosulfate'){
    const sample=copy(p.fractions.solution);for(const key of TARGETS)sample[key]*=.1;
    move(p,'solution','tests',.1);
    target=(kind==='REE'?sumREE(sample):sample[kind])*1000/(p.grams*.1)/thresholds[id];
    matrix=s.hidden.matrix*({chloride:.6,tin:.1,ammonium:.22,oxalate:1.3,arsenazo:.9}[id]);
  }
  for(const lane of LANES){
    if(lane==='spike'&&!spike)continue;
    if(id==='thiosulfate'){
      const prior=r.assays.chloride?.[lane];if(!prior)continue;
      const removed=prior.target*.97*c.reagent,remaining=Math.max(0,prior.signal-removed);
      results[lane]={...response(id,removed,remaining),target:removed,matrix:remaining};continue;
    }
    const isMatrix=['sample','spike'].includes(lane),amount=lane==='positive'?2:lane==='blank'?0:target+(lane==='spike'?2:0);
    const reacted=amount*c.reagent*(isMatrix?c.suppression:1);
    const interferent=isMatrix?matrix:0;
    results[lane]={...response(id,reacted+interferent+c.blank),target:reacted,matrix:interferent+c.blank};
  }
  r.assays[id]=results;return results;
}
function observe(s,route,step,skip,args){
  const p=s.portions[route],r=s.runs[route];
  const o={before:r.stage,dissolution:'No dissolution operation.',gas:'No gas evolution represented.',solution:'No liquid colour change.',precipitate:'None visible.',residue:'Fractions remain labelled and retained.',controls:'Preparation/physical observation; chemical controls follow.',interpretation:''};
  if(skip){o.controls='Optional stage omitted.';o.solution='Not measured.';r.skipped.push(step.id);return o;}
  const id=step.id;
  if(id==='nitric'){
    move(p,'solid','solution',{Ag:.7+.25*s.hidden.encapsulation,Ce:.015,La:.015,Nd:.015,Y:.01});
    o.dissolution='Some acid-soluble material dissolves; resistant grains remain.';o.gas='Nitrogen oxides represented; NO can oxidize to brown NO₂ in air. Gas colour is not an elemental identification.';
    o.solution='Pale blue/green or yellow from the matrix.';o.residue='Mixed resistant grains; no mineral identity established.';r.stage='Nitric-treated slurry';
  }else if(id==='nitric-probe'||id==='hcl-probe'){
    move(p,'solid','probes',id==='nitric-probe'?.1:1/9);
    o.dissolution='An independent microportion shows partial matrix dissolution and resistant grains.';o.gas=id==='nitric-probe'?'Possible nitrogen-oxide evolution in the virtual hood.':'Matrix-dependent gas behaviour; not a platinum identifier.';
    o.residue='Probe archived independently; main C material remains available.';r.stage='Two independent acid probes kept separate';
  }else if(id==='wash'){
    move(p,'solution','retained',1);o.dissolution='No additional target extraction assumed.';o.solution='Nitric filtrate and washings archived as B-N.';o.residue='Washed nitric-resistant B-R retained.';r.stage='Washed nitric-resistant solid';
  }else if(id==='chloride-digest'){
    const recovery=s.hidden.encapsulation;
    move(p,'solid','solution',{Au:recovery,Pt:recovery*.65,Ag:.08,Ce:.03,La:.03,Nd:.03,Y:.02});
    o.dissolution='Part of the accessible metal fraction enters the chloride solution. Encapsulated material may remain.';o.gas='Toxic oxidising-acid fumes represented (including nitrogen oxides/chlorine-related species).';o.solution='Yellow/amber matrix solution; colour is not proof of Au or Pt.';o.residue='Refractory minerals and unrecovered target material may remain.';r.stage='Chloride digest with retained mineral residue';
  }else if(id==='filter'){
    o.solution=route==='A'?'Diluted clear A-F filtrate retained.':'Clear chloride test solution retained; matrix colour may persist.';
    o.residue=`Insoluble ${route} residue retained in a labelled container.`;r.stage='Separated clear test solution and retained residue';
  }else if(id==='microscope'){
    r.exam=['Colourless angular transparent grains with low-to-moderate apparent density.','Dark opaque grains with metallic or dull lustre; mixed associations.','Amber/yellow-brown subrounded grains, variable transparency and higher apparent density.'];
    o.before='Fine, dried, homogenised, non-magnetic heavy-mineral concentrate.';o.residue=r.exam.join(' ');o.controls='Compare several grains; microscope colour and estimated density are ambiguous.';r.stage='Mineral textures observed; identities unresolved';
  }else if(id==='radiation'){
    const high=(s.hidden.radioactive&&s.hidden.ppm.Ce>0)||s.hidden.otherRadioactive;
    r.radiation={background:24,sample:high?63+Math.floor(rng(s)*42):20+Math.floor(rng(s)*10),seconds:60};
    o.controls=`Virtual 60 s count: background ${r.radiation.background}; sample ${r.radiation.sample}. Not a dose-rate or safety measurement.`;o.residue='Unchanged. Radioactivity does not identify a mineral or REE.';
  }else if(id==='ree-digest'){
    move(p,'solid','solution',{Ce:.55+s.hidden.encapsulation*.4,La:.55+s.hidden.encapsulation*.4,Nd:.55+s.hidden.encapsulation*.4,Y:.45+s.hidden.encapsulation*.45,Ag:.1,Au:0,Pt:0});
    o.dissolution='Virtual resistant-mineral decomposition is partial to extensive; no total-recovery guarantee.';o.solution='Pale matrix-coloured digest; Fe, Al, Ca, Th and phosphate may accompany target ions.';o.residue='Any undecomposed grains are retained.';r.stage='Conditioned mineral digest and retained residue';
  }else if(id==='light'){
    const primary=r.assays.chloride.sample;
    o.precipitate=primary.target>=.15?'The retained white-solid portion slowly becomes grey/violet.':'No convincing darkening of a retained white solid.';o.controls='Separate illustrative retained portion; not the thiosulfate-treated portion.';
  }else{
    const results=assay(s,route,id,args.spike!==false);
    o.solution=results.sample.description;o.precipitate=results.sample.precipitate;
    o.dissolution=id==='thiosulfate'?results.sample.description:'Test-portion reactions; extraction recovery is unchanged.';
    o.controls=Object.entries(results).map(([lane,result])=>`${LANE_NAMES[lane]}: ${result.description}`).join(' ');
    o.residue='Test portions, excess solutions and residues retained as labelled analytical waste/fractions.';r.stage=`${step.title} completed`;
  }
  return o;
}
function qc(lanes,id){
  if(!lanes?.blank||!lanes.positive||!lanes.sample)return 'The blank, positive control and sample must all be run.';
  if(lanes.blank.signal>=.15)return 'The reagent blank responds: contamination or reagent background invalidates this test.';
  if(id!=='thiosulfate'&&lanes.positive.signal<.65)return 'The positive control fails: an unresponsive sample cannot be called negative.';
  if(lanes.spike&&id!=='thiosulfate'&&lanes.sample.signal<2.8&&lanes.spike.signal-lanes.sample.signal<.65)return 'The matrix spike is suppressed; matrix effects can hide the target.';
  return '';
}
export function mineralConclusion(s,route){
  const r=s.runs[route],primary={A:'chloride',B:'tin',C:'ammonium',D:'oxalate'}[route],a=r.assays[primary];
  if(r.index<MINERAL_STEPS[route].length||s.pending)return {result:'Awaiting recorded evidence',confidence:'Inconclusive',reason:'Complete the guided sequence and observation records first.'};
  for(const [id,lanes] of Object.entries(r.assays)){const fail=qc(lanes,id);if(fail)return {result:'Inconclusive / interfered',confidence:'Inconclusive',reason:fail};}
  const level=a.sample.score;
  if(route==='A'){
    const confirmation=r.assays.thiosulfate.sample;
    if(level&& (confirmation.signal<.15||confirmation.remaining>a.sample.signal*.35))return {result:'Result inconclusive because of interference',confidence:'Inconclusive',reason:'The chloride solid does not substantially clear like the silver positive control. Mixed solids remain plausible.'};
    return {result:['Silver not detected','Weak indication of silver','Silver likely present','Strong silver response'][level],confidence:CONFIDENCE[level],reason:'Chloride response and thiosulfate behaviour are compared with the controls. This addresses acid-soluble silver only; an unextracted carrier or low concentration can be missed.'};
  }
  if(route==='B')return {result:['No detectable gold response','Possible trace gold','Positive qualitative gold indication','Strong qualitative gold indication'][level],confidence:CONFIDENCE[level],reason:'Blank and positive-control comparisons support this qualitative assignment. Colloid colour is not a calibration; incomplete recovery, matrix effects and the nugget effect can give a negative extract from a gold-bearing source.'};
  if(route==='C')return {result:['No visible platinum indication','Possible platinum-group-metal response','Platinum-compatible result','Strong platinum-compatible response'][level],confidence:level===3?'Probable':CONFIDENCE[level],reason:'The yellow-solid test is insensitive at trace levels and is not specific among all platinum-group mixtures. Resistance alone is not confirmatory evidence.'};
  const dye=r.assays.arsenazo?.sample.score||0;
  return {result:level||dye?'Potentially relevant metal-ion group; individual REEs unresolved':'No detectable REE-group screen response',confidence:level||dye?'Weak indication':'Not detected',reason:'Oxalate and Arsenazo III both have important non-REE interferences. Even agreeing screens cannot assign Ce, La, Nd or Y separately. Microscopy and radiation are contextual clues only.'};
}
export function mineralComplete(s){return Object.values(s.runs).every(r=>r.conclusion)&&!s.pending;}
export function operateMineral(original,action,args={},context={}){
  const s=copy(original),route=args.route||s.route;
  if(!Object.hasOwn(ROUTES,route))throw Error('Choose one of the four analytical aliquots.');
  if(action==='select'){s.route=route;return s;}
  if(s.pending&&action!=='record')throw Error('Record the current observation before another operation.');
  if(action==='split'){
    if(s.split)throw Error('This concentrate has already been split. Start a new run for another unknown.');
    divide(s,args.nugget===true);
    s.pending={route:'Original',step:'split',title:'Preserve and divide the concentrate',reagent:'Labelled containers; representative splitter',time:0,duration:0,equation:'',draft:{before:'Processed non-magnetic heavy-mineral concentrate.',dissolution:'None.',gas:'None.',solution:'No solution.',precipitate:'None.',residue:'Original and E preserved; independent A, B, C and D aliquots labelled.',controls:'Untreated reference retained. No chemical test yet.',interpretation:''}};
  }else if(action==='record'){
    if(!s.pending)throw Error('Perform an operation before recording it.');
    if(args.reviewed!==true)throw Error('Review and confirm the observations before saving.');
    const draft=Object.fromEntries(OBS_FIELDS.map(([id])=>[id,args[id]??s.pending.draft[id]]));
    if(OBS_FIELDS.some(([id])=>!text(draft[id])))throw Error('Complete each observation field, including your interpretation.');
    s.journal.push({...s.pending,draft});s.pending=null;
  }else{
    if(!s.split)throw Error('Preserve the reference and divide the concentrate first.');
    const r=s.runs[route];
    if(action==='step'||action==='skip'){
      const st=MINERAL_STEPS[route][r.index];if(!st)throw Error('This route is complete. Compare the controls and record your conclusion.');
      if(action==='skip'&&!st.optional)throw Error('This stage is required for the analytical sequence.');
      if(action==='step'&&st.hood&&context.ventilationOn!==true)throw Error('Turn on the shared simulated fume hood before this contained virtual operation.');
      const draft=observe(s,route,st,action==='skip',args),duration=action==='skip'?0:st.hood?90:30;s.time+=duration;
      s.pending={route,step:st.id,title:st.title,reagent:st.reagent,time:s.time,duration,equation:st.equation,draft};r.index++;r.conclusion=null;r.learner=null;
    }else if(action==='conclude'){
      if(r.index!==MINERAL_STEPS[route].length)throw Error('Complete and record this route before assigning a result.');
      if(args.compared!==true||!CONFIDENCE.includes(args.confidence)||!text(args.reason))throw Error('Compare sample and controls, then enter your confidence and reasoning.');
      if(r.conclusion)throw Error('This route already has a recorded conclusion.');
      r.learner={confidence:args.confidence,reason:args.reason};r.conclusion=mineralConclusion(s,route);r.conclusionDraft=emptyConclusionDraft();
    }else if(action==='instrument'){
      if(!mineralComplete(s))throw Error('Record conclusions for all four classical routes before revealing instrumental evidence.');
      const method=INSTRUMENTS[args.method];if(!Object.hasOwn(INSTRUMENTS,args.method))throw Error('Choose an available confirmatory instrument.');
      const source=args.source||'Original',p=s.portions[source];if(!Object.hasOwn(s.portions,source))throw Error('Choose a tracked sample.');
      const fraction=args.fraction||'bulk';if(!['bulk','solution','solid'].includes(fraction))throw Error('Choose bulk, solution or residue.');
      if(s.instruments.length>=20)throw Error('This run already has 20 instrumental comparisons. Save the report and begin a new run.');
      if(['Original','E'].includes(source)&&fraction!=='bulk')throw Error('The preserved material has not been digested or separated. Select bulk.');
      const inventory=fraction==='bulk'?p.initial:p.fractions[fraction];
      if(fraction==='solution'&&s.runs[source].index<({A:2,B:4,C:4,D:3}[source]))throw Error('Prepare and separate the solution before submitting it.');
      if(args.method==='sem'&&fraction==='solution')throw Error('SEM-EDS requires a solid or bulk grain portion.');
      const grain=Number.isInteger(args.grain)?args.grain:0;
      if(grain<0||grain>2)throw Error('Choose a microscope grain field.');
      const grainElement=['Ag','Au','Pt'].filter(id=>inventory[id]>0).sort((a,b)=>inventory[b]-inventory[a])[0],reeTotal=sumREE(inventory);
      const readings=TARGETS.map(id=>{
        const truth=inventory[id]*1000/p.grams,limit=method.limit[id];
        const grainValue=grain===0?0:grain===1?(id===grainElement?900000:0):['Ce','La','Nd','Y'].includes(id)&&reeTotal>0?inventory[id]/reeTotal*600000:0;
        const value=args.method==='sem'?grainValue:truth*(.97+rng(s)*.06);
        return {element:id,truth,limit:limit??null,detected:limit!==undefined&&value>=limit,value:limit!==undefined&&value>=limit?Number(value.toPrecision(5)):null};
      });
      // A small analytical subportion is reserved; the untouched parent remains.
      p.instrumentWithdrawn+=p.grams*.001;
      s.instruments.push({method:args.method,source,fraction,grain,readings,time:s.time,subsampleGrams:p.grams*.001});s.revealed=true;
    }else throw Error('Unsupported mineral-analysis operation.');
  }
  return s;
}
export function mineralComparison(s){
  if(!s.revealed)return [];
  return Object.entries(ROUTES).map(([route,name])=>{
    const p=s.portions[route],isREE=route==='D',id=targetFor(route),bulk=isREE?sumREE(s.hidden.ppm):s.hidden.ppm[id],aliquot=(isREE?sumREE(p.initial):p.initial[id])*1000/p.grams;
    const decision=s.runs[route].conclusion,learner=s.runs[route].learner;
    const positive=['Weak indication','Probable','Strong qualitative evidence'].includes(learner.confidence);
    const outcome=learner.confidence==='Inconclusive'?'Unresolved':positive&&aliquot===0?'False positive relative to this aliquot':!positive&&aliquot>0?'False negative relative to this aliquot':'Agrees with presence/absence in this aliquot';
    return {name,route,bulk,aliquot,result:decision.result,confidence:learner.confidence,outcome,reason:bulk>0&&aliquot<bulk*.2?'Sampling contrast: precious-metal particles are unevenly distributed.':learner.confidence==='Not detected'&&aliquot>0?'A detection limit, incomplete extraction or suppression can hide a present target.':positive&&aliquot===0?'A matrix response can resemble the target. Check specificity and controls.':'Qualitative evidence does not establish a grade; compare the instrument scope and reporting limits.'};
  });
}
export function mineralReport(s,{mode='guided',includeDrafts=true}={}){
  const presentation=mineralPresentation(mode);
  const lines=['# Mineral concentrate investigation',`Sample ${s.code}. Virtual teaching observations; no real analytical result.`, 'No colour-to-concentration calibration was performed.','', '| Element/group | Primary test | Confirmation | Result | Confidence |','| --- | --- | --- | --- | --- |'];
  const labels={A:['Ag','Nitric extraction / chloride','Thiosulfate'],B:['Au','Chloride extract','Sn(II) colour / controls'],C:['Pt','Chloride extract / NH4Cl','Precipitation behaviour / controls'],D:['REE','Mineral / digestion screen','Oxalate / optional Arsenazo III']};
  for(const [id,r] of Object.entries(s.runs)){const c=r.conclusion;lines.push(`| ${labels[id].join(' | ')} | ${presentation.feedback?c?.result||'Not concluded':r.learner?'Learner conclusion recorded':'Not concluded'} | ${(presentation.feedback?c?.confidence:r.learner?.confidence)||'Not recorded'} |`);}
  for(const [id,r] of Object.entries(s.runs))if(r.conclusion){if(presentation.feedback)lines.push('',`${id}: ${r.conclusion.reason}`);lines.push('',`${id} analyst (${r.learner.confidence}): ${r.learner.reason}`);}
  if(includeDrafts){
    const drafts=Object.entries(s.runs).filter(([id,r])=>!r.conclusion&&(r.conclusionDraft?.reason||r.conclusionDraft?.confidence));
    if(drafts.length)lines.push('','## Unsubmitted conclusion drafts','Working notes only; these do not complete a route.',...drafts.map(([id,r])=>`${id}: ${r.conclusionDraft.confidence||'Confidence not chosen'} — ${r.conclusionDraft.reason}`));
  }
  if(!presentation.feedback)lines.push('','Assessment presentation: model interpretation, equations and simulator answers are withheld. Recorded observations and learner writing remain available.');
  lines.push('','## Recorded observations');for(const row of s.journal){lines.push('',`${row.route} · ${row.title} · ${row.reagent} · ${row.time} model s (${row.duration} model s duration)`);if(presentation.equations&&row.equation)lines.push(row.equation);lines.push(...OBS_FIELDS.map(([id,label])=>`${label}: ${row.draft[id]}`));}
  if(s.revealed&&presentation.truth)lines.push('','## Simulator ground truth (separate from instrument readings)',...TARGETS.map(id=>`${id}: ${s.hidden.ppm[id].toPrecision(5)} mg/kg in the original bulk model.`),...mineralComparison(s).map(r=>`${r.name}: ${r.outcome}. ${r.reason}`));
  for(const run of s.instruments)lines.push('',`${INSTRUMENTS[run.method].name} · ${run.source} / ${run.fraction}: ${INSTRUMENTS[run.method].note}`,run.method==='sem'?'Selected-grain observations; values are not bulk grades.':'Values use original-sample-equivalent mg/kg; solution/residue results describe only the recovered fraction.',...run.readings.map(r=>`${r.element}: ${r.limit===null?'outside method':r.value===null?'below illustrative reporting limit':run.method==='sem'?'detected in selected grain':r.value+' mg/kg'}; limit ${r.limit??'not applicable'}.`));
  return lines.join('\n');
}
// Snapshots are immutable. Prefer their assessment-safe copy in Assessment;
// older snapshots have no such copy and can be opened in another learning mode.
export function mineralSnapshotReport(note,mode='guided'){
  return mineralPresentation(mode).feedback?note.mineralReport:note.mineralAssessmentReport??null;
}
export function mineralNotebookNotes(notes,mode='guided'){
  return notes.map(note=>!note.mineralReport||mineralPresentation(mode).feedback?note:{...note,mineralReport:mineralSnapshotReport(note,mode)??'This older mineral report contains model feedback. Open it in another learning mode.'});
}
export function mineralCSV(s){
  const cell=x=>'"'+String(x??'').replace(/^[\t\r\n ]*[=+@-]/,"'$&").replaceAll('"','""')+'"';
  const keys=['sample','step','reagent','model time (s)','duration (model s)',...OBS_FIELDS.map(([,label])=>label)];
  return [keys,...s.journal.map(r=>[r.route,r.title,r.reagent,r.time,r.duration,...OBS_FIELDS.map(([id])=>r.draft[id])])].map(row=>row.map(cell).join(',')).join('\r\n');
}
export function validMineral(s){
  try{
    if(s.version!==1||!Number.isSafeInteger(s.seed)||s.seed<0||s.seed>4294967295||!text(s.code)||!Object.hasOwn(ROUTES,s.route)||!Number.isFinite(s.time)||s.time<0||typeof s.split!=='boolean'||typeof s.nugget!=='boolean'||typeof s.revealed!=='boolean')return false;
    const finite=x=>Number.isFinite(x)&&x>=0&&x<=1e9;
    if(!TARGETS.every(id=>finite(s.hidden.ppm[id]))||!Array.isArray(s.hidden.minerals)||s.hidden.minerals.length!==12||!s.hidden.minerals.every(r=>MINERALS.includes(r.name)&&finite(r.fraction)&&r.fraction<=1)||!finite(s.hidden.encapsulation)||s.hidden.encapsulation>1||!finite(s.hidden.matrix)||s.hidden.matrix>1||typeof s.hidden.radioactive!=='boolean'||typeof s.hidden.otherRadioactive!=='boolean')return false;
    if(Object.keys(s.runs).join(',')!=='A,B,C,D')return false;
    for(const [id,r] of Object.entries(s.runs)){
      if(r.conclusionDraft!==undefined&&!validConclusionDraft(r.conclusionDraft))return false;
      if(!Number.isInteger(r.index)||r.index<0||r.index>MINERAL_STEPS[id].length||!Array.isArray(r.skipped)||!r.skipped.every(x=>MINERAL_STEPS[id].some(st=>st.id===x&&st.optional))||!text(r.stage))return false;
      if(!['blank','reagent','suppression'].every(k=>finite(r.conditions[k])&&r.conditions[k]<=1))return false;
      if(r.exam!==null&&(!Array.isArray(r.exam)||r.exam.length!==3||!r.exam.every(text)))return false;
      if(r.radiation!==null&&(!finite(r.radiation.background)||!finite(r.radiation.sample)||r.radiation.seconds!==60))return false;
      if(r.conclusion&&(!CONFIDENCE.includes(r.conclusion.confidence)||!text(r.conclusion.result)||!text(r.conclusion.reason)||!r.learner||!CONFIDENCE.includes(r.learner.confidence)||!text(r.learner.reason)))return false;
      for(const [assayId,lanes] of Object.entries(r.assays)){if(!MINERAL_STEPS[id].some(st=>st.id===assayId))return false;for(const [lane,v] of Object.entries(lanes)){if(!LANES.includes(lane)||!finite(v.signal)||!Number.isInteger(v.score)||v.score<0||v.score>3||!finite(v.target)||!finite(v.matrix)||!text(v.description)||!text(v.colour)||!text(v.precipitate)||!finite(v.remaining))return false;}}
    }
    if(s.split){
      if(Object.keys(s.portions).join(',')!=='Original,A,B,C,D,E')return false;
      for(const p of Object.values(s.portions))if(!finite(p.grams)||p.grams<=0||!finite(p.instrumentWithdrawn)||p.instrumentWithdrawn>p.grams||Object.keys(p.fractions).join(',')!=='solid,solution,retained,tests,probes'||!TARGETS.every(id=>finite(p.initial[id])&&Object.values(p.fractions).every(row=>finite(row[id]))&&Math.abs(total(p.fractions,id)-p.initial[id])<1e-7))return false;
      if(!TARGETS.every(id=>Math.abs(Object.values(s.portions).reduce((sum,p)=>sum+p.initial[id],0)-s.hidden.ppm[id]*.1)<1e-7))return false;
    }
    const validRow=r=>['Original',...Object.keys(ROUTES)].includes(r.route)&&text(r.step)&&text(r.title)&&text(r.reagent)&&finite(r.time)&&finite(r.duration)&&typeof r.equation==='string'&&OBS_FIELDS.every(([id])=>typeof r.draft[id]==='string'&&r.draft[id].length<=3000);
    if(!Array.isArray(s.journal)||s.journal.length>100||!s.journal.every(validRow)||s.pending&&!validRow(s.pending))return false;
    if(!Array.isArray(s.instruments)||s.instruments.length>20||!s.instruments.every(r=>Object.hasOwn(INSTRUMENTS,r.method)&&Object.hasOwn(s.portions,r.source)&&['bulk','solution','solid'].includes(r.fraction)&&Number.isInteger(r.grain)&&r.grain>=0&&r.grain<=2&&Array.isArray(r.readings)&&r.readings.length===7&&r.readings.every(v=>TARGETS.includes(v.element)&&finite(v.truth)&&(v.limit===null||finite(v.limit))&&(v.value===null||finite(v.value))&&typeof v.detected==='boolean')))return false;
    return !s.revealed||mineralComplete(s)&&s.instruments.length>0;
  }catch{return false;}
}

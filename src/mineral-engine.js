import {TARGETS,ROUTES,LANES,LANE_NAMES,OBS_FIELDS,CONFIDENCE,MINERAL_STEPS,MINERALS,INSTRUMENTS} from './mineral-data.js';
import {MINERAL_PORTIONS,MINERAL_APPARATUS,mineralProtocol,emptyMineralBench,emptyPreparation,validMineralBench,mineralReagentName} from './mineral-protocol.js';
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
  const s={version:1,seed:seed>>>0,code:`MC-${seed>>>0}`,time:0,route:Object.hasOwn(ROUTES,route)?route:'A',split:false,nugget:false,portions:{},runs:{},journal:[],pending:null,instruments:[],revealed:false,preparation:emptyPreparation()};
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
function assay(s,route,id,spike,args={}){
  const p=s.portions[route],r=s.runs[route],c=r.conditions,kind=targetFor(route);
  const thresholds={chloride:2,tin:.3,ammonium:120,oxalate:500,arsenazo:300};
  const results={};
  let target=0,matrix=0;
  if(id!=='thiosulfate'){
    const fraction=args.sampleFraction??.1;
    const sample=copy(p.fractions.solution);for(const key of TARGETS)sample[key]*=fraction;
    const lanes=args.controls&&args.controls.spike&&spike?2:1;
    move(p,'solution','tests',fraction*lanes);
    target=(kind==='REE'?sumREE(sample):sample[kind])*1000/(p.grams*.1)/thresholds[id];
    matrix=s.hidden.matrix*({chloride:.6,tin:.1,ammonium:.22,oxalate:1.3,arsenazo:.9}[id])*(fraction/.1);
  }
  for(const lane of LANES){
    if(lane==='spike'&&!spike)continue;
    if(args.controls&&!args.controls[lane])continue;
    if(id==='thiosulfate'){
      const prior=r.assays.chloride?.[lane];if(!prior)continue;
      const removed=prior.target*.97*c.reagent*(args.effect??1),remaining=Math.max(0,prior.signal-removed);
      results[lane]={...response(id,removed,remaining),target:removed,matrix:remaining};continue;
    }
    const isMatrix=['sample','spike'].includes(lane),amount=lane==='positive'?2:lane==='blank'?0:target+(lane==='spike'?2:0);
    const reacted=amount*c.reagent*(isMatrix?c.suppression:1)*(args.effect??1);
    const interferent=isMatrix?matrix:0;
    results[lane]={...response(id,reacted+interferent+c.blank),target:reacted,matrix:interferent+c.blank};
  }
  if(id==='arsenazo'&&args.zeroed&&results.blank){const baseline=results.blank.absorbance;for(const v of Object.values(results)){v.absorbance=Number((v.absorbance-baseline).toFixed(3));v.zeroed=true;}}
  r.assays[id]=results;return results;
}
function observe(s,route,step,skip,args){
  const p=s.portions[route],r=s.runs[route];
  const o={before:r.stage,dissolution:'No dissolution operation.',gas:'No gas evolution represented.',solution:'No liquid colour change.',precipitate:'None visible.',residue:'Fractions remain labelled and retained.',controls:'Preparation/physical observation; chemical controls follow.',interpretation:''};
  if(skip){o.controls='Optional stage omitted.';o.solution='Not measured.';r.skipped.push(step.id);return o;}
  const id=step.id;
  const extraction=recoveries=>Object.fromEntries(Object.entries(recoveries).map(([key,value])=>[key,value*(args.effect??1)]));
  if(id==='nitric'){
    move(p,'solid','solution',extraction({Ag:.7+.25*s.hidden.encapsulation,Ce:.015,La:.015,Nd:.015,Y:.01}));
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
    move(p,'solid','solution',extraction({Au:recovery,Pt:recovery*.65,Ag:.08,Ce:.03,La:.03,Nd:.03,Y:.02}));
    o.dissolution='Part of the accessible metal fraction enters the chloride solution. Encapsulated material may remain.';o.gas='Toxic oxidising-acid fumes represented (including nitrogen oxides/chlorine-related species).';o.solution='Yellow/amber matrix solution; colour is not proof of Au or Pt.';o.residue='Refractory minerals and unrecovered target material may remain.';r.stage='Chloride digest with retained mineral residue';
  }else if(id==='filter'){
    o.solution=route==='A'?'Diluted clear A-F filtrate retained.':'Clear chloride test solution retained; matrix colour may persist.';
    o.residue=`Insoluble ${route} residue retained in a labelled container.`;r.stage='Separated clear test solution and retained residue';
  }else if(id==='microscope'){
    r.exam=['Colourless angular transparent grains with low-to-moderate apparent density.','Dark opaque grains with metallic or dull lustre; mixed associations.','Amber/yellow-brown subrounded grains, variable transparency and higher apparent density.'];
    o.before='Fine, dried, homogenised, non-magnetic heavy-mineral concentrate.';o.residue=r.exam.join(' ');o.controls='Compare several grains; microscope colour and estimated density are ambiguous.';r.stage='Mineral textures observed; identities unresolved';
  }else if(id==='radiation'){
    const high=(s.hidden.radioactive&&s.hidden.ppm.Ce>0)||s.hidden.otherRadioactive;
    const seconds=args.duration??60,scale=seconds/60;
    r.radiation={background:Math.round(24*scale),sample:Math.round((high?63+Math.floor(rng(s)*42):20+Math.floor(rng(s)*10))*scale),seconds};
    o.controls=`Virtual ${seconds} s count: background ${r.radiation.background}; sample ${r.radiation.sample}. Not a dose-rate or safety measurement.`;o.residue='Unchanged. Radioactivity does not identify a mineral or REE.';
  }else if(id==='ree-digest'){
    move(p,'solid','solution',extraction({Ce:.55+s.hidden.encapsulation*.4,La:.55+s.hidden.encapsulation*.4,Nd:.55+s.hidden.encapsulation*.4,Y:.45+s.hidden.encapsulation*.45,Ag:.1,Au:0,Pt:0}));
    o.dissolution='Virtual resistant-mineral decomposition is partial to extensive; no total-recovery guarantee.';o.solution='Pale matrix-coloured digest; Fe, Al, Ca, Th and phosphate may accompany target ions.';o.residue='Any undecomposed grains are retained.';r.stage='Conditioned mineral digest and retained residue';
  }else if(id==='light'){
    const primary=r.assays.chloride.sample;
    o.precipitate=primary.target>=.15?'The retained white-solid portion slowly becomes grey/violet.':'No convincing darkening of a retained white solid.';o.controls='Separate illustrative retained portion; not the thiosulfate-treated portion.';
  }else{
    const results=assay(s,route,id,args.spike!==false,args);
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
  if(action.startsWith('bench-'))return operateMineralWorkbench(original,action,args,context);
  if(s.pending&&action!=='record')throw Error('Record the current observation before another operation.');
  if(action==='split'){
    if(s.split)throw Error('This concentrate has already been split. Start a new run for another unknown.');
    if(args.fromBench&&(!s.preparation?.mixed||s.preparation.weighed.length!==6))throw Error('Homogenise, tare and weigh all six labelled portions before opening the analytical routes.');
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
      if(args.effect!==undefined&&(!Number.isFinite(args.effect)||args.effect<0||args.effect>1)||args.sampleFraction!==undefined&&![.05,.1,.2].includes(args.sampleFraction)||args.duration!==undefined&&(!Number.isFinite(args.duration)||args.duration<=0||args.duration>180))throw Error('Choose supported model treatment settings.');
      if(args.controls&&(!args.controls.sample||Object.keys(args.controls).some(k=>!LANES.includes(k)||typeof args.controls[k]!=='boolean')))throw Error('Prepare a sample vial and supported controls.');
      if(action==='skip'&&!st.optional)throw Error('This stage is required for the analytical sequence.');
      if(action==='step'&&st.hood&&context.ventilationOn!==true)throw Error('Turn on the shared simulated fume hood before this contained virtual operation.');
      const draft=observe(s,route,st,action==='skip',args),duration=action==='skip'?0:args.duration??(st.hood?90:30);s.time+=duration;
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
export function operateMineralWorkbench(original,action,args={},context={}){
  const s=copy(original),route=args.route||s.route;
  if(!Object.hasOwn(ROUTES,route))throw Error('Choose an analytical aliquot.');
  if(s.pending)throw Error('Record the observed result before setting up another operation.');
  if(['bench-homogenise','bench-tare','bench-weigh','bench-nugget'].includes(action)){
    if(s.split)throw Error('The reference portions have already been divided.');
    const prep=s.preparation??=emptyPreparation();
    if(action==='bench-homogenise')prep.mixed=true;
    if(action==='bench-tare')prep.tared=true;
    if(action==='bench-nugget'){if(typeof args.nugget!=='boolean')throw Error('Choose whether to include uneven particles.');s.nugget=args.nugget;}
    if(action==='bench-weigh'){
      if(!prep.mixed)throw Error('Homogenise the incoming concentrate before weighing representative portions.');
      if(!prep.tared)throw Error('Tare the empty container on the balance before weighing this portion.');
      if(!Object.hasOwn(MINERAL_PORTIONS,args.portion)||prep.weighed.includes(args.portion))throw Error('Choose a labelled container that has not been filled.');
      prep.weighed.push(args.portion);prep.tared=false;
    }
    return s;
  }
  if(!s.split)throw Error('Prepare and divide the concentrate before loading analytical equipment.');
  const r=s.runs[route],plan=mineralProtocol(route,r.index);
  if(!plan)throw Error('This route is complete. Record your conclusion or start another run.');
  const b=r.bench?.index===r.index?r.bench:emptyMineralBench(r.index);r.bench=b;
  const event=message=>{if(b.events.length>=49)throw Error('Clear this apparatus setup before adding more operations.');b.events.push(message);};
  if(action==='bench-reset'){r.bench=emptyMineralBench(r.index);return s;}
  if(action==='bench-settings'){
    if(![.5,1,1.5].includes(args.exposure)||![.05,.1,.2].includes(args.sampleFraction))throw Error('Choose the available model treatment and test-portion settings.');
    if(b.exposure!==args.exposure)b.background=false;
    b.exposure=args.exposure;b.sampleFraction=args.sampleFraction;return s;
  }
  if(action==='bench-load'){
    if(b.loaded)throw Error('A fraction is already loaded. Clear this apparatus before replacing it.');
    if(args.apparatus!==plan.apparatus)throw Error(`Use ${MINERAL_APPARATUS[plan.apparatus]} for this operation.`);
    if(args.source!==plan.source)throw Error(`Load ${plan.sourceLabel}; keep other aliquots and references separate.`);
    b.apparatus=args.apparatus;b.source=args.source;b.loaded=true;event(`Loaded ${plan.sourceLabel} into ${MINERAL_APPARATUS[b.apparatus]}.`);return s;
  }
  if(!b.loaded)throw Error('Select the apparatus and load the labelled sample fraction first.');
  const st=MINERAL_STEPS[route][r.index];
  if(['bench-add','bench-run'].includes(action)&&st.hood&&context.ventilationOn!==true)throw Error('Turn on the shared virtual fume hood before adding this reagent or running the contained treatment.');
  if(action==='bench-add'){
    if(!plan.reagent||args.reagent!==plan.reagent)throw Error(plan.reagent?`This operation supports ${mineralReagentName(plan.reagent)}. Choose it from the shared shelf; other combinations are not calculated.`:'This is a physical observation; no reagent is required.');
    if(!Number.isFinite(args.charge)||args.charge<.25||args.charge>2||b.charge+args.charge>2)throw Error('Add 0.25–2 model charge units, with at most 2 units in this setup. These are not real reagent doses.');
    b.reagent=args.reagent;b.charge+=args.charge;b.mixed=false;b.background=false;event(`Added ${args.charge} model charge unit(s) of ${mineralReagentName(args.reagent)}.`);
  }else if(action==='bench-mix'){
    if(!plan.mix)throw Error('Mixing is not a control on this apparatus.');b.mixed=!b.mixed;event(b.mixed?'Mixed the loaded material and reagent.':'Left the loaded material unmixed.');
  }else if(action==='bench-filter'){
    if(plan.apparatus!=='filter')throw Error('Select the filter assembly.');b.filterSeated=true;event('Seated filter paper and labelled both the filtrate receiver and residue container.');
  }else if(action==='bench-focus'){
    if(plan.apparatus!=='microscope')throw Error('Select the microscope.');b.focused=true;event('Focused the loaded slide for grain observation.');
  }else if(action==='bench-background'){
    if(!['counter','photometer'].includes(plan.apparatus))throw Error('Select a counter or spectrophotometer.');
    if(plan.apparatus==='photometer'&&(!b.controls.blank||b.charge===0))throw Error('Prepare the reagent blank before zeroing the spectrophotometer.');
    b.background=true;event(plan.apparatus==='photometer'?'Zeroed the spectrophotometer with the prepared reagent blank.':`Measured the empty-holder background over ${plan.duration*b.exposure} model seconds.`);
  }else if(action==='bench-control'){
    if(!plan.assay||!LANES.includes(args.lane))throw Error('Choose a test-vial lane.');
    if(plan.id==='thiosulfate'&&!r.assays.chloride?.[args.lane])throw Error('No retained chloride-test portion exists for that lane. It cannot be replaced by a fresh control.');
    if(b.controls[args.lane])throw Error('This vial is already prepared.');
    b.controls[args.lane]=true;b.mixed=false;event(`Prepared ${LANE_NAMES[args.lane]}${args.lane==='positive'?` using ${plan.standard}`:''}.`);
  }else if(action==='bench-run'){
    if(plan.reagent&&b.charge===0)throw Error('Add the supported reagent before running the operation.');
    if(plan.apparatus==='filter'&&!b.filterSeated)throw Error('Seat the filter and prepare both receiving containers before filtering.');
    if(plan.apparatus==='microscope'&&!b.focused)throw Error('Focus the slide before capturing microscope fields.');
    if(plan.apparatus==='counter'&&!b.background)throw Error('Measure the background at this counting interval first.');
    if(plan.apparatus==='photometer'&&!b.background)throw Error('Zero the spectrophotometer with its prepared reagent blank first.');
    if(plan.assay&&!b.controls.sample)throw Error('Pipette a sample portion into its test vial first.');
    const effect=Math.min(1,plan.reagent?b.charge:1)*(plan.mix&&!b.mixed?.35:1)*Math.min(1,b.exposure);
    const duration=plan.duration*b.exposure;
    event(`${plan.verb}; ${duration} model seconds${plan.mix?`, ${b.mixed?'mixed':'unmixed'}`:''}.`);
    b.completed=true;
    const next=operateMineral(s,'step',{route,effect,duration,sampleFraction:b.sampleFraction,zeroed:plan.apparatus==='photometer'&&b.background,...(plan.assay?{controls:b.controls,spike:b.controls.spike}:{})},context);
    next.pending.procedure=[...b.events];
    if(plan.mix)next.pending.draft.dissolution+=` Treatment used ${b.charge} model charge unit(s), ${b.mixed?'mixing':'no mixing'} and ${b.exposure}× reference model exposure. These settings affect the assumed recovery/response, not validated physical kinetics.`;
    return next;
  }else throw Error('Unsupported mineral apparatus action.');
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
  if(s.journal.some(row=>row.procedure?.length)){lines.push('','## Performed apparatus operations');for(const row of s.journal)if(row.procedure?.length)lines.push('',`${row.route} · ${row.title}`,...row.procedure.map(line=>`- ${line}`));}
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
    if(s.preparation!==undefined&&(!s.preparation||typeof s.preparation.mixed!=='boolean'||typeof s.preparation.tared!=='boolean'||!Array.isArray(s.preparation.weighed)||new Set(s.preparation.weighed).size!==s.preparation.weighed.length||!s.preparation.weighed.every(id=>Object.hasOwn(MINERAL_PORTIONS,id))))return false;
    for(const [id,r] of Object.entries(s.runs)){
      if(r.conclusionDraft!==undefined&&!validConclusionDraft(r.conclusionDraft))return false;
      if(r.bench!==undefined&&(!validMineralBench(r.bench,id)||r.bench.index>r.index||r.bench.completed&&r.bench.index>=r.index))return false;
      if(!Number.isInteger(r.index)||r.index<0||r.index>MINERAL_STEPS[id].length||!Array.isArray(r.skipped)||!r.skipped.every(x=>MINERAL_STEPS[id].some(st=>st.id===x&&st.optional))||!text(r.stage))return false;
      if(!['blank','reagent','suppression'].every(k=>finite(r.conditions[k])&&r.conditions[k]<=1))return false;
      if(r.exam!==null&&(!Array.isArray(r.exam)||r.exam.length!==3||!r.exam.every(text)))return false;
      if(r.radiation!==null&&(!finite(r.radiation.background)||!finite(r.radiation.sample)||![30,60,90].includes(r.radiation.seconds)))return false;
      if(r.conclusion&&(!CONFIDENCE.includes(r.conclusion.confidence)||!text(r.conclusion.result)||!text(r.conclusion.reason)||!r.learner||!CONFIDENCE.includes(r.learner.confidence)||!text(r.learner.reason)))return false;
      for(const [assayId,lanes] of Object.entries(r.assays)){if(!MINERAL_STEPS[id].some(st=>st.id===assayId))return false;for(const [lane,v] of Object.entries(lanes)){if(!LANES.includes(lane)||!finite(v.signal)||!Number.isInteger(v.score)||v.score<0||v.score>3||!finite(v.target)||!finite(v.matrix)||!text(v.description)||!text(v.colour)||!text(v.precipitate)||!finite(v.remaining)||(v.absorbance!==undefined&&(!Number.isFinite(v.absorbance)||Math.abs(v.absorbance)>2))||(v.zeroed!==undefined&&typeof v.zeroed!=='boolean'))return false;}}
    }
    if(s.split){
      if(Object.keys(s.portions).join(',')!=='Original,A,B,C,D,E')return false;
      for(const p of Object.values(s.portions))if(!finite(p.grams)||p.grams<=0||!finite(p.instrumentWithdrawn)||p.instrumentWithdrawn>p.grams||Object.keys(p.fractions).join(',')!=='solid,solution,retained,tests,probes'||!TARGETS.every(id=>finite(p.initial[id])&&Object.values(p.fractions).every(row=>finite(row[id]))&&Math.abs(total(p.fractions,id)-p.initial[id])<1e-7))return false;
      if(!TARGETS.every(id=>Math.abs(Object.values(s.portions).reduce((sum,p)=>sum+p.initial[id],0)-s.hidden.ppm[id]*.1)<1e-7))return false;
    }
    const validRow=r=>['Original',...Object.keys(ROUTES)].includes(r.route)&&text(r.step)&&text(r.title)&&text(r.reagent)&&finite(r.time)&&finite(r.duration)&&typeof r.equation==='string'&&OBS_FIELDS.every(([id])=>typeof r.draft[id]==='string'&&r.draft[id].length<=3000)&&(r.procedure===undefined||Array.isArray(r.procedure)&&r.procedure.length<=50&&r.procedure.every(v=>typeof v==='string'&&v.length<300));
    if(!Array.isArray(s.journal)||s.journal.length>100||!s.journal.every(validRow)||s.pending&&!validRow(s.pending))return false;
    if(!Array.isArray(s.instruments)||s.instruments.length>20||!s.instruments.every(r=>Object.hasOwn(INSTRUMENTS,r.method)&&Object.hasOwn(s.portions,r.source)&&['bulk','solution','solid'].includes(r.fraction)&&Number.isInteger(r.grain)&&r.grain>=0&&r.grain<=2&&Array.isArray(r.readings)&&r.readings.length===7&&r.readings.every(v=>TARGETS.includes(v.element)&&finite(v.truth)&&(v.limit===null||finite(v.limit))&&(v.value===null||finite(v.value))&&typeof v.detected==='boolean')))return false;
    return !s.revealed||mineralComplete(s)&&s.instruments.length>0;
  }catch{return false;}
}

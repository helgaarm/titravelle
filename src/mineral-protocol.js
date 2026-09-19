import {MINERAL_STEPS,MINERAL_STOCKS,ROUTES} from './mineral-data.js';
import {REAGENTS} from './lab-data.js';

export const MINERAL_PORTIONS={Original:20,A:15,B:15,C:15,D:15,E:20};
export const MINERAL_APPARATUS={reactor:'Contained digestion vessel',filter:'Funnel, filter paper & receiver',rack:'Pipette & test-tube rack',photometer:'Spectrophotometer & cuvettes',microscope:'Microscope & slide',counter:'Radiation counter & sample holder',light:'Light source & retained test tube'};
export const MINERAL_BENCH_REAGENTS=[...REAGENTS.map(r=>({id:`aqueous:${r.id}`,name:r.name})),...MINERAL_STOCKS.map(r=>({id:`mineral:${r.id}`,name:r.name}))];
export const mineralReagentName=id=>MINERAL_BENCH_REAGENTS.find(r=>r.id===id)?.name||'No reagent added';
export function mineralProtocol(route,index){
  const step=MINERAL_STEPS[route]?.[index];if(!step)return null;
  const id=step.id,assay=['chloride','tin','thiosulfate','ammonium','oxalate','arsenazo'].includes(id);
  const apparatus=id==='arsenazo'?'photometer':assay?'rack':['filter','wash'].includes(id)?'filter':id==='microscope'?'microscope':id==='radiation'?'counter':id==='light'?'light':'reactor';
  const reagent={nitric:'mineral:min-nitric','nitric-probe':'mineral:min-nitric','hcl-probe':'aqueous:hcl','chloride-digest':'mineral:min-chloride-pack','ree-digest':'mineral:min-ree-pack',wash:'aqueous:water',chloride:'aqueous:salt',tin:'mineral:min-tin',thiosulfate:'mineral:min-thiosulfate',ammonium:'mineral:min-ammonium',oxalate:'mineral:min-oxalate',arsenazo:'mineral:min-arsenazo'}[id]||(id==='filter'&&route==='A'?'aqueous:water':null);
  const fraction=['thiosulfate','light'].includes(id)?'retained-test':assay?'solution':['filter','wash'].includes(id)?'slurry':'solid';
  const source=`${route}:${fraction}`;
  return {id,index,route,apparatus,reagent,source,sourceLabel:`${route} · ${fraction==='retained-test'?'retained chloride-test portions':fraction==='solution'?'separated test solution':fraction==='slurry'?'treated slurry':index?'remaining solid fraction':'untreated concentrate'}`,assay,
    mix:['reactor','rack','photometer'].includes(apparatus),duration:apparatus==='counter'?60:step.hood?90:30,
    verb:{reactor:'Run contained treatment',filter:'Filter & collect both fractions',rack:id==='thiosulfate'?'Treat & compare retained solids':'React & read the test vials',photometer:'React & measure cuvette absorbance',microscope:'Capture microscope fields',counter:'Count the sample',light:'Expose & inspect retained solid'}[apparatus],standard:{A:'Ag reference',B:'Au reference',C:'Pt reference',D:'REE group reference'}[route]};
}
export function mineralSources(s){
  return ['Original','E',...Object.keys(ROUTES)].flatMap(id=>id==='Original'||id==='E'?[{id:`${id}:solid`,name:`${id} · preserved reference`}]:['solid','slurry','solution','retained-test'].map(f=>({id:`${id}:${f}`,name:`${id} · ${f==='retained-test'?'retained chloride-test portions':f==='solution'?'separated test solution':f==='solid'?'solid fraction':'treated slurry'}`})));
}
export const emptyPreparation=()=>({mixed:false,tared:false,weighed:[]});
export const emptyMineralBench=index=>({index,apparatus:'',source:'',loaded:false,reagent:'',charge:0,mixed:false,filterSeated:false,focused:false,background:false,exposure:1,sampleFraction:.1,controls:{blank:false,positive:false,sample:false,spike:false},completed:false,events:[]});
export function mineralBench(s,route=s.route){
  const r=s.runs[route],index=s.pending?.route===route?r.index-1:r.index;
  return r.bench?.index===index?r.bench:emptyMineralBench(index);
}
export function validMineralBench(b,route){
  return b&&Number.isInteger(b.index)&&b.index>=0&&b.index<MINERAL_STEPS[route].length&&['',...Object.keys(MINERAL_APPARATUS)].includes(b.apparatus)&&typeof b.source==='string'&&['',...mineralSources().map(r=>r.id)].includes(b.source)&&['loaded','mixed','filterSeated','focused','background','completed'].every(k=>typeof b[k]==='boolean')&&['',...MINERAL_BENCH_REAGENTS.map(r=>r.id)].includes(b.reagent)&&Number.isFinite(b.charge)&&b.charge>=0&&b.charge<=2&&[.5,1,1.5].includes(b.exposure)&&[.05,.1,.2].includes(b.sampleFraction)&&b.controls&&Object.keys(b.controls).length===4&&['blank','positive','sample','spike'].every(k=>typeof b.controls[k]==='boolean')&&Array.isArray(b.events)&&b.events.length<=50&&b.events.every(v=>typeof v==='string'&&v.length<300);
}

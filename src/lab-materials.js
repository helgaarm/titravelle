import { ORGANIC_STOCKS } from './organic-data.js';
import { ELECTRO_MATERIALS } from './electro-data.js';

// Quantities are tracked independently of reaction support. Phase sketches are
// deliberately qualitative; supplied occupied volumes are not density predictions.
export const DRY_MATERIALS = [
  ['dry-salt','Sodium chloride · dry','NaCl','Dry salts','Dissolves in water. Avoid dust and ingestion.'],
  ['dry-bicarbonate','Sodium bicarbonate · dry','NaHCO3','Dry salts','Acid can release carbon dioxide. Keep gas-producing mixtures open.'],
  ['sugar','Sucrose · table sugar','C12H22O11','Dry organic materials','Water-soluble carbohydrate. Laboratory material is not food; avoid dust.'],
  ['citric','Citric acid · anhydrous','C6H8O7','Dry acids','Acidic when dissolved. Protect eyes and avoid inhaling dust.'],
  ['chalk','Calcium carbonate · chalk','CaCO3','Minerals & powders','Acid can release carbon dioxide. Reaction extent is not calculated here.'],
  ['starch','Starch','(C6H10O5)n','Dry organic materials','Cold-water suspension; heating and gelatinization require additional data. Avoid dust.'],
  ['sand','Silica sand','SiO2','Minerals & powders','Avoid creating or breathing silica dust. Use suitable containment for dusty handling.'],
  ['iron','Iron filings','Fe','Metals','Keep metal filings and dust away from ignition sources. Acid reactions may release hydrogen.'],
  ['magnesium','Magnesium ribbon','Mg','Metals','Flammable metal; acids may release flammable hydrogen. Ignition and combustion are not modeled.'],
  ['zinc','Zinc granules','Zn','Metals','Acids may release flammable hydrogen. Keep away from ignition sources and collect metal waste.'],
  ['carbon','Activated carbon','C','Minerals & powders','Avoid inhaling dust; fine carbon dust can be combustible. Adsorption is not quantified.'],
  ['dry-copper','Copper(II) sulfate pentahydrate','CuSO4·5H2O','Dry salts','Harmful if swallowed; aquatic hazard. Avoid dust/contact and collect copper-containing waste.'],
].map(([id,name,formula,group,hint])=>({id,name,formula,group,hint,scope:'dry',form:'solid'}));
export const DISPENSABLE_MATERIALS = [...ORGANIC_STOCKS.map(r=>({...r,scope:'organic'})),...DRY_MATERIALS,...ELECTRO_MATERIALS];
export const MATERIAL = Object.fromEntries(DISPENSABLE_MATERIALS.map(r=>[r.id,r]));
const liquids=new Set(['fame','iso18','branch15','branch14','other18','quench','solvent','methylAcetate','methanol','water','ester']);
export function defaultForm(id){return MATERIAL[id]?.form|| (liquids.has(id)?'liquid':'solid');}
export function hasMaterials(v){return Object.values(v.materials||{}).some(p=>p.mass>1e-10);}
export function materialRows(v){return Object.entries(v.materials||{}).filter(([,p])=>p.mass>1e-10).map(([key,p])=>({...p,key,material:MATERIAL[p.id]}));}
export function mergeMaterials(target,portion){
  if(!portion.materials)return;
  target.materials??={};
  for(const [key,p] of Object.entries(portion.materials)){
    const old=target.materials[key];
    target.materials[key]=old?{...old,mass:old.mass+p.mass,volume:old.volume+p.volume}:{...p};
  }
}
export function takeMaterials(v,out,ratio){
  if(!v.materials)return;
  out.materials={};
  for(const [key,p] of Object.entries(v.materials)){
    out.materials[key]={...p,mass:p.mass*ratio,volume:p.volume*ratio};
    p.mass=Math.max(0,p.mass-out.materials[key].mass);p.volume=Math.max(0,p.volume-out.materials[key].volume);
    if(p.mass<1e-12)delete v.materials[key];
  }
}
// Conservative room-temperature solubility caps (g per g water), not dissolution
// kinetics. Other materials are kept as additions with explicitly unresolved chemistry.
export function dissolveSimpleSalts(v){
  const caps={'dry-salt':{cap:.35,mm:58.44,ions:{Na:1,Cl:1},present:()=>Math.max(v.totals.Na,v.totals.Cl)*58.44},
    'dry-bicarbonate':{cap:.09,mm:84.01,ions:{Na:1,C:1},present:()=>Math.max(v.totals.Na,v.totals.C)*84.01}};
  for(const [key,p] of Object.entries(v.materials||{})){
    const rule=caps[p.id];if(!rule||v.waterMass<=0)continue;
    // Solubility in mixed organic solvents or with other added materials is unresolved.
    if(materialRows(v).some(r=>!caps[r.id]))continue;
    const dissolved=Math.min(p.mass,Math.max(0,v.waterMass*rule.cap-rule.present()));
    if(!dissolved)continue;
    const fraction=dissolved/p.mass;p.mass-=dissolved;p.volume*=1-fraction;
    for(const [ion,n] of Object.entries(rule.ions))v.totals[ion]+=dissolved/rule.mm*n;
    if(p.mass<1e-12)delete v.materials[key];
  }
}
export function materialWarning(v){
  if(!hasMaterials(v))return '';
  const reactive=materialRows(v).some(r=>r.id==='methoxide')&&v.waterMass>1e-9;
  return `${reactive?'Sodium methoxide reacts with water to form methanol and sodium hydroxide; its conversion and heat release are not calculated here. ':''}This sample contains weighed materials. Mass, assigned volume and transfers are tracked; full dissolution, partitioning, pH, reaction yield and thermal predictions are unavailable for this mixture. The contents list records additions, not confirmed chemical species.`;
}
export function materialAppearance(v){
  const rows=materialRows(v);if(!rows.length)return null;
  const solid=rows.some(r=>r.form==='solid'), liquidVolume=rows.filter(r=>r.form==='liquid').reduce((n,r)=>n+r.volume,0);
  const solidVolume=rows.filter(r=>r.form==='solid').reduce((n,r)=>n+r.volume,0);
  const carrier=Math.max(0,v.volume-solidVolume-liquidVolume);
  const miscible=rows.every(r=>r.form==='liquid'&&['methanol','quench'].includes(r.id));
  // A deliberately labelled water/FAME phase illustration, disabled with cosolvents.
  const oilOnly=rows.every(r=>r.form==='liquid'&&['fame','iso18','branch15','branch14','other18'].includes(r.id));
  const layered=oilOnly&&v.waterMass>1e-9;
  return {solid,solidVolume,liquidVolume:carrier+liquidVolume,pureSolid:carrier+liquidVolume<1e-9,
    layerFraction:layered&&!v.mixed?liquidVolume/v.volume:0,
    text:layered?(v.mixed?'Dispersed liquid phases · schematic mixture; remix before sampling':'Two liquid regions · water/FAME illustration; exact partitioning and layer volumes unresolved')
      :solid?(carrier+liquidVolume>1e-9?'Solid addition in liquid · dissolution and final phases unresolved':'Solid material in vessel · weighed sample')
      :miscible?(v.waterMass>1e-9?'Water-miscible liquid addition · mixed-solvent chemistry unresolved':'Liquid sample · nonaqueous chemistry unresolved')
      :'Liquid additions · phase behaviour unresolved'};
}
export function validMaterials(v){
  if(v.nitrogenOn!==undefined&&typeof v.nitrogenOn!=='boolean')return false;
  if(v.materials===undefined)return true;
  if(!v.materials||Array.isArray(v.materials)||typeof v.materials!=='object')return false;
  let mass=0,volume=0;
  for(const [key,p] of Object.entries(v.materials)){
    if(!p||!Object.hasOwn(MATERIAL,p.id)||['nitrogen','water'].includes(p.id)||!['solid','liquid'].includes(p.form)||key!==`${p.id}:${p.form}`)return false;
    if(!Number.isFinite(p.mass)||!Number.isFinite(p.volume)||p.mass<=0||p.volume<=0)return false;
    mass+=p.mass;volume+=p.volume;
  }
  return mass<=v.mass+1e-7&&volume<=v.volume+1e-7&&mass+v.waterMass<=v.mass+1e-7;
}

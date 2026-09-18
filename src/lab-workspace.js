import { REAGENTS, EQUIPMENT, STUDIES } from './lab-data.js';
import { DISPENSABLE_MATERIALS } from './lab-materials.js';
import { createOrganic } from './organic-engine.js';
import { createLab } from './lab-engine.js';
import { createElectro, electroPreset } from './electro-engine.js';

export const FREE_LAB = { id:null, title:'Free exploration', objective:'', question:'', steps:[], analysis:'' };

export const LAB_STATIONS = [
  ['aqueous', 'Vessel bench'], ['prepare', 'Preparation'], ['reaction', 'Reactor'],
  ['workup', 'Work-up'], ['analysis', 'Analysis'], ['materials', 'Materials & controls'], ['report', 'Organic report'],
  ['electro', 'Electrochemistry'],
];
const organicLocation = r => r.group === 'Controls' ? 'materials'
  : ['methoxide', 'methylAcetate'].includes(r.id) ? 'reaction'
  : r.group === 'Work-up' ? 'workup' : 'prepare';
export const LAB_MATERIALS = [
  ...REAGENTS.map(r => ({...r, catalogId:`aqueous:${r.id}`, scope:'aqueous', station:'aqueous', use:'Aqueous stock · dispense with the selected measuring tool.'})),
  ...DISPENSABLE_MATERIALS.map(r => ({...r, catalogId:`${r.scope}:${r.id}`, station:r.scope==='dry'?'aqueous':r.scope==='electro'?'electro':organicLocation(r),
    use:r.scope==='electro'?'Use in ordinary glassware, or select this material in the Electrochemistry cell preparation controls.':r.id==='nitrogen'?'Apply gas flow at the selected vessel or connect the reactor nitrogen supply.'
      :'Weigh into any vessel using the controls below. Reactor operations remain available separately.'})),
];
export const LAB_TOOLS = [
  ...EQUIPMENT.map(e=>({id:e.id,name:e.name,station:'aqueous',vessel:e.id})),
  ...[['ph','pH meter'],['mass','Analytical balance'],['temperature','Thermometer']].map(([id,name])=>({id,name,station:'aqueous',anchor:'sl-last-reading'})),
  {id:'apparatus',name:'Nitrogen, stirrer, vacuum, cold trap & pressure gauge',station:'prepare',anchor:'org-apparatus'},
  {id:'reactor',name:'Heated organic reactor',station:'reaction'},
  {id:'separation',name:'Neutralization, separation & vacuum drying',station:'workup'},
  {id:'feed-gc',name:'Feed GC-FID / GC-MS & Karl Fischer',station:'prepare'},
  {id:'product-qc',name:'Product qNMR, HPLC / ELSD, MS & purity checks',station:'analysis'},
  {id:'materials',name:'DSC / TGA, wetting & friction instruments',station:'materials'},
  ...[['cell','Electrolysis cell & electrode holders','cell','el-preparation'],['power','DC supply, current limit & timer','cell','el-power'],['circuit','Circuit leads, ammeter & voltmeter','cell','el-circuit'],['electro-meters','Cell multimeter, charge, pH, conductivity & balance','results','el-measurements'],['electro-graphs','Electrode and gas time series','results','el-graphs'],['potentiostat','Polarization, Tafel & cyclic voltammetry','advanced','el-advanced'],['electro-report','Electrochemistry report','report','el-report']].map(([id,name,panel,anchor])=>({id,name,panel,anchor,station:'electro'})),
];
export function stationOf(state) {
  return state.station ?? (state.study === 'soi18' ? 'prepare' : state.study?.startsWith('electro-')?'electro':'aqueous');
}
// Opening equipment never advances time, samples a material, or changes the guide.
export function openStation(state, station) {
  if (!LAB_STATIONS.some(([id])=>id===station)) throw Error('Choose available laboratory equipment.');
  return {...state, station, ...(station==='electro'&&!state.electro?{electro:createElectro(state.seed)}:{}),...(station !== 'aqueous' && station !== 'electro' && !state.organic ? {organic:createOrganic(state.seed)} : {})};
}

// An explicit null leaves the experiment; an omitted id repeats the current run.
export function restartLab(state, studyId = state.study ?? null) {
  const study = studyId === null ? FREE_LAB : [...STUDIES,...state.customStudies].find(s=>s.id===studyId);
  if (!study) throw Error('Choose an available experiment or restart without an experiment.');
  const fresh = createLab((state.seed + 1) >>> 0);
  fresh.notes = structuredClone(state.notes);
  fresh.customStudies = structuredClone(state.customStudies);
  fresh.mode = studyId === null ? 'free' : state.study === null ? 'guided' : state.mode;
  fresh.ideal = state.ideal;
  fresh.ventilationOn = state.ventilationOn === true;
  fresh.study = studyId;
  fresh.draft.objective = study.objective;
  if(study.preset)fresh.electro=electroPreset(study.preset,fresh.seed);
  return openStation(fresh, studyId === 'soi18' ? 'prepare' : study.preset?'electro':'aqueous');
}

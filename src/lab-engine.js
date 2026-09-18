import { CONSTANTS as K, REAGENT, EQUIPMENT, EQUIPMENT_BY_ID, DELIVERY, SPECIES } from './lab-data.js';
import { recordReactions, equationReport, validReactionHistory } from './lab-reactions.js';
import { COPPER, copperEquilibrium } from './lab-copper.js';
import { validOrganic } from './organic-engine.js';
import { validElectro } from './electro-engine.js';
import { MATERIAL, hasMaterials, materialWarning, materialAppearance, mergeMaterials, takeMaterials, dissolveSimpleSalts, validMaterials } from './lab-materials.js';

const clone = value => structuredClone(value);
const positive = (value, maximum = 100000) => {
  if (!Number.isFinite(value) || value <= 0 || value > maximum) throw Error('Enter a positive amount within the instrument range.');
  return value;
};
export function emptyVessel(id) {
  return { id, volume: 0, mass: 0, waterMass: 0, temperature: 25, totals: Object.fromEntries(Object.keys(SPECIES).map(s => [s, 0])), indicators: {}, mixed: true, dry: false, delivered: 0, trial: 0, stock: null, reactionHistory: [], reactionHistoryComplete: true };
}
export function createLab(seed = Date.now() >>> 0) {
  const s = { version: 2, seed: seed || 1, ideal: false, mode: 'guided', study: 'indicators', selected: 'beaker', time: 0, ventilationOn: false,
    vessels: Object.fromEntries(EQUIPMENT.map(e => [e.id, emptyVessel(e.id)])), gasMoles: 0, wasteMass: 0, evaporatedMass: 0,
    meterCalibrated: false, balanceTare: 0, buretteRinsed: false, log: [], measurements: [], endpoints: [],
    draft: { objective: '', hypothesis: '', procedure: '', observations: '', calculations: '', equations: '', conclusion: '', errors: '' },
    notes: [], customStudies: [], unknown: 0.1, revealed: false };
  s.unknown = (75 + Math.floor(random(s) * 51)) / 1000;
  // A water-wet burette makes conditioning consequential.
  s.vessels.burette.volume = s.vessels.burette.mass = s.vessels.burette.waterMass = 0.5;
  return s;
}
export function random(s) { s.seed = (1664525 * s.seed + 1013904223) >>> 0; return s.seed / 4294967296; }
const jitter = (s, tolerance) => s.ideal ? 0 : (random(s) * 2 - 1) * tolerance;
const copperCache = new WeakMap();
function copperResult(v) {
  const key = [v.volume,...Object.values(v.totals)].join('|'), saved = copperCache.get(v);
  if (saved?.key === key) return saved.result;
  const result = copperEquilibrium(v); copperCache.set(v,{key,result}); return result;
}
export function supported(v) {
  if(hasMaterials(v))return materialWarning(v);
  const t = v.totals;
  if ((t.Cu > 1e-14 || t.SO4 > 1e-14) && (t.Ac > 1e-14 || t.C > 1e-14 || t.Ag > 1e-14)) return 'This sulfate/copper mixture also contains acetate, carbonate, or silver. Their competing complexes and solids are not included in the copper model; pH and reaction predictions are withheld. Copper with water, chloride, strong acid, or hydroxide is supported.';
  if (t.Cu > 1e-14 && v.dry) return 'Dry copper residues require hydration and solid-phase data; aqueous predictions are withheld.';
  if (t.Ag > 1e-14 && (t.Ac > 1e-14 || t.C > 1e-14 || t.Na + t.Ag - t.Cl - t.NO3 > 1e-10)) return 'Silver with acetate, carbonate, or excess hydroxide requires additional equilibria. Material transfers remain available; reaction predictions are withheld.';
  return '';
}
export function phases(v) {
  const { Ag: a, Cl: b } = v.totals;
  const liters = v.volume / 1000;
  if (liters && !v.dry && !supported(v) && (v.totals.Cu > 1e-14 || v.totals.SO4 > 1e-14)) return copperResult(v);
  const solid = v.dry ? Math.min(a, b) : (!liters || supported(v) ? 0 : Math.max(0, (a + b - Math.sqrt((a - b) ** 2 + 4 * K.agclKsp * liters ** 2)) / 2));
  return { solid, copperSolid: 0, solidMass: solid * K.agclMolarMass, dissolved: { ...v.totals, Ag: a - solid, Cl: b - solid } };
}
export function chemistry(v) {
  const p = phases(v), liters = v.volume / 1000, warning = supported(v);
  if (!liters || warning) return { ...p, pH: null, warning, ions: {} };
  if (p.speciation) return p;
  const d = p.dissolved;
  const fixed = (d.Na + d.Ag + 2 * d.Cu - d.Cl - d.NO3 - 2 * d.SO4) / liters;
  const residual = ph => {
    const h = 10 ** -ph, den = h * h + K.carbonKa1 * h + K.carbonKa1 * K.carbonKa2;
    return h + fixed - K.kw / h - (d.Ac / liters) * K.acetateKa / (K.acetateKa + h)
      - (d.C / liters) * (K.carbonKa1 * h + 2 * K.carbonKa1 * K.carbonKa2) / den;
  };
  let lo = -2, hi = 16;
  for (let i = 0; i < 85; i++) { const mid = (lo + hi) / 2; if (residual(mid) > 0) lo = mid; else hi = mid; }
  const pH = (lo + hi) / 2, h = 10 ** -pH;
  return { ...p, pH, warning, ions: { ...Object.fromEntries(Object.entries(d).map(([id, n]) => [id, n / liters])), H: h, OH: K.kw / h, acetate: d.Ac / liters * K.acetateKa / (K.acetateKa + h) } };
}
export function predictEquations(v) { return equationReport(v, chemistry(v)); }
export function appearance(v) {
  const material=materialAppearance(v);
  if(material)return {colour:'#b7cdbd',name:'Material sample',text:material.text,solid:material.solid,solidColour:'#e3d8af',...material};
  const c = chemistry(v), dyes = Object.keys(v.indicators).filter(id => v.indicators[id] > 1e-8);
  let colour = '#bddbdc', name = 'Colourless';
  if (v.totals.Cu > 1e-14) {
    const dissolvedCopper = c.dissolved.Cu / (v.volume/1000 || 1);
    colour = dissolvedCopper > 0.001 ? '#4594c3' : dissolvedCopper > 1e-5 ? '#a4d2df' : '#bddbdc';
    name = dissolvedCopper > 0.001 ? 'Blue' : dissolvedCopper > 1e-5 ? 'Pale blue' : 'Nearly colourless';
  }
  else if (dyes.length > 1) { colour = '#a9a4a0'; name = 'Mixed indicators — colour not predicted'; }
  else if (dyes.length && c.pH !== null) {
    const ph = c.pH, dye = dyes[0];
    if (dye === 'phenol' && ph > 8.2) { colour = '#dc71ad'; name = ph < 9 ? 'Pale pink' : 'Pink'; }
    if (dye === 'methyl') { colour = ph < 3.1 ? '#d85557' : ph > 4.4 ? '#e5c643' : '#df9745'; name = ph < 3.1 ? 'Red' : ph > 4.4 ? 'Yellow' : 'Orange'; }
    if (dye === 'bromothymol') { colour = ph < 6 ? '#e5c643' : ph > 7.6 ? '#4979c4' : '#71a884'; name = ph < 6 ? 'Yellow' : ph > 7.6 ? 'Blue' : 'Green'; }
    if (dye === 'universal') {
      const index = ph < 3 ? 0 : ph < 6 ? 1 : ph < 8 ? 2 : ph < 11 ? 3 : 4;
      colour = ['#d85557', '#dfad43', '#72aa7d', '#5595b8', '#9973b5'][index]; name = ['Red', 'Yellow–orange', 'Green', 'Blue', 'Violet'][index];
    }
  }
  return { colour, name, text: v.dry ? 'Dry residue on the filter' : !v.volume ? 'Empty vessel' : `${name.toLowerCase()} liquid${c.solidMass > 1e-5 ? c.copperSolid > 0 ? '; a blue solid is visible' : '; a white solid is visible' : '; no visible solid'}`, solid: c.solidMass > 1e-5, solidColour: c.copperSolid > 0 ? '#6ab9d7' : '#f6f4e8' };
}
function resolveGas(s, v) {
  if (supported(v) || !v.volume) return;
  const t = v.totals;
  const escaped = Math.min(t.C, Math.max(0, t.Cl + t.NO3 + 2 * t.SO4 - t.Na - t.Ag - 2 * t.Cu + t.Ac + t.C));
  if (escaped > 1e-12) { t.C -= escaped; v.mass -= escaped * 44.01; v.waterMass += escaped * 18.015; s.gasMoles += escaped; }
}
function combine(s, target, portion) {
  if (target.dry) throw Error('Start with a clean filter before adding liquid to a dried residue.');
  if (target.volume + portion.volume > EQUIPMENT_BY_ID[target.id].capacity + 1e-7) throw Error('This amount exceeds the receiving vessel capacity. Choose a larger vessel.');
  const left = clone(target), before = chemistry(target), added = chemistry(portion), gasBefore = s.gasMoles;
  let heat = 0;
  if (before.pH !== null && added.pH !== null && !target.totals.Ac && !portion.totals.Ac && !target.totals.C && !portion.totals.C && !target.totals.SO4 && !portion.totals.SO4 && !target.totals.Cu && !portion.totals.Cu) {
    const acid = v => Math.max(0, v.totals.Cl + v.totals.NO3 - v.totals.Na - v.totals.Ag);
    const base = v => Math.max(0, v.totals.Na + v.totals.Ag - v.totals.Cl - v.totals.NO3);
    heat = (Math.min(acid(target), base(portion)) + Math.min(base(target), acid(portion))) * K.neutralizationJ;
  }
  const oldC = target.mass * K.cp + EQUIPMENT_BY_ID[target.id].heatCapacity, newC = portion.mass * K.cp;
  target.temperature = (oldC * target.temperature + newC * portion.temperature + heat) / (oldC + newC || 1);
  target.volume += portion.volume; target.mass += portion.mass; target.waterMass += portion.waterMass + heat / K.neutralizationJ * 18.015;
  for (const id of Object.keys(SPECIES)) target.totals[id] += portion.totals[id];
  for (const [id, amount] of Object.entries(portion.indicators)) target.indicators[id] = (target.indicators[id] || 0) + amount;
  mergeMaterials(target,portion);
  dissolveSimpleSalts(target);
  target.mixed = false;
  resolveGas(s, target);
  recordReactions(target, left, portion, before, added, chemistry(target), heat, s.gasMoles - gasBefore, s.time);
}
export function addStock(s, vesselId, reagentId, ml, concentration = 0.1, tool = 'pipette', temperature = 25, exact = false) {
  const reagent = REAGENT[reagentId], v = s.vessels[vesselId], instrument = DELIVERY[tool];
  if (!reagent || !v || !instrument || tool === 'burette') throw Error('Choose a reagent, vessel, and suitable dispensing tool. Deliver from the actual burette with Transfer.');
  positive(ml, instrument.max);
  if (![0.01, 0.1, 1].includes(concentration)) throw Error('Choose a listed stock concentration.');
  if (!Number.isFinite(temperature) || temperature < 5 || temperature > 80) throw Error('Stock temperature must be 5–80 °C.');
  const actual = exact || s.ideal ? ml : Math.max(ml * 0.5, ml + jitter(s, instrument.tolerance));
  const portion = emptyVessel('beaker'); portion.volume = portion.mass = actual; portion.temperature = temperature;
  const n = reagentId === 'water' || reagent.group === 'Indicators' ? 0 : actual / 1000 * (reagentId === 'unknown' ? s.unknown : concentration);
  for (const [id, ratio] of Object.entries(reagent.ions)) portion.totals[id] = n * ratio;
  portion.waterMass = Math.max(0, actual - n * reagent.mm);
  if (reagent.group === 'Indicators') portion.indicators[reagentId] = actual;
  portion.stock = n ? reagentId : null;
  combine(s, v, portion);
}
function removePortion(v, ml, includeSolid = true) {
  positive(ml);
  if (ml > v.volume + 1e-7 || !v.volume) throw Error('There is not enough liquid in the source vessel.');
  if(hasMaterials(v)){
    if(!v.mixed&&ml<v.volume-1e-7)throw Error('Mix the material sample before taking a representative portion, or transfer the whole sample. Layer-selective sampling is not modeled.');
    includeSolid=true;
  }
  const ratio = Math.min(1, ml / v.volume), p = phases(v), out = emptyVessel('beaker');
  out.volume = ml; out.temperature = v.temperature;
  out.stock = v.stock ?? null;
  out.mass = (v.mass - (includeSolid ? 0 : p.solidMass)) * ratio;
  out.waterMass = v.waterMass * ratio;
  for (const id of Object.keys(SPECIES)) out.totals[id] = (includeSolid ? v.totals[id] : p.dissolved[id]) * ratio;
  for (const [id, amount] of Object.entries(v.indicators)) { out.indicators[id] = amount * ratio; v.indicators[id] -= out.indicators[id]; }
  takeMaterials(v,out,ratio);
  v.volume -= ml; v.mass = Math.max(0, v.mass - out.mass); v.waterMass = Math.max(0, v.waterMass - out.waterMass);
  for (const id of Object.keys(SPECIES)) v.totals[id] = Math.max(0, v.totals[id] - out.totals[id]);
  return out;
}
export function transfer(s, from, to, ml, tool = 'pipette', exact = false) {
  const instrument = DELIVERY[tool];
  if (!instrument || from === to || !s.vessels[from] || !s.vessels[to]) throw Error('Choose distinct source and receiving vessels.');
  if(['pipette','burette'].includes(tool)&&materialAppearance(s.vessels[from])?.pureSolid)throw Error('A dry solid cannot be pipetted. Use Transfer sample by mass or Transfer entire sample.');
  positive(ml, instrument.max);
  if (tool === 'burette' && from !== 'burette') throw Error('Burette delivery requires the burette as the source.');
  // Remaining liquid can always be quantitatively transferred without a negative residual.
  const actual = exact ? ml : Math.min(s.vessels[from].volume, Math.max(ml * 0.5, ml + jitter(s, instrument.tolerance)));
  if (ml > s.vessels[from].volume + 1e-7) throw Error('Requested volume exceeds the liquid remaining in the source.');
  const portion = removePortion(s.vessels[from], actual, s.vessels[from].mixed);
  combine(s, s.vessels[to], portion);
  if (from === 'burette') s.vessels[to].delivered += actual;
}
function stamp(s, text) {
  s.log.push({ time: s.time, date: new Date().toISOString(), text });
  if (s.log.length > 1000) s.log.shift();
}
export function measure(s, kind, vesselId = s.selected) {
  const v = s.vessels[vesselId], e = EQUIPMENT_BY_ID[vesselId], c = chemistry(v);
  let value, unit, uncertainty, note = '';
  if(kind==='temperature'&&hasMaterials(v))throw Error('A temperature prediction for this material mixture needs heat-capacity and reaction-heat data. Mass and assigned-volume readings are available.');
  if (kind === 'ph') {
    if (c.pH === null) throw Error(c.warning || 'Add a solution before using the pH meter.');
    uncertainty = s.ideal ? 0 : 0.02; unit = 'pH';
    value = c.pH + jitter(s, uncertainty) + (s.ideal || s.meterCalibrated ? 0 : 0.18) + (s.ideal || v.mixed ? 0 : 0.12);
    note = `${s.meterCalibrated ? 'Calibrated' : 'Not calibrated'}; ${v.mixed ? 'mixed' : 'not mixed (sampling bias)'}${c.speciation ? '; ideal-concentration copper/sulfate estimate at 25 °C' : ''}`;
  } else if (kind === 'temperature') { if (!v.mass) throw Error('Add a sample first.'); value = v.temperature + jitter(s, 0.1); unit = '°C'; uncertainty = s.ideal ? 0 : 0.1; }
  else if (kind === 'mass') { value = v.mass + e.tare - s.balanceTare + jitter(s, 0.0001); unit = 'g'; uncertainty = s.ideal ? 0 : 0.0001; note = `Balance zero: ${s.balanceTare.toFixed(4)} g`; }
  else if (kind === 'volume') { uncertainty = s.ideal ? 0 : e.type === 'volumetric' ? 0.1 : e.type === 'cylinder' ? 0.5 : 2; value = v.volume + jitter(s, uncertainty); unit = 'mL'; }
  else if (kind === 'burette') { if (vesselId !== 'burette') throw Error('Select the burette to read its meniscus.'); value = 50 - v.volume + jitter(s, 0.025); unit = 'mL'; uncertainty = s.ideal ? 0 : 0.025; }
  else throw Error('Unknown instrument.');
  if(hasMaterials(v)&&['volume','burette'].includes(kind))note='Includes assigned occupied volumes of weighed additions; not a predicted solution volume or calibrated solid displacement.';
  const decimals = kind === 'mass' ? 4 : kind === 'temperature' ? 1 : 2;
  const record = { id: s.measurements.length + 1, date: new Date().toISOString(), time: s.time, vessel: vesselId, trial: v.trial || 0, kind, value: Number(value.toFixed(decimals)), unit, uncertainty, delivered: Number(v.delivered.toFixed(3)), note, ideal: s.ideal };
  s.measurements.push(record); if (s.measurements.length > 1000) s.measurements.shift();
  return record;
}
// All UI operations are transactional: capacity/validation errors never consume a sample.
export function operate(state, action, args = {}) {
  const s = clone(state), v = s.vessels[args.vessel || s.selected];
  if (!v) throw Error('Unknown vessel.');
  let message = '';
  if (action === 'add') { addStock(s, v.id, args.reagent, args.ml, args.concentration, args.tool, args.temperature); message = `Dispensed ${args.ml} mL ${REAGENT[args.reagent].name}${['water', 'unknown'].includes(args.reagent) || REAGENT[args.reagent].group === 'Indicators' ? '' : ` (${args.concentration} M)`} into ${EQUIPMENT_BY_ID[v.id].name} using ${DELIVERY[args.tool].name}.`; }
  else if(action==='add-material'){
    const material=Object.hasOwn(MATERIAL,args.material)?MATERIAL[args.material]:null;
    if(!material||args.material==='nitrogen')throw Error('Choose a weighed material; nitrogen uses the gas-flow control.');
    positive(args.mass,250);
    if(args.material==='water')addStock(s,v.id,'water',args.mass,.1,'beaker',25,true);
    else {
      positive(args.volume,250);if(!['liquid','solid'].includes(args.form))throw Error('Choose the physical form of the addition.');
      const portion=emptyVessel('beaker');portion.mass=args.mass;portion.volume=args.volume;
      portion.materials={[`${args.material}:${args.form}`]:{id:args.material,form:args.form,mass:args.mass,volume:args.volume}};
      combine(s,v,portion);
    }
    message=`Weighed ${args.mass} g ${material.name} into ${EQUIPMENT_BY_ID[v.id].name}${args.material==='water'?'.':`; assigned occupied volume ${args.volume} mL (${args.form}). Volume is an input, not a calculated density or solution-volume prediction.`}`;
  }
  else if(action==='transfer-mass'){
    const source=s.vessels[args.from],receiver=s.vessels[args.to];positive(args.mass,250);
    if(!source||!receiver||source===receiver||source.dry||source.mass<=0||source.volume<=0||args.mass>source.mass+1e-9)throw Error('Choose distinct vessels and a mass within the available sample. Dried filter residue is not transferable with this tool.');
    if(!source.mixed&&args.mass<source.mass-1e-9)throw Error('Mix the sample before transferring a representative partial mass, or transfer its entire mass.');
    const portion=removePortion(source,source.volume*Math.min(1,args.mass/source.mass),true);
    combine(s,receiver,portion);message=`Transferred ${args.mass} g of the sample from ${EQUIPMENT_BY_ID[source.id].name} to ${EQUIPMENT_BY_ID[receiver.id].name}. All tracked ingredients move in the representative portion.`;
  }
  else if(action==='nitrogen'){
    if(typeof args.enabled!=='boolean')throw Error('Choose nitrogen flow on or off.');
    v.nitrogenOn=args.enabled;message=`Nitrogen flow ${args.enabled?'ON':'OFF'} at ${EQUIPMENT_BY_ID[v.id].name}. Open-vessel gas flow adds no retained mass; oxygen displacement and dissolved gas are not calculated.`;
  }
  else if (action === 'transfer') { transfer(s, args.from, args.to, args.ml, args.tool); message = `Transferred a nominal ${args.ml} mL from ${EQUIPMENT_BY_ID[args.from].name} to ${EQUIPMENT_BY_ID[args.to].name} using ${DELIVERY[args.tool].name}.`; }
  else if (action === 'pour') { transfer(s, args.from, args.to, s.vessels[args.from]?.volume, 'beaker', true); message = `Transferred all liquid from ${EQUIPMENT_BY_ID[args.from].name} to ${EQUIPMENT_BY_ID[args.to].name}. Mix first to carry suspended solids with the liquid.`; }
  else if (action === 'ventilation') {
    if (typeof args.enabled !== 'boolean') throw Error('Choose ventilation on or off.');
    s.ventilationOn = args.enabled;
    message = `Switched simulated fume hood ventilation ${args.enabled ? 'ON' : 'OFF'}. This records local exhaust status, not a measured exposure or confirmation of safe conditions.`;
  }
  else if (action === 'mix') { dissolveSimpleSalts(v);resolveGas(s,v);v.mixed = true; message = `Mixed ${EQUIPMENT_BY_ID[v.id].name}.`; }
  else if (action === 'empty') { s.wasteMass += v.mass; s.vessels[v.id] = emptyVessel(v.id); if(v.nitrogenOn)s.vessels[v.id].nitrogenOn=true; s.vessels[v.id].trial = (v.trial || 0) + 1; message = `Emptied ${EQUIPMENT_BY_ID[v.id].name} into the waste ledger. Started a new measurement trial for this vessel.`; }
  else if (action === 'calibrate') { s.meterCalibrated = true; message = 'Calibrated the pH meter using virtual reference buffers.'; }
  else if (action === 'tare') { s.balanceTare = v.mass + EQUIPMENT_BY_ID[v.id].tare; message = `Tared the balance with ${EQUIPMENT_BY_ID[v.id].name} and its current contents.`; }
  else if (action === 'measure') { const m = measure(s, args.kind, v.id); message = `${EQUIPMENT_BY_ID[v.id].name}: ${m.value} ${m.unit}. ${m.note}`; }
  else if (action === 'rinse') {
    if (!REAGENT[args.reagent] || REAGENT[args.reagent].group === 'Indicators') throw Error('Select an aqueous stock for conditioning the burette.');
    const b = s.vessels.burette; s.wasteMass += b.mass + 3; s.vessels.burette = emptyVessel('burette'); s.buretteRinsed = true;
    message = `Conditioned and drained the burette with 3 mL of ${REAGENT[args.reagent]?.name || 'selected stock'}; fill with the same stock next.`;
  } else if (action === 'fill-burette') {
    if (!REAGENT[args.reagent] || REAGENT[args.reagent].group === 'Indicators') throw Error('Select a titrant stock for the burette.');
    const volume = 50 - s.vessels.burette.volume;
    if (volume < 0.001) throw Error('The burette is already filled to the zero mark.');
    addStock(s, 'burette', args.reagent, volume, args.concentration, 'cylinder', 25, true);
    message = `Filled the burette to its zero mark with ${REAGENT[args.reagent].name}. Any previous liquid remains mixed with the fill.`;
  } else if (action === 'mark') {
    if (v.id !== 'volumetric') throw Error('The calibrated 100 mL mark belongs to the volumetric flask.');
    const target = 100 + jitter(s, 0.1); if (v.volume >= target) throw Error('The liquid is already at or above the mark. Removing mixture also removes solute.');
    addStock(s, v.id, 'water', target - v.volume, 0.1, 'beaker', 25, true); message = 'Added distilled water to the 100 mL calibration mark.';
  } else if (action === 'heat' || action === 'cool' || action === 'wait') {
    const seconds = positive(args.seconds, 600);
    if(action!=='wait'&&hasMaterials(v))throw Error('This mixture can be handled and weighed, but its heating/cooling calculation needs material heat capacities, phase-change and reaction-heat data.');
    if (action !== 'wait' && (!v.volume || ['burette', 'volumetric', 'filter'].includes(v.id))) throw Error('Use a liquid sample in a beaker, Erlenmeyer flask, cylinder, or cup for this temperature operation.');
    for (const vessel of Object.values(s.vessels)) {
      if (!vessel.mass) continue;
      if(hasMaterials(vessel)){vessel.mixed=false;continue;}
      const capacity = vessel.mass * K.cp + EQUIPMENT_BY_ID[vessel.id].heatCapacity;
      const environment = action === 'cool' && vessel.id === v.id ? 5 : 25;
      const conductance = vessel.id === 'cup' ? 0.15 : 0.6;
      const power = action === 'heat' && vessel.id === v.id ? 50 : 0;
      const steady = environment + power / conductance;
      vessel.temperature = Math.min(80, steady + (vessel.temperature - steady) * Math.exp(-conductance * seconds / capacity));
    }
    s.time += seconds; message = `${action === 'heat' ? 'Applied a 50 W hotplate (80 °C cutoff)' : action === 'cool' ? 'Placed selected vessel in a 5 °C cooling bath' : 'Waited at room temperature'} for ${seconds} s.`;
  } else if (action === 'filter') {
    const receiver = s.vessels[args.to], filter = s.vessels.filter;
    if (!receiver || receiver.id === v.id || [v.id, receiver.id].includes('filter') || !v.volume || filter.mass > 1e-8) throw Error('Use a liquid sample, a different receiving vessel, and a clean filter.');
    if (supported(v)) throw Error('Filtration prediction is unavailable for this unsupported mixture.');
    if (receiver.volume + v.volume > EQUIPMENT_BY_ID[receiver.id].capacity) throw Error('The receiver cannot hold all the filtrate.');
    const initial = phases(v);
    const retained = Math.min(1, v.volume * 0.02);
    combine(s, receiver, removePortion(v, v.volume - retained, false));
    combine(s, filter, removePortion(v, v.volume, true));
    if (!s.ideal) {
      for (const [field,mm,components] of [['solid',K.agclMolarMass,['Ag','Cl']],['copperSolid',COPPER.molarMass,['Cu']]]) {
        const lost = Math.min(initial[field] * 0.02, phases(filter)[field]), mass = lost * mm;
        for (const id of components) { filter.totals[id] -= lost; receiver.totals[id] += lost; }
        filter.mass -= mass; receiver.mass += mass;
      }
    }
    message = 'Collected liquid in the receiver and retained wet material on the filter. Realistic mode permits 2% initial solid breakthrough; dissolved material also passes through.';
  } else if (action === 'wash') {
    const f = s.vessels.filter;
    if(hasMaterials(f))throw Error('Washing this mixture requires solubility and phase-separation data. Use a representative sample transfer to move tracked additions.');
    if (!f.mass || f.dry || args.to === 'filter' || !s.vessels[args.to]) throw Error('Wash a wet filter into a different receiving vessel.');
    addStock(s, 'filter', 'water', 5, 0.1, 'pipette', 25, true); f.mixed = true;
    combine(s, s.vessels[args.to], removePortion(f, f.volume - 0.5, false));
    message = 'Washed the retained material with 5 mL water; collected washings. Some solid can dissolve according to Ksp.';
  } else if (action === 'dry') {
    if (v.id !== 'filter' || !v.mass || v.dry) throw Error('Select a wet filter residue to dry.');
    if(hasMaterials(v))throw Error('Drying this material mixture requires volatility and decomposition data; no mass is removed.');
    if (v.totals.Cu > 1e-14) throw Error('Copper residue drying is not calculated: hydration and conversion to other copper solids require a separate model. Wet filtration, washing, and mass readings remain available.');
    s.evaporatedMass += v.waterMass; v.mass = Math.max(0, v.mass - v.waterMass); v.waterMass = 0; v.volume = 0; v.dry = true;
    message = 'Dried the filter to constant model mass. Dissolved nonvolatile salts remain with the residue.';
  } else if (action === 'endpoint') { const r = measure(s, 'burette', 'burette'); s.endpoints.push({ ...r, observation: String(args.observation || 'Endpoint selected by student').slice(0, 500) }); message = `Marked an observed endpoint at burette reading ${r.value} mL.`; }
  else throw Error('Unknown bench operation.');
  const gasDelta = s.gasMoles - state.gasMoles;
  if (gasDelta > 1e-12) message += ' Bubbles formed and gas escaped.';
  if (['add', 'add-material', 'transfer', 'transfer-mass', 'mix', 'filter'].includes(action)) message += ` Observation: ${appearance(s.vessels[['transfer','transfer-mass'].includes(action) ? args.to : v.id]).text}.`;
  stamp(s, message);
  return { state: s, message };
}

export function validateLab(value) {
  if (!value || value.version !== 2 || !EQUIPMENT_BY_ID[value.selected] || !Number.isFinite(value.unknown) || value.unknown < 0.075 || value.unknown > 0.125) return false;
  if (!['guided', 'student', 'free', 'assessment', 'professor'].includes(value.mode) || typeof value.ideal !== 'boolean') return false;
  if (value.ventilationOn !== undefined && typeof value.ventilationOn !== 'boolean') return false;
  if (value.organic !== undefined && !validOrganic(value.organic)) return false;
  if (value.electro !== undefined && !validElectro(value.electro)) return false;
  if (value.station !== undefined && !['aqueous','prepare','reaction','workup','analysis','materials','report','electro'].includes(value.station)) return false;
  for (const field of ['seed', 'time', 'gasMoles', 'wasteMass', 'evaporatedMass', 'balanceTare']) if (!Number.isFinite(value[field]) || value[field] < 0) return false;
  for (const e of EQUIPMENT) {
    const v = value.vessels?.[e.id];
    if (!v || v.id !== e.id || !v.totals || !v.indicators || typeof v.mixed !== 'boolean' || typeof v.dry !== 'boolean') return false;
    for (const field of ['volume', 'mass', 'waterMass', 'temperature', 'delivered']) if (!Number.isFinite(v[field]) || v[field] < 0 || v[field] > 100000) return false;
    if (v.volume > e.capacity + 1e-6) return false;
    if (v.trial !== undefined && (!Number.isSafeInteger(v.trial) || v.trial < 0)) return false;
    if (!validReactionHistory(v)) return false;
    if (!validMaterials(v)) return false;
    for (const id of Object.keys(SPECIES)) if (!Number.isFinite(v.totals[id]) || v.totals[id] < 0 || v.totals[id] > 100) return false;
    for (const [id, n] of Object.entries(v.indicators)) if (REAGENT[id]?.group !== 'Indicators' || !Number.isFinite(n) || n < 0) return false;
  }
  if (!value.draft || !['objective','hypothesis','procedure','observations','calculations','equations','conclusion','errors'].every(id => typeof value.draft[id] === 'string' && value.draft[id].length <= 10000)) return false;
  if (Object.keys(value.draft).some(id => !['objective','hypothesis','procedure','observations','calculations','equations','conclusion','errors'].includes(id))) return false;
  if (!Array.isArray(value.log) || value.log.length > 1000 || !value.log.every(r => typeof r.text === 'string' && Number.isFinite(r.time))) return false;
  if (!Array.isArray(value.measurements) || value.measurements.length > 1000 || !value.measurements.every(r => Number.isFinite(r.value) && Number.isFinite(r.time) && Number.isFinite(r.delivered) && EQUIPMENT_BY_ID[r.vessel] && typeof r.kind === 'string')) return false;
  return Array.isArray(value.endpoints) && Array.isArray(value.notes) && value.notes.length <= 100 && value.notes.every(n => typeof n.title === 'string' && n.draft && typeof n.date === 'string' && Array.isArray(n.measurements) && Array.isArray(n.log)) && Array.isArray(value.customStudies) && value.customStudies.length <= 30 && value.customStudies.every(validStudy);
}
export function validStudy(v) {
  return v && ['id', 'title', 'objective', 'question', 'analysis'].every(k => typeof v[k] === 'string' && v[k].length <= 3000) && /^custom-[a-z0-9-]+$/.test(v.id) && Array.isArray(v.steps) && v.steps.length > 0 && v.steps.length <= 20 && v.steps.every(x => typeof x === 'string' && x.length <= 3000);
}
export function measurementsCSV(rows) {
  const keys = ['date', 'time', 'vessel', 'trial', 'kind', 'value', 'unit', 'uncertainty', 'delivered', 'ideal', 'note'];
  const cell = x => `"${String(x ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`;
  return [keys.join(','), ...rows.map(r => keys.map(k => cell(r[k])).join(','))].join('\r\n');
}

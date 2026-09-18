import { REAGENT, EQUIPMENT_BY_ID } from './lab-data.js';
import { chemistry } from './lab-engine.js';
import { materialRows } from './lab-materials.js';
import { electroSafety } from './electro-model.js';

// Qualitative teaching prompts, not a GHS classifier or an airborne-exposure model.
// Thresholds and source scope are documented in SCIENTIFIC_MODEL.md.
const present = n => n > 1e-12;
const notice = (id, title, detail, precaution, hood = false) => ({ id, title, detail, precaution, hood });
const copper = () => notice('copper', 'Copper-containing material · toxicity and waste',
  'Copper compounds can be harmful if swallowed and can harm aquatic life. Contact and inhaled droplets or dust also need control; the hazard depends on concentration and chemical form.',
  'Avoid ingestion, splashes and aerosols. Collect copper solutions, solids and washings as designated chemical waste. Precipitation does not remove the copper.');
const silver = () => notice('silver', 'Silver-containing material · contact and waste',
  'Silver nitrate can injure eyes and skin and cause staining; supplier data also flag reproductive-health hazards. Mixture classification depends on composition. Silver-containing residues still need controlled handling after precipitation.',
  'Avoid contact and inhaling mist or dust. Collect silver solutions, precipitates and washings as designated chemical waste; do not assume neutral pH makes them harmless.');
const indicator = () => notice('indicator', 'Indicator formulation · check the solvent',
  'The carrier solvent and dye concentration are unspecified. Some indicator solutions contain flammable alcohol; their toxicity and ventilation requirements depend on the formulation.',
  'Avoid ingestion and contact. Check the bottle SDS before use or heating. Keep away from ignition sources until the formulation is known; use suitable local exhaust where the SDS or procedure requires it.');
const phenol = () => notice('phenol', 'Phenolphthalein · chronic health concern',
  'Phenolphthalein has evidence of carcinogenicity in animals. A solution’s classification depends on its composition; a colour change says nothing about its health hazard.',
  'Use the instructor-approved formulation and minimum necessary amount, prevent skin contact and ingestion, and follow its SDS and waste procedure.');

export function stockSafety(id, concentration = 0.1) {
  const reagent = REAGENT[id];
  if (!reagent) throw Error('Unknown stock for hazard review.');
  const notices = [];
  if (id === 'hcl' || id === 'unknown') notices.push(notice('acid-stock', 'Acid stock · protect eyes and skin',
    `${id === 'unknown' ? 'Unknown U is hydrochloric acid; its concentration is intentionally undisclosed.' : `Selected concentration: ${concentration} mol/L HCl.`} Irritation and burn potential depend on concentration and exposure. Hydrogen chloride vapour or acid mist can irritate the respiratory tract.`,
    'Avoid splashes and deliberate smelling. Use a functioning chemical fume hood for heating or operations that release irritating vapour or mist; follow the solution SDS.'));
  if (id === 'naoh') notices.push(notice('base-stock', 'Alkaline stock · splash and mist hazard',
    `Selected concentration: ${concentration} mol/L NaOH. Eye and skin injury becomes a greater concern as concentration increases. Sodium hydroxide is not a volatile gas; airborne exposure involves droplets, mist or dry material.`,
    'Prevent splashes. Use suitable local exhaust for aerosol-generating work and add reagents gradually: acid–base mixing can release heat.'));
  if (id === 'copper') notices.push(copper());
  if (id === 'silver') {
    notices.push(silver());
    notices.push(notice('silver-stock', 'Silver nitrate · review incompatibilities',
      'Oxidizing properties and contact hazards depend on the stock concentration. The model does not assess every incompatible combination.',
      'Check the solution SDS; keep away from incompatible reducing agents and combustible materials. Do not improvise mixtures outside the approved procedure.'));
  }
  if (id === 'acetic') notices.push(notice('acetic-stock', 'Acetic acid · contact and vapour precaution',
    `This is a ${concentration} mol/L aqueous stock, not glacial acetic acid. Contact irritation and vapour exposure depend on concentration, temperature and handling.`,
    'Avoid splashes and deliberate smelling. Use a chemical fume hood for heating or vapour-generating work as specified by the SDS and instructor.'));
  if (id === 'bicarbonate') notices.push(notice('carbonate-stock', 'Adding acid can release gas',
    'Acid and bicarbonate can release carbon dioxide, causing bubbling, foaming and splashes.',
    'Add slowly in an open vessel with spare capacity. Do not seal a gas-producing reaction.'));
  if (reagent.group === 'Indicators') notices.push(indicator());
  if (id === 'phenol') notices.push(phenol());
  return { name: reagent.name, notices, summary: notices.length ? '' : 'No additional stock-specific alert in this model. Use normal laboratory hygiene; do not taste laboratory materials.' };
}

export function vesselSafety(v) {
  const t = v.totals, notices = [], occupied = v.volume > 1e-9 || v.mass > 1e-9 || Object.values(t).some(present) || v.nitrogenOn;
  if (!occupied) return notices;
  const c = chemistry(v), ph = c.pH;
  for(const row of materialRows(v))notices.push(notice('material-'+row.id,row.material.name+' · ingredient precautions',row.material.hint,
    'Use suitable eye/skin protection, containment and labelled waste. Local exhaust is needed for volatile solvents or dusty handling; consult the formulation SDS. Quantitative exposure is not modeled.',
    ['methanol','methoxide','quench','methylAcetate','solvent','sand','carbon','iron','dry-copper'].includes(row.id)));
  if(v.nitrogenOn)notices.push(notice('nitrogen-flow','Nitrogen flow · oxygen displacement',
    'Nitrogen flow is active at this vessel. The model does not calculate oxygen concentration or a protective inert atmosphere.',
    'Use suitable gas delivery and ventilation; prevent oxygen depletion and do not seal unregulated gas into glassware.',true));
  if (present(t.Cu)) notices.push(copper());
  if (present(t.Ag)) notices.push(silver());
  const hasIndicator = Object.values(v.indicators).some(present);
  if (hasIndicator) notices.push(indicator());
  if (present(v.indicators.phenol)) notices.push(phenol());
  if (c.warning) notices.push(notice('unresolved', 'Mixture hazards need review',
    'This mixture is outside the supported equilibrium model. Its acidity and reaction products are not fully resolved, so missing predictions are not evidence of low hazard.',
    'Retain the ingredient precautions. Have the instructor review the mixture before further mixing, heating or disposal.'));
  if (Number.isFinite(ph) && ph < 4) notices.push(notice('acidic', ph <= 2 ? 'Strongly acidic sample · splash/burn potential' : 'Acidic sample · contact precaution',
    'The predicted acidity flags possible eye and skin injury. This is a qualitative prompt; pH alone does not determine a mixture’s hazard classification.',
    'Prevent splashes and use chemical-appropriate gloves and eye protection. Add base gradually because neutralization can release heat.'));
  if (Number.isFinite(ph) && ph > 10) notices.push(notice('alkaline', ph >= 11.5 ? 'Strongly alkaline sample · splash/burn potential' : 'Alkaline sample · contact precaution',
    'The predicted alkalinity flags possible eye and skin injury. Dissolved hydroxide is not a volatile gas; droplets and mist can still expose the respiratory tract.',
    'Avoid splashes and aerosols. Add acid gradually because neutralization can release heat; follow the solution SDS.'));
  // Unknown equilibrium must not suppress precautions for potentially acidic ingredients.
  const acidPossible = (Number.isFinite(ph) && ph < 4) || Boolean(c.warning && (present(t.Cl) || present(t.Ac)));
  const hazardousMaterial = present(t.Cu) || present(t.Ag) || hasIndicator || acidPossible || (Number.isFinite(ph) && ph > 10) || Boolean(c.warning);
  if (v.temperature > 30 && hazardousMaterial) notices.push(notice('heated-chemical', 'Warmed chemical sample · local exhaust advised',
    'Heating can increase vapour release and the consequences of splashing or aerosol formation. Metal salts are a droplet or residue concern, not a predicted metal vapour at these temperatures.',
    'Use a suitable, functioning chemical fume hood for this heating operation. Verify airflow and the approved procedure; stop heating if extraction fails.', true));
  if (v.temperature >= 45) notices.push(notice('hot', 'Heated apparatus · check before handling',
    'Hot liquid and glass can burn. Glass can look unchanged as it warms.',
    'Allow cooling and use the instructor-specified tools for hot apparatus. The model temperature is not a physical measurement.'));
  if (v.dry && (present(t.Cu) || present(t.Ag))) notices.push(notice('dust', 'Dry metal-containing residue · dust precaution',
    'Disturbing dry residue can create inhalable particles. Drying does not make the retained metals harmless.',
    'Avoid creating dust. Use the instructor-approved containment or local exhaust for handling and collect the residue as chemical waste.', true));
  if (v.dry && Object.values(t).some(present)) notices.push(notice('dry-residue', 'Dry chemical residue · review before handling',
    'An aqueous pH is not defined for this residue. Drying can concentrate retained chemicals; the absence of a pH prediction does not remove acid, alkali or other ingredient hazards.',
    'Avoid dust and contact. Review the retained ingredients and their SDS before handling or rewetting the residue; use appropriate containment for dust-generating work.'));
  if (present(t.C)) notices.push(notice('carbonate', 'Acid addition can release CO₂',
    'This sample retains inorganic carbon that may release carbon dioxide when acid is added.',
    'Use an open vessel, add slowly and leave room for bubbling. Never seal a gas-producing reaction.'));
  return notices;
}

export function benchSafety(state) {
  const grouped = new Map();
  for (const v of Object.values(state.vessels)) for (const item of vesselSafety(v)) {
    // Keep stronger acidity wording if several vessels share the same warning.
    const key = `${item.id}:${item.title}`;
    if (!grouped.has(key)) grouped.set(key, { ...item, vessels: [] });
    grouped.get(key).vessels.push(EQUIPMENT_BY_ID[v.id].name);
  }
  const notices = [...grouped.values()];
  if(state.mineral)notices.push({...notice('mineral-analysis','Mineral concentrate and analytical reagents',
    'Fine concentrate may contain silica, lead and naturally radioactive minerals. Nitric and oxidising-chloride modules represent corrosive chemistry and toxic fumes; soluble platinum salts can sensitize, and Arsenazo III contains arsenic.',
    'Use the simulated hood for contained digestion steps. Retain labelled solids, acidic solutions and test waste separately. A radiation-screen result or virtual hood switch is not a real safety assessment.',true),vessels:['Mineral analysis / retained fractions']});
  if(state.electro)notices.push(...electroSafety(state.electro,state.ventilationOn===true));
  if (state.organic && Object.values(state.organic.charged).some(Boolean)) notices.push({ ...notice('organic-run', 'Organic reactor, volatiles and collected waste',
    'An organic batch is present in this run. Methoxide is corrosive and moisture-reactive; methanol is toxic and flammable, and methyl acetate and work-up solvents are flammable. Switching equipment does not remove these precautions.',
    'Use suitable local exhaust, compatible volatile collection and waste handling. Review nitrogen, vacuum glass, cold-trap capacity and pump exhaust controls.', true), vessels: ['Organic reactor / collection train'] });
  if (state.gasMoles > 1e-12) notices.push({ ...notice('released-gas', 'CO₂ release recorded in this run',
    'The open-vessel chemistry model has released carbon dioxide. This is a record of gas generation, not a current room-air concentration or a toxicity measurement.',
    'Keep gas-producing reactions open and use appropriate laboratory ventilation. CO₂ can accumulate in poorly ventilated enclosed spaces.'), vessels: [] });
  if (state.wasteMass > 1e-9) notices.push({ ...notice('waste', 'Discarded material remains chemical waste',
    'Emptying or rinsing a vessel moves material to the waste ledger. Its composition and container compatibility are not calculated.',
    'Use separate, labelled, compatible waste collection as directed by the instructor. Do not treat the virtual waste ledger as permission to combine real wastes.'), vessels: [] });
  const ventilationOn = state.ventilationOn === true, needsHood = notices.some(n => n.hood);
  return { ventilationOn, needsHood, notices,
    ventilationMessage: needsHood && !ventilationOn ? 'Ventilation precaution: local exhaust is OFF. Review the flagged chemicals and handling operations.' : ventilationOn ? 'Local exhaust is ON in the simulation. Contact, waste and other precautions still apply.' : 'Local exhaust is OFF. Check the procedure before heating or creating vapour, mist or dust.',
    summary: notices.length ? `${notices.length} precaution${notices.length === 1 ? '' : 's'} across the workbench and run record` : 'No additional sample-specific alert identified by this limited model.' };
}

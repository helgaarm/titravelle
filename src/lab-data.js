// Project-authored records. Equilibrium constants use the sources in SCIENTIFIC_MODEL.md.
import { ELECTRO_STUDIES } from './electro-data.js';
import { MINERAL_STUDIES } from './mineral-data.js';
export const CONSTANTS = { kw: 1e-14, acetateKa: 1.8e-5, carbonKa1: 4.3e-7, carbonKa2: 4.7e-11, agclKsp: 1.8e-10, agclMolarMass: 143.32, cp: 4.184, neutralizationJ: 57300 };
export const SPECIES = {
  Na: { label: 'Na⁺', charge: 1 }, Cl: { label: 'Cl⁻', charge: -1 }, Ag: { label: 'Ag⁺', charge: 1 },
  NO3: { label: 'NO₃⁻', charge: -1 }, Ac: { label: 'CH₃COOH + CH₃COO⁻', charge: null },
  C: { label: 'Dissolved inorganic carbon', charge: null }, Cu: { label: 'Cu²⁺', charge: 2 }, SO4: { label: 'SO₄²⁻', charge: -2 },
};
export const REAGENTS = [
  { id: 'water', name: 'Distilled water', formula: 'H₂O', group: 'Solvent', ions: {}, mm: 0 },
  { id: 'hcl', name: 'Hydrochloric acid', formula: 'HCl', group: 'Acids', ions: { Cl: 1 }, mm: 36.46 },
  { id: 'naoh', name: 'Sodium hydroxide', formula: 'NaOH', group: 'Bases', ions: { Na: 1 }, mm: 40.00 },
  { id: 'salt', name: 'Sodium chloride', formula: 'NaCl', group: 'Salts', ions: { Na: 1, Cl: 1 }, mm: 58.44 },
  { id: 'silver', name: 'Silver nitrate', formula: 'AgNO₃', group: 'Salts', ions: { Ag: 1, NO3: 1 }, mm: 169.87 },
  { id: 'acetic', name: 'Acetic acid', formula: 'CH₃COOH', group: 'Acids', ions: { Ac: 1 }, mm: 60.05 },
  { id: 'bicarbonate', name: 'Sodium bicarbonate', formula: 'NaHCO₃', group: 'Bases', ions: { Na: 1, C: 1 }, mm: 84.01 },
  { id: 'copper', name: 'Copper(II) sulfate', formula: 'CuSO₄', group: 'Salts', ions: { Cu: 1, SO4: 1 }, mm: 159.61 },
  { id: 'unknown', name: 'Unknown acid U', formula: 'HCl (?)', group: 'Unknown', ions: { Cl: 1 }, mm: 36.46 },
  { id: 'universal', name: 'Universal indicator', formula: 'Indicator', group: 'Indicators', ions: {}, mm: 0 },
  { id: 'phenol', name: 'Phenolphthalein', formula: 'pH 8.2–10.0', group: 'Indicators', ions: {}, mm: 0 },
  { id: 'methyl', name: 'Methyl orange', formula: 'pH 3.1–4.4', group: 'Indicators', ions: {}, mm: 0 },
  { id: 'bromothymol', name: 'Bromothymol blue', formula: 'pH 6.0–7.6', group: 'Indicators', ions: {}, mm: 0 },
];
export const REAGENT = Object.fromEntries(REAGENTS.map(r => [r.id, r]));
export const EQUIPMENT = [
  { id: 'beaker', name: 'Beaker A', type: 'beaker', capacity: 250, tare: 92.314, heatCapacity: 0 },
  { id: 'beaker-b', name: 'Beaker B', type: 'beaker', capacity: 250, tare: 89.721, heatCapacity: 0 },
  { id: 'flask', name: 'Erlenmeyer flask', type: 'flask', capacity: 250, tare: 104.382, heatCapacity: 0 },
  { id: 'volumetric', name: '100 mL volumetric flask', type: 'volumetric', capacity: 120, mark: 100, tare: 64.212, heatCapacity: 0 },
  { id: 'cylinder', name: 'Graduated cylinder', type: 'cylinder', capacity: 100, tare: 112.482, heatCapacity: 0 },
  { id: 'burette', name: '50 mL burette', type: 'burette', capacity: 50, tare: 74.281, heatCapacity: 0 },
  { id: 'cup', name: 'Calorimeter cup', type: 'cup', capacity: 200, tare: 4.032, heatCapacity: 20 },
  { id: 'filter', name: 'Filter paper + residue', type: 'filter', capacity: 10, tare: 1.0000, heatCapacity: 0 },
];
export const EQUIPMENT_BY_ID = Object.fromEntries(EQUIPMENT.map(e => [e.id, e]));
export const DELIVERY = {
  pipette: { name: 'Graduated pipette (≤25 mL)', tolerance: 0.03, max: 25 },
  cylinder: { name: 'Graduated cylinder (≤100 mL)', tolerance: 0.5, max: 100 },
  beaker: { name: 'Beaker graduations', tolerance: 2, max: 250 },
  burette: { name: 'Burette delivery', tolerance: 0.05, max: 50 },
};
export const REACTIONS = [
  { id: 'neutralize', equation: 'H⁺(aq) + OH⁻(aq) → H₂O(l)', description: 'Strong acid–base neutralization; heat release uses 57.3 kJ/mol.' },
  { id: 'acetate', equation: 'CH₃COOH(aq) ⇌ H⁺(aq) + CH₃COO⁻(aq)', description: 'Acetic acid dissociation; Ka = 1.8 × 10⁻⁵.' },
  { id: 'agcl', equation: 'Ag⁺(aq) + Cl⁻(aq) ⇌ AgCl(s)', description: 'Silver chloride precipitation and dissolution; Ksp = 1.8 × 10⁻¹⁰.' },
  { id: 'carbon', equation: 'H⁺(aq) + HCO₃⁻(aq) → CO₂(g) + H₂O(l)', description: 'Open-vessel approximation: generated carbon dioxide leaves the liquid.' },
];
export const STUDIES = [
  { id: 'indicators', code: '01', title: 'Read the colour, test the claim', topic: 'Acids & bases', objective: 'Compare how four indicators respond to acidic, neutral, and basic samples.', question: 'Can a colour identify an exact pH?', steps: ['Prepare separate acid, water, and base samples. Add 0.10 mL of one indicator to each.', 'Mix, observe, and record a calibrated pH measurement. Repeat with another indicator.', 'Compare transition ranges and discuss why two indicators may look different in the same sample.'], analysis: 'Indicators span transition ranges. Their colour is evidence of a range, not an exact pH. Compare your observations with meter uncertainty.' },
  { id: 'titration', code: '02', title: 'Measure an unknown acid', topic: 'Quantitative analysis', objective: 'Estimate the concentration of unknown hydrochloric acid U with standardized NaOH.', question: 'How closely can you locate the end of neutralization?', steps: ['Condition the burette with 0.100 M NaOH, fill it, and record the initial reading. Pipette 25.00 mL of unknown U into the Erlenmeyer flask.', 'Add 0.10 mL phenolphthalein. Deliver NaOH from the burette, mix, and record pH after each addition. Use smaller additions near the colour change.', 'Mark your endpoint and record the final burette reading. Repeat with a fresh aliquot. Calculate c(acid) = c(base) × delivered volume / aliquot volume.'], analysis: 'The equivalence point is defined by equal acid/base equivalents. The indicator endpoint is an observation and can be overshot. Compare repeated trials, reading differences, and the measured pH curve.' },
  { id: 'precipitation', code: '03', title: 'Follow matter into a solid', topic: 'Gravimetry', objective: 'Form, separate, wash, dry, and weigh a precipitate from sodium chloride and silver nitrate.', question: 'Where does the measured mass come from?', steps: ['Tare the empty filter paper on the balance. In a beaker, combine 10.00 mL of 0.100 M NaCl and 15.00 mL of 0.100 M AgNO₃. Mix and describe what appears.', 'Filter into an empty receiving beaker. Wash the retained solid with distilled water, collecting the washings. Dry the filter residue and weigh it.', 'Use the limiting reagent to calculate a theoretical mass. Compare wet versus dry mass, washed versus unwashed residue, and material that escaped the filter.'], analysis: 'Ag⁺ and Cl⁻ form AgCl. The solid is in equilibrium with dissolved ions: [Ag⁺][Cl⁻] = Ksp when solid is present. Na⁺ and NO₃⁻ are spectator ions. Residual mother liquor can leave soluble salts when dried.' },
  { id: 'dilution', code: '04', title: 'Keep the amount, change the volume', topic: 'Solution preparation', objective: 'Prepare 100.0 mL of approximately 0.100 M NaCl from a 1.00 M stock.', question: 'Which operation controls the final concentration?', steps: ['Calculate the required stock volume using c₁V₁ = c₂V₂. Use a pipette to deliver that volume into the 100 mL volumetric flask.', 'Add distilled water to below the mark, then use “Fill to 100 mL mark”. Mix thoroughly.', 'Record the final volume. Compare with a preparation using beaker graduations and explain the difference in uncertainty.'], analysis: 'Dilution conserves solute amount. Bringing the mixture to a final volume differs from assuming that two measured volumes sum exactly in a real solution. This model uses additive volumes and a separate mark-setting error.' },
  { id: 'calorimetry', code: '05', title: 'Account for the warming', topic: 'Energy & measurement', objective: 'Estimate the molar enthalpy of strong acid–base neutralization.', question: 'How much reaction heat reaches the solution?', steps: ['Tare the empty calorimeter cup. Add 50.0 mL of 1.00 M HCl and record its mass and temperature. Prepare 50.0 mL of 1.00 M NaOH at the same temperature in a beaker.', 'Transfer the base into the cup. Mix and promptly measure temperature and mass. Record temperature again after waiting.', 'Use q(solution) = m × 4.184 × ΔT and q(cup) = 20 × ΔT in joules. Estimate ΔH = −(q(solution) + q(cup)) / reacted moles, then discuss heat loss.'], analysis: 'The cup has a model heat capacity of 20 J/K. Other glass heat capacities and heats of dilution are omitted. Heat leaks toward a 25 °C room as simulated time advances. Compare the peak with delayed readings.' },
];
STUDIES.push({id:'soi18',code:'06',title:'SOI-18: test the whole claim',topic:'Organic synthesis & materials',objective:'Explore sucrose acyl exchange, qualify purity independently, and compare synthetic snow-friction data against matched controls.',question:'Can the batch meet chemical specifications, and does the comparative evidence support a performance claim?',steps:['Qualify and dry the starting lots; prepare the reactor and volatile collection.','Follow sequential exchange, sampling, work-up and independent product QC.','Explore assumed material properties and matched controls; report uncertainty and failures.'],analysis:'This experimental compound lacks validated kinetic and performance data here. Distinguish calculated stoichiometry from assumed kinetics and properties; synthetic measurements cannot demonstrate real-world efficacy or safety.'});
STUDIES.push(...ELECTRO_STUDIES);
STUDIES.push(...MINERAL_STUDIES);
export const MODES = { guided: 'Guided', student: 'Student', free: 'Free exploration', assessment: 'Assessment', professor: 'Professor' };

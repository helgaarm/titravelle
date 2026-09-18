import { CONSTANTS as K } from './lab-data.js';
import { checkEquation } from './lab-analysis.js';
import { COPPER } from './lab-copper.js';

// Curated chemistry, selected by calculated changes, not by matching words in a log.
// ASCII formulas are also used by the independent atom/charge checker.
const equation = (left, right, reversible = false) => ({ left, right, reversible });
export const REACTION_RULES = {
  neutralize: { title: 'Strong acid–base neutralization', net: equation('H+ + OH-', 'H2O'), quantity: 'H₂O formed', detail: 'The smaller available acid or base equivalent determines the reacted amount.' },
  precipitate: { title: 'Silver chloride precipitation', net: equation('Ag+ + Cl-', 'AgCl'), quantity: 'AgCl formed', detail: 'Calculated from the increase in solid after mixing, including the AgCl solubility equilibrium.' },
  dissolve: { title: 'Silver chloride dissolution', net: equation('AgCl', 'Ag+ + Cl-'), quantity: 'AgCl dissolved', detail: 'Dilution can dissolve some existing precipitate. This is separate from the earlier precipitation.' },
  weak: { title: 'Acetic acid neutralization', net: equation('CH3COOH + OH-', 'CH3COO- + H2O'), quantity: 'Net increase in acetate', detail: 'The amount is the equilibrium increase in acetate on adding base, rather than assuming complete conversion.' },
  protonate: { title: 'Acetate protonation', net: equation('CH3COO- + H+', 'CH3COOH'), quantity: 'Net decrease in acetate', detail: 'Added strong acid shifts acetate toward acetic acid; the amount comes from equilibrium speciation.' },
  gas: { title: 'Acid–bicarbonate gas formation', net: equation('H+ + HCO3-', 'CO2 + H2O'), quantity: 'CO₂ released', detail: 'The open-vessel model removes CO₂ irreversibly. Gas dissolution, pressure, and release rate are not calculated.' },
  weakGas: { title: 'Acetic acid–bicarbonate gas formation', net: equation('CH3COOH + HCO3-', 'CH3COO- + CO2 + H2O'), quantity: 'CO₂ released', detail: 'The open-vessel model assumes gas escape drives the reaction. Mixed acid/carbonate systems are not resolved into individual pathways.' },
  copperPrecipitate: { title: 'Copper(II) hydroxide precipitation', net: equation('Cu++ + 2 OH-', 'Cu(OH)2'), quantity: 'Cu(OH)₂ formed', detail: 'The amount is the increase in solid after solving copper, ligand, and charge balances with Cu(OH)₂ solubility. This model excludes other copper minerals.' },
  copperDissolve: { title: 'Copper(II) hydroxide dissolution', net: equation('Cu(OH)2','Cu++ + 2 OH-'), quantity: 'Cu(OH)₂ dissolved', detail: 'Dilution or acid can dissolve the solid. In acid, H⁺ consumes the released OH⁻; the overall acid pathway is Cu(OH)₂(s) + 2 H⁺(aq) → Cu²⁺(aq) + 2 H₂O(l).' },
};
export const MOLECULAR_FORMS = {
  neutralize: { reaction: 'neutralize', stocks: ['hcl','naoh'], equation: equation('HCl + NaOH','NaCl + H2O'), spectators: 'Na⁺ and Cl⁻' },
  saltSilver: { reaction: 'precipitate', stocks: ['salt','silver'], equation: equation('NaCl + AgNO3','AgCl + NaNO3'), spectators: 'Na⁺ and NO₃⁻' },
  acidSilver: { reaction: 'precipitate', stocks: ['hcl','silver'], equation: equation('HCl + AgNO3','AgCl + HNO3'), spectators: 'H⁺ and NO₃⁻' },
  weak: { reaction: 'weak', stocks: ['acetic','naoh'], equation: equation('CH3COOH + NaOH','CH3COONa + H2O'), spectators: 'Na⁺' },
  gas: { reaction: 'gas', stocks: ['hcl','bicarbonate'], equation: equation('HCl + NaHCO3','NaCl + CO2 + H2O'), spectators: 'Na⁺ and Cl⁻' },
  weakGas: { reaction: 'weakGas', stocks: ['acetic','bicarbonate'], equation: equation('CH3COOH + NaHCO3','CH3COONa + CO2 + H2O'), spectators: 'Na⁺' },
  copperPrecipitate: { reaction: 'copperPrecipitate', stocks: ['copper','naoh'], equation: equation('CuSO4 + 2 NaOH','Cu(OH)2 + Na2SO4'), spectators: 'Na⁺; sulfate stays dissolved but also participates in complexation' },
};
const labels = { 'H+':'H⁺', 'OH-':'OH⁻', H2O:'H₂O', 'Ag+':'Ag⁺', 'Cl-':'Cl⁻', 'Na+':'Na⁺', 'NO3-':'NO₃⁻', AgNO3:'AgNO₃', NaNO3:'NaNO₃', HNO3:'HNO₃', CH3COOH:'CH₃COOH', 'CH3COO-':'CH₃COO⁻', CH3COONa:'CH₃COONa', 'HCO3-':'HCO₃⁻', NaHCO3:'NaHCO₃', 'CO3--':'CO₃²⁻', CO2:'CO₂' };
Object.assign(labels,{'Cu++':'Cu²⁺','CuCl+':'CuCl⁺',CuCl2:'CuCl₂','CuCl3-':'CuCl₃⁻','CuCl4--':'CuCl₄²⁻',CuSO4:'CuSO₄',Na2SO4:'Na₂SO₄','SO4--':'SO₄²⁻','HSO4-':'HSO₄⁻','CuOH+':'CuOH⁺','Cu(OH)2':'Cu(OH)₂','Cu(OH)2(aq)':'Cu(OH)₂','Cu(OH)3-':'Cu(OH)₃⁻','Cu(OH)4--':'Cu(OH)₄²⁻','Cu2(OH)2++':'Cu₂(OH)₂²⁺'});
export function formatEquation(eq, aqueousCO2 = false) {
  const side = text => text.split(' + ').map(term => {
    const match=term.match(/^(\d+)\s+(.+)$/),coefficient=match?`${match[1]} `:'';if(match)term=match[2];
    const phase = term === 'H2O' ? 'l' : ['AgCl','Cu(OH)2'].includes(term) ? 's' : term === 'CO2' && !aqueousCO2 ? 'g' : 'aq';
    return `${coefficient}${labels[term] || term}(${phase})`;
  }).join(' + ');
  return `${side(eq.left)} ${eq.reversible ? '⇌' : '→'} ${side(eq.right)}`;
}
const acid = v => Math.max(0, v.totals.Cl + v.totals.NO3 - v.totals.Na - v.totals.Ag);
const base = v => Math.max(0, v.totals.Na + v.totals.Ag - v.totals.Cl - v.totals.NO3);
const acetate = (v,c) => (c.ions.acetate || 0) * v.volume / 1000;
const stockName = id => id === 'unknown' ? 'hcl' : id;
const inert = v => Object.values(v.totals).every(n => n < 1e-14);

// History belongs to the vessel where a reaction happened. It is not transferred
// with the liquid and must never be mistaken for current product inventory.
export function recordReactions(target, left, right, before, added, after, heat, gas, time) {
  target.reactionHistory ??= [];
  target.reactionHistoryComplete ??= left.mass === 0;
  const pair = [stockName(left.stock), stockName(right.stock)];
  target.stock = inert(left) ? right.stock ?? null : inert(right) ? left.stock ?? null : left.stock && left.stock === right.stock ? left.stock : null;
  if (before.warning || added.warning || after.warning) { target.stock = null; return; }
  const record = (id, moles) => {
    if (moles <= 1e-12) return;
    const forms = Object.entries(MOLECULAR_FORMS).filter(([, f]) => f.reaction === id && f.stocks.every(s => pair.includes(s))).map(([key]) => key);
    let entry = target.reactionHistory.find(e => e.id === id);
    if (!entry) { entry = { id, moles: 0, steps: 0, molecular: [], time }; target.reactionHistory.push(entry); }
    entry.moles += moles; entry.steps++; entry.time = time;
    entry.molecular = [...new Set([...entry.molecular,...forms])];
    target.stock = null;
  };
  record('neutralize', heat / K.neutralizationJ);
  const change = after.solid - before.solid - added.solid;
  record(change >= 0 ? 'precipitate' : 'dissolve', Math.abs(change));
  const copperChange=(after.copperSolid || 0)-(before.copperSolid || 0)-(added.copperSolid || 0);
  record(copperChange>=0?'copperPrecipitate':'copperDissolve',Math.abs(copperChange));
  if (!left.totals.C && !right.totals.C) {
    const changeAc = acetate(target,after) - acetate(left,before) - acetate(right,added);
    if ((left.totals.Ac > 0 && !right.totals.Ac && base(right) > 0) || (right.totals.Ac > 0 && !left.totals.Ac && base(left) > 0)) record('weak', changeAc);
    if ((left.totals.Ac > 0 && !right.totals.Ac && acid(right) > 0) || (right.totals.Ac > 0 && !left.totals.Ac && acid(left) > 0)) record('protonate', -changeAc);
  }
  if (gas > 1e-12) record(pair.includes('acetic') && pair.includes('bicarbonate') ? 'weakGas' : 'gas', gas);
}

export function validReactionHistory(v) {
  if (v.stock !== undefined && v.stock !== null && !['hcl','unknown','naoh','salt','silver','acetic','bicarbonate','copper'].includes(v.stock)) return false;
  if (v.reactionHistoryComplete !== undefined && typeof v.reactionHistoryComplete !== 'boolean') return false;
  if (v.reactionHistory === undefined) return v.reactionHistoryComplete === undefined;
  return typeof v.reactionHistoryComplete === 'boolean' && Array.isArray(v.reactionHistory) && v.reactionHistory.length <= Object.keys(REACTION_RULES).length
    && new Set(v.reactionHistory.map(e => e?.id)).size === v.reactionHistory.length
    && v.reactionHistory.every(e => e && Object.hasOwn(REACTION_RULES,e.id) && Number.isFinite(e.moles) && e.moles > 0 && e.moles < 1e9 && Number.isSafeInteger(e.steps) && e.steps > 0 && Number.isFinite(e.time) && e.time >= 0
      && Array.isArray(e.molecular) && e.molecular.length <= Object.keys(MOLECULAR_FORMS).length && e.molecular.every(id => Object.hasOwn(MOLECULAR_FORMS,id) && MOLECULAR_FORMS[id].reaction === e.id));
}

export function equationReport(v, c) {
  const report = { reactions: [], equilibria: [], notices: [], summary: '', warning: c.warning };
  if (c.warning) { report.summary = 'Reaction prediction is unavailable for this mixture.'; return report; }
  report.reactions = (v.reactionHistory || []).map(e => {
    const rule = REACTION_RULES[e.id];
    return { ...e, ...rule, equation: formatEquation(rule.net), balanced: checkEquation(rule.net.left,rule.net.right).balanced,
      molecular: e.molecular.map(id => ({ equation: formatEquation(MOLECULAR_FORMS[id].equation), spectators: MOLECULAR_FORMS[id].spectators })) };
  });
  if (!v.reactionHistoryComplete && v.mass) report.notices.push('Earlier saved material has no reaction history. Equations are recorded from new additions onward; past reactions cannot be reconstructed from the final ions alone.');
  if (v.volume && !v.dry) {
    const equilibrium = (title, eq, calculation, aqueousCO2 = false) => report.equilibria.push({ title, equation: formatEquation(eq,aqueousCO2), calculation, balanced: checkEquation(eq.left,eq.right).balanced });
    const sci = n => n.toExponential(3), ions = c.ions;
    if (c.speciation) {
      const rows=c.speciation.aqueous,find=id=>rows.find(s=>s.id===id)?.concentration||0;
      report.mixture = {
        volume:v.volume,pH:c.pH,ionicStrength:c.speciation.ionicStrength,quality:c.speciation.quality,limit:c.speciation.limit,
        totals:['Cu','Cl','SO4','Na','NO3'].filter(id=>v.totals[id]>1e-14).map(id=>({id,label:{Cu:'Total Cu(II)',Cl:'Total chloride',SO4:'Total sulfate',Na:'Sodium',NO3:'Nitrate'}[id],moles:v.totals[id],concentration:v.totals[id]/(v.volume/1000)})),
        species:rows.filter(s=>s.concentration>1e-12).map(s=>({...s,copperFraction:v.totals.Cu?s.moles*s.copperAtoms/v.totals.Cu:0})),
        solidMoles:c.copperSolid,solidMass:c.solidMass,ionProduct:c.speciation.ionProduct,ksp:COPPER.ksp,residual:c.speciation.maxResidual,
        descriptions:[
          'These aqueous stocks redistribute among dissolved ions and complexes. A single complete salt-exchange equation does not describe the mixture.',
          v.totals.Cl>1e-14?'Chloride binds some copper as CuCl⁺, CuCl₂(aq), and smaller higher-chloride complexes. Total chloride includes both free and bound chloride.':'Copper remains distributed between hydrated Cu²⁺, sulfate complexes, and hydrolyzed forms.',
          v.totals.SO4>1e-14?'Sulfate can bind copper as neutral CuSO₄(aq) and take up H⁺ as HSO₄⁻. Consequently, free [H⁺] need not equal the analytical concentration of added HCl.':'Hydrolysis and solubility couple the free copper concentration to acidity.',
          c.copperSolid>1e-12?'Cu(OH)₂ solid is predicted in this restricted phase model. Free copper and hydroxide satisfy the solubility product.':'No Cu(OH)₂ precipitate is predicted in this phase model. The free-ion product is below the solubility product.',
          'The blue liquid/solid illustration is qualitative. Complex formation does not establish an exact colour or spectrum, and no metallic copper or gas is produced by these modeled pathways.',
        ],
      };
      if(v.totals.Cu>1e-14) {
        if(v.totals.Cl>1e-14) for(let i=1;i<=4;i++) {
          const id=['CuCl+','CuCl2','CuCl3-','CuCl4--'][i-1];
          equilibrium(`Copper–chloride complex · ${i} ligand${i===1?'':'s'}`,equation(`Cu++ + ${i===1?'':`${i} `}Cl-`,id,true),`β${i} = [complex]/([Cu²⁺][Cl⁻]^${i}) = ${sci(COPPER.chloride[i-1])}; [${labels[id]}] ≈ ${sci(find(id))} mol/L.`);
        }
        if(v.totals.SO4>1e-14) equilibrium('Copper–sulfate ion pairing',equation('Cu++ + SO4--','CuSO4',true),`β = [CuSO₄]/([Cu²⁺][SO₄²⁻]) = ${sci(COPPER.sulfate)}; [CuSO₄(aq)] ≈ ${sci(find('CuSO4'))} mol/L.`);
        equilibrium('Copper hydrolysis',equation('Cu++ + H2O','CuOH+ + H+',true),`K = [CuOH⁺][H⁺]/[Cu²⁺] = ${sci(COPPER.hydrolysis[0])}. Higher hydroxide complexes and the hydrolysis dimer are also included in the balance.`);
        equilibrium('Copper hydroxide solubility',equation('Cu(OH)2','Cu++ + 2 OH-',true),`Q = [Cu²⁺][OH⁻]² ≈ ${sci(c.speciation.ionProduct)}; Ksp = ${sci(COPPER.ksp)}. ${c.copperSolid>1e-12?'Solid present; Q = Ksp.':'Solid absent; Q < Ksp.'}`);
        for(const [i,id] of [[2,'Cu(OH)2(aq)'],[3,'Cu(OH)3-'],[4,'Cu(OH)4--']]) if(find(id)>1e-8) equilibrium(`Copper hydrolysis · ${i} hydroxide ligands`,equation(`Cu++ + ${i} H2O`,`${id} + ${i} H+`,true),`Cumulative hydrolysis constant = ${sci(COPPER.hydrolysis[i-1])}; concentration ≈ ${sci(find(id))} mol/L.`);
        if(find('Cu2(OH)2++')>1e-8)equilibrium('Copper hydrolysis dimer',equation('2 Cu++ + 2 H2O','Cu2(OH)2++ + 2 H+',true),`K = ${sci(COPPER.dimer)}; [Cu₂(OH)₂²⁺] ≈ ${sci(find('Cu2(OH)2++'))} mol/L. Each dimer contains two copper atoms.`);
      }
      if(v.totals.SO4>1e-14)equilibrium('Sulfate protonation',equation('H+ + SO4--','HSO4-',true),`K = [HSO₄⁻]/([H⁺][SO₄²⁻]) = ${sci(COPPER.bisulfate)}; [HSO₄⁻] ≈ ${sci(find('HSO4-'))} mol/L.`);
    }
    if (v.totals.Ac > 1e-12) equilibrium('Acetic acid equilibrium',equation('CH3COOH','H+ + CH3COO-',true),`Kₐ = [H⁺][CH₃COO⁻]/[CH₃COOH] = ${sci(K.acetateKa)}; [CH₃COO⁻] = ${sci(ions.acetate)} mol/L.`);
    if (v.totals.C > 1e-12) {
      equilibrium('Dissolved carbon dioxide / bicarbonate',equation('CO2 + H2O','H+ + HCO3-',true),`Effective Kₐ₁ = ${sci(K.carbonKa1)}. CO₂(aq) includes the small hydrated carbonic-acid fraction.`,true);
      equilibrium('Bicarbonate / carbonate',equation('HCO3-','H+ + CO3--',true),`Kₐ₂ = [H⁺][CO₃²⁻]/[HCO₃⁻] = ${sci(K.carbonKa2)}.`);
    }
    if (c.solid > 1e-12) equilibrium('Silver chloride solubility',equation('AgCl','Ag+ + Cl-',true),`Ksp = [Ag⁺][Cl⁻] = ${sci(K.agclKsp)}; current AgCl solid = ${(c.solid * K.agclMolarMass).toPrecision(5)} g.`);
    else if (v.totals.Ag > 0 && v.totals.Cl > 0) report.notices.push(`No AgCl solid predicted: [Ag⁺][Cl⁻] = ${sci(ions.Ag * ions.Cl)}, at or below Ksp = ${sci(K.agclKsp)}.`);
    equilibrium('Water autoionization',equation('H2O','H+ + OH-',true),`Kw = [H⁺][OH⁻] = ${sci(K.kw)}. H⁺ is shorthand for the hydrated proton.`);
  }
  report.summary = report.reactions.length ? `${report.reactions.length} reaction ${report.reactions.length === 1 ? 'type' : 'types'} calculated in this vessel.` : v.mass ? 'No new reaction recorded in this vessel.' : 'Add reagents to this vessel to calculate a reaction.';
  if(report.mixture && !report.reactions.length)report.summary='Coupled equilibria calculated for the current mixture.';
  if (v.dry) report.notices.push('Aqueous equilibria are unavailable for a dry residue. Recorded reactions describe the earlier liquid-stage operations.');
  if (!report.reactions.length && v.volume && !report.mixture) report.notices.push('Stocks are already aqueous. Mixing soluble salts or adding water alone does not imply a new net reaction. Transferred reaction history stays with the original vessel.');
  return report;
}

export function equationsAsText(report, vesselName) {
  const lines = [`Calculated equations · ${vesselName} (model predictions, not measurements)`, report.summary];
  if(report.mixture) {
    const m=report.mixture;
    lines.push(`${m.quality}. Volume ${m.volume.toPrecision(5)} mL; pH ≈ ${m.pH.toFixed(2)}; ionic strength ≈ ${m.ionicStrength.toPrecision(3)} mol/L.`,m.limit,...m.descriptions);
    for(const t of m.totals)lines.push(`${t.label}: ${(t.moles*1000).toPrecision(4)} mmol; analytical concentration ${t.concentration.toPrecision(4)} mol/L.`);
    for(const s of m.species)lines.push(`${s.label}: ≈ ${s.concentration.toPrecision(3)} mol/L${s.copperAtoms?`; ${(s.copperFraction*100).toPrecision(3)}% of total copper`:''}.`);
    lines.push(`Cu(OH)₂ solid: ≈ ${m.solidMass.toPrecision(3)} g. Concentrations solved from element and charge balances.`);
  }
  for (const r of report.reactions) {
    lines.push(`${r.title}: ${r.equation}`, ...r.molecular.map(m=>`Molecular: ${m.equation}`), `${r.quantity}: ${(r.moles*1000).toPrecision(5)} mmol accumulated here over ${r.steps} mixing step(s); not current inventory.`);
  }
  for (const e of report.equilibria) lines.push(`${e.title}: ${e.equation}`,e.calculation);
  return [...lines,...report.notices].join('\n');
}

export const CALCULATORS = {
  dilution: { title: 'Dilution · required stock volume', formula: 'V₁ = c₂ × V₂ / c₁', labels: ['Target concentration (mol/L)', 'Final volume (mL)', 'Stock concentration (mol/L)'], unit: 'mL', calculate: (a,b,c) => a*b/c },
  titration: { title: 'Titration · acid concentration', formula: 'c(acid) = c(base) × V(base) / V(acid)', labels: ['Base concentration (mol/L)', 'Delivered base volume (mL)', 'Acid aliquot (mL)'], unit: 'mol/L', calculate: (a,b,c) => a*b/c },
  precipitate: { title: 'Gravimetry · theoretical AgCl mass', formula: 'm = min(n(Ag⁺), n(Cl⁻)) × 143.32', labels: ['Silver amount (mol)', 'Chloride amount (mol)', 'Not used'], unit: 'g (stoichiometric maximum)', calculate: (a,b) => Math.min(a,b)*143.32 },
  heat: { title: 'Calorimetry · heat absorbed', formula: 'q = (m × 4.184 + C(cup)) × ΔT', labels: ['Solution mass (g)', 'Temperature rise (°C)', 'Cup heat capacity (J/K)'], unit: 'J', calculate: (a,b,c) => (a*4.184+c)*b },
  enthalpy: { title: 'Calorimetry · molar enthalpy', formula: 'ΔH = −q(absorbed) / n / 1000', labels: ['Heat absorbed (J)', 'Reacted amount (mol)', 'Not used'], unit: 'kJ/mol', calculate: (a,b) => -a/b/1000 },
};
export function calculate(id, values) {
  if (!CALCULATORS[id] || values.some(x => !Number.isFinite(x))) throw Error('Enter numerical values for the calculation.');
  const result = CALCULATORS[id].calculate(...values);
  if (!Number.isFinite(result)) throw Error('The denominator must be nonzero.');
  return result;
}
// Structured species keep charge separate from atom counts; no evaluation of user code.
export const EQUATION_SPECIES = {
  'H+': { atoms: { H:1 }, charge:1 }, 'OH-': { atoms:{O:1,H:1},charge:-1 }, H2O:{atoms:{H:2,O:1},charge:0},
  'Ag+':{atoms:{Ag:1},charge:1}, 'Cl-':{atoms:{Cl:1},charge:-1}, AgCl:{atoms:{Ag:1,Cl:1},charge:0},
  'Na+':{atoms:{Na:1},charge:1}, 'NO3-':{atoms:{N:1,O:3},charge:-1}, NaCl:{atoms:{Na:1,Cl:1},charge:0}, AgNO3:{atoms:{Ag:1,N:1,O:3},charge:0},
  HCl:{atoms:{H:1,Cl:1},charge:0}, NaOH:{atoms:{Na:1,O:1,H:1},charge:0},
  CH3COOH:{atoms:{C:2,H:4,O:2},charge:0}, 'CH3COO-':{atoms:{C:2,H:3,O:2},charge:-1},
  'HCO3-':{atoms:{H:1,C:1,O:3},charge:-1}, CO2:{atoms:{C:1,O:2},charge:0},
  'CO3--':{atoms:{C:1,O:3},charge:-2}, NaHCO3:{atoms:{Na:1,H:1,C:1,O:3},charge:0},
  NaNO3:{atoms:{Na:1,N:1,O:3},charge:0}, HNO3:{atoms:{H:1,N:1,O:3},charge:0},
  CH3COONa:{atoms:{C:2,H:3,O:2,Na:1},charge:0},
  'Cu++':{atoms:{Cu:1},charge:2}, 'CuCl+':{atoms:{Cu:1,Cl:1},charge:1}, CuCl2:{atoms:{Cu:1,Cl:2},charge:0},
  'CuCl3-':{atoms:{Cu:1,Cl:3},charge:-1}, 'CuCl4--':{atoms:{Cu:1,Cl:4},charge:-2},
  'SO4--':{atoms:{S:1,O:4},charge:-2}, 'HSO4-':{atoms:{H:1,S:1,O:4},charge:-1}, CuSO4:{atoms:{Cu:1,S:1,O:4},charge:0}, Na2SO4:{atoms:{Na:2,S:1,O:4},charge:0},
  'CuOH+':{atoms:{Cu:1,O:1,H:1},charge:1}, 'Cu(OH)2':{atoms:{Cu:1,O:2,H:2},charge:0},
  'Cu(OH)2(aq)':{atoms:{Cu:1,O:2,H:2},charge:0}, 'Cu(OH)3-':{atoms:{Cu:1,O:3,H:3},charge:-1}, 'Cu(OH)4--':{atoms:{Cu:1,O:4,H:4},charge:-2},
  'Cu2(OH)2++':{atoms:{Cu:2,O:2,H:2},charge:2},
};
export function checkEquation(left, right) {
  const sum = side => {
    const out = { charge:0 };
    for (const term of side.split(/\s+\+\s+/)) {
      const m = term.trim().match(/^(?:(\d+)\s*)?([A-Za-z0-9()+-]+)$/);
      if (!m || !EQUATION_SPECIES[m[2]]) throw Error('Use listed species and spaces around the + between terms. Example: H+ + OH- -> H2O.');
      const n = Number(m[1] || 1); if (n < 1 || n > 100) throw Error('Coefficients must be integers from 1 to 100.');
      const species = EQUATION_SPECIES[m[2]];
      for (const [atom, count] of Object.entries(species.atoms)) out[atom] = (out[atom] || 0) + n*count;
      out.charge += n*species.charge;
    }
    return out;
  };
  const a = sum(left), b = sum(right), keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const differences = [...keys].filter(k => (a[k] || 0) !== (b[k] || 0));
  return { balanced: !differences.length, differences };
}

// Selected 25 °C constants from USGS PHREEQC minteq.v4.dat (see SCIENTIFIC_MODEL.md).
// This is a concentration-based teaching subset, not the PHREEQC activity model.
export const COPPER = Object.freeze({
  chloride: [0.2, -0.26, -2.29, -4.59].map(x => 10 ** x),
  sulfate: 10 ** 2.36, bisulfate: 10 ** 1.99,
  hydrolysis: [-7.497, -16.194, -26.879, -39.98].map(x => 10 ** x),
  dimer: 10 ** -10.594, ksp: 10 ** (8.674 - 28), molarMass: 97.56, kw: 1e-14,
});

function chlorideBalance(total, copper) {
  // Positive, convex ligand balance. Newton steps from its upper bound stay
  // above the root. Each complex consumes its own number of chloride ligands.
  let free = total;
  for (let i = 0; i < 40 && free > 0; i++) {
    let bound = 0, derivative = 1;
    for (let j = 1; j <= 4; j++) {
      bound += j * copper * COPPER.chloride[j-1] * free ** j;
      derivative += j*j * copper * COPPER.chloride[j-1] * free ** (j-1);
    }
    const next = Math.max(0,free - (free + bound - total) / derivative);
    if (Math.abs(next-free) <= Math.max(1e-30,total*1e-13)) return next;
    free = next;
  }
  return free;
}

// At fixed [H+], solve the Cu/Cl/sulfate balances, with a complementarity
// condition: Cu(OH)2 solid is absent, or free Cu2+ * OH-^2 equals Ksp.
function atPH(t, ph) {
  const h = 10 ** -ph, oh = COPPER.kw / h;
  const hydro = COPPER.hydrolysis.map((k,i)=>k / h ** (i+1));
  const species = cu => {
    const cl = chlorideBalance(t.Cl,cu), sulfate = t.SO4 / (1 + COPPER.bisulfate*h + COPPER.sulfate*cu);
    const chloride = COPPER.chloride.map((k,i)=>cu*k*cl ** (i+1));
    const hydroxide = hydro.map(k=>cu*k), pair = cu*COPPER.sulfate*sulfate, dimer = COPPER.dimer*(cu/h)**2;
    return { cu, cl, sulfate, chloride, hydroxide, pair, dimer, bisulfate: COPPER.bisulfate*h*sulfate,
      dissolvedCu: cu + pair + 2*dimer + chloride.reduce((a,b)=>a+b,0) + hydroxide.reduce((a,b)=>a+b,0) };
  };
  const saturationCu = COPPER.ksp / oh**2;
  let lo = 0, hi = Math.min(t.Cu / (1 + hydro.reduce((a,b)=>a+b,0)), saturationCu), result = species(hi);
  if (result.dissolvedCu > t.Cu) {
    for (let i=0; i<65; i++) { const mid=(lo+hi)/2; if(species(mid).dissolvedCu>t.Cu) hi=mid; else lo=mid; }
    result = species((lo+hi)/2);
  }
  const solid = Math.max(0,t.Cu-result.dissolvedCu);
  const [cl1,,cl3,cl4] = result.chloride, [oh1,,oh3,oh4] = result.hydroxide;
  const charge = h + t.Na + 2*result.cu + cl1 + oh1 + 2*result.dimer
    - oh - result.cl - t.NO3 - 2*result.sulfate - result.bisulfate - cl3 - 2*cl4 - oh3 - 2*oh4;
  return {...result,h,oh,solid,charge};
}

export function copperEquilibrium(v) {
  const volume = v.volume/1000;
  const t = Object.fromEntries(Object.entries(v.totals).map(([id,n])=>[id,n/volume]));
  let lo=-2,hi=16;
  for(let i=0;i<65;i++){const mid=(lo+hi)/2;if(atPH(t,mid).charge>0)lo=mid;else hi=mid;}
  const pH=(lo+hi)/2,r=atPH(t,pH),copperSolid=r.solid*volume;
  const aqueous=[];
  const put=(id,label,concentration,charge,copperAtoms=0)=>aqueous.push({id,label,concentration,charge,copperAtoms,moles:concentration*volume});
  put('Cu++','Cu²⁺',r.cu,2,1);
  const clNames=['CuCl⁺','CuCl₂','CuCl₃⁻','CuCl₄²⁻'],clIds=['CuCl+','CuCl2','CuCl3-','CuCl4--'];
  r.chloride.forEach((n,i)=>put(clIds[i],clNames[i],n,1-i,1));
  put('CuSO4','CuSO₄(aq)',r.pair,0,1);
  const ohNames=['CuOH⁺','Cu(OH)₂(aq)','Cu(OH)₃⁻','Cu(OH)₄²⁻'],ohIds=['CuOH+','Cu(OH)2(aq)','Cu(OH)3-','Cu(OH)4--'];
  r.hydroxide.forEach((n,i)=>put(ohIds[i],ohNames[i],n,1-i,1));
  put('Cu2(OH)2++','Cu₂(OH)₂²⁺',r.dimer,2,2);
  put('H+','H⁺',r.h,1);put('OH-','OH⁻',r.oh,-1);put('Cl-','Cl⁻',r.cl,-1);
  put('SO4--','SO₄²⁻',r.sulfate,-2);put('HSO4-','HSO₄⁻',r.bisulfate,-1);
  put('Na+','Na⁺',t.Na,1);put('NO3-','NO₃⁻',t.NO3,-1);
  const ionicStrength=aqueous.reduce((sum,s)=>sum+0.5*s.concentration*s.charge**2,0);
  const residuals={
    Cu:r.dissolvedCu+r.solid-t.Cu,
    Cl:r.cl+r.chloride.reduce((sum,n,i)=>sum+(i+1)*n,0)-t.Cl,
    SO4:r.sulfate+r.bisulfate+r.pair-t.SO4,
    charge:r.charge,
  };
  const maxResidual=Math.max(...Object.values(residuals).map(Math.abs));
  const converged=Number.isFinite(maxResidual) && maxResidual<1e-9*Math.max(1,t.Cu,t.Cl,t.SO4,t.Na);
  return {
    pH:converged?pH:null, warning:converged?'':'The coupled copper calculation did not converge; numerical predictions are withheld.',
    solid:0,copperSolid,solidMass:copperSolid*COPPER.molarMass,
    dissolved:{...v.totals,Cu:Math.max(0,v.totals.Cu-copperSolid)},
    ions:{Na:t.Na,NO3:t.NO3,Cu:r.cu,Cl:r.cl,SO4:r.sulfate,H:r.h,OH:r.oh},
    speciation:{aqueous,ionicStrength,residuals,maxResidual,ionProduct:r.cu*r.oh**2,converged,
      quality:ionicStrength>0.1?'Concentrated mixture · qualitative estimate':'Ideal-concentration estimate',
      limit:'Activities are approximated by concentrations at 25 °C. Percentages and pH are model estimates, especially above ionic strength 0.1 mol/L; “Ideal measurements” does not improve chemical accuracy. Other copper minerals, sodium–sulfate pairing, redox, and reaction heats are not calculated.'},
  };
}

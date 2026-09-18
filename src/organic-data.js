// Original teaching model. SOI-18-specific kinetics and properties are unvalidated.
export const atomic = { C:12.011, H:1.008, O:15.999, Na:22.98976928 };
export const exactAtomic = { C:12, H:1.00782503223, O:15.99491461957, Na:22.989769282 };
export const massOf = (formula, exact=false) => Object.entries(formula).reduce((s,[e,n])=>s+n*(exact?exactAtomic:atomic)[e],0);
export const MW = { sugar:massOf({C:12,H:22,O:11}), soa:massOf({C:28,H:38,O:19}), fame:massOf({C:19,H:38,O:2}), product:massOf({C:156,H:294,O:19}), water:massOf({H:2,O:1}), methanol:massOf({C:1,H:4,O:1}), methylAcetate:massOf({C:3,H:6,O:2}), acid:massOf({C:2,H:4,O:2}), methoxide:massOf({C:1,H:3,O:1,Na:1}), hydroxide:massOf({H:1,O:1,Na:1}), sodiumAcetate:massOf({C:2,H:3,O:2,Na:1}) };
export const FAMES = [
  ['iso18','16-methylheptadecanoate',18,18.2,1], ['linear18','stearate (linear C18)',18,18.8,1.015],
  ['branch15','15-methylheptadecanoate',18,18.35,1.008], ['branch14','14-methylheptadecanoate',18,18.5,.995],
  ['other18','other branched C18',18,18.65,1.02], ['c16','C16 fatty acid',16,16.2,.94],
  ['c17','C17 fatty acid',17,17.2,.97], ['c19','C19 fatty acid',19,19.6,1.04], ['unidentified','unidentified (C18 surrogate)',18,19.9,1]
].map(([id,name,carbons,rt,response])=>({id,name,carbons,rt,response,mm:massOf({C:carbons+1,H:2*carbons+2,O:2})}));
export const ORGANIC_STOCKS = [
  {id:'soa',name:'Sucrose octaacetate',formula:'C28H38O19',group:'Substrates',hint:'Eight acetate sites; dry before charge. Dust/contact precautions.'},
  {id:'fame',name:'Methyl 16-methylheptadecanoate',formula:'C19H38O2',group:'Substrates',hint:'Qualify isomer purity by resolved GC with standards. Toxicology is incompletely characterized.'},
  {id:'methoxide',name:'Sodium methoxide',formula:'CH3ONa',group:'Catalysts',hint:'Corrosive, moisture-reactive base. Can generate toxic, flammable methanol; dry handling and local exhaust.'},
  {id:'quench',name:'Acetic acid · neutralizing reagent',formula:'C2H4O2',group:'Work-up',hint:'Acid/base neutralization is exothermic. This tool calculates equivalents and requires cooling first.'},
  {id:'solvent',name:'Chromatography solvent blend',formula:'Heptane / ethyl acetate',group:'Work-up',hint:'Flammable solvent scenario. Use local exhaust and appropriate vacuum-rated solvent handling; no ignition sources.'},
  {id:'nitrogen',name:'Dry nitrogen',formula:'N2',group:'Gases',hint:'Compressed-gas and oxygen-displacement hazards. Inert atmosphere does not make flammable vapours harmless.'},
  {id:'methylAcetate',name:'Methyl acetate · collected product',formula:'C3H6O2',group:'Volatiles',hint:'Flammable; inhalation and eye irritation concern. Capture in a suitable trap; protect the vacuum pump.'},
  {id:'methanol',name:'Methanol · volatile impurity',formula:'CH4O',group:'Volatiles',hint:'Toxic by inhalation, ingestion and skin exposure; flammable. Local exhaust and compatible collection.'},
  {id:'water',name:'Water · moisture challenge',formula:'H2O',group:'Impurities',hint:'Converts methoxide to hydroxide/methanol and promotes hydrolysis; hydroxide remains basic.'},
  ...FAMES.map(f=>({id:f.id,name:`Methyl ${f.name}`,formula:`C${f.carbons+1}H${2*f.carbons+2}O2`,group:'GC standards',hint:'Virtual reference identity. Retention and response factors in this app are assumed; real isomer assignment needs resolved standards.'})),
  {id:'ffa',name:'16-methylheptadecanoic acid',formula:'C18H36O2',group:'Impurities',hint:'Consumes base equivalents and forms fatty-acid salts; quantify separately from the FAME isomer population.'},
  ...[['linear','Sucrose octastearate'],['mixed','Mixed-isomer sucrose octaisostearate'],['ester','Conventional C18 ester'],['wax','Fluor-free racing wax'],['bare','Untreated UHMWPE']].map(([id,name])=>({id,name,formula:'Comparison material',group:'Controls',hint:'Matched comparison coupon. Performance is not known from its name; scenario results are not real material data.'}))
];
export const CONTROLS = [['soi','SOI-18'],['linear','Sucrose octastearate'],['mixed','Mixed-isomer octaisostearate'],['ester','Conventional C18 ester'],['wax','Fluor-free racing wax'],['bare','Untreated UHMWPE']];
export const ORGANIC_STAGES = [
  ['Feed qualification','GC-FID/GC-MS; distinguish isomer purity from water, acid and methanol.'],
  ['Drying & apparatus','Karl Fischer, dry reactor, stirring, nitrogen, cold trap and pressure calibration.'],
  ['Charge & condition','Condition the methyl ester, then mix in sucrose octaacetate and catalyst.'],
  ['Reaction & endpoint','Ramp temperature/vacuum; sample sequential substitution and methyl-acetate evolution.'],
  ['Work-up & isolation','Cool, neutralize by equivalents, separate with losses, remove volatiles and establish constant mass.'],
  ['Independent quality checks','Cleaved-residue GC, qNMR, HPLC/ELSD and calculated MS adducts.'],
  ['Materials & controls','DSC/TGA, contact angles, morphology, coating retention and comparative friction.'],
  ['Decision & report','Uncertainty-aware criteria, mass balance, failure analysis and next experiment.']
];
export const DEFAULT_PARAMETERS = { exchangeRate:2.4, reverseRate:.12, degradationRate:.0008, hydrolysisRate:.04, trapEfficiency:.97, productRecovery:.90, intermediateRecovery:.7, fameCarryover:.025, saltCarryover:.015, gcUncertainty:.06, areaUncertainty:.3, waterUncertainty:.003, meltPoint:42, degradationOnset:175, contactAngle:100, frictionEffect:0, wearRate:.012, frictionNoise:.004, degradationHalfLife:60 };
export const PARAMETER_INFO = {
  exchangeRate:['Exchange rate at 110 °C (h⁻¹)',0,10],reverseRate:['Reverse exchange coefficient (h⁻¹)',0,2],degradationRate:['Degradation at 110 °C (h⁻¹)',0,.2],hydrolysisRate:['Hydrolysis coefficient (h⁻¹)',0,1],
  trapEfficiency:['Cold-trap collection fraction',0,1],productRecovery:['Octaester recovery per separation',.1,1],intermediateRecovery:['Intermediate recovery per separation',0,1],fameCarryover:['Free FAME retained per separation',0,1],saltCarryover:['Inorganic material retained per separation',0,1],
  gcUncertainty:['GC expanded uncertainty (mol-% points)',.01,2],areaUncertainty:['HPLC expanded uncertainty (area-% points)',.05,3],waterUncertainty:['KF expanded uncertainty (wt-% points)',.0001,.05],
  meltPoint:['Assumed transition centre (°C)',0,100],degradationOnset:['Assumed TGA onset (°C)',100,250],contactAngle:['Assumed static contact angle (°)',40,140],frictionEffect:['Assumed SOI friction shift (absolute μ)',-.04,.04],wearRate:['Assumed wear coefficient',0,.1],frictionNoise:['Coupon-to-coupon SD of μ',.0001,.02],degradationHalfLife:['Assumed environmental hydrolysis half-life (days)',1,1000]
};

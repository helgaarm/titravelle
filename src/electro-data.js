// Formula-based electrochemistry with explicit, adjustable teaching kinetics.
export const EC = { F:96485.33212, R:8.314462618, pressure:101325, kw:1e-14, sulfateKa:.012 };
export const IONS = {
  Na:{z:1,lambda:50.1},Cl:{z:-1,lambda:76.3},SO4:{z:-2,lambda:160},NO3:{z:-1,lambda:71.4},
  Cu:{z:2,lambda:107,mm:63.546,E:.340,ksp:2.2e-20},Zn:{z:2,lambda:106,mm:65.38,E:-.763,ksp:3e-17},
  Ag:{z:1,lambda:61.9,mm:107.8682,E:.800},Ni:{z:2,lambda:100,mm:58.6934,E:-.257,ksp:5.5e-16},
  Fe:{z:2,lambda:108,mm:55.845,E:-.447,ksp:4.9e-17},Al:{z:3,lambda:189,mm:26.9815,E:-1.662,ksp:1e-33},
};
export const ELECTRODES = [
  ['graphite','Graphite','C',null,1e5,1e-7,1e-9,'Oxidative carbon corrosion is not quantified; gas-only anode approximation.'],
  ['platinum','Platinum','Pt',null,9.4e6,1e-3,1e-7,'Catalytic surface; oxide formation and platinum dissolution are omitted.'],
  ['gold','Gold','Au',null,4.1e7,1e-6,1e-9,'Gold oxide and chloride-complex corrosion are unresolved; chloride anode runs are withheld.'],
  ['copper','Copper','Cu','Cu',5.96e7,1e-6,1e-9,'Dissolution competes with oxygen/chlorine evolution. Oxide films are approximated.'],
  ['silver','Silver','Ag','Ag',6.3e7,1e-7,1e-9,'Silver chloride films are unresolved; chloride anode runs are withheld.'],
  ['nickel','Nickel','Ni','Ni',1.43e7,1e-5,1e-7,'An assumed passive film reduces dissolution at positive potentials.'],
  ['iron','Iron','Fe','Fe',1e7,1e-6,1e-8,'Fe(II) dissolution only; rust, Fe(III), and complex film chemistry are omitted.'],
  ['zinc','Zinc','Zn','Zn',1.69e7,1e-8,1e-9,'Dissolves anodically; hydrogen competes with zinc deposition.'],
  ['aluminium','Aluminium','Al','Al',3.5e7,1e-8,1e-9,'Strong passivation is approximated. Aqueous aluminium plating is not supported.'],
  ['stainless','Stainless steel','Fe/Cr/Ni',null,1.4e6,1e-6,1e-8,'Alloy corrosion and chromium oxidation products are unresolved; quantitative anode runs are withheld.'],
].map(([id,name,formula,ion,conductivity,hydrogenI0,oxygenI0,note])=>({id,name,formula,ion,conductivity,hydrogenI0,oxygenI0,note}));
// Eleven selectable materials, including a second useful carbon electrode surface.
ELECTRODES.splice(1,0,{id:'carbon-rod',name:'Glassy carbon',formula:'C',ion:null,conductivity:2e4,hydrogenI0:3e-8,oxygenI0:3e-10,note:'Idealized inert carbon surface; oxidation and surface aging are not quantified.'});
export const ELECTRODE = Object.fromEntries(ELECTRODES.map(e=>[e.id,e]));
export const ELECTROLYTES = [
  {id:'water',name:'Distilled water',formula:'H2O',ions:{},catalogId:'aqueous:water'},
  {id:'sodium-sulfate',name:'Sodium sulfate',formula:'Na2SO4',ions:{Na:2,SO4:1},mm:142.04,catalogId:'electro:electro-sulfate'},
  {id:'salt',name:'Sodium chloride',formula:'NaCl',ions:{Na:1,Cl:1},mm:58.44,catalogId:'aqueous:salt'},
  {id:'copper',name:'Copper(II) sulfate',formula:'CuSO4',ions:{Cu:1,SO4:1},mm:159.61,catalogId:'aqueous:copper'},
  {id:'zinc-sulfate',name:'Zinc sulfate',formula:'ZnSO4',ions:{Zn:1,SO4:1},mm:161.44,catalogId:'electro:electro-zinc-sulfate'},
  {id:'sulfuric',name:'Dilute sulfuric acid',formula:'H2SO4',ions:{SO4:1},mm:98.079,catalogId:'electro:electro-sulfuric'},
  {id:'naoh',name:'Sodium hydroxide',formula:'NaOH',ions:{Na:1},mm:40,catalogId:'aqueous:naoh'},
  {id:'hcl',name:'Hydrochloric acid',formula:'HCl',ions:{Cl:1},mm:36.46,catalogId:'aqueous:hcl'},
  {id:'silver',name:'Silver nitrate',formula:'AgNO3',ions:{Ag:1,NO3:1},mm:169.87,catalogId:'aqueous:silver'},
];
export const ELECTRO_MATERIALS = [
  {id:'electro-sulfate',name:'Sodium sulfate · anhydrous',formula:'Na2SO4',group:'Electrolytes',hint:'Supporting electrolyte for the water-electrolysis scenario. Avoid dust/contact.'},
  {id:'electro-zinc-sulfate',name:'Zinc sulfate · anhydrous',formula:'ZnSO4',group:'Electrolytes',hint:'Harmful metal salt; avoid dust/contact and collect zinc-containing waste.'},
  {id:'electro-sulfuric',name:'Dilute sulfuric acid · aqueous stock',formula:'H2SO4(aq)',group:'Electrolytes',hint:'Concentration is set when preparing the cell. Corrosive acidity and mist require precautions. Ordinary weighed additions retain unresolved stock composition.',form:'liquid'},
  ...ELECTRODES.map(e=>({id:`electrode-${e.id}`,name:`${e.name} electrode`,formula:e.formula,group:'Electrodes',hint:e.note,form:'solid'})),
].map(e=>({...e,scope:'electro'}));
export const PREDICTIONS = [['cathode','Cathode reaction'],['anode','Anode reaction'],['voltage','Required voltage (V)'],['current','Expected current (A)'],['products','Expected products'],['mass','Electrode mass change (g)'],['gas','Expected gas production (mL)']];
export const TERMINALS = [['plus','Supply + / load +'],['minus','Supply − / load −'],['left','Left electrode'],['right','Right electrode'],['a-plus','Ammeter +'],['a-minus','Ammeter −'],['v-plus','Voltmeter +'],['v-minus','Voltmeter −']];
export const STANDARD_WIRES = [['plus','a-plus'],['a-minus','left'],['right','minus'],['v-plus','left'],['v-minus','right']];
export const ELECTRO_STUDIES = [
  {id:'electro-water',code:'07',title:'Split water, count the charge',topic:'Electrolysis & gases',objective:'Compare hydrogen and oxygen production with integrated charge and the expected 2:1 molar ratio.',question:'Does collected gas agree with Faraday’s law?',preset:'water'},
  {id:'electro-plating',code:'08',title:'Build a metal coating',topic:'Electrodeposition',objective:'Explore how area, stirring, concentration and current density affect copper deposition and competing hydrogen production.',question:'When does charge stop translating into a useful coating?',preset:'plating'},
  {id:'electro-copper',code:'09',title:'Move copper, conserve matter',topic:'Electrochemical mass balance',objective:'Compare a copper anode’s mass loss, cathode deposit and dissolved copper inventory.',question:'Where does every gram of copper go?',preset:'copper'},
].map(e=>({...e,steps:['Inspect the cell, electrolyte and electrodes, then record your predictions.','Wire the circuit, set the supply and run timed intervals while recording measurements.','Compare charge, half-reaction shares, gas and electrode changes; save your report.'],analysis:'Faraday’s law applies separately to each partial reaction current. Conductivity, transport and assumed kinetics determine the split; synthetic data are not validation of a real process.'}));
export const ELECTRO_SOURCES = [
  ['Standard aqueous potentials (NIST reference compilation)','https://www.nist.gov/system/files/documents/2019/04/02/jpcrd355.pdf'],
  ['Fundamental constants (NIST CODATA)','https://physics.nist.gov/cuu/Constants/'],
  ['Electrode kinetics and model conventions (COMSOL)','https://doc.comsol.com/6.3/doc/com.comsol.help.fce/fce_ug_electrochem.07.095.html'],
  ['Chlorine hazards (CDC/NIOSH)','https://www.cdc.gov/niosh/npg/npgd0115.html'],
];

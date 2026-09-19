// Original teaching scenarios. Recovery, response and detection settings are
// illustrative assumptions, not validated analytical methods or lab recipes.
export const TARGETS=['Ag','Au','Pt','Ce','La','Nd','Y'];
export const ROUTES={A:'Silver',B:'Gold',C:'Platinum',D:'Rare earths'};
export const CONFIDENCE=['Not detected','Weak indication','Probable','Strong qualitative evidence','Inconclusive'];
export const LANES=['blank','positive','sample','spike'];
export const LANE_NAMES={blank:'Reagent blank',positive:'Positive control',sample:'Unknown sample',spike:'Matrix-spiked sample'};
export const OBS_FIELDS=[['before','Appearance before'],['dissolution','Dissolution'],['gas','Gas evolution'],['solution','Solution colour'],['precipitate','Precipitate colour'],['residue','Residue appearance'],['controls','Control comparison'],['interpretation','Your interpretation']];
const step=(id,title,reagent,advice,equation='',hood=false,optional=false)=>({id,title,reagent,advice,equation,hood,optional});
export const MINERAL_STEPS={
  A:[
    step('nitric','Extract the silver aliquot','Nitric acid · virtual extraction','Use aliquot A. Turn on the shared fume hood. Acid-soluble silver may enter solution with copper and lead; undissolved grains remain. This virtual module supplies no real acid recipe.','3 Ag + 4 HNO₃ → 3 AgNO₃ + NO + 2 H₂O',true),
    step('filter','Dilute, filter and retain both fractions','Water; filter assembly','Use the virtual dilution and filtration module. Label the clear filtrate A-F and residue A-R. A residue is not proof of a valuable metal.'),
    step('chloride','Compare the chloride test with controls','Sodium chloride; Ag reference standard','Run the blank, positive control and unknown together. The optional spike checks matrix suppression. A white solid may include lead chloride or other material.','Ag⁺ + Cl⁻ ⇌ AgCl(s)'),
    step('thiosulfate','Challenge the white precipitate','Sodium thiosulfate','Use a portion of each retained chloride-test solid. Compare loss of cloudiness with the positive control. Residual matrix solids or abnormal controls weaken the assignment.','AgCl(s) + 2 S₂O₃²⁻ ⇌ [Ag(S₂O₃)₂]³⁻ + Cl⁻'),
    step('light','Inspect the retained light-exposed portion','Virtual light source','Inspect a separate retained portion, not the portion used for thiosulfate. Darkening is supporting behaviour; it is not a quantitative silver assay.','2 AgCl(s) → 2 Ag(s) + Cl₂  (idealized photochemical bookkeeping)',false,true),
  ],
  B:[
    step('nitric','Remove acid-soluble material from B','Nitric acid · virtual pretreatment','Keep this aliquot independent of A. Gold is modeled as resistant to this treatment; many ordinary minerals are resistant too.','Resistance to nitric acid alone does not prove that the material is gold.',true),
    step('wash','Filter, wash and keep the residue','Water; filter assembly','Archive the nitric filtrate and washings as B-N. Keep the washed solid B-R for the next operation. No fraction is silently discarded.'),
    step('chloride-digest','Use the oxidising chloride module','Virtual aqua-regia chemistry','Transfer only the washed residue into the contained virtual module. Encapsulation can prevent complete recovery. No visible dissolution does not rule out gold.','Au + 4 Cl⁻ → [AuCl₄]⁻ + 3 e⁻  (oxidation half-reaction; an oxidant accepts the electrons)',true),
    step('filter','Clarify and condition the test solution','Virtual filtration and assay conditioning','Retain resistant minerals as B-R2 and the chloride solution as B-F. The module represents controlled conditioning of residual oxidants; excess oxidant can consume Sn(II) and suppress the colour test.', '',true),
    step('tin','Run the gold colour test and controls','Fresh simulated tin(II) chloride; Au reference standard','Compare all vials. Colloidal gold can appear reddish-purple, violet, brown or nearly black. This response is historically associated with Purple of Cassius; colour alone does not specify concentration.','2 [AuCl₄]⁻ + 3 Sn²⁺ → 2 Au + 3 Sn⁴⁺ + 8 Cl⁻'),
  ],
  C:[
    step('nitric-probe','Inspect an independent nitric-acid probe','Nitric acid · separate microportion','A small C-N probe is removed from C. Platinum and many minerals may resist this acid. The probe is archived separately, not reused for the other acid test.','Acid resistance is not diagnostic.',true),
    step('hcl-probe','Inspect an independent hydrochloric-acid probe','Hydrochloric acid · separate microportion','A fresh C-H probe is used. Compare resistance without treating it as platinum identification. Keep both probes labelled.', '',true),
    step('chloride-digest','Form soluble chloride complexes','Virtual aqua-regia chemistry','Treat the remaining C material in the contained module. Some platinum grains may dissolve incompletely; refractory platinum-group minerals can be missed.','Pt + 6 Cl⁻ → [PtCl₆]²⁻ + 4 e⁻  (oxidation half-reaction)',true),
    step('filter','Separate the chloride solution','Virtual filtration','Keep the insoluble residue and clear solution separately. Low recovery and low concentration remain possible even when no solid response follows.'),
    step('ammonium','Screen with ammonium chloride','Ammonium chloride; Pt reference standard','Compare yellow crystalline material with the controls. This classical precipitation test is much less satisfactory for trace platinum than the simple silver and gold tests. Other platinum-group metals can interfere.','[PtCl₆]²⁻ + 2 NH₄⁺ ⇌ (NH₄)₂PtCl₆(s)'),
  ],
  D:[
    step('microscope','Examine the mineral grains','Virtual microscope','Inspect colour, habit, transparency, density indications and associations. Yellow, amber or brown grains can have several identities. Visual inspection cannot establish an REE mineral.'),
    step('radiation','Compare radiation with background','Virtual radiation detector','Some monazite and other minerals contain Th or U. Elevated counts do not prove REEs; background-like counts do not exclude them. Geometry and background matter.', '',false,true),
    step('ree-digest','Decompose resistant minerals virtually','REE mineral digestion module','This dedicated virtual operation represents decomposition of phosphate minerals. It may recover Ce, La, Nd and Y alongside Fe, Al, Ca, Th and phosphate. Recovery is not guaranteed.','REPO₄(s) + 3 H⁺ → RE³⁺ + H₃PO₄  (conceptual acid bookkeeping; not a practical digestion recipe)',true),
    step('oxalate','Screen the recovered ion group','Oxalate reagent; mixed REE reference','Run controls and compare the precipitates. Calcium, thorium and other ions can contribute. A precipitate supports a metal-ion group, not a particular rare-earth element.','2 RE³⁺ + 3 C₂O₄²⁻ ⇌ RE₂(C₂O₄)₃(s)'),
    step('arsenazo','Compare the Arsenazo III assay','Arsenazo III; mixed REE reference','Use the blank, positive control, sample and matrix spike. Inspect colour and synthetic absorbance. Th, U, Zr and other ions can interfere. No individual Ce, La, Nd or Y assignment follows from this dye alone.','Metal ion + Arsenazo III ⇌ coloured complex (stoichiometry and response depend on conditions)',false,true),
  ],
};
export const MINERAL_STUDIES=[
  ['all','10','Read the concentrate: four claims','Complete independent Ag, Au, Pt and REE screens, compare controls, then challenge the conclusions with instrumental evidence.'],
  ['A','11','Silver: follow the white solid','Track an independent extraction, chloride response and thiosulfate confirmation.'],
  ['B','12','Gold: compare the colour controls','Compare a chloride extract with a blank, reference gold response and matrix spike.'],
  ['C','13','Platinum: test the limits of precipitation','Investigate resistance, chloride complexes and the limitations of a yellow precipitate.'],
  ['D','14','Rare earths: separate clues from identity','Combine mineral examination, optional radiation, digestion, oxalate and Arsenazo III evidence.'],
].map(([mineral,code,title,objective])=>({id:`mineral-${mineral.toLowerCase()}`,mineral,code,title,objective,topic:'Mineral concentrate analysis',question:'Do the sample and controls support the same conclusion?',steps:['Preserve reference and reserve portions; work with independent aliquots.','Record each operation and compare blanks, references and unknowns.','State a qualitative conclusion before viewing instrumental evidence.'],analysis:'Synthetic observations teach recovery, interference and sampling limitations. No screen alone establishes a geological grade.'}));
export const MINERAL_STOCKS=[
  ['min-concentrate','Unknown heavy-mineral concentrate','Mineral mixture','Geological samples','solid','Fine mineral dust may contain silica, lead and naturally radioactive minerals. Use containment; do not infer composition from appearance.'],
  ['min-nitric','Nitric acid · analytical module','HNO₃','Analytical acids','liquid','Corrosive oxidizer; dissolution may evolve toxic nitrogen oxides. Virtual hood required.'],
  ['min-chloride-pack','Oxidising chloride · virtual reagent pack','Virtual chloride module','Analytical acids','liquid','Contained teaching reagent, not a physical formulation. Corrosive chemistry and toxic fumes require the virtual hood.'],
  ['min-ree-pack','Resistant-mineral decomposition · virtual reagent pack','Virtual REE module','Analytical acids','liquid','Abstract mineral decomposition, not a real digestion mixture. Use the contained module and shared virtual hood.'],
  ['min-thiosulfate','Sodium thiosulfate solution','Na₂S₂O₃','Analytical reagents','liquid','Acid can decompose thiosulfate; chemical compatibility and waste collection matter.'],
  ['min-tin','Tin(II) chloride · fresh test reagent','SnCl₂','Analytical reagents','liquid','Acidic reagent; oxidation and interfering ions can invalidate a colour test.'],
  ['min-ammonium','Ammonium chloride','NH₄Cl','Analytical reagents','solid','Avoid dust and contact; collect metal-bearing test waste.'],
  ['min-oxalate','Oxalate screening reagent','C₂O₄²⁻','Analytical reagents','liquid','Harmful reagent; calcium and other metals can precipitate.'],
  ['min-arsenazo','Arsenazo III reagent','Arsenazo III','Analytical reagents','liquid','Arsenic-containing analytical dye; avoid contact and collect compatible hazardous waste.'],
  ['min-ag-standard','Silver positive-control solution','Ag⁺','Analytical standards','liquid','Known reference; light sensitivity and contamination affect interpretation.'],
  ['min-au-standard','Gold positive-control solution','[AuCl₄]⁻','Analytical standards','liquid','Acidic reference solution; qualitative control, not a calibration curve.'],
  ['min-pt-standard','Platinum positive-control solution','[PtCl₆]²⁻','Analytical standards','liquid','Soluble platinum salts can sensitize; avoid contact and collect metal waste.'],
  ['min-ree-standard','Mixed rare-earth positive control','Ce / La / Nd / Y','Analytical standards','liquid','Mixed reference verifies group response; does not resolve individual elements.'],
].map(([id,name,formula,group,form,hint])=>({id,name,formula,group,form,hint,scope:'mineral'}));
export const MINERALS=['quartz','feldspar','magnetite residue','ilmenite','zircon','rutile','pyrite','chalcopyrite','galena','monazite','xenotime','allanite'];
export const INSTRUMENTS={
  xrf:{name:'XRF',limit:{Ag:10,Au:20,Pt:20,Ce:50,La:50,Nd:50,Y:20},note:'Bulk screening; matrix corrections and spectral overlap matter. Trace noble metals can lie below the assumed reporting limit.'},
  oes:{name:'ICP-OES',limit:{Ag:.2,Au:1,Pt:1,Ce:.5,La:.5,Nd:.5,Y:.2},note:'Assumes validated preparation and calibration. Solution sensitivity cannot compensate for incomplete dissolution.'},
  ms:{name:'ICP-MS',limit:{Ag:.01,Au:.02,Pt:.02,Ce:.01,La:.01,Nd:.01,Y:.01},note:'Assumes validated preparation and interference control. Matrix effects, contamination and sampling remain important.'},
  fire:{name:'Fire assay + instrumental finish',limit:{Ag:.1,Au:.02,Pt:.05},note:'Synthetic precious-metal collection and instrumental finish. No furnace, flux or operating recipe is supplied; REEs are outside this method.'},
  sem:{name:'SEM-EDS',limit:{Ag:1000,Au:1000,Pt:1000,Ce:1000,La:1000,Nd:1000,Y:1000},note:'A selected grain is examined; a grain result is not a bulk concentration. The illustrative elemental threshold is 0.1 mass %. Grain selection can miss the carrier.'},
};
export const MINERAL_SOURCES=[
  ['USGS · sample heterogeneity and the nugget effect','https://pubs.usgs.gov/of/2008/1132/pdf/Pebble_OFR_2008-1132.pdf'],
  ['USGS · geological analytical methods','https://www.usgs.gov/centers/gggsc/science/analytical-chemistry'],
  ['USGS · thorium-bearing accessory minerals','https://pubs.usgs.gov/of/2004/1050/thorium.htm'],
  ['Arsenazo III · response to several metal groups','https://pubmed.ncbi.nlm.nih.gov/18961075/'],
  ['Ammonium hexachloroplatinate · experimental characterization','https://www.sciencedirect.com/science/article/abs/pii/S0167577X03003811'],
  ['NIST · silver-halide complexation by thiosulfate','https://nvlpubs.nist.gov/nistpubs/jres/64C/jresv64Cn1p65_A1b.pdf'],
  ['Gold nanoparticles and Purple of Cassius · experimental study','https://pmc.ncbi.nlm.nih.gov/articles/PMC9170166/'],
  ['Penn EHRS · gas-producing analytical waste','https://ehrs.upenn.edu/health-safety/lab-safety/chemical-hygiene-plan/fact-sheets/fact-sheet-gas-producing-waste'],
];

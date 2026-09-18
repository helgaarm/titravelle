# SOI-18 organic research workbench

This module implements the user's SOI-18 brief as an **unvalidated, parameterized teaching scenario**. It does not predict the real performance, toxicity, kinetics, separation selectivity or experimental feasibility of sucrose octakis(16-methylheptadecanoate). Every quantitative result is either formula-based bookkeeping or synthetic data generated from stated assumptions. A general acyl-exchange precedent is not validation of this specific molecule, scale or apparatus.

## Starting the investigation

The standard Workbench exposes **Preparation, Reactor, Work-up, Analysis, Materials & controls, and Organic report** alongside the Vessel bench. No experiment must be selected to use them. **Experiments → SOI-18: test the whole claim** starts a fresh guided run. Organic tools use an open research view; aqueous assessment-mode hiding does not apply, and organic snapshots are labeled research.

One shared shelf combines the 24 organic reagent, impurity/reference and comparison entries with 13 aqueous stocks and 12 common dry materials. Name/formula search, collection/category filters and bounded scrolling keep it compact. Selecting an organic material leaves the current work area open and exposes **Use in a vessel**. Any solid/liquid entry can be weighed into standard glassware; nitrogen uses a gas-flow toggle. These ordinary vessel additions have independent inventories and do not charge or qualify the research reactor. Stock forms and references have distinct catalog identities.

Both chemistry states, readings and drafts survive equipment changes; the ventilation setting and notebook are shared. Old saves open in their previous aqueous or SOI context. A new run explicitly resets both sets of samples and can be undone during the session. The specialized SOI-18 analytical models still apply only to their qualified feed/reactor/product. Arbitrary vessel samples cannot be imported into those analyses. General-vessel material tracking and conservative phase/chemistry limits are documented in [SCIENTIFIC_MODEL.md](SCIENTIFIC_MODEL.md).

The SOI-18 investigation includes a collapsible **Guided sequence** with 13 steps, live evidence checks and direct links to the relevant controls. It follows current lot qualification, apparatus and hood settings, conditioning/blending counters, reaction samples, work-up, drying, final QC, materials, controls and a saved notebook snapshot. **Browse all steps** lets you review the sequence or stop a failed reaction for work-up. Opening controls does not execute an operation; **Load suggested settings** only fills that instrument's form. Suggested values describe the default teaching scenario, not a validated physical procedure.

Progress is derived from existing records and survives reload and undo. Changed lots require new feed measurements; changed products require new QC and characterization. After cooling or neutralization, the reaction stage carries a review flag: stored reaction samples do not certify a later batch state. Failed quality criteria remain visible and can lead to an unsuccessful report. Recording all guide steps does not mean every scientific criterion passed.

One example of using the default scenario (not a validated physical protocol):

1. Dry the two lots, then measure Karl Fischer water and resolved feed GC. A 60-minute modeled drying period is enough for the supplied default moisture assumptions; readings must demonstrate this. Connect the standard apparatus and turn simulated local exhaust on.
2. Charge qualified methyl ester, set 50 °C and 50 mbar, and advance long enough to accumulate 30 minutes of conditioning **after** reaching those conditions. A 60-minute advance includes the initial temperature/pressure ramps.
3. Charge sucrose octaacetate; blend for 30 minutes. Add the nominal 0.136 g methoxide charge or choose another loading. Take the initial sample.
4. Explore 110 °C and 1 mbar with hourly advances and samples. Inspect endpoint criteria and degradation; elapsed time alone is not an endpoint. A sample represents 5 mg removed from the material ledger.
5. Cool and gradually return to near atmospheric pressure using Reactor controls, then neutralize the calculated remaining methoxide/hydroxide equivalents. Collect a fraction using the stated separation assumptions. Dry, repeat to assess constant mass, and obtain final QC.
6. Run the synthetic materials panel and all six matched friction controls. Inspect the report before interpreting any A–D scenario conclusion. Download a standalone HTML report with graphs or the complete Markdown/JSON record or preserve an independent notebook snapshot.

Change feed quantities/composition/moisture, rate constants, separations or assumed material properties **before charging** to create related investigations. Stirring, inert atmosphere, vacuum, trap and calibration settings can be varied during the run and are recorded. High-purity SOI-18 qualification deliberately rejects inappropriate feed; the workbench is not a universal organic reaction solver.

## Stoichiometry and molecular identity

The supplied conceptual exchange is atom-balanced:

`C28H38O19 + 8 C19H38O2 ⇌ C156H294O19 + 8 C3H6O2`.

Average masses use C = 12.011, H = 1.008 and O = 15.999. The target average molar mass is 2474.049 g/mol; stoichiometric quantities derive from the actual dry sucrose charge, alongside the brief's nominal 5.00 g target. The nominal lot weights are 1.371 g and 5.430 g **including contamination**. Drying changes their weights; it does not refill the lot to its original number. Element-based masses are used consistently so rounding differences cannot create or destroy tracked mass.

The 45 surviving sucrose states have `j` fatty residues and `k` hydroxyl positions, where `j+k≤8`; the other `8−j−k` sites are acetates. Thus sucrose octaacetate has fatty DS 0 but total ester DS 8. Hydrolysis increases OH and reduces total ester DS. For dominant C18 residues, the formula of a state is `C(28+16j−2k) H(38+32j−2k) O(19−k)`.

Four distinct purity quantities are retained:

- Desired fatty-isomer mole fraction among all fatty residues, quantified from cleaved-residue GC after excluding free ester.
- Fatty DS and the population of octa-fatty versus partially exchanged/hydrolyzed sucrose species.
- HPLC/ELSD area fraction, under an explicit nonlinear response assumption; this is not mass or mole fraction.
- Whole-batch octa-family mass fraction and estimated mass fraction of molecules bearing eight desired residues. The latter uses independent random incorporation, `p^8`, which is an assumption. Even 99.7 mol-% desired residues does not imply 99.7% of molecules have eight desired residues.

Monoisotopic masses use the most abundant isotope masses; [M+H]+ adds 1.007276466621 Da and [M+Na]+ adds 22.9892207 Da. Average molecular mass is not reported as an experimental ion. Positional C18 isomers remain isobaric. The displayed masses describe the dominant C18 species; full isotope envelopes, other chain-length satellites, fragmentation intensities, ion efficiencies and unknown oxidation structures are not predicted.

## Reactor model and conservation

The engine performs bounded half-minute steps. Competing events move molecules between the 45 states: forward acetate/fatty exchange, reverse exchange, acetate hydrolysis, fatty-ester hydrolysis, and transfer into a retained unresolved degradation pool. Substrate, methyl acetate and water consumption are capped at available amounts. Free FAME, free acid, methanol, methyl acetate, water, methoxide, hydroxide, acetate salt, fatty soap, solvent and degraded mass are tracked separately.

Forward exchange has an adjustable rate at 110 °C, an assumed 45 kJ/mol temperature dependence, dependence on available FAME and remaining active methoxide, methanol inhibition and a stirring factor. Reverse exchange depends on retained methyl acetate. Hydrolysis depends on water and hydroxide. Degradation accelerates with temperature and is greater without the assumed inert atmosphere. **These constants are not experimentally fitted SOI-18 values.** Nitrogen-off runs receive a documented small assumed moisture influx, included in input mass. Oxidative structures are not assigned; the degraded pool is mass bookkeeping, not mechanistic identification.

Water converts methoxide to hydroxide and methanol. This changes catalyst identity/activity without automatically removing all basic equivalents. Free acids consume base and form salts; methanol is not counted as a stoichiometric neutralizing acid. Cooling precedes a calculated stoichiometric acetic-acid quench of remaining methoxide/hydroxide. The model omits a detailed quench heat/boiling calculation.

Setpoints ramp at at most 2 °C/min and 0.2 units of log pressure per minute. Actual model pressure and an indicated gauge value are recorded separately: the assumed uncalibrated systematic bias is +10%, with a nominal uncertainty bound of 0.02 mbar + 2% of pressure. This is not a pressure-gauge specification. A deliberately abrupt pressure step with a large pressure ratio can remove an assumed 8% representative entrained fraction; it is a failure scenario rather than a hydrodynamic boiling model.

Water, methanol, methyl acetate and a lumped work-up solvent evaporate with stated surrogate rate constants depending on temperature/pressure. The cold-trap efficiency partitions them between collected and uncaptured mass. Disabling the trap does not suppress generation or improve conversion. Dissolved gases, full vapour–liquid equilibrium, trap capacity, air leaks, pump curves, actual foam height and heat-transfer coefficients are not resolved. Free fatty ester is nonvolatile in this limited model and can be lost by entrainment/separation, not silently removed as a low-boiling solvent.

At every stage:

`total reactor inputs = reactor mass + trap mass + uncaptured mass + separated/entrained waste + analytical aliquots`.

Starting-lot drying/separation losses are recorded before reactor charge and are not double-counted as reactor inputs. The apparent crude mass, isolated batch mass, recovered octa-family mass, actual theoretical yield, nominal target yield and purification losses are reported separately. Feed composition is a fixed incorporated pool with no assumed isomer-selective reaction rate. The unidentified FAME uses a labeled C18 surrogate for bookkeeping; real unidentified impurities would make molecular balances less certain.

## Separation and instruments

Close FAME isomer separation cannot be established from molecular formula alone. Feed purification takes explicitly specified target recovery and contaminant carryover, changes the recovered composition/mass, and invalidates GC/KF qualification. Product purification is a hypothetical chromatography fractionation with adjustable recoveries for octa-family, partial esters, free FAME and inorganic material; it is not a claimed validated solvent recipe. The solvent input remains in the ledger until removed. Constant mass requires two drying records within 1 mg, and a changed batch needs current QC.

GC-FID uses assumed retention times and molar response factors, calculating mole-% from `area/factor`, normalized over the entire FAME population. Simulated GC-MS ions are schematic saturated-FAME examples, not a downloaded reference spectrum or isomer-specific fingerprint. Coelution explicitly withholds isomer purity and prevents high-purity feed qualification. Feed must meet ≥99.5 mole-% at the lower expanded-uncertainty bound, while KF upper bounds must be <0.05 wt-% for the sucrose lot and <0.03 wt-% for the FAME lot. The starting free-acid and methanol contamination remain separate from FAME-population purity.

Analytical results use a reproducible pseudo-random sequence, sampled only on explicit instrument actions. Reopening a view or export never resamples. qNMR gives approximate integrals and assignment windows, separates bound acetate from free acetate-containing material, and estimates fatty DS independently of the simulated response-corrected HPLC estimator. HPLC endpoint predominance is normalized among sucrose peaks, while final area-% also includes free-FAME and unresolved degradation response. The analytical estimators share the underlying model, so agreement does not independently validate it. COSY/HSQC/HMBC are explicit assignment tasks, not fabricated correlations. An actual isomer identification needs resolved standards and suitable methods.

The endpoint combines low bound acetate, octa-fatty predominance, small changes between samples at least 30 minutes apart, slow net methyl-acetate generation and limited decomposition. Sampling losses must not be confused with negative conversion; the net-generation ledger is used for the evolution test. These endpoint tolerances are pedagogical. An early quench may be attempted and may fail QC.

## Materials, statistics and conclusions

The materials panel generates illustrative first-heat/cool/second-heat DSC curves and TGA from assumed thermal properties, wetting droplets from an assumed contact angle, and explicitly illustrative coating morphology/UHMWPE retention scenarios. DSC signal units are arbitrary; fusion enthalpy and glass transition remain unestablished. The panel cannot infer nanoscale domains, penetration, a safe processing window or environmental safety from the chemical name.

The six comparison materials receive identical load, velocity, grain, water, run length and temperature settings. There are seven temperature labels; +1 °C refers to ambient wet-test conditions, not stable snow/ice at +1 °C. Independent coupon replicates generate friction-versus-distance curves and abrasion results at 1, 10, 50 and 100 cycles. Untreated UHMWPE has no retained coating. The SOI-specific friction advantage is **zero by default**; it is an editable hypothesis parameter, not a result of molecular simulation. Other control offsets and wear are likewise assumptions.

Means, sample SDs and Student-t intervals use independent coupon means rather than counting repeated distance points as independent samples. Fourteen prespecified SOI-versus-linear/mixed comparisons use Welch intervals with a Bonferroni familywise 95% bound; effect sizes and replicate counts are recorded. D requires lower friction against both architecture controls at a common temperature with those bounds, plus all current chemical criteria and completed characterization. It is always explicitly a **synthetic scenario conclusion**; the model cannot attribute a real advantage to terminal branching. C is a null comparative result, B failed/unconfirmed batch specification, and A negligible octa-fatty formation. Missing stages remain incomplete rather than being forced into C or D.

Environmental ester cleavage is a sensitivity curve for an assumed half-life. Formal complete hydrolysis yields sucrose and the constituent fatty acids. Further biodegradation, logP, BCF, aquatic toxicity and ultimate products remain unestablished. Missing values are deliberately not invented.

## Persistence, interface and verification

The optional `organic` object is stored in the existing version-2 laboratory state. Older aqueous saves do not require migration or replacement. Changes are transactional, undoable and persist; snapshots retain the complete organic run and Markdown report; standalone HTML exports include the analytical tables and SVG graphs. Exports include all stage results, profiles, assumptions, instrument records, mass ledgers, control data and statistical comparisons. Source and support modules have no runtime packages or remote asset loads.

Tests check atom and mass balance, qualification gates, coelution, sequential populations, catalyst/moisture effects, failed stirring/vacuum/trap, thermal degradation, foaming, neutralization, purification recovery, independent purity definitions, stale QC, endpoint sampling, A–D outcomes, Student-t/Welch statistics, report immutability, persistence and shelf filtering. Browser tests run the full workflow through controls, inspect desktop/mobile layouts, and check notebook export and undo alongside the aqueous regression suite.

## Factual references

Consulted 18 September 2026. Source text, diagrams and layouts are not bundled.

- [EP0647652A2, saccharide polyester transesterification](https://patents.google.com/patent/EP0647652A2/en): general acyl-exchange precedent and removal of volatile by-products. The project's formula, targets and requested scale came from the user's brief. This citation is not patent clearance or validation of SOI-18.
- [IUPAC: monoisotopic mass](https://goldbook.iupac.org/terms/view/12495): distinction from average mass.
- [NIOSH: methyl acetate](https://www.cdc.gov/niosh/npg/npgd0391.html) and [methanol](https://www.cdc.gov/niosh/npg/npgd0397.html): volatility, flammability and exposure concerns.
- [Supplier SDS for methyl 16-methylheptadecanoate](https://static.cymitquimica.com/products/3D/pdf/sds-FAA12961.pdf): formula and incomplete toxicological characterization. Absence of a classification is not evidence of safety.
- [Sigma-Aldrich sodium methoxide solution](https://www.sigmaaldrich.com/ER/en/product/sial/156256): methoxide/methanol hazard context; the user's actual reagent form and current SDS govern physical handling, not this simulator.

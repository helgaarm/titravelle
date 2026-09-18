# First-milestone scientific model

This document describes the general vessel laboratory (`lab-*.js`), including aqueous calculations and weighed organic/dry additions. It is an educational approximation with explicit coverage limits. The separate SOI-18 calculation model (`organic-*.js`), its unvalidated kinetics/material assumptions, qualification gates and full mass ledger are documented in [ORGANIC_MODEL.md](ORGANIC_MODEL.md).

## Weighed organic and dry materials in ordinary vessels

Every nongaseous shelf material can be weighed into ordinary vessels independently of the reactor. The additional catalog includes dry NaCl, NaHCO₃, sucrose, anhydrous citric acid, CaCO₃, starch, silica sand, iron filings, magnesium ribbon, zinc granules, activated carbon and CuSO₄·5H₂O. A material parcel stores identity, added form, mass in grams and an **assigned occupied volume** in mL. The user supplies that volume; the default 1 g / 1 mL is a placeholder, not a density. Form choices and schematic drawings do not establish phase identity at a particular temperature.

The capacity check and drawing use additive assigned volumes. Bulk/displacement volume, dissolution contraction, solvation, melt transitions and partial molar volumes are not predicted. The balance tracks total mass. A representative transfer moves the same fraction of each material, water, aqueous component and indicator; a partial transfer of a material sample requires mixing. Whole-sample transfer moves all layers and solids. Layer-selective pipetting and quantitative extraction are not implemented. Dry solids use mass transfer or a whole-sample pour rather than a pipette. Emptying moves mass to the waste ledger. Additions, parcel transfers, snapshots, reloads and undo retain the inventories.

The ledger describes **added ingredients**, not analytical confirmation that those molecules remain unchanged after mixing. For example, sodium methoxide reacts with water to give methanol and sodium hydroxide. The general vessel model names this reaction but does not quantify its extent or heat; it does not present unchanged reagent masses as equilibrium species. The specialized reactor has its own reaction rules. The water reaction is supported by [NOAA CAMEO / USCG sodium methylate property information](https://cameochemicals.noaa.gov/chris/SML.pdf).

General organic/solid mixtures with unresolved ingredients withhold pH, reaction yields and quantitative thermal predictions. Heating, cooling, temperature measurement, filtration, washing and drying reject operations for which the required thermal, solubility or volatility data are missing. They do not consume or transform the sample on failure. Room-temperature waits advance time and settle only the illustration; no evaporation or reaction rate is inferred. Other occupied aqueous vessels retain their existing thermal model.

Two narrowly scoped dry-salt rules bridge to the aqueous calculations: NaCl and NaHCO₃ can dissolve into tracked analytical ions, capped at **0.35 and 0.09 g per g of available water**, respectively. These conservative teaching caps approximate room-temperature solubility rather than fit a thermodynamic model. Existing relevant ion totals reduce the allowance; other weighed materials disable these rules. Residual solid retains its ledger and withholds quantitative aqueous results. Adding more water can permit further dissolution. The rules do not reverse-predict crystallization, common-ion equilibria or multisolvent solubility. Reference values are about 36 g NaCl per 100 g water ([FAO/WHO analytical-method discussion](https://www.fao.org/fao-who-codexalimentarius/sh-proxy/jp/?lnk=1&url=https%253A%252F%252Fworkspace.fao.org%252Fsites%252Fcodex%252FMeetings%252FCX-715-43%252FWorking%2Bdocuments%252Fma43_05_Add.1x.pdf)) and 9.3 g NaHCO₃ per 100 mL water at 20 °C ([ILO/WHO ICSC 1044](https://www.inchem.org/documents/icsc/icsc/eics1044.htm)).

Phase drawings are deliberately limited. Methanol and acetic acid are identified as water-miscible liquids, consistent with the [NIOSH methanol](https://www.cdc.gov/niosh/npg/npgd0397.html) and [acetic acid](https://www.cdc.gov/niosh/npg/npgd0002.html) records. A binary water/branched-FAME illustration shows separate regions before mixing and a dispersion after mixing; layer volumes, density order and exact partitioning are **not calculated**. Adding another weighed material disables that binary sketch. Solids are illustrated as additions with an unresolved dissolved fraction. No automatic insolubility claim is made for sugar or citric acid, and partially water-soluble methyl acetate does not automatically become a separate layer.

Nitrogen can be switched on/off at an ordinary vessel. The open-vessel flow records no retained gas mass and makes no oxygen-concentration or inert-atmosphere claim. Ingredient precautions follow parcels into receiving vessels; ventilation does not remove them. Exports and notebook snapshots include the complete vessel inventories. Loading older saves without material ledgers remains supported.

## State and conservation

Every vessel has a capacity, liquid volume (or assigned occupied volume for weighed additions, in mL), sample mass (g), estimated water mass (g), temperature (°C), analytical component totals (mol), indicator amounts, mixing status, and trial number. Components include Na, Cl, Ag, nitrate, total acetate, dissolved inorganic carbon, Cu, and sulfate. Free hydrogen/hydroxide and weak-acid speciation are calculated from equilibrium; they are not separately added stock ingredients. Analytical totals track conserved components across dissociation and precipitation.

A stock addition introduces a parcel. A transfer removes that parcel from the source and combines it with the receiver, including thermal energy and suspended solids when mixed. Invalid operations are transactional: failed capacity or quantity checks leave the original state intact. Stock bottles are unlimited reservoirs. The experiment clock advances only through explicit wait/heating/cooling operations.

Liquid volumes are additive. All supplied solutions use a simplified density of 1.000 g/mL; solute molar masses partition that input into estimated solute/water mass. Strong neutralization and the open-vessel bicarbonate reaction add generated water to the water estimate. Sample mass is conserved across transfers, filtration, and drying when escaped CO₂, evaporated water, and discarded mass are included. This is not a complete element-by-element H/O speciation model for arbitrary weak-acid mixtures; solvent mass is an approximation, particularly outside the five study workflows.

## Equilibria and observations

The charge-balance solver bisects pH between −2 and 16 using ideal concentrations and fixed 25 °C constants:

- `Kw = 1e-14`
- `Ka(acetic acid) = 1.8e-5`
- carbonate `Ka1 = 4.3e-7`, `Ka2 = 4.7e-11`
- `Ksp(AgCl) = 1.8e-10`

For silver/chloride totals A and B (mol), liquid volume V (L), and an allowed AgCl system, solid amount is `max(0, (A+B−sqrt((A−B)²+4 Ksp V²))/2)`. Remaining Ag and Cl are dissolved. Their charges, spectator ions, water, acetate, and carbonate enter electroneutrality. This permits precipitation, the common-ion effect, and dissolution during washing/dilution without separate outcome scripts.

Macroscopic descriptions identify a colour, clarity, white solid, or escaped gas. They do not name a precipitate before analysis. The optional conceptual inventory identifies components and model amounts; it is not a measured particle count or molecular dynamics. Equation view and the calculation desk select equations from recorded changes in the selected vessel and its current equilibrium state. The manual equation checker independently checks atoms and charge for its supported notation; balance alone does not establish chemical feasibility.

## Equation prediction and calculated amounts

`predictEquations(vessel)` is read-only: it returns reaction records, current equilibria, coverage notices, and balanced formatted equations. It does not run an additional reaction, take a measurement, or consume random numbers. The bench records supported changes when parcels are combined:

- Strong acid/base neutralization uses the same reacted equivalents as the thermal model, `min(acid₁,base₂) + min(base₁,acid₂)`. This pathway is quantitatively recorded only in mixtures without acetate, inorganic carbon, copper, or sulfate, matching the existing heat calculation. Proton redistribution in copper/sulfate mixtures is shown through the coupled equilibria instead.
- AgCl precipitation/dissolution uses the final solid amount minus the solid already present in both incoming parcels. Pre-existing solid transferred into a clean receiver therefore does not become a second precipitation event. Events below `1e-12 mol` are omitted as numerical noise.
- Acetic acid with added strong base records the equilibrium increase in acetate. Strong acid with acetate records the reverse change. These are changes in acid/base speciation, not an assumption that all analytical acetate reacted; unrelated dilution is not labeled neutralization. Carbonate-containing mixtures do not receive these quantitative acetate records.
- Bicarbonate gas equations use the engine's escaped CO₂ amount. The known acetic-acid/bicarbonate stock pairing has its own weak-acid net equation. Other acid systems use the simplified hydrogen-ion/bicarbonate pathway. This does not resolve every simultaneous proton-transfer pathway in a mixed acid/carbonate system.
- Copper hydroxide precipitation/dissolution records the change in Cu(OH)₂ solid after subtracting solid already present in both parcels. Dissolution uses the general free-ion equation; its description also gives the overall acid-driven equation. Complex distributions are current equilibrium inventories, not cumulative reaction extents.

Records aggregate by reaction type in each vessel. Their amounts are historical totals over mixing steps, **not current product inventories**; gas can have escaped, a product can react again, and liquid can be transferred out. History stays with the vessel where it happened, survives reload/undo, and resets when that vessel is emptied. Material transferred into a receiver contributes its actual equilibrium inventory and may cause new reactions there. Emptying or rinsing does not erase saved notebook snapshots.

Molecular forms and spectator lists are supplied only when the two parcels have known unmixed stock identities (including a stock diluted with water or indicator). Mixed/reacted parcels lose that stock identity; their net ionic results remain available. A previously identified molecular form in an aggregated record describes the known pairing steps, not necessarily every later step. Existing saved vessels without the new fields remain valid; the UI labels missing historical data instead of inferring neutralization from sodium and chloride alone.

The separate equilibrium section includes water, acetate, bicarbonate/carbonate, AgCl, and the supported copper/sulfate equilibria when relevant. Effective carbonic `Ka1` treats dissolved CO₂ and the small hydrated carbonic-acid fraction as one pool. Equilibrium arrows do not represent extra completed reactions. The same independent atom/charge checker validates displayed equations, including integer coefficients and the explicit copper species notation; chemistry selection relies on curated rules, not balance alone. No arbitrary unknown-sample identification or general reaction discovery is implemented. Unsupported competing mixtures withhold the report; dry samples withhold aqueous equilibria.

**Add equations to notebook** appends a labeled model report, preserving student writing and avoiding an identical duplicate. Saving a notebook snapshot then preserves that text independently. Predictions are hidden in assessment mode.

Indicators use approximate colour bands. Indicator volume dilutes a sample, but the dye's own acid/base chemistry is neglected. Mixed-dye colour is withheld. Phenolphthalein is colourless below its transition, becoming pink above approximately pH 8.2. Universal, methyl-orange, and bromothymol-blue palettes are conceptual observations, not spectroscopic colour predictions.

Bicarbonate consumes available acid equivalents under an irreversible open-vessel CO₂-escape approximation. Escaped gas is a cumulative mass ledger, not retained headspace or a pressure prediction. Atmospheric uptake, bubble kinetics, partial CO₂ retention, and gas-transfer rates are absent.

Copper with water, chloride, sulfate, strong acid, or hydroxide uses the coupled calculation below. Copper/sulfate combined with acetate, inorganic carbon, or silver still requires missing competing equilibria. Silver with acetate, inorganic carbon, or excess hydroxide is also unsupported. Those mixtures show a specific coverage message and withhold pH/reaction predictions.

## Copper, chloride, and sulfate speciation

`src/lab-copper.js` solves a restricted aqueous Cu(II) system using conserved analytical totals, equilibrium relations, and electroneutrality. Its selected constants come from the USGS PHREEQC `minteq.v4.dat` database, accessed 18 September 2026. The project includes numerical facts and its own solver, not a copy of the database or the PHREEQC program. Constants are fixed at 25 °C. Hydrated Cu²⁺ is written without its coordination waters.

| Equilibrium | Model log₁₀ K |
| --- | --- |
| Cu²⁺ + n Cl⁻ ⇌ CuClₙ^(2−n), n = 1, 2, 3, 4 | 0.20, −0.26, −2.29, −4.59 (cumulative) |
| Cu²⁺ + SO₄²⁻ ⇌ CuSO₄(aq) | 2.36 |
| H⁺ + SO₄²⁻ ⇌ HSO₄⁻ | 1.99 |
| Cu²⁺ + n H₂O ⇌ Cu(OH)ₙ^(2−n) + n H⁺, n = 1, 2, 3, 4 | −7.497, −16.194, −26.879, −39.98 (aqueous, cumulative) |
| 2 Cu²⁺ + 2 H₂O ⇌ Cu₂(OH)₂²⁺ + 2 H⁺ | −10.594 |
| Cu(OH)₂(s) + 2 H⁺ ⇌ Cu²⁺ + 2 H₂O | 8.674 |

With model `Kw = 1e-14`, the last value gives `Ksp(Cu(OH)2) = 10^(8.674−28)`, approximately `4.72e-20`. The Cu(OH)₂ molar mass is 97.56 g/mol. Some database constants, particularly the higher hydroxide complexes, are conditional at finite ionic strength. The selected subset is an ideal-concentration teaching approximation, not a uniform thermodynamic parameter fit.

At a trial hydrogen-ion concentration, the solver finds free chloride from its ligand balance and free sulfate from its balance with bisulfate and CuSO₄(aq). It adjusts free copper to satisfy the copper balance, counting two copper atoms per dimer. If a no-solid solution would exceed `Ksp`, free copper is capped by `Ksp/[OH−]²`, and the remaining copper is Cu(OH)₂ solid. A pH bisection then balances all dissolved charges. The returned result includes actual aqueous species, total dissolved components for material transfers, precipitated copper, the ion product, ionic strength, and element/charge residuals. Nonconvergence withholds numerical predictions. Cached results are invalidated when a vessel's volume or component totals change.

The interface separates **analytical totals** (`C_T = n/V`) from **free-ion/complex concentrations**. Copper percentages refer to total copper atoms including solid; displayed aqueous percentages therefore need not total 100% when solid is present. Minor species omitted from the table remain in the balance. Current equilibria are available for existing saved mixtures even without reaction history. Notebook reports include the approximation label and the current species distribution.

For the user's nominal mixture of 50 mL each of 1 M NaCl, water, 1 M HCl, and 1 M CuSO₄, ideal delivery gives 200 mL, 0.250 M total Cu, 0.500 M total chloride, 0.250 M total sulfate, and 0.250 M Na. This restricted model predicts pH about 0.86, free Cu²⁺ about 0.0671 M, CuCl⁺ about 0.0467 M, CuCl₂(aq) about 0.00711 M, CuSO₄(aq) about 0.129 M, and HSO₄⁻ about 0.113 M. It predicts no Cu(OH)₂ solid. These are **model checks, not validated physical-sample values**: the calculated ionic strength is about 0.644 M, well outside a dilute ideal-solution regime.

The report explicitly flags ionic strength above 0.1 mol/L as a qualitative estimate. This is a conservative teaching threshold, not a validated accuracy boundary. No Davies, SIT, or Pitzer activity correction, copper redox, exact optical spectrum, sodium–sulfate ion pairing, or alternative solid competition (such as CuO or basic copper sulfates/chlorides) is implemented. The blue colours illustrate dissolved copper or hydroxide precipitate, not a spectral calculation. “Ideal measurements” switches off instrument errors only; it does not remove these chemistry limitations. Copper/sulfate reaction heat is omitted.

Wet copper precipitation, settled/mixed transfers, filtration, and washing conserve Cu, chloride, sulfate, and sample mass. Realistic filtration allows the same 2% solid breakthrough as the silver workflow. Copper-residue drying is explicitly refused because hydration/dehydration and conversion to other solids need a separate model; wet weighing remains available. As elsewhere, the water-mass estimate is not a complete H/O speciation inventory.

## Instruments and mistakes

Transfer animations depict the already validated and saved operation. Source/receiver volumes interpolate between their actual before/after states. During the pipette animation, the volume removed but not yet delivered is shown in the pipette; it does not create a second engine operation. Displayed colours are calculated from interpolated compositions. Tilted liquid surfaces are approximate geometric illustrations, not a fluid-dynamics or reaction-rate model. Animation duration is unrelated to laboratory-clock time. Skip, navigation, reload, and reduced-motion behavior preserve the single committed result; Undo restores its preceding bench state.

The seeded pseudo-random generator samples only at an operation or measurement. Re-rendering, opening a notebook, or plotting does not resample an existing reading. Recorded observations include timestamps, model time, vessel/trial, instrument, units, random bound, mode, and context.

| Operation/instrument | Realistic-mode approximation |
| --- | --- |
| Graduated pipette delivery | Nominal quantity plus uniform ±0.03 mL; capacity 25 mL |
| Graduated cylinder delivery | Nominal quantity plus uniform ±0.5 mL; capacity 100 mL |
| Beaker graduation delivery | Nominal quantity plus uniform ±2 mL; capacity 250 mL |
| Burette delivery | Nominal quantity plus uniform ±0.05 mL; finite 50 mL stock |
| Very small deliveries | Lower bound is half the requested amount; errors therefore become asymmetric near zero. These are teaching approximations, not a glassware certification model. |
| Burette reading | Uniform ±0.025 mL per reading; delivered volume is final minus initial reading |
| pH meter | Uniform ±0.02 pH; fixed +0.18 uncalibrated bias; +0.12 unmixed sampling bias |
| Balance | Uniform ±0.0001 g; includes container/filter tare until explicitly zeroed |
| Thermometer | Uniform ±0.1 °C |
| Volume observation | Volumetric flask ±0.1 mL; cylinder ±0.5 mL; other vessels ±2 mL |
| Setting the 100 mL mark | Uniform ±0.1 mL final volume |

These errors are pedagogical choices, not verified specifications for actual equipment. Calibration removes the pH systematic offset; mixing removes its sampling offset. Balance tare zeros the current load, including contents. The uncertainty column shows only random bounds, not a combined confidence interval or all systematic effects. Unmixed liquids otherwise equilibrate instantly; liquid layering and diffusion are not spatially modeled. The fixed unmixed pH offset illustrates nonrepresentative sampling rather than predicting its real direction.

The initial burette contains 0.5 mL rinse water. Filling without conditioning dilutes its titrant. Conditioning empties it; a fill then brings total liquid volume to 50 mL. Residual conditioning films and air bubbles are not modeled. The learner chooses an indicator endpoint; the app does not stop addition at equivalence. Unknown HCl is generated in the interval 0.075–0.125 M per new run and remains the same for repeat aliquots in that run.

Ideal mode removes delivery/reading randomness, calibration/mixing offsets, and filter breakthrough. It does not remove equilibrium solubility, heat loss, apparatus heat capacity, or contamination from unwashed mother liquor. Undo can restore an operation, but measurements are not silently corrected.

## Filtration and gravimetry

Filtering separates liquid and equilibrium solid. Wet retained mother liquor is the lesser of 1 mL and 2% of the original liquid volume. Realistic mode lets 2% of the initially formed solid break through into the receiver; this loss remains in the material ledger. A wash adds 5 mL water, recalculates AgCl equilibrium, and drains to a retained 0.5 mL. Dissolved solutes leave in the filtrate/washings; some AgCl can dissolve. The model uses one filter per run and retains all other balances.

Drying is an explicit accelerated operation that removes estimated water into the evaporated-mass ledger. It does not simulate drying kinetics. Nonvolatile solutes from unwashed mother liquor remain in the measured residue, so dry residue need not be pure AgCl. The filter has a separate 1.0000 g tare. AgCl molar mass is modeled as 143.32 g/mol. The calculator's stoichiometric maximum differs slightly from the equilibrium/recovered mass.

## Calorimetry and temperature

Simple strong acid/base neutralization releases a fixed **57.3 kJ per mole** of reacted acid/base equivalents. This pathway excludes acetate, carbonate, copper, and sulfate mixtures. This is a teaching value in the usual dilute-solution range, not a concentration-dependent thermochemical fit. Heat of dilution and all other reaction enthalpies are omitted. Equilibrium constants remain at 25 °C even when temperature changes.

Solution heat capacity is `mass × 4.184 J/(g·K)`. The calorimeter cup adds 20 J/K. Other apparatus heat capacities are omitted. Combining parcels uses their heat capacities, temperatures, and any supported reaction heat. Waiting exchanges heat with a 25 °C room through a lumped conductance: 0.15 W/K for the cup and 0.6 W/K for other vessels. These are chosen simulation parameters. A hotplate supplies 50 W with an 80 °C control cutoff; the cooling bath is 5 °C. No boiling, vapour pressure, ordinary evaporation, or temperature-dependent density is modeled.

For 50.0 mL each of ideal 1.00 M HCl and NaOH at 25 °C, neutralization produces 2,865 J. In the cup, the predicted instantaneous rise is `2865 / (100×4.184 + 20)` = approximately 6.535 °C. Subsequent waits lower the temperature. A student must account for the cup and delayed measurements when estimating molar enthalpy.

## Hazard prompts and ventilation

`lab-safety.js` produces qualitative teaching prompts from current analytical inventories, supported pH predictions, indicator presence, dry/wet state and temperature. This is **not a GHS mixture classifier, risk assessment, SDS, or exposure calculation**. Reference information about a substance does not assign the same classification to every diluted solution. Indicator solvent and dye concentration are unknown; the app requests the actual formulation's SDS rather than declaring all indicators flammable or nonflammable. Phenolphthalein's chronic health concern is explicitly identified. Silver nitrate supplier data also identify reproductive-health hazards.

Copper and silver prompts use total retained metal, including precipitates. They therefore follow transfers and filtration and remain after neutralization or precipitation. Alerts cover all vessels, including unselected vessels. Unsupported mixtures retain ingredient alerts and a review prompt; missing pH never establishes safety. A dry-residue prompt covers the absence of aqueous pH, including retained alkali. Waste has a mass ledger only, so its composition and compatibility are not inferred. A general collection prompt persists after emptying or rinsing; the simulated ledger is not an instruction to mix real wastes.

The following **project-chosen teaching triggers are not validated injury, exposure, or safe-handling boundaries**:

- Component or indicator presence above 10⁻¹² in the engine's stored amount units suppresses floating-point residue noise; it is not a toxicological threshold.
- Supported predicted pH below 4 or above 10 prompts contact precautions. Stronger wording applies at pH ≤2 or ≥11.5; the app does not infer a formal classification from pH alone.
- Flagged chemical samples above 30 °C prompt local exhaust review; this is an educational reminder for warmed material, not a safe temperature limit. Procedures producing vapour, mist or dust may need local exhaust at room temperature too. At ≥45 °C a separate hot-apparatus prompt appears. Temperatures below these triggers are not certified safe.
- Dry metal-containing residues prompt dust control/local exhaust. Ventilation guidance for all stocks remains available before handling.
- Cumulative CO₂ generation is labeled as a historical run record, never as ongoing emission or room-air concentration. Gas-generating reactions require unsealed vessels; pressure, oxygen depletion, airflow and dose are not computed.

The boolean `ventilationOn` represents **simulated chemical fume-hood local exhaust at the workbench**, separate from general room ventilation. It starts off; pre-feature version-2 saves without the field also read as off without resetting their chemistry. Toggling is a transactional, logged and undoable operation. It neither changes reagents, mass, pH, gas equilibria, temperature, model time nor random sampling, and does not disable other warnings. The airflow illustration changes with the switch (brief motion respects reduced-motion settings). The setting persists across reloads and fresh runs; snapshots and JSON exports include a precaution report and its ventilation setting. Actual hood performance and real exposure cannot be established by a switch. No emissions, capture efficiencies, clearance times, ppm, exposure limits, mixture toxicology or claims of safe conditions are calculated.

Assessment mode retains safety prompts, with no numeric pH, solute amounts or unknown-stock concentration. Newly arising warnings are included in operation feedback and the live announcement. Source texts, SDS layouts, hazard pictograms and illustrations are not copied; notices and the hood drawing were authored for this app.

## Validation and extension boundaries

Regression tests independently check analytical pH, half/complete neutralization, concentration and transfer conservation, AgCl ion product, spectator-ion amounts, wet/washed/dry residue mass, reaction heat, CO₂ mass, error consequences, finite burette titration, unsupported mixtures, atomic failures, persistence, CSV, equation balance, and trial separation. Browser tests perform the five workflows through their controls and verify equation prediction, notebook persistence, exports, navigation, and mobile layouts.

Hazard regression checks cover the supplied copper/acid mixture, warnings on unselected vessels, metal persistence through precipitate/filtrate/transfer, unsupported chemistry, dry residues, indicators, gas-record interpretation, unchanged chemistry when toggling, old saves and unknown-concentration privacy. Browser checks verify the keyboard switch, undo/reload/new-run behavior, assessment warnings, notebook/export records, responsive layout and reduced motion.

This milestone supplies data-driven study definitions and separate data, engine, analysis, and UI modules. The engine exposes vessel, equilibrium/property, equipment-operation, and measurement functions. It does not implement arbitrary reaction discovery, formal oxidation-state tracking for a general database, kinetics, complete redox/electrochemistry, pressure control, all solids/solvents, every instrument in the longer brief, automatic grading, or an authenticated course system. A new study can reuse existing operations; new chemistry needs new validated rules, not just an additional catalog entry.

## Factual references

- [Purdue: weak acids and equilibrium](https://chemed.chem.purdue.edu/genchem/topicreview/bp/ch17/weaka.php) — acid dissociation and acetate equilibrium.
- [Purdue: common-ion effects](https://chemed.chem.purdue.edu/genchem/topicreview/bp/ch18/complex.php) — AgCl solubility product and common-ion behavior.
- [OpenStax: classifying reactions](https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions) — molecular/net ionic forms, precipitation, and acid/base reactions.
- [University of Maryland: acetic acid and sodium hydroxide](https://terpconnect.umd.edu/~wbreslyn/chemistry/net-ionic/NaOH-CH3COOH.html) — weak-acid net ionic notation.
- [USGS PHREEQC MINTEQ database](https://github.com/usgs-coupled/phreeqc3/blob/master/database/minteq.v4.dat) — selected copper complexation, hydrolysis, sulfate protonation, and Cu(OH)₂ phase constants, with original data provenance in the source.
- [OpenStax: calorimetry](https://openstax.org/books/chemistry/pages/5-2-calorimetry) — heat capacity, solution calorimetry, and dilute-solution approximations.
- [University of Scranton: heat of neutralization](https://www.scranton.edu/faculty/baumann/courses/labs/360_2.pdf) — the approximately 57 kJ/mol scale for strong acid/base neutralization. The app's fixed 57.3 value is its stated teaching parameter.

Equations and explanations here were written for this project. Reference figures, source prose, laboratory handout layouts, and commercial kit assets are not reproduced.

Safety facts checked on 18 September 2026:

- [Penn EHRS: fume hoods](https://ehrs.upenn.edu/health-safety/lab-safety/fume-hoods) — local exhaust, SDS/procedure requirements, correct operation and airflow checks.
- NIOSH Pocket Guide: [hydrogen chloride](https://www.cdc.gov/niosh/npg/npgd0332.html), [sodium hydroxide](https://www.cdc.gov/niosh/npg/npgd0565.html), [acetic acid](https://www.cdc.gov/niosh/npg/npgd0002.html), [copper dusts and mists](https://www.cdc.gov/niosh/npg/npgd0150.html), [silver](https://www.cdc.gov/niosh/npg/npgd0557.html), and [carbon dioxide](https://www.cdc.gov/niosh/npg/npgd0103.html) — substance properties and exposure routes; these entries are not concentration-specific solution SDSs.
- [Merck/Sigma-Aldrich: 0.1 M copper sulfate](https://www.sigmaaldrich.com/US/en/product/mm/102784), [copper sulfate substance](https://www.sigmaaldrich.com/MD/en/product/sigald/c1297), and [0.1 M silver nitrate](https://www.sigmaaldrich.com/US/en/product/mm/109081) — concentration-dependent supplier classifications, aquatic hazards, contact concerns and silver nitrate reproductive-health classification. No supplier product is endorsed or assumed to be the user's actual bottle.
- [National Toxicology Program: phenolphthalein](https://www.ncbi.nlm.nih.gov/books/NBK590820/) — evidence of carcinogenicity in animals and use in alcoholic indicator solutions. The simulated indicator's formulation is unspecified.

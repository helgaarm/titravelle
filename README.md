# Titravelle

A local virtual chemistry laboratory with a shared chemical shelf and equipment, five aqueous investigations, an SOI-18 organic research scenario, three electrochemistry investigations, five mineral-analysis guides, explicit instrument readings, and a scientific notebook.

## Run

Use a supported Node.js LTS release (CI uses Node.js 24). No package installation, accounts, API keys, or backend services are needed.

```sh
npm start
```

Open **http://localhost:5174**. Keep the server running while using the app. For another port, use `npm start -- --port 8080`. The server listens on the local computer by default. All application code, drawings, and styles are local; fonts come from your device.

## First implementation milestone

This implements section 26 of the supplied brief. Five experiment definitions use the same engine and equipment:

1. **Indicator testing:** compare universal indicator, phenolphthalein, methyl orange, and bromothymol blue against measured pH.
2. **HCl/NaOH titration:** condition and fill a finite burette, pipette an unknown acid, record initial/final readings, plot pH against delivery, and choose an observed endpoint. Overshoot and inadequate conditioning remain possible.
3. **NaCl/AgNO₃ precipitation:** form an equilibrium precipitate, tare the filter, filter, wash, dry, and weigh. Wet mass, soluble contamination, and imperfect recovery affect the result.
4. **Dilution:** prepare 100.0 mL of approximately 0.100 M NaCl from 1.00 M stock using a pipette and calibrated volumetric flask.
5. **Calorimetry:** measure masses and temperatures, combine strong acid/base solutions, and account for solution/cup heat capacity and time-dependent heat loss.

## Using the laboratory

**One shared laboratory.** The Workbench includes **Vessel bench, Preparation, Reactor, Work-up, Analysis, Materials & controls, Organic report, Electrochemistry, and Mineral analysis**. Use these buttons or **Open equipment** to access glassware, meters, the nitrogen/vacuum apparatus, chromatography, product QC, materials instruments, electrochemical cells and mineral-screening tools without starting an experiment. Switching equipment preserves samples, readings, your draft and the ventilation setting. The last work area reopens on reload.

Use **Restart without experiment** beside **Equipment & instruments**, on the Experiments page, or in the **New run** dialog to leave an active experiment and open a fresh lab in free exploration. Confirming resets all working samples, readings and the working draft; saved notebook snapshots, custom studies and the ventilation setting are kept. No experiment is selected, and all equipment remains available. **Undo last operation** can restore the preceding run during the session. Starting an experiment from free exploration opens its guide again.

The shared chemical shelf contains **74 stocks and reference entries**, including **12 common dry materials**: sodium chloride, sodium bicarbonate, sucrose, citric acid, chalk, starch, silica sand, iron filings, magnesium ribbon, zinc granules, activated carbon and copper(II) sulfate pentahydrate. The **Electrochemistry** collection adds supporting salts, dilute sulfuric acid and 11 electrode surfaces. **Mineral analysis & standards** contains the unknown concentrate, analytical reagents and Ag/Au/Pt/REE controls. Search by name/formula, filter by collection and category, or scroll the bounded list.

**Organic and dry materials can be used directly in standard vessels.** Selecting one keeps the current work area open. In **Use in a vessel**, choose the receiving vessel, enter a weighed amount in grams and an assigned occupied volume, choose solid/liquid form and press **Weigh & add**. Assigned volume is an explicit input used for capacity and drawing, not a density, dissolution-volume or contraction prediction; defaults are placeholders. Nitrogen uses a separate gas-flow toggle and adds no fictional retained mass. Stock forms, reference materials and comparison samples remain separately identified.

The selected vessel displays a material inventory. **Mix**, **Transfer sample by mass**, liquid transfer and **Transfer entire sample** preserve its tracked ingredients. A partial material transfer requires mixing; whole-sample transfer carries all contents. Dry solids cannot be pipetted. **Wait** settles the schematic illustration. Mass and assigned-volume readings remain available; unsupported pH, heating, cooling, drying and separation calculations explain their missing data. Dry NaCl and sodium bicarbonate can dissolve under conservative water-only solubility rules and then use the existing aqueous calculations. Other additions remain an additions ledger, not a claim of unchanged molecular species after mixing.

Snapshots and JSON exports include vessel inventories, and materials survive reloads and undo. Organic research instruments still analyze the specialized feed/reactor/product; arbitrary vessel samples are not silently passed into the SOI-18 analysis. Phase sketches and unimplemented chemistry are explained in [SCIENTIFIC_MODEL.md](SCIENTIFIC_MODEL.md).

Open **Experiments → SOI-18: test the whole claim** when you want its guide and a fresh run. It covers feed qualification, a stirred nitrogen/vacuum reactor with cold trap, sequential acyl exchange, sampling, work-up, independent product QC, and six-control materials testing. Experiments guide the setup; they do not unlock equipment.

The SOI-18 **Guided sequence** follows 13 steps using your actual saved batch records. Each step explains the action and its purpose, shows evidence checks, and opens the relevant controls. **Load suggested settings** fills a form for review without running it. Browse earlier or later steps, including cooling an unsuccessful reaction, or return to the next unfinished step. Stale measurements and failed specifications stay visible; progress does not imply that the chemical or performance claim passed. Save the final notebook snapshot to record the completed investigation.

The SOI-18 workspace includes editable feed/catalyst/operating conditions and explicit rate, separation and property assumptions for related investigations. It can fail synthesis or QC and does not assume a friction advantage. Its material-property values are **unvalidated teaching scenarios**, not real predictions or measured evidence. See [ORGANIC_MODEL.md](ORGANIC_MODEL.md) for a walkthrough, supported operations, equations and limitations. Download the full report (HTML with graphs, Markdown, or JSON) or save it to the shared notebook from the Report tab.

- Select a vessel and a stock. Select concentration, nominal volume, and measuring tool, then dispense. Stocks are available at 0.010, 0.100, and 1.00 mol/L; water, indicators, and unknown U do not use that concentration selector.
- **Hazards & ventilation** summarizes toxicity, contact, gas, heating, residue and waste precautions across all vessels. Expand **Precautions, explanations & sources** for the reasons and handling guidance. The chemical shelf also shows **Before dispensing** precautions for the selected stock. Alerts remain visible in assessment mode without numeric pH or the unknown acid concentration.
- **Fume hood ventilation → Turn on / Turn off** changes the simulated local exhaust and airflow drawing. Heating flagged chemicals or handling dry metal residues prompts a ventilation warning when it is off. This is distinct from room ventilation and does not measure airborne exposure or certify safe conditions. Other precautions remain visible with the hood on. The setting persists on reload and new runs, supports Undo, and is captured in procedure logs, notebook snapshots and JSON exports. Older saves default to off without losing their contents.
- Each vessel retains its own contents. Transfers move material from the source. **Transfer all liquid** is useful for pouring a prepared calorimetry sample without knowing its exact volume. Mix to carry suspended solid; an unmixed transfer samples liquid only.
- Transfers now show both vessels: pouring tilts the source and shows a stream, pipetting draws up and dispenses liquid, and the burette releases droplets through its tip. Liquid levels and colours follow the transferred sample. **Skip animation** finishes the view immediately; reduced-motion settings show a static transfer diagram. The validated transfer is saved once before its animation starts, so navigating away or reloading cannot repeat it. Animation time does not advance the laboratory clock or create instrument readings.
- **Prepare, separate & control temperature** contains burette conditioning/filling, the volumetric mark, filtration, washing, drying, the hotplate, cooling bath, and elapsed time. Filtration and washings use the receiver selected in the transfer controls.
- Measurements are explicit actions. Calibrate the pH meter and tare the balance with the intended load. Taring a filled vessel zeros its contents too. The displayed balance zero explains subsequent readings.
- Open **Calculation desk & equation checker → Calculate & show equations** for the selected vessel. Balanced net ionic equations, known molecular stock pairings, spectator ions, and calculated amounts update after additions and transfers. **Current equilibria** explains the solution now; reaction amounts record what happened in that vessel since it was emptied. **Add equations to notebook** appends the report to your own writing. The smaller Equation view beside the instruments uses the same results. Earlier saved material has no retroactive reaction history.
- Copper/sulfate mixtures with water, chloride, strong acid, or hydroxide now show a coupled calculation: analytical totals, free ions and complexes, approximate pH, sulfate protonation, copper hydrolysis, and Cu(OH)₂ precipitation/dissolution. Expand **How the coupled calculation works** for the balances and solubility test. Concentrated solutions are explicitly labeled qualitative estimates; the results are not validated physical-sample measurements. Existing saved mixtures gain this current analysis on reload.
- The vessel-bench clock advances when you heat, cool, or wait. These operations update heat exchange for its occupied vessels. Other vessel operations use instantaneous equilibrium and do not invent elapsed time. The reactor and electrochemistry instruments have explicit run timers.
- **Ideal measurements** removes random instrument error, calibration/mixing bias, and filter breakthrough. Equilibrium solubility and heat transfer still apply. In realistic mode, instrument accuracy and handling matter.
- Write an objective, hypothesis, procedure, observations, calculations, equations, conclusion, and sources of error. A **notebook snapshot** attaches the recorded operations and readings; later edits do not change that snapshot. Conclusions remain your own writing.
- Graphs show recorded pH or temperature measurements for the selected vessel's current trial. Emptying a vessel starts another trial without deleting earlier readings. Export all readings as CSV, including trial identifiers, uncertainty, and instrument notes. JSON notebook export includes snapshots and the current draft/readings.
- **Undo** restores the previous bench operation or run, while keeping saved snapshots. It is limited to the current page session. Starting a new run asks before resetting both the aqueous vessels and organic reactor, readings and working draft. Switching equipment requires no reset. Organic batch precautions remain visible when returning to the aqueous bench.
- On the **Vessel bench**, Guided mode shows instructions and optional discussion; Student removes those prompts; Assessment hides guidance, conceptual contents, equations, calculation feedback and answer tools. Professor can reveal the aqueous unknown and create/edit structured JSON study definitions using existing chemistry rules. Free exploration changes the objective to your own question and leaves equipment available. **Specialized equipment currently has different scope:** organic tools use an open research view; electrochemistry shows preset guidance in Guided mode but retains analytical results in other modes; mineral analysis retains step advice, equations and model feedback in every mode, with instrument/reveal access gated by completed route conclusions. Consistent presentation is proposed in [ADR-0004](docs/adr/0004-learning-mode-contract.md). These are local learning modes, not a secure exam or authenticated teacher system.

Bench data and notebooks persist in `titravelle-science-lab-v2` in this browser. Export important records; storage can be unavailable or reach its browser quota. Each collection supports 100 snapshots; the working run retains the latest 1,000 operations and 1,000 measurements.

## Electrochemistry in the same lab

Open **Workbench → Electrochemistry** or select electrochemical equipment in **Open equipment**. The cell uses the shared shelf, ventilation, undo and notebook. Prepare a supported electrolyte, combine solutes at a stated final volume, or transfer an actual mixed aliquot from a standard vessel. Cell transfer subtracts that aliquot from its source. Unsupported mixtures explain the missing chemistry.

The **Cell & circuit** panel keeps the drawing, wiring, voltage and timer controls together. Click two terminals in the drawing to connect a wire, use the keyboard to activate terminal buttons, or expand **Wire list & terminal selectors** for the connection form and removal buttons. Wire changes require the output to be off. Choose a voltage with the slider or numeric field and press **Apply supply settings**; electrical settings can also be adjusted during a run. The **Before starting** box beside Start shows prediction readiness: expand **Write or review predictions**, or choose **Mark unanswered uncertain & start**. Written answers are preserved; only blank predictions are marked uncertain. **Start** saves complete prepared predictions, applies the visible settings and advances the timer; **Stop** pauses time and switches off the output without clearing the cell or readings. Incomplete predictions and other startup errors are explained beside the controls. Unapplied edits stay visible during timer updates. Manual output, timed steps and measurements are available in **Manual steps & instruments**.

Choose electrodes and cell geometry, record seven predictions, and use constant voltage, constant current or a galvanic load. **Water electrolysis**, **Metal deposition** and **Copper transfer** provide guided starting points; free exploration needs no active experiment. A **New cell trial** resets the cell only; **Restart without experiment** resets all working samples.

The four electrochemistry view buttons stay at the top while you scroll, together with **Start**, **Stop**, **New run** and **Clean desk**. Use Left/Right arrows to move between view buttons, or Home/End to reach the first/last view. Switching these views keeps the run going; measurements and reports show their capture time and have **Refresh this view**. Live controls retain focus and edits. Opening a reset confirmation immediately stops the run; cancelling keeps that stopped sample, and confirming preserves saved notebook entries. A background browser tab pauses the run. Running data saves every two seconds and again when stopped.

**Measurements & calculations** shows competing half reactions, Nernst potentials, polarization and resistance, Faraday mass/gas comparisons, recorded measurements and time-series graphs. **Advanced studies** provides independent polarization/Tafel, Butler–Volmer and finite-inventory cyclic-voltammetry models. Save a notebook snapshot or export CSV, JSON, Markdown and standalone HTML with graphs from **Report**. These use assumed kinetics and synthetic instrument readings; scope, formulas, validation and limitations are documented in [ELECTROCHEMISTRY_MODEL.md](ELECTROCHEMISTRY_MODEL.md).

## Mineral concentrate investigations

Open **Experiments** and choose **Read the concentrate: four claims**, or begin with the silver, gold, platinum or rare-earth guide. The same equipment is available under **Workbench > Mineral analysis**.

1. Label and split the unknown; preserve Original and E. Optionally enable uneven Au/Pt particle distribution.
2. Follow the next-step advice for A, B, C and D. Digestion steps require the shared virtual fume hood.
3. Review each recorded appearance, dissolution, gas, liquid, solid, residue and control result. Write your interpretation and save before continuing.
4. Compare the unknown with the blank and positive control; use the matrix spike to explore suppression. Record a confidence and reason for each route.
5. In **Report & confirmation**, submit a tracked portion to a virtual instrument. Compare the instrument limits and your claims with the separately revealed model composition.

The tools include labelled fractions, filtration, contained digestion modules, microscope, radiation screening, test vials, an uncalibrated Arsenazo III absorbance comparison, XRF, ICP-OES, ICP-MS, fire assay with a finish, and SEM-EDS. Observations and reports save to the shared notebook and export as Markdown/CSV. No colour is converted to a grade. Chemical hazards and all numerical assumptions are explained in [MINERAL_MODEL.md](MINERAL_MODEL.md). These are virtual teaching modules, not hazardous real-world operating recipes.

**Known draft limitation:** submit a route conclusion before switching views; its unfinished confidence/reason form is currently lost on redraw. Pending observation records and submitted conclusions persist. [ADR-0005](docs/adr/0005-mineral-conclusion-drafts.md) proposes per-route conclusion drafts; that fix is not implemented yet.

## Scientific scope and originality

The general vessel solver does not discover arbitrary reactions. Electrochemistry and mineral screening use separately documented equipment models with their own assumptions.

[SCIENTIFIC_MODEL.md](SCIENTIFIC_MODEL.md) documents equations, numerical constants, error models, assumptions, numerical checks, and unimplemented modules. The copper model covers chloride/sulfate complexes, hydrolysis, and Cu(OH)₂, but withholds predictions for competing copper mixtures with acetate, carbonate, or silver. Wet copper filtration and weighing are supported; copper-residue drying is not. Unsupported silver combinations also withhold predictions. This is not a universal reaction solver. Activity corrections, full kinetics, arbitrary redox, alternative copper minerals and general separation/spectroscopy remain outside the vessel solver. Specialized organic, electrochemical and mineral equipment models have narrower documented scopes.

The interface, lesson text, diagrams, and code were authored for this project with AI assistance. No commercial kit pages, illustrations, manuals, or branded layouts are bundled. See [ORIGINALITY.md](ORIGINALITY.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for provenance and review limits. Asset checks do not establish legal clearance.

## License

Titravelle is licensed under the [MIT License](LICENSE). Copyright (c) 2026 Armann Helgason. Package metadata uses `license: "MIT"`; `private: true` prevents accidental npm publication and does not restrict the MIT license permissions. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for third-party material and scientific references.

## Security

See [SECURITY.md](SECURITY.md) for private vulnerability reporting, local data storage, and server boundaries. The default server stays on loopback, restricts the files it serves, and sends browser security headers. Keep the default binding for personal use.

Pull requests run static checks, unit/security tests, and browser regressions in GitHub Actions. Official actions are pinned to commit revisions, use read-only repository permissions, and receive weekly Dependabot update proposals. Changes to `main` go through a pull request with passing required checks.

## Validation

```sh
npm run check
npm test
npm run check:provenance
npm run test:browser
```

The first three commands perform syntax, numerical/state and HTTP security regression, and asset/dependency checks. Browser tests require the running server and a separately installed Chromium-compatible browser (`BROWSER_PATH` can specify its executable). They use an isolated headless profile and cover aqueous, organic, electrochemistry and mineral-analysis workflows, graphing, exports, modes, notebook preservation, equation prediction, and application navigation. Screenshots and results are written under ignored `artifacts/`. The tests check 320px/390px layouts and require no application requests to third-party origins.

## Modules

The [architecture decision records](docs/adr/README.md) explain the shared workbench, model boundaries and mineral evidence workflow, and distinguish implemented decisions from proposed review follow-ups.

| File | Responsibility |
| --- | --- |
| `src/main.js` | Entry point for the laboratory |
| `src/lab-data.js` | Reagent/species/equipment records, constants, reactions, modes, and study definitions |
| `src/lab-engine.js` | Vessel state, transfers, equilibria, physical operations, measurement sampling, state validation, and CSV records |
| `src/lab-copper.js` | Coupled Cu(II)/chloride/sulfate speciation, hydrolysis, charge balance, and hydroxide solubility |
| `src/lab-safety.js` | Read-only stock/sample precaution rules and simulated local-exhaust status |
| `src/lab-shelf.js` | Shared searchable, categorized, height-bounded chemical inventory |
| `src/lab-workspace.js` | Combined material/equipment catalog, supported destinations and sample-preserving work-area navigation |
| `src/lab-materials.js` | Weighed material identities, dry-material catalog, conservative salt dissolution, conserved parcels, phase sketches and validation |
| `src/organic-data.js` | SOI-18 formulas, stocks/reference materials, scenario parameters and controls |
| `src/organic-engine.js` | Sequential organic reaction states, apparatus, mass ledger, qualification, isolation and persistence checks |
| `src/organic-analysis.js` | Synthetic analytical records, adduct calculations, material/control scenarios, statistics and reports |
| `src/organic-ui.js`, `src/organic.css` | Organic workflow, original reactor/SVG plots, analytical tables and report controls |
| `src/organic-guide.js` | SOI-18 guide progress derived from saved batch evidence |
| `src/electro-data.js`, `src/electro-model.js`, `src/electro-engine.js` | Cell definitions, supported electrochemical calculations, operations and state validation |
| `src/electro-analysis.js`, `src/electro-runner.js` | Electrochemical analysis/reports and cancellable scheduled simulation advancement |
| `src/electro-ui.js`, `src/electro-scene.js`, `src/electro.css` | Integrated circuit controls, original cell drawings, measurements and report views |
| `src/mineral-data.js`, `src/mineral-engine.js` | Mineral routes, reagents, assumptions, independent target inventories, controls and instrument gates |
| `src/mineral-ui.js`, `src/mineral.css` | Step guidance, observations, original test-vial/grain drawings, conclusions and comparison reports |
| `src/lab-analysis.js` | Unit-aware teaching calculations and atom/charge equation checking |
| `src/lab-reactions.js` | Mixture-aware reaction records, balanced equation forms, current equilibria, and notebook reports |
| `src/lab-glassware.js` | Original glassware, apparatus, menisci, graduations, and matching equipment thumbnails |
| `src/lab-transfer.js` | Pouring, pipette and burette scenes; display-only progress and cancellable animation |
| `src/lab-ui.js`, `src/lab.css` | Original bench, instruments, conceptual views, graphs, notebook, and mode controls |
| `src/identity.js` | Local application mark |
| `server.mjs` | Local static server with a restricted public file allowlist |

New study definitions need no separate chemical simulation or UI outcome script. New reagent chemistry still requires appropriate engine rules and scientific validation; adding a database label alone does not implement a reaction.

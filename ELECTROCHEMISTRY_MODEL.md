# Electrochemistry in the shared workbench

Electrochemistry is an equipment station in the existing laboratory, using the same shelf, ventilation setting, saved state, undo and notebook. It is available without an experiment. Three additional experiment guides prepare water electrolysis, copper deposition and copper transfer; they do not unlock equipment. A new **cell trial** clears only the electrochemical state. A fresh **lab** resets all working samples, preserving saved notebook entries.

The scope is a transparent educational model, not a validated process-design, toxicology, corrosion, coating-quality or safety simulator. Its reactions compete dynamically within a declared set of candidate pathways. It cannot discover every reaction that arbitrary materials might undergo.

## Materials and sample preparation

The shared shelf has 74 entries: 13 aqueous stocks, 24 organic entries, 12 dry materials, 14 electrochemical materials and 11 mineral-analysis stocks/references. The additions are sodium sulfate, zinc sulfate, a dilute-sulfuric-acid stock entry, and 11 electrode surfaces (including graphite and glassy carbon). These may also be weighed into ordinary vessels under the existing conservative material-tracking rules. Shelf selection never automatically charges an electrode or runs electrolysis.

The cell accepts 10–1,000 mL, with undivided, porous, salt-bridge, cation-selective and anion-selective arrangements. Supported stock concentration increments are added at a fixed final volume, following an explicit solution-preparation approximation; this is not a stock-volume dispensing calculation. The source log records each increment. Different stocks may be combined, including different divided-cell compartments. Water, sodium sulfate, sodium chloride, copper sulfate, zinc sulfate, dilute sulfuric acid, sodium hydroxide, hydrochloric acid and silver nitrate are available from the shared chemical database.

An actual aliquot can be transferred from ordinary glassware: source volume, mass, water and analytical ions are reduced proportionally. The destination preserves transferred analytical totals; it recalculates speciation with this station's simpler electrochemical model, not the aqueous bench's copper-complex solver. Mixing is required. Samples containing unresolved weighed materials, indicators, acetate or carbonate are rejected with an explanation rather than receiving invented electrode predictions. There is currently no cell-to-vessel return transfer.

## Circuit and equipment

Manual leads connect the supply/load, left and right electrodes, series ammeter and parallel voltmeter. The standard-circuit button is optional. Graph connectivity determines open circuits, polarity reversal, meter connection and electrical shorts. A wire bypassing the cell trips the virtual supply. Electron flow is external; ions carry liquid-phase current. The original SVG shows electrodes, gas collectors, coatings, precipitation, colour and illustrative concentration gradients. Animations respect reduced-motion settings; spatial fields and coating dimensions are schematic.

The DC supply supports 0–30 V, 0–5 A current protection, CV and CC operation. CC current has a voltage compliance ceiling; CV can enter current limiting. Galvanic mode solves a passive external load instead of applying voltage. Electrical supply settings can change during a run without resetting time, chemistry or recorded data; the next integration step uses the new settings. Cell geometry and wiring retain their output-off requirement. Start applies the displayed electrical settings before enabling the timer; Stop disables output and pauses the timer. Digital voltage/current channels, charge integration, timer, temperature, compartment pH, conductivity, electrode balance and collected gas readings are recorded. The displayed resistance is a calculation, not an ohmmeter connected to an energized cell. Stirring, a heating plate, area, spacing, separator resistance, gas collection and virtual headspace are adjustable.

## Equilibrium chemistry

Standard potentials are aqueous reduction potentials vs SHE, approximated at 25 °C: H⁺/H₂ 0 V; O₂/H₂O 1.229 V; Cl₂/Cl⁻ 1.358 V; Cu²⁺/Cu 0.340 V; Zn²⁺/Zn −0.763 V; Ag⁺/Ag 0.800 V; Ni²⁺/Ni −0.257 V; Fe²⁺/Fe −0.447 V; Al³⁺/Al −1.662 V. The listed electrode material does not have one universal potential independent of its redox couple.

`E = E° − RT ln(Q)/(nF)` uses F = 96485.33212 C/mol and R = 8.314462618 J/(mol K). Ideal concentration activities have a 1 mol/L reference; gas reference fugacities are fixed at unity. The reduction quotients are 1/[H⁺]² for H₂, 1/[H⁺]⁴ for O₂, [Cl⁻]² for Cl₂, and 1/[Mᶻ⁺] for metal deposition. A 10⁻¹⁰ M floor initializes dissolution into a solution without that metal. Gas-pressure changes do not feed back into these reaction quotients in this approximation.

The model uses acid-form reference half reactions consistently. The equivalent neutral/basic cathodic form, `2 H₂O + 2 e⁻ → H₂ + 2 OH⁻`, is explained separately. Combining the dominant pair balances electrons; parallel product amounts always use each partial charge, not just that displayed equation. `E_cell = E_cathode,eq − E_anode,eq`, `ΔG = −nFE_cell` for the displayed balanced reaction, and `V_decomp = max(0, −E_cell)`. Identical copper electrodes can transfer copper with zero reversible decomposition voltage, while still requiring polarization and resistance losses.

Compartment pH solves electroneutrality with water, bisulfate/sulfate and supported simple metal hydroxides. Kw = 10⁻¹⁴ and sulfate Ka = 0.012 are fixed at 25 °C. Ideal Ksp approximations are used for Cu(OH)₂ (2.2×10⁻²⁰), Zn(OH)₂ (3×10⁻¹⁷), Ni(OH)₂ (5.5×10⁻¹⁶), Fe(OH)₂ (4.9×10⁻¹⁷), Al(OH)₃ (10⁻³³), and AgCl (1.8×10⁻¹⁰). No claims of exhaustive phase selection, activity corrections, oxide hydrates, amphoteric dissolution or metal-complex speciation are made. Temperature-dependent equilibrium constants, Fe(III), dissolved oxygen reduction, nitrate reduction and subsequent chlorine/hypochlorite chemistry are omitted. Al plating is excluded in aqueous operation. Unsupported stainless anode corrosion, gold/silver chloride anodes and alkaline silver chemistry withhold quantitative current.

`I_s = ½Σcᵢzᵢ²` reports ionic strength. `κ = Σλᵢcᵢ/1000` gives S/cm from limiting ionic molar conductivities in S cm²/mol; an assumed factor `1 + 0.02(T−25)` adds temperature sensitivity. These dilute-limit estimates become inaccurate at high ionic strength. Solid-electrode conductivities are representative bulk values for comparison, not fitted resistance/film data for a particular specimen.

## Competing kinetics and transport

Every available cathodic metal reduction competes with hydrogen; oxygen, chloride oxidation, and dissolution of available electrode/coating metals compete anodically. Standard potential is not the sole selector. For a candidate, the main cell uses the positive-direction branch of a lumped Butler–Volmer expression:

`I_kin = 2 A i₀ sinh(F|η|/(2RT))`.

The activation barrier represents an assumed one-electron rate-limiting step, independently of overall stoichiometric n. The opposite net direction is not included for that candidate on that electrode. Reaction currents sum to the same series cell current. Exchange-current values depend on material, concentration and an editable common scale; they are **teaching assumptions, not measured electrode-specific kinetic fits**. Assumed passive-film factors reduce Al, Fe, Ni and alkaline Cu dissolution. Carbon and noble-metal degradation may be omitted; each material explains its scope.

Soluble-reactant currents are bounded by `I_lim = nFADC/δ`, with concentrations converted from mol/L to mol/cm³, plus the finite inventory available during a one-second step. Cathodic stirring divides δ by four. The phenomenological combination `I = I_kin I_lim/(I_kin + I_lim)` prevents a kinetic rate from exceeding transport. The concentration-polarization diagnostic is `−RT ln(1−I/I_lim)/(nF)`; it is already represented in the effective polarization and must not be added twice.

Nested monotonic solves find both electrode potentials and the feasible series current from:

`V = E_anode − E_cathode + IR`.

The geometric solution resistance averages the two compartment resistivities with minimum wetted area and adds separator and 0.05 Ω contact resistance. Electrode bulk conductivity is not used to invent an unknown electrode geometry resistance. CV solves within its current limit; CC respects compliance; a below-onset voltage gives zero sustained Faradaic current. Galvanic mode solves `V_required + I R_load = 0` and reports delivered energy. Open-circuit self-corrosion and transient capacitive current in the main cell are outside this model; double-layer current is explored in the independent CV study.

In divided cells, formal ions move in their appropriate migration directions, weighted by concentration and representative mobility. Cation/anion membranes select the carrier sign; depletion stops the model if charge transport cannot be represented. This is an idealized compartment transport model, not a Nernst–Planck PDE or a real membrane's selectivity/leakage model. Proton/water transfer, crossover and bisulfate-specific transport are not explicitly resolved. Undivided cells use one well-mixed inventory; there is no resolved local electrode pH gradient.

## Accounting and measurements

The live timer executes the same one-second integration steps in short batches, yielding between batches so Stop and navigation remain responsive. The selected speed is a target; a busy device can run more slowly without skipping chemistry steps. Samples follow the configured interval, with a final reading when output stops between intervals. Adjacent continuous advances are grouped in the procedure log. Live readings update without rebuilding controls; other views capture the current results when opened or explicitly refreshed. Plots of long runs preserve endpoints and local extrema while reducing drawn points; CSV/JSON retain every stored sample.

One-second steps integrate `Q = ΣIΔt` and electrical work `W = Σ|VI|Δt`. Each branch converts `n = Q_partial/(zF)` and `m = nM`. Electrode substrates, deposits, dissolved analytical metal and equilibrium precipitates close the metal balance. The finite-inventory cap prevents a depleted solution or electrode supplying negative material. Current efficiency is `Q_partial/Q_total`, distinct from collection efficiency. At 100% gas branch efficiency, hydrogen and oxygen are Q/(2F) and Q/(4F), giving 2:1 molar production.

Gas volumes use `V = nRT/P`, with dry ideal gas at 101325 Pa. Collection has an adjustable capture fraction; losses remain distinct from total evolution. Solubility, water vapour, gas crossover, combustion and chlorine reactions are omitted. A sealed-headspace challenge computes pressure from all evolved gas and trips at 2 bar absolute; the threshold is a virtual protection setting, not a vessel rating. Solution volume is held fixed: this is a **metal and charge conservation model**, not a full solvent/atom balance through gas, hydration and evaporation.

Temperature integrates electrical irreversible losses, an assumed heat capacity of 4.184 J/(g K) × solution mL plus 40 J/K apparatus, Newton cooling and a bounded plate term. Reversible entropic heat is omitted. A virtual 80 °C trip prevents extrapolation to boiling/aerosol regimes. These values do not establish safe heating conditions.

Stored simulated measurements have bounded uncertainty: voltage ±0.01 V, current ±0.001 A, balance ±0.001 g per reading, temperature ±0.2 °C, pH ±0.02, conductivity ±2%, and collected gas ±0.02 mL. Ideal mode removes reading noise, but not reaction competition, collection loss or model assumptions. A seeded generator changes only on explicit measurements, not view changes or recalculation. The first recorded mass is the balance baseline. Percentage error is undefined for zero predicted change. Records retain the most recent 7,200 samples, with cumulative charge and products preserved. All recorded concentrations and measured channels export to CSV/JSON.

## Advanced studies and reports

The independent model studies do not consume the live cell:

- Full-cell polarization solves the same model at 61 voltages without changing initial composition. Tafel coordinates expose cathodic polarization vs logarithmic current density.
- The reversible single-couple Butler–Volmer curve includes both current signs and user-controlled i₀ and α, without transport or series resistance.
- Cyclic voltammetry scans an ideal working-electrode potential vs SHE with finite dissolved metal and electrode inventories, reversible Butler–Volmer current, a diffusion-layer cap, solution resistance and `I_C = A C_dl ΔE/Δt`. Only Faradaic current changes metal. Its approximate diffusion layer grows as √(πDt) between turns and is capped at 0.1 cm. It is not a full spatial diffusion calculation or a safety/solvent-window prediction.

Reports compare the student's seven recorded predictions with results and include starting stocks, wires, parameters, half reactions, dominant overall reaction, explicit equations and substituted values, charge, energy, mass/gas comparisons, measured data, graphs in standalone HTML, assumptions and procedure history. Cumulative pathway charges and the last powered measurement are preserved in reports after switching off; current-state calculations remain labeled separately. Reports save to the same notebook as aqueous and organic experiments, with the recorded measurements available for CSV export. A, B, C or other named qualitative success categories are not inferred for electrochemistry.

## Sources and verification

- [NIST aqueous electrode-potential reference compilation](https://www.nist.gov/system/files/documents/2019/04/02/jpcrd355.pdf): reference reduction potentials; the finite teaching reaction set is a project choice.
- [NIST CODATA constants](https://physics.nist.gov/cuu/Constants/): physical constants.
- [COMSOL electrode kinetics documentation](https://doc.comsol.com/6.3/doc/com.comsol.help.fce/fce_ug_electrochem.07.095.html): modeling conventions and kinetic/transport approximations. No software, illustrations or proprietary model files are bundled.
- [CDC/NIOSH chlorine hazard reference](https://www.cdc.gov/niosh/npg/npgd0115.html): qualitative chlorine warning.
- Existing equilibrium references and their limitations are recorded in [SCIENTIFIC_MODEL.md](SCIENTIFIC_MODEL.md).

Unit tests cover Nernst signs, voltage/current limits, Faraday gas and mass relationships, competition and transport sensitivity, divided-cell pH, galvanic generation, finite inventories, protection stops, supported speciation, transactional sample transfers, advanced-study conservation, repeatable reports and persistence validation. Browser tests cover the shared shelf, cell workflow, notebook, exports, undo, free-lab restart, timer and narrow layouts.

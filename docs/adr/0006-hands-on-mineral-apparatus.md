# ADR-0006: Perform mineral analysis through staged apparatus operations

- Status: Accepted
- Implementation: Implemented
- Date: 2026-09-19
- Extends: [ADR-0003](0003-mineral-evidence-workflow.md)

## Context

The original mineral workflow bundled each analytical stage into one button followed by an observation form. The user clarified that learners must perform the analysis, not only record supplied outcomes. The existing independent aliquots, target accounting, controls, learning modes and saved drafts must continue to work.

## Decision

Add an apparatus workbench within the same mineral equipment view. Prepare the sample by homogenising, taring and transferring six labelled masses. For each analytical stage, load an appropriate fraction and apparatus, select a supported shared-shelf reagent, add a relative charge and operate the filter, mixer, vials or instrument. Original SVG scenes show setup and result states. The observation form opens after the learner has produced evidence.

Keep protocol definitions and rendering separate from the engine. Persist a bounded setup object per route with source, apparatus, charge, controls and performed actions. Loading reserves the fraction in place; Run performs one atomic model operation and attaches the procedure to the pending observation. A reset clears uncommitted staging. Navigation and rendering do not advance time, sample randomness or create readings. No background reaction scheduler is introduced.

Use explicit relative teaching settings for charge, mixing, duration and test-portion size. Apply those settings to the documented extraction/response model, and consume separate fresh sample and matrix-spike portions. Require physical preparation actions for filtering, focusing and instrument references. Missing controls remain possible and affect interpretation. The fixed-route model rejects unsupported combinations rather than inventing chemistry. The existing low-level `step` API remains available for legacy model scripts and compatibility tests.

Retain the mode contract from [ADR-0004](0004-learning-mode-contract.md), the draft policy from [ADR-0005](0005-mineral-conclusion-drafts.md), and the shared ventilation, shelf, notebook, undo and restart controls. Older saves without staging objects initialize them when needed. Relative settings do not supply real acid recipes, validated kinetics or measured sample identification.

## Alternatives considered

- Renaming the existing stage buttons would leave apparatus preparation and experimental choices absent.
- Reusing the aqueous equilibrium engine for an arbitrary geological digest would imply chemistry and matrix conservation that it does not implement.
- A continuous animation timer would add scheduling and persistence complexity without improving the explicit measurement lesson. Result animations are display-only.

## Consequences and verification

The learner now performs several meaningful actions before recording each result. The route remains a bounded teaching protocol rather than an arbitrary reaction predictor. Staging must be validated, preserved across navigation and cleared without duplicating target inventory. Apparatus controls and original drawings must remain usable on narrow screens.

- [Protocol](../../src/mineral-protocol.js), [workbench view](../../src/mineral-workbench.js), [engine](../../src/mineral-engine.js) and [UI integration](../../src/lab-ui.js).
- [Model assumptions](../../MINERAL_MODEL.md) document dose factors, portion accounting, zeroing and limitations.
- [Unit tests](../../test/mineral.test.js) cover preparation gates, all four apparatus routes, conservation, rejected operations, setting-dependent results, missing controls, persistence and old saves.
- [Browser regression](../../scripts/mineral-browser-check.mjs) performs each stage through visible controls and checks reloads, hood gates, results-before-recording, drafts, mode-safe reports, shared equipment and 320/390 px layouts.

# ADR-0003: Independent mineral aliquots and evidence before confirmation

- Status: Accepted, retrospective
- Recorded: 2026-09-19
- Implementation baseline: `0eef3bc`

## Context

The mineral brief asks learners to investigate Ag, Au, Pt and a rare-earth group in a processed concentrate, compare controls and reach classical conclusions before seeing instrumental results. Reusing altered material across unrelated tests or revealing the unknown at the outset would defeat that investigation. The feature must belong to the existing lab rather than become a separate application.

## Decision

Implement Mineral analysis as shared equipment with five catalog guides: the full investigation and four route entry points. Every guide retains access to all four routes. Generate one seeded hidden sample and split it into independent A–D aliquots plus preserved Original and E portions. Keep target inventories for solids, solutions, archived fractions, test portions and acid probes. Optional uneven Au/Pt allocation illustrates sampling variation.

Require an observation record and learner interpretation after each modeled operation. Keep blank, positive-control, sample and optional matrix-spike results separate. Derive the model interpretation from recorded responses and control performance, while retaining the learner's confidence and reasoning separately. A positive screen, an unresolved result and a non-detection have different meanings; a completed route is not automatically a successful identification.

Gate instrumental comparison on recorded conclusions for all four routes, including when the learner entered through a single-route guide. Track the portion and fraction submitted to each instrument and its modeled reporting limits. Display simulator ground truth in a separate panel after the first instrument submission rather than substituting it for an instrument result. Keep the ground truth out of ordinary reports until that reveal.

Represent hazardous digestion and decomposition as contained virtual operations requiring the shared hood setting. Supply observations and conceptual equations without real digestion ratios, operating temperatures or physical reaction-time instructions. Model time and instrument responses are teaching assumptions.

## Alternatives

- Applying every route to one evolving portion would confound evidence and conceal material loss or cross-contamination.
- Deciding the displayed classical conclusion directly from hidden composition would produce an answer key rather than an evidence-based interpretation.
- Immediate instrument access would bypass the requested classical reasoning sequence. The chosen gate means a single-route entry still needs the other routes before confirmation.
- Reusing arbitrary ordinary-vessel inventories as the geological unknown would require a mineral identity and preparation model that is not implemented.

## Consequences

[ADR-0006](0006-hands-on-mineral-apparatus.md) extends this workflow with explicit sample preparation and apparatus operations before observation entry. The independent-aliquot and evidence decisions below continue to apply.

Each new operation must preserve target inventory and sample identity, retain its observation history, enforce relevant sequence/hood gates and label analytical limitations. Controls can invalidate a result. Incomplete dissolution, interferences and uneven sampling can disagree with the hidden bulk composition without constituting an engine failure.

The model conserves selected targets, not every matrix atom, reagent or solvent. It cannot certify the composition or safety of a real sample. Interface blindness is educational only because the hidden recipe is stored locally. [ADR-0004](0004-learning-mode-contract.md) defines the implemented learning-mode presentation; [ADR-0005](0005-mineral-conclusion-drafts.md) defines unfinished conclusion persistence.

## Evidence and verification

- [MINERAL_MODEL.md](../../MINERAL_MODEL.md): accounting, response assumptions, method limits and chemical scope.
- [mineral-data.js](../../src/mineral-data.js), [mineral-engine.js](../../src/mineral-engine.js) and [mineral-ui.js](../../src/mineral-ui.js): routes, state, controls, gates and views.
- [Mineral unit tests](../../test/mineral.test.js) and [mineral browser checks](../../scripts/mineral-browser-check.mjs): controls, conservation, blindness, records, instrument gating, exports and shared-lab integration.

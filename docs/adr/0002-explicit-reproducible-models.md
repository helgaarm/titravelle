# ADR-0002: Explicit and reproducible domain models

- Status: Accepted, retrospective
- Recorded: 2026-09-19
- Implementation baseline: `0eef3bc`

## Context

A chemical name on a shelf does not supply equilibria, reaction kinetics, separation behavior or instrument calibration. The laboratory needs useful calculations while distinguishing supported chemistry from assumptions and unavailable predictions. Observations must remain stable while a learner navigates, compares results and writes a report.

## Decision

Keep explicit domain models for aqueous chemistry, organic research, electrochemistry and mineral screening. Separate data and assumptions, operations, views and reports rather than making a displayed lesson determine a successful outcome.

Represent operations as validated state transitions. Where an operation rejects its arguments, preserve the previous state. Use seeded random state for unknown composition and synthetic measurement/error scenarios. Reopening a view or exporting existing results must not resample observations. An explicit sampling or instrument operation may generate another record; continuous electrochemistry advances only through its run/step mechanism.

Declare each model's accounting boundary. Vessel transfers track supported solutes and material parcels; organic operations maintain their batch mass ledger; electrochemistry tracks supported charge and material changes; mineral operations conserve selected target-element inventories. None of this establishes conservation of every chemical species across every domain. Ordinary unsupported mixtures may retain an additions ledger while withholding pH, reactions or other unsupported predictions.

Present assumptions, uncertainties, synthetic readings and applicability limits alongside the relevant workflow and in the model documents. Balanced equations establish atom/charge bookkeeping, not proof that a reaction occurs or a physical sample has been identified. Calculated or synthetic success must not become measured scientific evidence.

## Alternatives

- One universal reaction/instrument solver would require thermodynamic, kinetic and analytical data the application does not contain.
- Fixed scripted success would prevent meaningful exploration of contamination, handling errors, incomplete recovery and unsuccessful experiments.
- Resampling during rendering would make navigation change the evidence and invalidate comparisons and saved reports.

## Consequences

New stock labels and study definitions can reuse existing capabilities; new chemistry requires explicit model rules, documented assumptions and focused tests. Unsupported cases need a useful explanation rather than fabricated numerical answers.

Reproducibility means the same state and operation sequence yields the same modeled outcome. Changing model rules may change a replay; saved records remain the evidence captured at the time. Numerical and regression tests verify implementation properties, not real-world analytical accuracy.

## Evidence and verification

- [SCIENTIFIC_MODEL.md](../../SCIENTIFIC_MODEL.md), [ORGANIC_MODEL.md](../../ORGANIC_MODEL.md), [ELECTROCHEMISTRY_MODEL.md](../../ELECTROCHEMISTRY_MODEL.md) and [MINERAL_MODEL.md](../../MINERAL_MODEL.md) define separate assumptions and limits.
- [lab-engine.js](../../src/lab-engine.js), [organic-engine.js](../../src/organic-engine.js), [electro-engine.js](../../src/electro-engine.js) and [mineral-engine.js](../../src/mineral-engine.js) implement state transitions and validation.
- [electro-runner.js](../../src/electro-runner.js) separates scheduled advancement from rendering and permits cancellation.
- [Engine tests](../../test/lab-engine.test.js), [organic tests](../../test/organic.test.js), [electrochemical tests](../../test/electro.test.js) and [mineral tests](../../test/mineral.test.js) exercise conservation, rejection, seeded outcomes and stable read-only results within each model's scope.

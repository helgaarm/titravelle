# ADR-0004: Make learning-mode scope explicit for specialized equipment

- Status: Accepted
- Recorded: 2026-09-19
- Evidence baseline: `0eef3bc`
- Accepted and implemented: 2026-09-19, following the request to fix review findings

## Context

The global learning-mode selector suggests a common contract. Before this documentation update, the README described Student as removing prompts and Assessment as hiding guidance, equations and answer tools without limiting that statement to the vessel bench.

At the evidence baseline, the aqueous view checked the selected mode, organic equipment used a documented open research view, and electrochemistry received only a guided flag while retaining analytical results. Mineral analysis received no learning-mode argument and rendered advice, equations, model interpretations and the completion-gated instrument/reveal workflow in every mode. The review reproduced identical guided/assessment mineral markup. This was a teaching-behavior discrepancy, not a remote-security vulnerability.

## Decision

Pass the selected learning mode from the shared shell to mineral views and learning exports. Centralize its presentation capabilities in `mineralPresentation`, used by the mineral renderer, reports and instrument-action handler. Keep the chemistry state and numerical results independent of presentation choices. Preserve existing aqueous behavior and explicitly label the other specialized equipment's exceptions.

For mineral analysis, Guided shows instructional advice; Student retains operational controls, recorded observations and required evidence entry while omitting optional teaching prompts. Assessment additionally withholds conceptual equations, generated conclusions, new instrumental submissions and ground-truth answers from views and learning reports. Recorded instrument readings remain available as existing evidence. Professor exposes eligible feedback without bypassing sample, safety or evidence gates. Free exploration leaves equipment accessible without implying an active experiment. Professor and Free omit optional step advice, like Student.

Preserve the explicitly documented organic research exception unless a separate decision changes it. Clearly label any equipment whose analytical feedback remains open, including electrochemistry, so a global selector does not silently promise unsupported restrictions. Hazards, ventilation, operation requirements and already recorded observations must remain available in every mode.

New mineral snapshots store an immutable report for the capture mode and a separate Assessment report containing observations and learner writing. Downloading a mineral snapshot or exporting the notebook in Assessment uses that safe copy. Older snapshots without the safe copy retain their data but require another learning mode to download the full report; a legacy `mode: assessment` label alone does not prove its contents were restricted. Working-report exports retain explicitly labelled unfinished drafts, while snapshots capture completed evidence and conclusions.

## Alternatives and tradeoffs

- Keep mineral analysis always open and explicitly label it as a research exception. This is smaller, but gives instructors no mineral Assessment presentation despite the global selector.
- Hide only the mode selector in unsupported stations. This avoids one misleading control but makes cross-station mode state harder to understand and does not define report behavior.
- Treat mode hiding as authorization. Rejected for the local application: a learner can inspect stored state and source, so secure assessment would require a different architecture.

Central capability rules add integration work but avoid divergent conditions in views, reports and later equipment. Existing locally stored data and previously exported answers cannot be made secret retroactively.

## Verification

- The mineral mode matrix is documented in [MINERAL_MODEL.md](../../MINERAL_MODEL.md) and tested across Guided, Student, Free, Assessment and Professor. Organic and electrochemical exceptions remain explicit in the shell and README.
- Unit and browser checks exercise Guided → Student → Assessment → Professor transitions without changing chemistry, observations, seed or learner writing.
- Safety and operational controls remain usable, and the existing mineral evidence/instrument gates still apply. Checks cover pending observations, completed routes, prior instrument results and legacy notebook snapshots.
- Browser checks inspect downloaded Markdown, CSV and notebook JSON as well as visible reports. This verifies presentation behavior, not examination security.

## Evidence

[lab-ui.js](../../src/lab-ui.js) passes the mode to [mineral-ui.js](../../src/mineral-ui.js) and mineral reports. [mineral-engine.js](../../src/mineral-engine.js) defines presentation capabilities and snapshot selection. [Mineral unit tests](../../test/mineral.test.js) and [browser checks](../../scripts/mineral-browser-check.mjs) cover the contract. [ORGANIC_MODEL.md](../../ORGANIC_MODEL.md) documents the research exception. [SECURITY.md](../../SECURITY.md) describes the local-state trust boundary.

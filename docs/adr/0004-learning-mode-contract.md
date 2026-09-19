# ADR-0004: Make learning-mode scope explicit for specialized equipment

- Status: Proposed
- Recorded: 2026-09-19
- Evidence baseline: `0eef3bc`
- Implementation: Not implemented; the review finding remains open

## Context

The global learning-mode selector suggests a common contract. Before this documentation update, the README described Student as removing prompts and Assessment as hiding guidance, equations and answer tools without limiting that statement to the vessel bench.

The implementation is more specific. The aqueous view checks the selected mode. Organic equipment uses a documented open research view. Electrochemistry receives a guided flag but does not receive the full mode; its analytical results remain available. Mineral analysis receives no learning-mode argument and renders advice, equations, model interpretations and the completion-gated instrument/reveal workflow in every mode. The review reproduced identical guided/assessment mineral markup. This is a teaching-behavior discrepancy, not a remote-security vulnerability.

## Proposed decision

Define presentation capabilities explicitly for each work area and selected mode, and pass them from the shared shell to specialized views and learning exports. Keep the chemistry state and numerical results independent of presentation choices.

For mineral analysis, make Guided show instructional advice; Student retain operational controls, recorded observations and required evidence entry while omitting optional teaching prompts; and Assessment additionally withhold conceptual equations, generated conclusions and ground-truth answer tools from visible views and learning reports. Professor may expose eligible model feedback without bypassing sample, safety or evidence gates. Free exploration should leave all equipment accessible without implying that an experiment is selected.

Preserve the explicitly documented organic research exception unless a separate decision changes it. Clearly label any equipment whose analytical feedback remains open, including electrochemistry, so a global selector does not silently promise unsupported restrictions. Hazards, ventilation, operation requirements and already recorded observations must remain available in every mode.

This proposal is not adopted by the documentation update. The README now describes current scope; that correction does not accept permanent always-open mineral behavior.

## Alternatives and tradeoffs

- Keep mineral analysis always open and explicitly label it as a research exception. This is smaller, but gives instructors no mineral Assessment presentation despite the global selector.
- Hide only the mode selector in unsupported stations. This avoids one misleading control but makes cross-station mode state harder to understand and does not define report behavior.
- Treat mode hiding as authorization. Rejected for the local application: a learner can inspect stored state and source, so secure assessment would require a different architecture.

Central capability rules add integration work but avoid divergent conditions in views, reports and later equipment. Existing locally stored data and previously exported answers cannot be made secret retroactively.

## Acceptance checks before adoption

- Specify and test a work-area/mode matrix covering instructions, equations, generated interpretation, reveal controls and each learning export.
- Reproduce Guided → Student → Assessment → Professor transitions without changing chemistry, observations, seed or learner writing.
- Confirm safety and operational controls remain usable, the existing mineral evidence/instrument gates still apply, and mode exceptions are visible.
- Update documentation and tests together; do not describe this as examination security.

## Evidence

[lab-ui.js](../../src/lab-ui.js) selects the mode and invokes specialized views; [mineral-ui.js](../../src/mineral-ui.js) currently has no mode parameter. [ORGANIC_MODEL.md](../../ORGANIC_MODEL.md) documents the research exception. [SECURITY.md](../../SECURITY.md) describes the local-state trust boundary.

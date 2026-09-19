# ADR-0005: Preserve unsubmitted mineral conclusions per route

- Status: Proposed
- Recorded: 2026-09-19
- Evidence baseline: `0eef3bc`
- Implementation: Not implemented; the reproduced draft-loss defect remains open

## Context

The shared shell redraws its content when a learner changes routes or equipment. Mineral pending-observation fields already persist into state, but the unfinished conclusion form exists only in the DOM. After finishing route A, typing a reason and selecting “Probable”, navigating to B and back to A empties the reason and resets confidence to “Not detected”. The full-stack review reproduced this in isolated Chrome.

Learners need to compare evidence across routes while writing. Persisting only the submitted conclusion is insufficient, and reusing one global draft would mix reasoning for different aliquots.

## Proposed decision

Store a separate conclusion draft for each mineral route in the saved mineral state, with bounded reasoning text and an optional confidence choice. Restore these values when rendering. Do not assign a scientific conclusion merely because a draft is absent; require an explicit confidence choice when submitting.

Capture draft edits without advancing time, consuming material, resampling observations or adding a completed journal record. A successful conclusion submission copies the validated draft into the completed learner result through the existing operation path. An invalid submission must retain the draft. Keep the draft distinct from model interpretation, route completion and the instrumental-confirmation gate.

Add backward-compatible validation: older saves without drafts remain readable, and any present draft must have a recognized route, allowed confidence and bounded string fields. Adopt the existing localStorage error reporting and export guidance. Include explicitly labelled unfinished drafts in portable working-state exports; do not turn them into completed notebook conclusions. Full restart intentionally clears working drafts along with the run, while saved snapshots stay unchanged.

Use existing session-undo semantics rather than introducing a separate per-keystroke history: navigation does not alter a draft, successful operations capture their preceding state, and undo restores that operation checkpoint. Typing alone should not consume the finite operation-undo stack. Document that undo is not a text-editor history and that intentional undo/reset can restore or discard working draft state.

## Alternatives and tradeoffs

- Saving only on route selection misses reloads, equipment changes and other redraws.
- Saving text only in DOM nodes or a transient module variable does not survive reloads and makes exports incomplete.
- Requiring confirmation before every navigation interrupts evidence comparison and leaves the underlying persistence gap.
- Replacing the whole UI framework is disproportionate; the existing pending-observation persistence provides a smaller implementation pattern.

Per-route drafts add a small amount of saved state and validation/migration work. They prevent avoidable loss without changing the chemistry engine's conclusions or evidence gates.

## Acceptance checks before adoption

- Type distinct reasoning/confidence in A and B; navigate through another route, Report, equipment and notebook; return and reload with both drafts intact.
- Reject invalid/empty submissions without losing entered text; successful submission records the intended route once and leaves its interpretation stable.
- Load an older save without draft fields, reject malformed draft values, and render hostile text as text.
- Verify editing causes no new random draws, time advancement, operations or completed conclusions; confirm restart, snapshot and operation-undo behavior is intentional.
- Add a focused browser regression for the exact A → B → A failure, plus state-validation tests for the new saved fields.

## Evidence

[mineral-ui.js](../../src/mineral-ui.js) currently renders the unfinished conclusion with default/empty values. [lab-ui.js](../../src/lab-ui.js) persists pending-observation edits and redraws on route selection. [mineral-engine.js](../../src/mineral-engine.js) owns submitted conclusions, route validation and the instrument gate. See [ADR-0001](0001-browser-local-shared-workbench.md) for the shared persistence boundary.

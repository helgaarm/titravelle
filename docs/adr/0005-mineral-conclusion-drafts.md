# ADR-0005: Preserve unsubmitted mineral conclusions per route

- Status: Accepted
- Recorded: 2026-09-19
- Evidence baseline: `0eef3bc`
- Accepted and implemented: 2026-09-19, following the request to fix review findings

## Context

The shared shell redraws its content when a learner changes routes or equipment. At the evidence baseline, pending-observation fields persisted into state, but unfinished conclusions existed only in the DOM. After finishing route A, typing a reason and selecting “Probable”, navigating to B and back to A emptied the reason and reset confidence to “Not detected”. The full-stack review reproduced this in isolated Chrome.

Learners need to compare evidence across routes while writing. Persisting only the submitted conclusion is insufficient, and reusing one global draft would mix reasoning for different aliquots.

## Decision

Store a separate `conclusionDraft` for each mineral route in saved state, with reasoning text up to 3000 characters, a confidence choice (empty until chosen), and a boolean control-comparison checkbox. Restore these values when rendering. Do not assign a scientific conclusion merely because a draft is absent; require an explicit confidence choice when submitting.

Capture input/change events without advancing time, consuming material, resampling observations or adding a completed journal record. A successful submission commits the form's validated values through the existing operation path and clears the working draft. Reject duplicate conclusion submission. Invalid submissions retain the draft. Keep drafts distinct from model interpretation, route completion and the instrumental-confirmation gate.

Keep backward-compatible validation: older saves without drafts remain readable, and any present draft must have exactly the supported fields, an allowed confidence or empty choice, bounded reasoning and a boolean checkbox. Use the existing localStorage error reporting and export guidance. Working Markdown and notebook JSON exports include explicitly labelled unfinished drafts; saved snapshots omit those unfinished conclusions. Full restart intentionally clears working drafts along with the run, while saved snapshots stay unchanged.

Use existing session-undo semantics rather than introducing a separate per-keystroke history: navigation does not alter a draft, successful operations capture their preceding state, and undo restores that operation checkpoint. Typing alone should not consume the finite operation-undo stack. Document that undo is not a text-editor history and that intentional undo/reset can restore or discard working draft state.

## Alternatives and tradeoffs

- Saving only on route selection misses reloads, equipment changes and other redraws.
- Saving text only in DOM nodes or a transient module variable does not survive reloads and makes exports incomplete.
- Requiring confirmation before every navigation interrupts evidence comparison and leaves the underlying persistence gap.
- Replacing the whole UI framework is disproportionate; the existing pending-observation persistence provides a smaller implementation pattern.

Per-route drafts add a small amount of saved state and validation/migration work. They prevent avoidable loss without changing the chemistry engine's conclusions or evidence gates.

## Verification

- Browser checks keep distinct reasoning/confidence in A and B through another route, Report, equipment, notebook and reload.
- Invalid/empty submissions retain entered text; unit checks verify a successful submission records the intended route once and rejects duplicate submission.
- State-validation tests accept older saves without drafts, reject malformed draft values, and verify hostile text is escaped on rendering.
- Unit checks verify editing causes no new random draws, time advancement, operations or completed conclusions, and restart clears the working run. Browser checks verify operation undo restores the pre-submission draft.
- Working exports label unfinished reasoning separately; snapshot reports omit it. The browser regression includes the original A → B → A failure.

## Evidence

[mineral-ui.js](../../src/mineral-ui.js) restores route-specific values. [lab-ui.js](../../src/lab-ui.js) captures and saves edits without a chemistry operation. [mineral-engine.js](../../src/mineral-engine.js) validates drafts, commits conclusions and preserves the instrument gate. [Mineral unit tests](../../test/mineral.test.js) cover legacy/malformed saves, independent drafts, rejection, rendering and exports; [browser checks](../../scripts/mineral-browser-check.mjs) reproduce A → B → A, equipment/report/notebook navigation, reload, learning-mode changes and operation undo. See [ADR-0001](0001-browser-local-shared-workbench.md) for the shared persistence boundary.

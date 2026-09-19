# Architecture decision records

These records explain architectural choices and their consequences. Scientific constants and analytical limitations belong in the model documents linked from each record.

The first records were written on 2026-09-19 against `0eef3bcca4b635639e0afaa85f198e24a03e3ef4`. Records 0001–0003 document the implementation retrospectively; their recording date is not the date the original choices were made. Records 0004–0005 originated in the full-stack and documentation reviews and were accepted and implemented on 2026-09-19 when the user requested the review fixes.

| ADR | Status | Decision |
| --- | --- | --- |
| [0001](0001-browser-local-shared-workbench.md) | Accepted, retrospective | One browser-local workbench with specialized equipment and a restricted static server |
| [0002](0002-explicit-reproducible-models.md) | Accepted, retrospective | Explicit, reproducible domain models with declared accounting and prediction limits |
| [0003](0003-mineral-evidence-workflow.md) | Accepted, retrospective | Independent mineral aliquots and controlled evidence before instrumental comparison |
| [0004](0004-learning-mode-contract.md) | Accepted, implemented | Make learning-mode behavior explicit for specialized equipment |
| [0005](0005-mineral-conclusion-drafts.md) | Accepted, implemented | Persist unsubmitted mineral conclusions independently for each route |
| [0006](0006-hands-on-mineral-apparatus.md) | Accepted, implemented | Perform mineral analyses through staged apparatus actions before recording evidence |

## Maintaining the records

- Use the next unused four-digit identifier and a descriptive filename. Include status, date, context, decision or proposal, alternatives, consequences and verification evidence or acceptance checks.
- Use **Proposed** for an unresolved recommendation and **Accepted** for an adopted decision. Record implementation status separately; acceptance alone does not prove delivery.
- Amend factual corrections and implementation notes in place. For a changed architectural choice, add a new record and mark the old one **Superseded by ADR-NNNN**, with reciprocal links. Keep the history rather than renumbering records.
- Link to source modules, tests and model documentation. Record specific commits for time-sensitive findings. Keep routine bug logs and individual test results outside the ADR index unless they explain a decision.

Return to the [project README](../../README.md).

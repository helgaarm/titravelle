# ADR-0001: One browser-local shared workbench

- Status: Accepted, retrospective
- Recorded: 2026-09-19
- Implementation baseline: `0eef3bc`

## Context

The laboratory grew from aqueous experiments to organic, electrochemical and mineral investigations. The user requested shared materials and equipment, access without selecting an experiment, and switching work areas without losing samples. The application also needs to run locally without accounts or service credentials.

## Decision

Keep one browser application and one saved laboratory state, with specialized domain state and equipment views inside the same workbench. The selected work area and active experiment are separate: equipment is available in free exploration, while starting or repeating an experiment explicitly prepares a new run.

Use the shared shelf, qualitative hazard panel, ventilation setting, session undo and notebook across equipment. Catalog availability does not imply a universal sample interface. Ordinary-vessel material additions are tracked separately from organic feed/reactor/product and mineral aliquots. The electrochemical cell has an explicit, validated import path for supported vessel samples.

Use local ES modules and HTML/CSS/SVG with no npm runtime dependencies or remote runtime assets. A Node.js static server binds to loopback by default, restricts served paths and methods, validates Host headers on loopback bindings and supplies browser security headers. It does not store experiments or expose a chemistry API.

Persist validated state in browser localStorage under `titravelle-science-lab-v2`; export notebooks for portable records. A full restart clears working runs while preserving saved snapshots, custom studies and ventilation. Undo is limited to the current page session. This is the implemented persistence policy, not a guarantee that every unfinished form is persisted; [ADR-0005](0005-mineral-conclusion-drafts.md) defines persistence for unfinished mineral conclusions.

## Alternatives

- Separate applications for each chemistry area would duplicate navigation, safety, storage and notebook behavior and break the requested shared-workbench experience.
- A hosted application backend could support accounts and cross-device storage, but introduces authentication, hosting and data-handling responsibilities that the current local application does not need.
- Treating every shelf material as valid input to every instrument would imply analytical support that the domain models do not implement.

## Consequences

Shared navigation must preserve each domain's samples and readings. New equipment must integrate with the shared reset, validation and notebook paths instead of creating another independent application. Imports between domain models need explicit identity, amount and compatibility rules.

Storage is device/profile-local, quota-limited and unencrypted, with no server backup. Learning modes and hidden recipes are not authentication or secure-examination controls. A non-loopback deployment needs its own hosting and access-control assessment; the built-in server is not a production service. See [SECURITY.md](../../SECURITY.md).

## Evidence and verification

- [lab-workspace.js](../../src/lab-workspace.js): catalog, stations, `openStation` and `restartLab`.
- [lab-ui.js](../../src/lab-ui.js): browser persistence, shared controls, snapshots and session undo.
- [lab-engine.js](../../src/lab-engine.js): overall state validation; [server.mjs](../../server.mjs): static-server boundary.
- [Workspace tests](../../test/lab-workspace.test.js), [server tests](../../test/server.test.js) and [workspace browser checks](../../scripts/workspace-browser-check.mjs) cover navigation, reset, compatibility and serving boundaries.

# Security policy

Security fixes target the current `main` branch. Older snapshots have no separate maintenance commitment.

## Report a vulnerability

Use [GitHub's private vulnerability report form](https://github.com/helgaarm/titravelle/security/advisories/new). Include affected files or commit, reproduction steps, and expected impact. Do not include real credentials, personal laboratory notes, or unrelated personal data. Please keep exploit details out of public issues while the report is being assessed.

Ordinary bugs and scientific-model inaccuracies can be reported in public issues using synthetic examples. No guaranteed response time or bounty program is offered.

## Application boundaries

- Titravelle runs locally and has no accounts, remote database, API credentials, or npm dependencies. Use a supported Node.js LTS release and an updated browser.
- The built-in server binds to `127.0.0.1` by default, serves only the application entry point and allowed source assets, and rejects foreign Host headers on loopback bindings. Keep this default for personal use. An explicit `--host` network binding exposes the static app to that network; it provides no authentication or TLS and is not a production hosting configuration.
- Browser headers restrict scripts to local files, prevent framing and form submission, and disable unused device permissions. Inline styles remain necessary for the original diagrams and plots. Custom hosting must configure equivalent headers; the HTML file alone does not provide them.
- Runs and notebooks are saved in browser localStorage. They are not encrypted or backed up by a server. Anyone with access to the same browser profile can access or change them. Professor and assessment modes are learning controls, not authentication or secure examination boundaries.
- Exported notebooks may contain user-entered information. Review exports before sharing. Keep browser profiles, `.env` files, logs, test artifacts, and credentials out of commits.

## Maintainer checks

Run `npm run check`, `npm test`, `npm run check:provenance`, and `npm run test:browser` with a local server running before merging. CI uses read-only repository permissions, pinned official actions, isolated hosted runners, and no repository secrets. Dependabot proposes action updates for review. Never execute untrusted pull-request code in a privileged `pull_request_target` job.

The repository's secret scanning, push protection, private reporting, CodeQL scanning, and branch protections are GitHub settings, separate from these files. Review those settings after any repository transfer or visibility change. Automated checks reduce risk; they do not prove the absence of vulnerabilities or establish scientific accuracy.

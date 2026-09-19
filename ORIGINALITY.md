# Titravelle: originality and provenance review

Review date: 18 September 2026. Scope: the source and application assets in this workspace, available development history, package metadata, cited scientific references, and a limited public-web name search made during development.

The current application contains fourteen investigations, shared chemistry equipment, original apparatus illustrations and transfer animations, equation calculations, and a scientific notebook. Its code, wording, and interface were authored for this project with AI assistance.

This is an implementation review, not a legal opinion, trademark registration search, patent/design clearance, or guarantee against infringement. No claim is made that every phrase, geometric symbol, teaching activity, or interface arrangement is unique worldwide.

## Findings and source history

| Area | Evidence and resulting action |
| --- | --- |
| Application name | An earlier public search found an existing chemistry-learning app called **Element Lab & Periodic Table**. The visible name, package name, export identity, and favicon use **Titravelle**. Exact-name and chemistry/app-related searches made during the review returned no relevant matches for Titravelle. This preliminary screening does not establish availability or rule out similar marks or unregistered rights. |
| Commercial kit reference | The initial request referenced Thames & Kosmos CHEM C3000. Its product description and a publicly indexed sample-manual excerpt were consulted for context. No kit photo, logo, scan, manual page, downloaded design, or proprietary software package is bundled. No commercial-kit affiliation is presented in the interface. This development was not a formal clean-room process. |
| Lessons and setup | The fourteen investigations follow the user's capability brief and use locally written questions, instructions, and explanations. Stock concentrations, doses, apparatus capacities, and model parameters are project choices. Common chemical facts, equations, terminology, and conventional laboratory methods remain. |
| Visuals | The mark, favicon, glassware, apparatus, transfer animations, and graphs use local HTML/CSS/SVG code. No stock-image library, icon package, manufacturer imagery, or commercial design template is bundled. Conventional apparatus shapes and simple symbols are not claimed as exclusive designs. |
| Fonts | The application references device-installed system, serif, and monospace fonts. It distributes no font files and makes no external font request. |
| Runtime packages | There are no npm runtime dependencies or vendored runtime libraries. The server uses Node.js built-ins; Node.js and the browser are independently installed software. |
| Scientific sources | Outbound reference links support factual content. Their page layouts, photographs, charts, logos, and extended prose are not embedded. See THIRD_PARTY_NOTICES.md and SCIENTIFIC_MODEL.md. |
| User data | Current laboratory notes persist in the existing `titravelle-science-lab-v2` collection. Removing retired application features does not erase browser storage. |
| Distribution scope | Package metadata lists application files explicitly, including the MIT LICENSE. Browser profiles, caches, screenshots, downloaded test notebooks, development scripts, and `artifacts/` are excluded from the npm package file list. The project is MIT-licensed; `private: true` prevents accidental npm publication. |

## Authorship and source map

| Files | Origin and role |
| --- | --- |
| `src/identity.js`, favicon in `index.html` | Project-authored application mark |
| `src/styles.css`, `src/lab.css`, `src/lab-ui.js` | Project-authored shell, interface, notebook, and controls |
| `src/lab-safety.js` and hood SVG/CSS in the UI | Original precaution wording, qualitative rule logic, ventilation control and illustration; factual references documented in SCIENTIFIC_MODEL.md |
| `src/lab-data.js` | Locally written investigations, reagent/equipment data, and model parameters |
| `src/lab-engine.js` | Project-authored equilibria, material transfers, operations, and measurements |
| `src/lab-copper.js` | Project-authored coupled solver using selected cited numerical equilibrium constants |
| `src/lab-analysis.js`, `src/lab-reactions.js` | Project-authored calculations, atom/charge checking, and equation reports |
| `src/lab-glassware.js`, `src/lab-transfer.js` | Original apparatus drawings, menisci, markings, and transfer scenes |
| `src/organic-*.js`, `src/organic.css`, `src/lab-shelf.js` | Original organic reaction/analysis scenarios, reactor and plots, and searchable shelf; targets supplied by the user, with references and assumptions in ORGANIC_MODEL.md |
| `src/electro-*.js`, `src/electro.css` | Original cell and circuit drawings, calculation and transport models, synthetic measurements, interactive graphs and reports; references and assumptions in ELECTROCHEMISTRY_MODEL.md |
| `src/mineral-*.js`, `src/mineral.css` | Original guided concentrate tests, target inventories, synthetic controls, test-vial/grain drawings and instrument comparison; user-supplied capability brief, with references and assumptions in MINERAL_MODEL.md |
| `docs/adr/` | Project-authored architectural rationale and explicitly labelled proposals; the index records the retrospective baseline and recording dates |
| `src/main.js`, `server.mjs`, `test/`, `scripts/` | Project-authored application support and validation using standard platform APIs |

These provenance statements do not establish copyright ownership, copyrightability, exclusivity, or the absence of accidental similarity to unknown works.

## Review limits and references

The full commercial manual, every existing chemistry simulator, and trademark, patent, or registered-design databases were not exhaustively compared. No formal register clearance was performed. The project's MIT license and public repository visibility do not establish legal clearance for third-party material; repository checks cannot certify that clearance.

- [Existing Element Lab chemistry app listing](https://apps.apple.com/us/app/element-lab-periodic-table/id6752604178): reason for replacing the earlier name.
- [U.S. Copyright Office, Circular 33](https://www.copyright.gov/circs/circ33.pdf): source consulted on expression and underlying ideas or methods.
- [USPTO clearance searching](https://www.uspto.gov/trademarks/search/comprehensive-clearance-search-similar-trademarks): context for the limits of an exact-name web search.
- [Norwegian Industrial Property Office search tools](https://www.patentstyret.no/en/search/): register search tools; no formal clearance was performed here.

## Technical verification

`npm run check:provenance` inventories the packaged source surface and flags remote asset declarations, unexpected asset types, and third-party package imports. Browser checks require application requests to remain on the local origin. These checks assess assets and dependencies, not copyright similarity or legal clearance.

`npm run check`, `npm test`, and `npm run test:browser` cover syntax, chemistry, equations, material transfers, saved data, notebook exports, application navigation, and responsive layouts. Scientific assumptions and coverage limits are documented in SCIENTIFIC_MODEL.md.

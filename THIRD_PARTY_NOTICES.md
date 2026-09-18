# Third-party material and scientific references

## Material distributed with the application

The application contains no bundled third-party image files, fonts, UI frameworks, icon packages, or npm runtime libraries. Its mark, diagrams, glassware, and transfer illustrations are rendered from project-authored SVG/CSS. Device-installed fonts are referenced by family; no font binary is copied or delivered by this project.

The app relies on the user's separately installed browser and Node.js runtime. Their licenses remain their own. Development browser tests use a separately installed Chromium-compatible executable; that executable and its profiles/caches are not part of the packaged application.

## Scientific references

These sources informed factual chemistry. The project provides outbound links and locally written explanations, not embedded copies of articles, photographs, diagrams, handouts, or source-site designs. Citation acknowledges a factual source; it is not a license to copy protected presentation or a claim of endorsement.

| Reference | Facts checked |
| --- | --- |
| [Purdue University: weak acids and equilibrium](https://chemed.chem.purdue.edu/genchem/topicreview/bp/ch17/weaka.php) | Weak-acid dissociation and acetic acid equilibrium |
| [Purdue University: common-ion effects](https://chemed.chem.purdue.edu/genchem/topicreview/bp/ch18/complex.php) | AgCl solubility product and common-ion behavior |
| [OpenStax: classifying chemical reactions](https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions) | Molecular and net ionic equations, precipitation, and acid/base reactions |
| [University of Maryland: acetic acid and sodium hydroxide](https://terpconnect.umd.edu/~wbreslyn/chemistry/net-ionic/NaOH-CH3COOH.html) | Weak-acid net ionic notation |
| [USGS PHREEQC MINTEQ database](https://github.com/usgs-coupled/phreeqc3/blob/master/database/minteq.v4.dat) | Selected numerical copper/sulfate/chloride equilibrium and phase constants; the database and PHREEQC implementation are not bundled |
| [OpenStax: calorimetry](https://openstax.org/books/chemistry/pages/5-2-calorimetry) | Heat capacity, solution calorimetry, and dilute-solution approximations |
| [University of Scranton: heat of neutralization](https://www.scranton.edu/faculty/baumann/courses/labs/360_2.pdf) | Approximate heat-release scale for strong acid/base neutralization |
| [Penn EHRS: fume hoods](https://ehrs.upenn.edu/health-safety/lab-safety/fume-hoods) | Local exhaust purpose, procedure/SDS requirements, airflow and operational precautions |
| [NIOSH Pocket Guide](https://www.cdc.gov/niosh/npg/default.html), individual substance entries linked in SCIENTIFIC_MODEL.md | Exposure routes and properties for HCl, NaOH, acetic acid, copper, silver and CO₂; no blanket classification of diluted mixtures |
| [Merck/Sigma-Aldrich copper sulfate solution](https://www.sigmaaldrich.com/US/en/product/mm/102784) and [silver nitrate solution](https://www.sigmaaldrich.com/US/en/product/mm/109081) | Examples of concentration-dependent supplier hazard classifications; reference facts only, no SDS text, layouts or pictograms bundled |
| [National Toxicology Program: phenolphthalein](https://www.ncbi.nlm.nih.gov/books/NBK590820/) | Animal carcinogenicity evidence and indicator formulation context |

Scientific constants, chosen teaching parameters, and model limitations are distinguished in SCIENTIFIC_MODEL.md. University names identify sources; their logos, seals, photographs, source illustrations, and trademarks are not used as the application's identity. The initial kit reference and earlier app-name conflict are documented in ORIGINALITY.md as source history, not as affiliations, licenses, or endorsements.

The electrochemistry addition references the [NIST aqueous electrode-potential compilation](https://www.nist.gov/system/files/documents/2019/04/02/jpcrd355.pdf), [NIST physical constants](https://physics.nist.gov/cuu/Constants/), [COMSOL electrode-kinetics documentation](https://doc.comsol.com/6.3/doc/com.comsol.help.fce/fce_ug_electrochem.07.095.html) and [NIOSH chlorine entry](https://www.cdc.gov/niosh/npg/npgd0115.html). These support scientific facts and modeling conventions. No source diagrams, software, model files or extended wording are distributed. The cell, circuit, kinetic approximations and plots are project-authored; selected constants and assumptions are distinguished in ELECTROCHEMISTRY_MODEL.md.

## Project licensing status

The SOI-18 addition also references a general [saccharide transesterification patent](https://patents.google.com/patent/EP0647652A2/en), [IUPAC mass terminology](https://goldbook.iupac.org/terms/view/12495), and NIOSH entries for [methyl acetate](https://www.cdc.gov/niosh/npg/npgd0391.html) and [methanol](https://www.cdc.gov/niosh/npg/npgd0397.html). Its targets and scale were supplied by the user. Models, UI, apparatus drawing, synthetic plots and explanations are project-authored; no source spectra, microscopy images, patent figures or third-party implementation is bundled. Formula-derived masses and project-chosen assumptions are distinguished in ORGANIC_MODEL.md. General reaction precedent does not establish the experimental material's properties or confer patent/design clearance.

The GitHub repository is public, with package metadata `private: true` (to prevent npm publication) and `license: "UNLICENSED"`. [LICENSE](LICENSE) records the existing all-rights-reserved status; it grants no general permission for third parties to redistribute the project. This status does not claim ownership of chemical facts, standard equations, conventional apparatus shapes, user-owned notes, independently installed software, or unprotectable/third-party material. Revisit this inventory if external assets or packages are added or the licensing policy changes.

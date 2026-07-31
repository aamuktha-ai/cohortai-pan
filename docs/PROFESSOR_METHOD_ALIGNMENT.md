# Professor-Method Alignment

## Purpose

This document records how CohortAI-PAN implements the statistical harmonization process supplied in `Code_Information.docx`. The source process is an ADNI x NACC x PAN baseline harmonization pipeline. CohortAI-PAN is a data-dictionary feasibility tool, so it does not transform participant-level data. Instead, it identifies the PAN field, assigns the same match type, and returns the proposed transformation and review conditions needed before an analyst performs the transformation.

## Match Taxonomy

The tool uses the established five-category crosswalk taxonomy:

- `Direct`: same construct, compatible definition and scoring/coding; raw comparison is possible after analyst confirmation.
- `Analogous`: related construct with a required recode, derivation, rescaling, or instrument-aware harmonization step.
- `Partial`: related construct with restricted availability, a timing difference, incomplete scoring evidence, or a non-interchangeable subset.
- `Supplemental`: unique to one cohort and retained as context only, not as a pooled construct.
- `No match`: the construct is not collected or is not an interchangeable measurement.

`Needs review` is a separate unresolved status. It is used only when the supplied metadata cannot support one of the five categories; it is counted separately and is never silently forced into `Partial`.

## Implemented Statistical Rules

| Construct | PAN reference field(s) | Match logic | Proposed harmonized output |
| --- | --- | --- | --- |
| Age | `age_hml` | Direct when both are continuous age in years; visit anchor is retained for review. | `dem_age` |
| Biological sex | `sex_hml` | Direct only as a documented biological-sex recode. | `dem_sex` |
| Education | `edu_yrs_hml` | Direct for years of formal education. | `dem_edu_yrs` |
| BMI | BMI or height/weight fields | Analogous because derivation and units must be documented. | `dem_bmi` |
| Race and ethnicity | `race_hml_*` | Analogous because PAN is multi-select; use a documented NIH-style crosswalk and preserve Hispanic/Latino and multi-racial policies. | `dem_race_nih` |
| APOE | `apoe_status`, `rs429358`, `rs7412` | Direct only for genotype. Derive e4 dose and carrier status. APOE protein is `No match`. | `dem_apoe_dose`, `dem_apoe_carrier` |
| MoCA | `moca_total` | Direct for a directly administered compatible MoCA; converted MMSE-equivalent is Analogous and must retain source provenance. | `cog_moca`, `cog_moca_source`, `cog_moca_bl` |
| AVLT | PAN AVLT trial, delay, and recognition fields | Partial until trial structure and scoring are verified; retain outcomes separately. | `cog_avlt_*` |
| Depression | `phq9_total` | GDS and PHQ-9 are Analogous. Create a documented binary indicator rather than pooling raw scores. | `cog_dep_binary` |
| Comorbidities and smoking | PAN health-medical survey fields | Direct only with confirmed binary definitions and codes. Stroke requires cross-source discordance review. | `cmb_*`, `sub_smoking_*` |
| Cytokines and CRP | PAN assay fields | Analogous; require platform, transformation, and limit-of-detection evidence. | `cyt_*_log` |
| MMSE, CDR-SB, Trails A/B | Not directly represented in PAN | No match for raw pooling. | Cohort-specific or excluded |

## Reproducibility Controls

- Each report records the PAN release label, release date, and SHA-256 dictionary fingerprint.
- Each report records the deterministic profile version and input fingerprint.
- The generated CSV includes the selected PAN field, match type, proposed harmonized variable, transformation rule, review notes, and reviewer status.
- The PAN dictionary remains server-side and is not stored in the public repository or sent to the browser.

## Validation Boundary

The implementation has regression tests for the source-method rules, including race recoding, direct age, GDS versus PHQ-9, and APOE protein versus genotype. It is not a substitute for a held-out expert validation set. Before production deployment, a statistician should adjudicate blinded examples from new source dictionaries, compare the resulting labels and transformations with the reference method, and approve the release threshold.

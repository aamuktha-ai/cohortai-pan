# PAN Data Dictionary Deep Dive

## Scope and Source

This guide was reviewed against the supplied `PAN_Data_Dictionary.pdf`, titled *Precision Aging Network Data Dictionary*. The reviewed PDF has 511 pages and its table index identifies 51 source domains with 3,416 declared field slots. CohortAI-PAN's domain-aware PDF-text parser recovers 3,240 usable variable records from the matching `page,text` export. The difference is expected because some displayed fields do not have recoverable descriptions or share structural rows in the PDF export.

This document describes metadata structure and harmonization implications only. It does not establish participant eligibility, sample availability, consent, or data-access approval.

## Data Structure

- `hml_id` is the PAN participant identifier that recurs across HML tables.
- `mindcrowd_id` is a recurring linked MindCrowd identifier. It must not be assumed to be interchangeable with `hml_id` without linkage confirmation.
- Many HML instruments carry `visit`. The dictionary defines `visit = 1` as baseline and `visit = 2` as the first follow-up two years after baseline; subsequent values correspond to later follow-up years.
- Many source tables also carry instrument-specific date or timestamp fields. Harmonization must use the actual assessment/collection time, not just the participant identifier.
- The same generic field name can occur in multiple tables. CohortAI-PAN preserves the PAN source domain so a field such as `mindcrowd_id`, `visit`, or `race` is not merged across unrelated acquisition streams.

## Domain Inventory

### Core participant, demographics, and study operations

- `HML_Demographics` (33 fields), `HML_Eligibility` (9), `MindCrowd_Demographics` (56), and `Full_MindCrowd_Data` (28).
- These domains contain participant linkage, demographic capture, recruitment/site fields, eligibility, discontinuation, and assessment timing.
- Do not treat HML current-age fields and MindCrowd age-at-first-login fields as the same time anchor.

### Cognitive and mental-health assessments

- `AVLT` (15), `MoCA` (16), `NAART` (5), `PHQ9` (5).
- MindCrowd task-score domains: Flanker (24), Keep Track (21), Letter Number (24), Simple and Choice (23), and Verbal Paired Associates (42).
- Instruments must be compared at the construct level, not pooled as raw scores across different tests.

### Raw surveys and scored survey products

- Raw domains include ADL, anxiety, brain disease, COVID, diet, family history, health/medical, perceived stress, QPAR, sleep, social stressor, social support, socioeconomic, subjective English, and satisfaction-with-life surveys.
- `HML_Scored_Surveys` (24) contains calculated totals and subscales derived from raw survey items. The dictionary explicitly documents several formulas, scale ranges, source-item relationships, and references.
- For harmonization, distinguish raw responses from PAN-calculated scores. Preserve the calculation version and time period. The dictionary notes scoring changes for some QPAR scales before and after 2025-03-22.

### Biometrics, clinical measures, and laboratories

- `Biometrics` (33) includes height, weight, body composition, and repeated blood-pressure readings with units.
- Laboratory and biomarker domains include AD plasma biomarkers, APOE4, epigenetic clocks, Millipore cytokines, NULISAseq, polygenic risk scores, Sonora Quest blood chemistries, cortisol, and GeMAPS.
- Direct pooling requires analyte identity, specimen/collection timing, assay platform, unit, transformation, and QC policy. For example, the cytokine section states that below-LOD readings are replaced with 0.5 times LOD and highly variable readings are replaced using the cytokine mean by assay plate.
- `Cortisol` is described as cortisol from sweat beads in ng, which is not interchangeable with serum, saliva, or hair cortisol without an explicit model.

### Imaging, sensors, and physical function

- Imaging domains include carotid ultrasound, structural MRI, diffusion MRI, ASL perfusion, resting-state fMRI variants, and white-matter hyperintensities.
- Sensor and functional domains include LabFront Garmin and UEF Frailty.
- The Garmin dictionary defines a valid day as at least 100 recorded steps and provides monitoring duration and valid-days fields. These rules are part of the measurement definition.
- ASL fields are derived with BASIL and report units such as mL/100g/min. MRI fields require protocol, preprocessing pipeline, atlas/region definition, and QC compatibility before direct comparison.

## Core PAN Reference Rules

| Construct | Preferred PAN field(s) | Acquisition / scoring implication | CohortAI-PAN label when details differ |
| --- | --- | --- | --- |
| Age | `age_hml` in `HML_Demographics` | Current age; align the assessment visit/timepoint. | Analogous or Direct only with matching anchor and units. |
| Biological sex | `sex_hml` in `HML_Demographics` | Core demographic biological-sex question. | Analogous until coding is confirmed. |
| Education | `edu_yrs_hml` in `HML_Demographics` | Validated years-of-education field, indicated 0-100 range. | Direct only after confirming local formal-education definition. |
| Race | `race_hml_1` through `race_hml_555` | Multiple binary race indicators plus Other and a screening race/ethnicity field. | Partial for broad single-choice local race; require a documented recoding policy. |
| MoCA | `moca_total` in `MoCA` | Calculated total includes an education bonus for participants with 12 or fewer years of education. | Analogous / Needs review unless administration and adjustment policy match. |
| APOE | `apoe_status` in `APOE4`; also `rs429358`, `rs7412` | Genotype status, distinct from measured APOE protein. | Analogous until genotype/carrier derivation matches. |
| Depression | `phq9_total` in `PHQ9` | PHQ-9 total plus question-9 endorsement field. | Direct only against matching PHQ-9 scoring and handling. |
| BMI | Biometrics height/weight/BMI fields | Measurement units and protocol matter. | Analogous or Partial unless measurement timing/protocol match. |

## Required Harmonization Checks

1. Confirm the PAN domain and field, not merely a similar field name.
2. Confirm participant linkage and use the correct assessment visit or timestamp.
3. Identify raw versus calculated/derived PAN variables; do not recompute or pool without the formula and version.
4. Check coding, allowable values, units, range, missing-data policy, and branching logic.
5. For laboratory, imaging, sensor, and derived digital measures, require acquisition and preprocessing compatibility evidence before a `Direct` decision.
6. Keep source evidence, dictionary release ID, release date, and SHA-256 fingerprint with every exported crosswalk.

## Automated Coverage in CohortAI-PAN

The standalone tool now tests:

- server-side PAN reference loading and release fingerprinting;
- fixed PAN comparison of investigator metadata;
- domain-preserving parsing for repeated field names in PDF-text exports;
- HML race-field preference over generic parallel fields and its required `Partial` label;
- server-side architecture that keeps the PAN dictionary out of browser requests and source control.

## Limits of This Dictionary

The data dictionary is strong evidence for variable names, descriptions, allowed values, units, calculated fields, and some acquisition/QC notes. It is not enough by itself to prove equivalence of recruitment criteria, consent, clinical adjudication, MRI scanner/protocol details, biospecimen handling, assay batch structure, or full processing pipelines. CohortAI-PAN should return `Needs review` or `Partial` where those external protocol documents are required.

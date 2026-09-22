# How the Professor-Method Rules Are Used

## What this document is for

This explains how CohortAI-PAN uses the harmonization process from Code_Information.docx. The original workflow is an ADNI, NACC, and PAN baseline harmonization pipeline.

The tool does not transform participant-level data. It works at the dictionary level. It finds the likely PAN field, gives it the same kind of match label, and explains the transformation or review that would be needed before an analyst actually changes data.

## Match labels

- **Direct:** the same construct with compatible definition and scoring or coding. It can be compared after a person checks the details.
- **Analogous:** related, but needs a recode, derivation, rescaling, or instrument-aware harmonization step.
- **Partial:** related, but there is limited availability, a timing difference, missing scoring information, or a non-interchangeable subset.
- **Supplemental:** only appears in one cohort. It can be useful context, but it is not a pooled construct.
- **No match:** the construct is not collected or is not an interchangeable measure.
- **Needs review:** the dictionary does not give enough information to make a responsible call. This is separate from Partial and is not quietly forced into another category.

## Main rules in the tool

| Construct | PAN reference field(s) | What the tool checks | Proposed output |
| --- | --- | --- | --- |
| Age | age_hml | Direct when both are continuous age in years. The visit anchor still needs to be checked. | dem_age |
| Biological sex | sex_hml | Direct only with a documented biological-sex recode. | dem_sex |
| Education | edu_yrs_hml | Direct for years of formal education. | dem_edu_yrs |
| BMI | BMI or height/weight fields | Usually analogous because the derivation and units need to be documented. | dem_bmi |
| Race and ethnicity | race_hml fields | Usually analogous because PAN is multi-select. A documented NIH-style crosswalk is needed. | dem_race_nih |
| APOE | apoe_status, rs429358, rs7412 | Direct only for genotype. Protein is not a substitute. | dem_apoe_dose, dem_apoe_carrier |
| MoCA | moca_total | Direct for a directly administered compatible MoCA. A converted MMSE-equivalent is analogous and needs source information. | cog_moca |
| AVLT | PAN AVLT fields | Partial until trial structure and scoring are checked. | cog_avlt |
| Depression | phq9_total | GDS and PHQ-9 are analogous. Do not pool their raw scores. | cog_dep_binary |
| Comorbidities and smoking | PAN health-medical fields | Direct only when the binary definition and coding are confirmed. | cmb or sub variables |
| Cytokines and CRP | PAN assay fields | Analogous. Platform, transformation, and LOD rules need to be checked. | cyt variables |
| MMSE, CDR-SB, Trails A/B | Not directly represented in PAN | No match for raw pooling. | cohort-specific or excluded |

## What is recorded in a report

- The PAN release label, date, and SHA-256 dictionary fingerprint.
- The version of the rules used for the comparison.
- A fingerprint of the input dictionary.
- The selected PAN field, match label, proposed output, transformation note, and reviewer note.

## What still needs expert review

The tool has tests for the main rules, including race recoding, age, GDS versus PHQ-9, and APOE protein versus genotype. That is helpful, but it is not the same as a full external validation study. Before any production use, a statistician should review blinded examples from new dictionaries and decide what level of agreement is good enough for release.

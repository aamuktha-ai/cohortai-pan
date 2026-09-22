# PAN Data Dictionary Notes

## What was reviewed

These notes come from the supplied Precision Aging Network Data Dictionary PDF. The PDF has 511 pages. Its table index lists 51 source domains and 3,416 field slots. The parser recovered 3,240 usable variable records from the matching page-text export. That difference makes sense because some PDF rows are structural or do not include a recoverable description.

This is a guide to the dictionary and what it means for harmonization. It does not prove eligibility, data availability, consent, or access approval.

## Important structure to keep in mind

- hml_id is the PAN participant identifier used across HML tables.
- mindcrowd_id is a linked MindCrowd identifier. It should not be treated as interchangeable with hml_id unless the linkage is confirmed.
- A lot of HML instruments include visit. In the dictionary, visit 1 is baseline and visit 2 is the first follow-up two years later. Later values refer to later follow-ups.
- Tables can also include their own assessment date or timestamp. Matching studies need the actual assessment time, not just the participant ID.
- The same generic name can show up in different tables. The tool keeps the source domain so that a field like visit or race is not automatically mixed across unrelated data collection streams.

## Main PAN areas

### Demographics and study information

Key tables include HML_Demographics, HML_Eligibility, MindCrowd_Demographics, and Full_MindCrowd_Data. They cover participant linkage, demographics, recruitment/site information, eligibility, discontinuation, and timing.

HML current age and MindCrowd age at first login are not the same measure. The assessment anchor has to be checked before comparing them.

### Cognitive and mental-health measures

PAN includes AVLT, MoCA, NAART, and PHQ-9, along with MindCrowd task-score tables such as Flanker, Keep Track, Letter Number, Simple and Choice, and Verbal Paired Associates.

Scores from different cognitive tests should not be pooled as raw values just because they all measure cognition. The instrument, scoring, timing, and version matter.

### Surveys and calculated scores

PAN has raw survey data for ADL, anxiety, brain disease, COVID, diet, family history, health/medical history, perceived stress, QPAR, sleep, social stressors, social support, socioeconomic factors, subjective English, and satisfaction with life.

HML_Scored_Surveys contains totals and subscales calculated from the raw questions. When a score is calculated, the formula and version need to stay with it. Some QPAR scoring changed before and after 2025-03-22, so that release detail matters.

### Biometrics, labs, and biomarkers

Biometrics includes height, weight, body composition, and repeated blood pressure readings. PAN also has AD plasma biomarkers, APOE4, epigenetic clocks, cytokines, NULISAseq, polygenic risk scores, blood chemistry, cortisol, and GeMAPS.

For direct pooling, we need the same analyte, specimen, collection time, assay platform, units, transformation, and QC approach. For example, the cytokine documentation includes how below-LOD and highly variable results are handled. PAN cortisol is from sweat beads in ng, so it is not automatically the same as serum, saliva, or hair cortisol.

### Imaging, sensors, and physical function

PAN includes carotid ultrasound, structural MRI, diffusion MRI, ASL perfusion, resting-state fMRI, white-matter hyperintensities, LabFront Garmin, and UEF Frailty.

The Garmin dictionary defines a valid day as at least 100 recorded steps and includes monitoring duration and valid-day fields. Those are part of the measure. MRI comparisons need compatible protocols, preprocessing, atlas or region definitions, and QC before they can be treated as direct matches.

## Core fields the tool checks carefully

| Construct | PAN field(s) | What needs to match |
| --- | --- | --- |
| Age | age_hml in HML_Demographics | Age in years and the same visit or assessment-time anchor. |
| Biological sex | sex_hml in HML_Demographics | The source question and coding. |
| Education | edu_yrs_hml in HML_Demographics | Years of formal education and the range used. |
| Race | race_hml_1 through race_hml_555 | A documented recoding plan because PAN has multiple binary indicators. |
| MoCA | moca_total in MoCA | Administration and education-bonus policy. PAN includes an education bonus for 12 or fewer years of education. |
| APOE | apoe_status, rs429358, rs7412 | Genotype or e4-carrier definition. Protein measurements are not substitutes. |
| Depression | phq9_total in PHQ9 | The same PHQ-9 scoring and missing-data handling. |
| BMI | PAN height, weight, and BMI fields | Units, timing, and measurement protocol. |

## Before calling something a match

1. Confirm the PAN table and field, not just a similar-looking name.
2. Confirm participant linkage and the right visit or timestamp.
3. Separate raw fields from calculated PAN scores.
4. Check coding, allowable values, units, range, missing-data rules, and branching.
5. For labs, imaging, sensors, and derived digital data, check the collection and processing details before calling it direct.
6. Save the source release, date, and dictionary fingerprint with the final crosswalk.

## What the dictionary cannot tell us by itself

A dictionary is useful for names, descriptions, allowed values, units, calculated fields, and some collection or QC notes. It does not fully prove matching recruitment criteria, consent, clinical adjudication, scanner protocol, biospecimen handling, assay batches, or processing pipelines. When those details are missing, the tool should say Partial or Needs review, not guess.

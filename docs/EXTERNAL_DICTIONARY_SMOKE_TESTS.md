# External Dictionary Smoke Tests

This record supplements the committed unit tests with independent, real-world dictionaries. It does not treat CohortAI-PAN output as a gold standard; each expected outcome was checked against the source field description and the PAN professor-method profile.

## ADNI Data Dictionary CSV

- Source format: ADNI `DATADIC`-style CSV supplied for testing; no ADNI data rows are committed to this repository.
- Source documentation: [ADNI data dictionary fields](https://adni.loni.usc.edu/quick-start-guide-asset101625/datadic.html).
- Relevant structure: `PHASE`, `FLDNAME`, `TBLNAME`, `CRFNAME`, `TEXT`, `CODE`, and `UNITS`.
- Expected parser behavior: use `FLDNAME` as the variable identifier and `TEXT` as its description, not `CRFNAME` as a variable name.
- Checked outcomes: `AGE` is selected for age, `PTGENDER` for sex, `APOE4`/genotype fields are preferred over APOE biomarker or glycosylation fields, and `MOCA` is selected for MoCA.

## NACC UDS v2 Data Element Dictionary PDF

- Source: [NACC UDS v2 Data Element Dictionary - IVP](https://files.alz.washington.edu/documentation/uds2-ivp-ded.pdf).
- Format: 264-page text PDF using repeated `Variable Name`, `Short Descriptor`, and `Allowable Codes` sections.
- Expected parser behavior: reconstruct named variables from form-style pages and retain descriptions/codes.
- Checked outcomes:
  - `SEX` to PAN `sex_hml`: Direct, after analyst confirmation of coding.
  - `EDUC` to PAN `edu_yrs_hml`: Direct, after confirming years-of-education meaning and range.
  - `BIRTHYR` to PAN `age_hml`: Partial, because assessment date is required to derive age.
  - No NACC UDS v2 MoCA variable: No match, not an unrelated cognitive/depression field.
  - `APOE` genotype-collected flag: No match, because availability is not genotype/e4-carrier data.

## Guardrails Added From These Tests

- CSV parser priority for meaningful field and description headers, including `FLDNAME` and `TEXT`.
- Proper RFC-style handling of quoted and multi-line CSV cells.
- Text-PDF extraction plus generic form-style dictionary parsing.
- Penalties for relatives' age at onset and other non-participant age measures.
- Rejection of APOE protein/biomarker fields and genotype-availability flags as genotype substitutes.
- Instrument-specific matching so an unrelated field is not used as a MoCA, AVLT, MMSE, or CDR substitute.

These checks are regression tests, not proof of universal validity. Any report remains decision support and requires source-document and analyst review before pooling or clinical inference.

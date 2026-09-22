# External Dictionary Smoke Tests

These are practical checks with real-world dictionary formats. They are not meant to prove that the tool will be correct for every future study. For each check, the output was compared with the source field description and the PAN harmonization rules.

## ADNI CSV

- The test used an ADNI DATADIC-style CSV. No ADNI participant data is included in this repository.
- ADNI documents the dictionary fields [here](https://adni.loni.usc.edu/quick-start-guide-asset101625/datadic.html).
- The relevant columns are PHASE, FLDNAME, TBLNAME, CRFNAME, TEXT, CODE, and UNITS.
- The parser should use FLDNAME for the variable name and TEXT for the description. It should not mistake a CRF name for the variable itself.
- The test checked that AGE is used for age, PTGENDER for sex, genotype fields such as APOE4 are preferred over APOE protein or glycosylation fields, and MOCA is used for MoCA.

## NACC UDS v2 PDF

- Source: [NACC UDS v2 Data Element Dictionary](https://files.alz.washington.edu/documentation/uds2-ivp-ded.pdf).
- This is a 264-page text PDF with repeated Variable Name, Short Descriptor, and Allowable Codes sections.
- The parser needs to rebuild variables from those form-style pages and keep the description and codes with them.
- The expected results were:
  - SEX to PAN sex_hml: direct after checking the coding.
  - EDUC to PAN edu_yrs_hml: direct after confirming it means years of education.
  - BIRTHYR to PAN age_hml: partial because a visit date is needed to calculate age.
  - No NACC UDS v2 MoCA variable: no match. A different cognitive or depression field should not be substituted.
  - An APOE genotype-collected flag: no match because it is not genotype or e4-carrier information.

## What changed because of these checks

- The CSV parser gives priority to meaningful field and description headers, including FLDNAME and TEXT.
- Quoted and multi-line CSV cells are handled correctly.
- Text PDFs and form-style dictionaries can be read.
- Relative age at onset and similar fields are penalized when the target is participant age.
- APOE biomarker fields and genotype-availability flags are not treated as APOE genotype.
- A field from a different instrument is not used as a MoCA, AVLT, MMSE, or CDR replacement just because it is loosely related.

Every report still needs source-document and analyst review before someone pools data or makes a clinical or research claim.

# CohortAI-PAN Validation Runbook

## What the app can check

The app creates a versioned crosswalk with a PAN release fingerprint, input fingerprint, match summary, unresolved-call summary, sample-overlap flag, metadata screen, and transformation notes. The included scorer can calculate the CohortAI metrics from the UACC validation protocol after independent expert labels are available.

The app cannot create expert labels, inter-rater agreement, or institutional approvals. Those have to come from the validation team.

## Before starting the benchmark

1. Freeze the release. Record the Git commit, pipeline version, PAN release label, PAN dictionary SHA-256 fingerprint, and benchmark version.
2. Build a set with the protocol difficulty groups: 15-20 easy cases, 15-20 moderate cases, 15-20 hard cases, and 5-10 edge cases.
3. Have two biostatisticians label each requested variable pair as Direct, Analogous, Partial, Supplemental, or No match. Use Needs review only when the information is truly not enough.
4. Record sample-overlap risk and the cohort-level recommendation for each case. Have a third senior reviewer resolve disagreements.
5. Calculate Cohen's kappa between the first two reviewers before using consensus as the benchmark. If kappa is below about 0.60, revisit the instructions.
6. Keep a held-out set that is not used while changing the tool.

## Benchmark file

Start with benchmarks/adjudicated-benchmark.template.json. Keep completed benchmark dictionaries and labels in an access-controlled location. The template is not a completed benchmark and should not be used to claim validation performance.

Each case should include the exact metadata the tool received and the expert label. After reading the tool output, a reviewer can also give the explanation a 1-5 quality score.

## Run the scorer

~~~bash
node scripts/run-validation.js \\
  --benchmark /secure/path/adjudicated-benchmark.json \\
  --out /secure/path/validation-results/cohortai-pan-v1.json
~~~

The results include per-category precision, recall, specificity, F1, support, and Wilson confidence intervals. They also include reviewer kappa, sample-overlap sensitivity and specificity, recommendation agreement, results by difficulty, high-risk false negatives, and missed known-overlap cases.

## Target checks

Use the targets in CohortAI_scRNASeqAI_Validation.docx:

- F1 of at least 0.80 for No match and Partial flagging, with recall treated as especially important.
- Sample-overlap sensitivity of at least 0.90 for known-overlap cases.
- Exact cohort recommendation agreement of at least 0.75.
- Mean expert explanation score of at least 4.0 out of 5.

Do not make an acceptance decision if there are too few labeled cases for a meaningful confidence interval. Keep the unresolved calls and false negatives for biostatistician review.

## Before wider deployment

- Confirm UACC authentication, HTTPS, audit logging, and a correction-feedback link.
- Confirm who owns the PAN release source and how the reference will be refreshed.
- If an external model is added later, document the provider, model version, data-handling terms, and retention policy in the report.
- Keep the tool limited to authorized metadata and data dictionaries. Do not submit subject-level records, PHI, or protected research files.

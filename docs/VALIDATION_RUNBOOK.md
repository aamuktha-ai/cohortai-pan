# CohortAI-PAN Validation Runbook

## What This Repository Can Validate

The application now produces a versioned crosswalk, PAN release fingerprint, input fingerprint, five-category match summary, unresolved-call summary, sample-overlap flag, metadata-granularity screen, and auditable transformation notes. The included runner calculates the CohortAI metrics in the UACC validation protocol once independent expert labels are available.

It cannot create independent adjudication, inter-rater agreement, or institutional approvals. Those are release gates, not software features.

## Before Benchmarking

1. Freeze the release: record the Git commit, `pipelineVersion`, PAN release label, PAN dictionary SHA-256 fingerprint, and benchmark version.
2. Build the benchmark with the protocol strata: 15-20 easy/concordant, 15-20 moderate, 15-20 hard/discordant, and 5-10 edge cases.
3. Have two biostatisticians independently label every requested variable pair using `Direct`, `Analogous`, `Partial`, `Supplemental`, or `No match`; use `Needs review` only for genuinely unresolved calls.
4. Capture sample-overlap risk and cohort recommendation for each case. Use a third senior reviewer to resolve differences.
5. Calculate Cohen's kappa between the two primary adjudicators before treating consensus as ground truth. Revise the rubric if kappa is below approximately 0.60.
6. Keep a held-out set that is not used while changing the profile or parsing rules.

## Benchmark File

Start from `benchmarks/adjudicated-benchmark.template.json`. Store completed benchmark dictionaries and labels in an access-controlled location. The template is deliberately not a labeled benchmark and cannot be used to claim validation performance.

Each case contains the exact metadata input supplied to the tool and adjudicated ground truth. Add a 1-5 explanation-quality score after a reviewer reads the tool's evidence line and rationale.

## Run the Scorer

```bash
node scripts/run-validation.js \
  --benchmark /secure/path/adjudicated-benchmark.json \
  --out /secure/path/validation-results/cohortai-pan-v1.json
```

The output includes:

- Per-category precision, recall/sensitivity, specificity, F1, support, and 95% Wilson confidence intervals.
- Cohen's kappa for independently entered rater-1 and rater-2 match labels.
- Sample-overlap sensitivity and specificity with Wilson confidence intervals.
- Cohort-recommendation exact match rate and Gwet's AC1.
- Results stratified by difficulty tier.
- High-risk false negatives: expert `Partial` or `No match` calls predicted as `Direct` or `Analogous`.
- Missed known sample-overlap cases.

## Protocol Targets

Use the targets in `CohortAI_scRNASeqAI_Validation.docx` as prespecified acceptance criteria:

- F1 at least 0.80 for `No match` and `Partial` flagging, prioritizing recall.
- Sample-overlap sensitivity at least 0.90 for known-overlap cases.
- Cohort-level recommendation exact match at least 0.75.
- Mean expert explanation-quality rating at least 4.0/5.

Do not report an acceptance decision if any target has insufficient labeled cases for a meaningful confidence interval. Report all unresolved calls and all false negatives for biostatistician review.

## Deployment Gates

- Confirm UACC authentication, HTTPS, audit logging, and a correction-feedback URL before exposing the tool beyond the validation group.
- Confirm the current PAN release source and refresh owner.
- If an external LLM is added, document the provider, endpoint/model version, institutional data-handling terms, and retention policy in every report. This release does not make an external LLM call.
- Keep the tool limited to authorized metadata/data dictionaries; do not submit subject-level records, PHI, or protected research files.

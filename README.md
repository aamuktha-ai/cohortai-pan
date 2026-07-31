# CohortAI-PAN

CohortAI-PAN is a standalone fixed-reference tool. It compares an investigator-provided data dictionary with the currently configured Precision Aging Network (PAN) data dictionary.

The PAN dictionary is never bundled into the browser or committed to this repository. The API server retrieves it from an approved server path or approved HTTPS URL and records release provenance in every report.

## Local Setup

1. Copy `.env.example` to `.env` and configure an approved reference source.
2. Set `PAN_REFERENCE_PATH` to the local approved PAN dictionary file, or set `PAN_REFERENCE_URL` to an approved HTTPS release URL.
3. Record `PAN_REFERENCE_VERSION` and `PAN_REFERENCE_RELEASE_DATE`.
4. Run:

```bash
npm run dev
```

Open `http://127.0.0.1:5180`.

## Reliable Local Startup (macOS)

For a presentation or recurring local use, install the background service once after configuring `.env`:

```bash
bash scripts/install-local-service.sh
```

It starts CohortAI-PAN at login and restarts it if it stops. The app remains available at `http://127.0.0.1:5180` without leaving a Terminal window open. Remove it with:

```bash
bash scripts/uninstall-local-service.sh
```

## API

- `GET /api/pan/reference-status`: Returns the active PAN release metadata and fingerprint, not the dictionary itself.
- `POST /api/pan/analyze`: Accepts the investigator dictionary, scientific question, targets, and authorization attestation. The server attaches the fixed current PAN reference before analysis.

The server rejects requests above 2 MB and is intended for metadata/data dictionaries only. Put production deployments behind UACC authentication, HTTPS, and audit logging. Do not put API keys, subject-level data, or the PAN dictionary in the browser or a public repository.

Inputs are processed in memory for the request and are not persisted by this application. An optional `COHORTAI_FEEDBACK_URL` can point users to an approved HTTPS correction channel.

## Updating PAN

When PAN publishes an approved new release, update the server-side source file or approved release URL, then update these settings:

```text
PAN_REFERENCE_VERSION=
PAN_REFERENCE_RELEASE_DATE=
PAN_REFERENCE_SOURCE_LABEL=
```

The next API refresh uses the new file and includes its SHA-256 fingerprint in the report provenance.

## PAN Harmonization Knowledge

See [`docs/PAN_DATA_DICTIONARY_DEEP_DIVE.md`](docs/PAN_DATA_DICTIONARY_DEEP_DIVE.md) for the reviewed PAN domain structure, collection and scoring implications, core-field rules, and the limits of what a data dictionary can establish.

See [`docs/PROFESSOR_METHOD_ALIGNMENT.md`](docs/PROFESSOR_METHOD_ALIGNMENT.md) for the implemented match taxonomy, statistical transformation rules, and validation boundary derived from the supplied reference pipeline.

See [`docs/VALIDATION_RUNBOOK.md`](docs/VALIDATION_RUNBOOK.md) for the prespecified benchmark procedure, acceptance criteria, and reproducible metrics runner.

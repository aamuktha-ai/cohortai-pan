# CohortAI-PAN

CohortAI-PAN helps someone compare their data dictionary with the Precision Aging Network (PAN) data dictionary. You upload a dictionary, choose the variables you care about, and the tool creates a crosswalk that shows what looks directly comparable, what needs harmonization, and what still needs a person to check.

It is meant for metadata and data dictionaries only. It does not use participant-level data, and it does not make a decision about data access or whether a study is ready to pool.

## What the shared link does

The public GitHub Pages version uses the public PAN snapshot in reference-data/PAN_Data_Dictionary.csv. Everything runs in the browser, so uploaded dictionaries are not sent to a server or an external model. The report includes the PAN release information and a SHA-256 fingerprint so people can see exactly which PAN snapshot was used.

The tool reads CSV, TSV, TXT, JSON, YAML, Markdown, and text-based PDF dictionaries. For CSV files, it recognizes common variable and description columns, including ADNI-style FLDNAME and TEXT. For PDFs, the text has to be selectable. A scanned PDF needs OCR or a CSV/TSV export first.

## Run it locally

~~~bash
npm run dev
~~~

Then open [http://127.0.0.1:5180](http://127.0.0.1:5180).

For regular local use on macOS, after setting up .env, you can install the local service:

~~~bash
bash scripts/install-local-service.sh
~~~

It starts the app at login and restarts it if it stops. Remove it with:

~~~bash
bash scripts/uninstall-local-service.sh
~~~

## How the PAN reference is connected

There are two versions of the PAN reference setup:

1. **GitHub Pages / public demo:** src/app.js loads reference-data/PAN_Data_Dictionary.csv and reference-data/pan-release.json. Because GitHub Pages is a static site, it cannot automatically reach into a PAN system and refresh itself while someone is using the site. A new PAN release needs to be checked, committed, and deployed.
2. **Secure server deployment:** src/panReference.js reads either PAN_REFERENCE_PATH or PAN_REFERENCE_URL from the server environment. If PAN can provide one approved, stable HTTPS release URL, the server can refresh from that URL on its configured cache schedule. This is the path to use for an institutional deployment with authentication and audit logging.

The static reference data is intentionally public in this repository. Do not use the GitHub Pages version for a PAN release that should not be public.

## Updating the public PAN snapshot

The repository includes a manual **Update PAN Reference Snapshot** GitHub Action. When PAN publishes an approved CSV or text dictionary at an HTTPS URL:

1. Open the repository on GitHub and go to **Actions**.
2. Choose **Update PAN Reference Snapshot** and click **Run workflow**.
3. Enter the approved HTTPS dictionary URL, the release version, release date, and source label.
4. The workflow downloads the file, checks that it contains usable variable records, updates the CSV and release manifest, runs the tests, and commits the update to main.
5. The existing Pages workflow deploys the new snapshot. The public link stays the same.

The update script is also available locally:

~~~bash
node scripts/update-pan-reference.js \\
  --file /path/to/new/PAN_Data_Dictionary.csv \\
  --version "PAN 2026.1" \\
  --release-date 2026-09-22 \\
  --source-label "Precision Aging Network approved data dictionary"
~~~

Use --dry-run at the end if you only want to check the source and see the proposed release information. Before using a new release, someone on the PAN side should confirm that the URL and file are the approved release.

## Secure server setup

Copy .env.example to .env, then set either a secure local path or approved HTTPS URL:

~~~text
PAN_REFERENCE_PATH=/secure/path/PAN_Data_Dictionary.csv
# or
PAN_REFERENCE_URL=https://approved-pan-source.example.org/PAN_Data_Dictionary.csv
PAN_REFERENCE_VERSION=PAN-release-id
PAN_REFERENCE_RELEASE_DATE=YYYY-MM-DD
PAN_REFERENCE_SOURCE_LABEL=Precision Aging Network approved data dictionary
PAN_REFERENCE_CACHE_MINUTES=60
~~~

For production, put the server behind UACC authentication, HTTPS, and audit logging. The API only keeps the submitted dictionary in memory for the request. Do not send subject-level data, PHI, credentials, or private PAN files through the public site.

## Project notes

- [PAN data dictionary notes](docs/PAN_DATA_DICTIONARY_DEEP_DIVE.md)
- [How the professor-method rules are used](docs/PROFESSOR_METHOD_ALIGNMENT.md)
- [Validation runbook](docs/VALIDATION_RUNBOOK.md)
- [External dictionary smoke tests](docs/EXTERNAL_DICTIONARY_SMOKE_TESTS.md)
- [Short project summary](docs/CLASSROOM_TOOL_SUMMARY.md)

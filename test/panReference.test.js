import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { analyzeFeasibility } from "../src/analysisEngine.js";
import { clearPanReferenceCache, loadPanReference } from "../src/panReference.js";

const fixturePath = new URL("./fixtures/pan-reference.csv", import.meta.url);

test("PAN reference loader records approved-file provenance without exposing it in configuration", async () => {
  clearPanReferenceCache();
  const reference = await loadPanReference({
    referencePath: fixturePath,
    version: "test-release",
    releaseDate: "2026-07-27",
    sourceLabel: "Approved PAN test dictionary",
    cacheMinutes: 0
  });

  assert.match(reference.candidateDatasets, /Precision Aging Network \(PAN\)/);
  assert.equal(reference.status.version, "test-release");
  assert.match(reference.status.dictionarySha256, /^[a-f0-9]{64}$/);
  assert.equal(reference.status.sourceType, "approved server file");
});

test("PAN API analysis input can compare a local dictionary with a server-side reference", async () => {
  const panDictionary = await readFile(fixturePath, "utf8");
  const report = analyzeFeasibility({
    question: "Can age and education be harmonized?",
    diseaseArea: "Aging",
    analysisGoal: "harmonized-pooling",
    variables: "age, education",
    localDataset: "variable,description,units\nage,Age at baseline visit,years\neducation_years,Years of formal education,years",
    candidateDatasets: `### Precision Aging Network (PAN)\n${panDictionary}`,
    userAttestation: true
  });

  assert.equal(report.candidateCount, 1);
  assert.equal(report.crosswalk[0].publicVariable, "age_hml");
  assert.equal(report.crosswalk[1].publicVariable, "edu_yrs_hml");
});

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

test("PDF-text dictionaries retain repeated field names within their source domains", () => {
  const report = analyzeFeasibility({
    question: "Compare MoCA fields",
    diseaseArea: "Aging",
    analysisGoal: "harmonized-pooling",
    variables: "moca",
    localDataset: "variable,description\nmoca_score,Montreal Cognitive Assessment total score",
    candidateDatasets: [
      "page,text",
      "1,MoCA",
      "1,↑",
      "1,Fields: 2",
      "1,moca_total",
      "1,Description: Montreal Cognitive Assessment total score",
      "2,Alternate cognitive assessment",
      "2,↑",
      "2,Fields: 2",
      "2,moca_total",
      "2,Description: Alternate cognitive screening total"
    ].join("\n"),
    userAttestation: true
  });

  assert.equal(report.provenance.dictionaryParsing[1].recordCount, 2);
  assert.match(report.crosswalk[0].publicDescription, /MoCA/);
});

test("PAN core profile prefers HML multi-select race fields over generic parallel fields", () => {
  const report = analyzeFeasibility({
    question: "Compare race capture",
    diseaseArea: "Aging",
    analysisGoal: "harmonized-pooling",
    variables: "race",
    localDataset: "variable,description,values\nrace,Self-reported single-choice race,White; Black; Asian; Other",
    candidateDatasets: [
      "### Precision Aging Network (PAN)",
      "page,text",
      "1,HML_Demographics",
      "1,↑",
      "1,Fields: 2",
      "1,race_hml_1",
      "1,Description: Race: American Indian or Alaska Native",
      "1,Field Options: 0- No, 1- Yes",
      "2,MindCrowd_Demographics",
      "2,↑",
      "2,Fields: 2",
      "2,race",
      "2,Description: Race"
    ].join("\n"),
    userAttestation: true
  });

  assert.equal(report.crosswalk[0].publicVariable, "race_hml_1");
  assert.equal(report.crosswalk[0].matchType, "Partial");
});

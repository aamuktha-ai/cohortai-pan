import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { analyzeFeasibility, matchTypes, parseDictionary } from "../src/analysisEngine.js";
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

test("ADNI structured CSV uses FLDNAME and TEXT rather than form labels", () => {
  const adniDictionary = [
    '"PHASE","CRFNAME","TBLNAME","FLDNAME","TEXT","TYPE","LENGTH","CODE","UNITS"',
    '"ADNI1","ADNI Cognitive","ADASCog","AGE","Age at baseline assessment","N","3","","years"',
    '"ADNI1","ADNI Participant","PTDEMOG","PTGENDER","Biological sex assigned at birth","T","1","1=Male;2=Female",""',
    '"ADNI1","ADNI Biomarker","CSF","APOEG","APOE glycosylation in ADNI CSF","N","8","","pg/mL"',
    '"ADNI1","ADNI Genetics","APOERES","APGEN1","APOE genotype allele 1","T","2","e2;e3;e4",""',
    '"ADNI1","ADNI Cognitive","MOCA","MOCA","Montreal Cognitive Assessment total score","N","2","","0-30"'
  ].join("\n");
  const records = parseDictionary(adniDictionary, "ADNI");

  assert.equal(records.find((record) => record.variable === "AGE")?.description, "Age at baseline assessment");
  assert.equal(records.find((record) => record.variable === "PTGENDER")?.description, "Biological sex assigned at birth");

  const report = analyzeFeasibility({
    question: "Can ADNI age, sex, APOE, and MoCA be compared?",
    diseaseArea: "Cognition",
    analysisGoal: "direct-comparison",
    variables: "age, sex, APOE, MoCA",
    localDataset: adniDictionary,
    candidateDatasets: [
      "### Precision Aging Network (PAN)",
      "variable,description,units",
      "age_hml,Current age at assessment,years",
      "sex_hml,Biological sex assigned at birth,",
      "apoe_status,APOE genotype status,",
      "moca_total,Montreal Cognitive Assessment total score,0-30"
    ].join("\n"),
    userAttestation: true
  });

  assert.equal(report.crosswalk.find((row) => row.targetVariable === "age")?.localVariable, "AGE");
  assert.equal(report.crosswalk.find((row) => row.targetVariable === "sex")?.localVariable, "PTGENDER");
  assert.equal(report.crosswalk.find((row) => row.targetVariable === "APOE")?.localVariable, "APGEN1");
  assert.equal(report.crosswalk.find((row) => row.targetVariable === "APOE")?.matchType, "Direct");
  assert.equal(report.crosswalk.find((row) => row.targetVariable === "MoCA")?.localVariable, "MOCA");
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
  assert.equal(report.crosswalk[0].matchType, "Analogous");
  assert.match(report.crosswalk[0].transformationRule, /NIH-style race crosswalk/);
});

test("professor-method profile keeps the five-category taxonomy and attaches a proposed transform", () => {
  const report = analyzeFeasibility({
    question: "Can age be pooled?",
    diseaseArea: "Aging",
    analysisGoal: "harmonized-pooling",
    variables: "age",
    localDataset: "variable,description,units\nage_years,Age at baseline assessment,years",
    candidateDatasets: "### Precision Aging Network (PAN)\nvariable,description,units\nage_hml,Current age at HML assessment,years",
    userAttestation: true
  });

  assert.deepEqual(matchTypes, ["Direct", "Analogous", "Partial", "Supplemental", "No match"]);
  assert.equal(report.crosswalk[0].matchType, "Direct");
  assert.equal(report.crosswalk[0].proposedHarmonizedVariable, "dem_age");
  assert.match(report.crosswalk[0].transformationRule, /assessment visit/);
});

test("inferred cohort-only variables are reported as Supplemental", () => {
  const report = analyzeFeasibility({
    question: "Review the available metadata",
    diseaseArea: "Aging",
    analysisGoal: "harmonized-pooling",
    variables: "",
    localDataset: "variable,description\nresearcher_note,Local investigator note for cohort context",
    candidateDatasets: "### Precision Aging Network (PAN)\nvariable,description,units\nage_hml,Current age at HML assessment,years",
    userAttestation: true
  });

  assert.equal(report.crosswalk.find((row) => row.targetVariable === "researcher_note").matchType, "Supplemental");
});

test("ambiguous source definitions are held for review instead of forced into the taxonomy", () => {
  const report = analyzeFeasibility({
    question: "Can tumor stage be compared?",
    diseaseArea: "Cancer",
    analysisGoal: "harmonized-pooling",
    variables: "stage",
    localDataset: "variable,description\nstage,Unknown tumor stage definition",
    candidateDatasets: "### Precision Aging Network (PAN)\nvariable,description\nstage,Unknown clinical stage definition",
    userAttestation: true
  });

  assert.equal(report.crosswalk[0].matchType, "Needs review");
  assert.equal(report.reviewSummary.unresolvedCount, 1);
  assert.equal(report.matchSummary.reduce((sum, item) => sum + item.count, 0), 0);
});

test("metadata disclosure screen flags multiple granular detail signals", () => {
  const report = analyzeFeasibility({
    question: "Can age be compared?",
    diseaseArea: "Rare disease",
    analysisGoal: "direct-comparison",
    variables: "age",
    localDataset: "variable,description,units\nage_years,Age from rare disease recruitment site; n=5,years",
    candidateDatasets: "### Precision Aging Network (PAN)\nvariable,description,units\nage_hml,Current age at HML assessment,years",
    userAttestation: true
  });

  assert.equal(report.metadataDisclosureRisk.level, "Review recommended");
});

test("professor-method profile treats GDS and PHQ-9 as analogous with a binary derivation", () => {
  const report = analyzeFeasibility({
    question: "Can depression be harmonized?",
    diseaseArea: "Aging",
    analysisGoal: "harmonized-pooling",
    variables: "depression",
    localDataset: "variable,description,units\ngds_total,Geriatric Depression Scale 15 total score,0-15 score",
    candidateDatasets: "### Precision Aging Network (PAN)\nvariable,description,units\nphq9_total,Patient Health Questionnaire 9 total score,0-27 score",
    userAttestation: true
  });

  assert.equal(report.crosswalk[0].matchType, "Analogous");
  assert.match(report.crosswalk[0].transformationRule, /GDS-15 >= 6 or PHQ-9 >= 10/);
  assert.equal(report.crosswalk[0].reviewerStatus, "Needs human review");
});

test("professor-method profile rejects APOE protein as a substitute for genotype", () => {
  const report = analyzeFeasibility({
    question: "Can APOE be pooled?",
    diseaseArea: "Aging",
    analysisGoal: "harmonized-pooling",
    variables: "apoe",
    localDataset: "variable,description,units\napoe4_protein,APOE4 protein concentration measured by assay,pg/mL",
    candidateDatasets: "### Precision Aging Network (PAN)\nvariable,description,values\napoe_status,APOE genotype status,e2e2; e2e3; e2e4; e3e3; e3e4; e4e4",
    userAttestation: true
  });

  assert.equal(report.crosswalk[0].matchType, "No match");
  assert.match(report.crosswalk[0].rationale, /protein.*genotype/i);
});

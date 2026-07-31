import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { analyzeFeasibility, pipelineVersion } from "../src/analysisEngine.js";
import { scoreValidationResults } from "../src/validationMetrics.js";

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? "" : process.argv[index + 1] || "";
}

function usage() {
  console.log("Usage: node scripts/run-validation.js --benchmark benchmarks/adjudicated-benchmark.json --out validation-results/report.json");
}

function findCrosswalkRow(report, expectedPair) {
  return report.crosswalk.find((row) => row.targetVariable === expectedPair.targetVariable && (!expectedPair.candidateCohort || row.candidateCohort === expectedPair.candidateCohort));
}

const benchmarkPath = readArgument("--benchmark");
const outputPath = readArgument("--out");
if (!benchmarkPath || !outputPath || process.argv.includes("--help")) {
  usage();
  process.exit(process.argv.includes("--help") ? 0 : 1);
}

const benchmark = JSON.parse(await readFile(resolve(benchmarkPath), "utf8"));
const results = (benchmark.cases || []).map((testCase) => {
  const report = analyzeFeasibility({ ...testCase.input, userAttestation: true });
  const pairs = (testCase.groundTruth?.variablePairs || []).map((expectedPair) => {
    const row = findCrosswalkRow(report, expectedPair);
    return {
      caseId: testCase.id,
      targetVariable: expectedPair.targetVariable,
      expected: expectedPair.matchType,
      actual: row?.matchType || "Not returned",
      rater1: expectedPair.rater1MatchType || "",
      rater2: expectedPair.rater2MatchType || "",
      evidence: row?.publicEvidenceLine || ""
    };
  });
  return {
    caseId: testCase.id,
    stratum: testCase.stratum,
    pairs,
    overlap: testCase.groundTruth?.sampleOverlapRisk
      ? { expected: testCase.groundTruth.sampleOverlapRisk, actual: report.sampleOverlapRisk.level }
      : null,
    recommendation: testCase.groundTruth?.recommendation
      ? { expected: testCase.groundTruth.recommendation, actual: report.recommendation }
      : null,
    explanationRatings: testCase.groundTruth?.explanationRatings || []
  };
});

const summary = scoreValidationResults(results, {
  benchmarkVersion: benchmark.metadata?.benchmarkVersion,
  adjudicationStatus: benchmark.metadata?.adjudicationStatus,
  pipelineVersion
});
const artifact = { generatedAt: new Date().toISOString(), summary, results };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`Wrote ${resolve(outputPath)}`);

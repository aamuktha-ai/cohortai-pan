import assert from "node:assert/strict";
import test from "node:test";
import { classificationMetrics, cohenKappa, gwetAc1, scoreValidationResults, wilsonInterval } from "../src/validationMetrics.js";

test("Wilson interval and classification metrics are reproducible", () => {
  assert.deepEqual(wilsonInterval(8, 10), { lower: 0.49, upper: 0.943 });
  const metrics = classificationMetrics([
    { expected: "Direct", actual: "Direct" },
    { expected: "Partial", actual: "Partial" },
    { expected: "Partial", actual: "Direct" }
  ]);
  assert.equal(metrics.total, 3);
  assert.equal(metrics.byCategory.Partial.recall, 0.5);
  assert.equal(metrics.byCategory.Direct.falsePositive, 1);
});

test("validation scorer identifies high-risk and overlap false negatives", () => {
  const score = scoreValidationResults([
    {
      stratum: "Hard / discordant",
      pairs: [{ expected: "No match", actual: "Direct", targetVariable: "apoe" }],
      overlap: { expected: "Likely", actual: "None expected" },
      recommendation: { expected: "Not poolable", actual: "Direct comparison" },
      explanationRatings: [4, 5]
    }
  ], { benchmarkVersion: "test-v1", pipelineVersion: "cohortai-pan-1.0", adjudicationStatus: "adjudicated" });

  assert.equal(score.highRiskErrors.length, 1);
  assert.equal(score.overlapFalseNegatives.length, 1);
  assert.equal(score.explanationQuality.mean, 4.5);
  assert.equal(score.stratified["Hard / discordant"].caseCount, 1);
});

test("Gwet AC1 handles two equally sized label streams", () => {
  assert.equal(gwetAc1(["Direct", "Partial", "No match"], ["Direct", "Partial", "Analogous"], ["Direct", "Analogous", "Partial", "No match"]), 0.561);
  assert.equal(cohenKappa(["Direct", "Partial", "No match"], ["Direct", "Partial", "Analogous"], ["Direct", "Analogous", "Partial", "No match"]), 0.571);
});

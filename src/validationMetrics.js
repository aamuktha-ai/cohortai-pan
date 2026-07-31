const defaultMatchTypes = ["Direct", "Analogous", "Partial", "Supplemental", "No match"];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function rounded(value, digits = 3) {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

export function wilsonInterval(successes, total, z = 1.96) {
  if (!total) return null;
  const proportion = successes / total;
  const denominator = 1 + (z ** 2) / total;
  const centre = (proportion + (z ** 2) / (2 * total)) / denominator;
  const margin = (z / denominator) * Math.sqrt((proportion * (1 - proportion)) / total + (z ** 2) / (4 * total ** 2));
  return { lower: rounded(clamp(centre - margin, 0, 1)), upper: rounded(clamp(centre + margin, 0, 1)) };
}

export function classificationMetrics(records, categories = defaultMatchTypes) {
  const total = records.length;
  const exact = records.filter((record) => record.expected === record.actual).length;
  const byCategory = Object.fromEntries(categories.map((category) => [category, {}]));

  categories.forEach((category) => {
    const truePositive = records.filter((record) => record.expected === category && record.actual === category).length;
    const falsePositive = records.filter((record) => record.expected !== category && record.actual === category).length;
    const falseNegative = records.filter((record) => record.expected === category && record.actual !== category).length;
    const trueNegative = total - truePositive - falsePositive - falseNegative;
    const precision = truePositive + falsePositive ? truePositive / (truePositive + falsePositive) : null;
    const recall = truePositive + falseNegative ? truePositive / (truePositive + falseNegative) : null;
    const specificity = trueNegative + falsePositive ? trueNegative / (trueNegative + falsePositive) : null;
    const f1 = precision !== null && recall !== null && precision + recall ? (2 * precision * recall) / (precision + recall) : null;
    byCategory[category] = {
      support: truePositive + falseNegative,
      truePositive,
      falsePositive,
      falseNegative,
      trueNegative,
      precision: rounded(precision),
      recall: rounded(recall),
      specificity: rounded(specificity),
      f1: rounded(f1),
      recall95Ci: wilsonInterval(truePositive, truePositive + falseNegative)
    };
  });

  return {
    total,
    exactMatches: exact,
    exactMatchRate: rounded(total ? exact / total : null),
    exactMatch95Ci: wilsonInterval(exact, total),
    byCategory
  };
}

export function gwetAc1(expected, actual, categories) {
  if (!expected.length || expected.length !== actual.length) return null;
  const total = expected.length;
  const observed = expected.filter((value, index) => value === actual[index]).length / total;
  const k = categories.length;
  if (k < 2) return null;
  const chance = categories.reduce((sum, category) => {
    const first = expected.filter((value) => value === category).length / total;
    const second = actual.filter((value) => value === category).length / total;
    const average = (first + second) / 2;
    return sum + average * (1 - average);
  }, 0) / (k - 1);
  return rounded((observed - chance) / (1 - chance));
}

export function cohenKappa(firstRater, secondRater, categories) {
  if (!firstRater.length || firstRater.length !== secondRater.length) return null;
  const total = firstRater.length;
  const observed = firstRater.filter((value, index) => value === secondRater[index]).length / total;
  const expected = categories.reduce((sum, category) => {
    const first = firstRater.filter((value) => value === category).length / total;
    const second = secondRater.filter((value) => value === category).length / total;
    return sum + first * second;
  }, 0);
  return rounded((observed - expected) / (1 - expected));
}

function positiveOverlap(level) {
  return ["Possible", "Likely"].includes(level);
}

function scoreOverlap(records) {
  const positive = records.filter((record) => positiveOverlap(record.expected));
  const detected = positive.filter((record) => positiveOverlap(record.actual)).length;
  const negative = records.filter((record) => !positiveOverlap(record.expected));
  const correctNegative = negative.filter((record) => !positiveOverlap(record.actual)).length;
  return {
    total: records.length,
    knownOverlapCases: positive.length,
    detectedKnownOverlapCases: detected,
    sensitivity: rounded(positive.length ? detected / positive.length : null),
    sensitivity95Ci: wilsonInterval(detected, positive.length),
    specificity: rounded(negative.length ? correctNegative / negative.length : null),
    specificity95Ci: wilsonInterval(correctNegative, negative.length)
  };
}

function scoreRecommendations(records) {
  const expected = records.map((record) => record.expected);
  const actual = records.map((record) => record.actual);
  const exact = records.filter((record) => record.expected === record.actual).length;
  const categories = [...new Set([...expected, ...actual])].filter(Boolean);
  return {
    total: records.length,
    exactMatches: exact,
    exactMatchRate: rounded(records.length ? exact / records.length : null),
    exactMatch95Ci: wilsonInterval(exact, records.length),
    gwetAc1: gwetAc1(expected, actual, categories)
  };
}

function emptyScore() {
  return { total: 0, note: "No adjudicated labels were supplied for this task." };
}

export function scoreValidationResults(results, metadata = {}) {
  const pairRecords = results.flatMap((result) => result.pairs || []);
  const overlapRecords = results.filter((result) => result.overlap?.expected && result.overlap?.actual).map((result) => result.overlap);
  const recommendationRecords = results.filter((result) => result.recommendation?.expected && result.recommendation?.actual).map((result) => result.recommendation);
  const humanRatings = results.flatMap((result) => result.explanationRatings || []).filter(Number.isFinite);
  const raterPairs = pairRecords.filter((record) => record.rater1 && record.rater2);
  const strata = [...new Set(results.map((result) => result.stratum).filter(Boolean))];

  return {
    benchmarkVersion: metadata.benchmarkVersion || "Unspecified",
    pipelineVersion: metadata.pipelineVersion || "Unspecified",
    adjudicationStatus: metadata.adjudicationStatus || "not recorded",
    caseCount: results.length,
    variablePairCount: pairRecords.length,
    matchTypeClassification: pairRecords.length ? classificationMetrics(pairRecords) : emptyScore(),
    interRaterAgreement: raterPairs.length
      ? {
          variablePairCount: raterPairs.length,
          cohenKappa: cohenKappa(raterPairs.map((record) => record.rater1), raterPairs.map((record) => record.rater2), defaultMatchTypes)
        }
      : emptyScore(),
    sampleOverlapRisk: overlapRecords.length ? scoreOverlap(overlapRecords) : emptyScore(),
    cohortRecommendation: recommendationRecords.length ? scoreRecommendations(recommendationRecords) : emptyScore(),
    explanationQuality: humanRatings.length
      ? { n: humanRatings.length, mean: rounded(humanRatings.reduce((sum, rating) => sum + rating, 0) / humanRatings.length, 2) }
      : emptyScore(),
    stratified: Object.fromEntries(strata.map((stratum) => {
      const subset = results.filter((result) => result.stratum === stratum);
      const subsetPairs = subset.flatMap((result) => result.pairs || []);
      return [stratum, {
        caseCount: subset.length,
        variablePairCount: subsetPairs.length,
        matchTypeClassification: subsetPairs.length ? classificationMetrics(subsetPairs) : emptyScore()
      }];
    })),
    highRiskErrors: pairRecords.filter((record) => ["Partial", "No match"].includes(record.expected) && ["Direct", "Analogous"].includes(record.actual)),
    overlapFalseNegatives: overlapRecords.filter((record) => positiveOverlap(record.expected) && !positiveOverlap(record.actual))
  };
}

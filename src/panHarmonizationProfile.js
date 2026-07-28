export const panProfileVersion = "2026-07-27.2";

// This profile is a machine-readable implementation of the supplied ADNI x NACC x
// PAN harmonization pipeline. It expresses the decision rules, not a fixed list of
// source-cohort variable names, so an investigator dictionary can be evaluated on
// its definitions, coding, timing, and measurement context.
const professorRules = {
  age: {
    panVariables: ["age_hml"],
    harmonizedVariable: "dem_age",
    expectedMatch: "Direct",
    transform: "Retain continuous age in years at the assessment visit.",
    review: "Confirm that both cohorts use the same visit/time anchor."
  },
  sex: {
    panVariables: ["sex_hml"],
    harmonizedVariable: "dem_sex",
    expectedMatch: "Direct",
    transform: "Recode biological sex to a documented common binary coding only when source coding is known.",
    review: "Confirm the investigator field measures biological sex rather than gender identity."
  },
  education: {
    panVariables: ["edu_yrs_hml"],
    harmonizedVariable: "dem_edu_yrs",
    expectedMatch: "Direct",
    transform: "Retain continuous years of formal education.",
    review: "Check range, missingness, and whether education is years rather than an ordinal category."
  },
  bmi: {
    panVariables: ["bmi", "bio_weight", "bio_height"],
    harmonizedVariable: "dem_bmi",
    expectedMatch: "Analogous",
    transform: "Use BMI as kg/m^2 or derive it from weight and height after unit conversion; retain the derivation in provenance.",
    review: "Confirm units, measurement protocol, visit, and plausible range before pooling."
  },
  race: {
    panVariables: ["race_hml_1", "race_hml_2", "race_hml_3", "race_hml_4", "race_hml_5", "race_hml_555"],
    harmonizedVariable: "dem_race_nih",
    expectedMatch: "Analogous",
    transform: "Map source categories to a documented NIH-style race crosswalk and preserve a separate Hispanic/Latino flag plus a multi-racial/unknown policy.",
    review: "PAN race is multi-select; do not silently collapse it to a single-choice local category."
  },
  apoe: {
    panVariables: ["apoe_status", "rs429358", "rs7412"],
    harmonizedVariable: "dem_apoe_dose; dem_apoe_carrier",
    expectedMatch: "Direct",
    transform: "Convert genotype to e4 dosage (0/1/2) and e4-carrier status (0/1) with the derivation recorded.",
    review: "Use genotype fields only. APOE protein measurements are not a substitute for genotype."
  },
  moca: {
    panVariables: ["moca_total"],
    harmonizedVariable: "cog_moca; cog_moca_source; cog_moca_bl",
    expectedMatch: "Direct",
    transform: "Use the MoCA total after documenting the administration and education-bonus policy; retain a direct-versus-converted source flag.",
    review: "An MMSE-derived MoCA equivalent is not the same as a directly administered MoCA and must be labeled as converted."
  },
  avlt: {
    panVariables: ["avlt_trial_a1_raw", "avlt_trial_a7_raw", "avlt_list_a_raw", "avlt_recognition_raw"],
    harmonizedVariable: "cog_avlt_imm; cog_avlt_t1; cog_avlt_delay; cog_avlt_recog",
    expectedMatch: "Partial",
    transform: "Keep immediate total, trial 1, delayed recall, and recognition as separate outcomes; do not substitute a different memory instrument as a raw score.",
    review: "Confirm trial structure and whether immediate recall is the sum of trials 1-5."
  },
  depression: {
    panVariables: ["phq9_total"],
    harmonizedVariable: "cog_dep_binary",
    expectedMatch: "Analogous",
    transform: "For GDS versus PHQ-9, derive a documented depression indicator (GDS-15 >= 6 or PHQ-9 >= 10) rather than pooling raw scores.",
    review: "Do not label different depression instruments as a direct raw-score match."
  },
  hypertension: { panVariables: ["hm_v1031"], harmonizedVariable: "cmb_hypertension", expectedMatch: "Direct", transform: "Recode documented source values to binary 0/1.", review: "Confirm the condition definition and coding." },
  diabetes: { panVariables: ["hm_v109"], harmonizedVariable: "cmb_diabetes", expectedMatch: "Direct", transform: "Recode documented source values to binary 0/1.", review: "Confirm the condition definition and coding." },
  cancer: { panVariables: ["hm_v108"], harmonizedVariable: "cmb_cancer", expectedMatch: "Direct", transform: "Recode documented source values to binary 0/1.", review: "Confirm the condition definition and coding." },
  stroke: { panVariables: ["hm_v1038", "bd_v1063_1"], harmonizedVariable: "cmb_stroke", expectedMatch: "Direct", transform: "Create a binary indicator and cross-check the health-medical and brain-disease survey sources when both exist.", review: "Flag discordant source fields rather than overwriting them silently." },
  smoking: { panVariables: ["hm_v1047", "hm_v1050"], harmonizedVariable: "sub_smoking_current; sub_smoking_ever", expectedMatch: "Direct", transform: "Derive current and ever smoking as separate binary variables.", review: "Confirm source categories distinguish current, former, and never use." },
  "trail making test a": { panVariables: [], harmonizedVariable: "cog_trails_a", expectedMatch: "No match", transform: "PAN does not provide a directly comparable Trails A outcome in the reviewed reference dictionary.", review: "Do not infer equivalence from a broad cognitive domain label." },
  "trail making test b": { panVariables: [], harmonizedVariable: "cog_trails_b", expectedMatch: "No match", transform: "PAN does not provide a directly comparable Trails B outcome in the reviewed reference dictionary.", review: "Do not infer equivalence from a broad cognitive domain label." },
  mmse: { panVariables: [], harmonizedVariable: "cog_mmse", expectedMatch: "No match", transform: "PAN does not collect MMSE as a raw harmonized outcome.", review: "Do not treat a converted MoCA equivalent as a direct MMSE match." },
  "cdr sum of boxes": { panVariables: [], harmonizedVariable: "cog_cdr_sb", expectedMatch: "No match", transform: "PAN does not provide a directly comparable CDR Sum of Boxes outcome in the reviewed reference dictionary.", review: "A broader clinical-status variable is not a raw CDR-SB substitute." },
  "interleukin 6": { panVariables: ["IL_6"], harmonizedVariable: "cyt_il6_log", expectedMatch: "Analogous", transform: "Apply a documented non-negative log transformation and cross-platform normalization before comparison.", review: "Assay platform and limit-of-detection handling are required evidence." },
  "tumor necrosis factor alpha": { panVariables: ["TNFa"], harmonizedVariable: "cyt_tnfa_log", expectedMatch: "Analogous", transform: "Apply a documented non-negative log transformation and cross-platform normalization before comparison.", review: "Assay platform and limit-of-detection handling are required evidence." },
  "interleukin 10": { panVariables: ["IL_10"], harmonizedVariable: "cyt_il10_log", expectedMatch: "Analogous", transform: "Apply a documented non-negative log transformation and cross-platform normalization before comparison.", review: "Assay platform and limit-of-detection handling are required evidence." },
  crp: { panVariables: ["crp_high_sensitivity"], harmonizedVariable: "cyt_crp_log", expectedMatch: "Analogous", transform: "Apply a documented non-negative log transformation and cross-platform normalization before comparison.", review: "PAN and external cohorts may use different CRP assay platforms." }
};

const coreRules = {
  age: {
    variables: ["age_hml"],
    domains: ["HML_Demographics"],
    collection: "HML demographics question: current age; retain the visit/timepoint used for comparison.",
    harmonization: "Compare only after confirming the local age anchor matches PAN's assessment visit."
  },
  sex: {
    variables: ["sex_hml"],
    domains: ["HML_Demographics"],
    collection: "HML demographics question: biological sex.",
    harmonization: "Do not substitute downstream genetic or polygenic-study sex fields for the core HML demographic field."
  },
  education: {
    variables: ["edu_yrs_hml"],
    domains: ["HML_Demographics"],
    collection: "HML validated years-of-education field with an indicated 0-100 range.",
    harmonization: "Confirm local education is years of formal education, then screen for implausible values and missingness."
  },
  race: {
    variables: ["race_hml_1", "race_hml_2", "race_hml_3", "race_hml_4", "race_hml_5", "race_hml_555"],
    domains: ["HML_Demographics"],
    collection: "PAN records race as separate binary indicators plus an Other specification field; it also has a screening race/ethnicity variable.",
    harmonization: "Treat this as multi-select race capture. Create a documented crosswalk to any single-choice local race category and retain a multi-racial/unknown policy."
  },
  moca: {
    variables: ["moca_total"],
    domains: ["MoCA"],
    collection: "PAN MoCA total is calculated from component scores and includes an education bonus when education is 12 years or fewer.",
    harmonization: "Align administration version and decide whether to compare the education-adjusted total, reconstruct an unadjusted total, or adjust analytically."
  },
  apoe: {
    variables: ["apoe_status"],
    domains: ["APOE4"],
    collection: "PAN APOE status is genotype-based and is accompanied by rs429358 and rs7412 calls.",
    harmonization: "Use genotype status or an explicitly derived e4-carrier definition. Do not substitute an APOE protein measurement from a biomarker panel."
  },
  depression: {
    variables: ["phq9_total"],
    domains: ["PHQ9"],
    collection: "PAN stores a PHQ-9 total and separate question-9 endorsement flag.",
    harmonization: "Use the total only against the same PHQ-9 scoring definition; preserve question-9 handling as a safety-related secondary field."
  },
  bmi: {
    variables: ["bmi"],
    domains: ["Biometrics"],
    collection: "PAN biometrics include height, weight, body composition, and repeated blood-pressure measurements.",
    harmonization: "Confirm whether BMI is supplied or reconstructed, and document units, measurement protocol, and visit."
  }
};

export const panDomainGroups = [
  {
    name: "Core participant and longitudinal structure",
    domains: ["HML_Demographics", "HML_Eligibility", "MindCrowd_Demographics", "Full_MindCrowd_Data"],
    harmonization: "Use hml_id as the PAN participant key, preserve mindcrowd_id as a linked source identifier, and align visit and timestamps before pooling."
  },
  {
    name: "Cognition and mental health",
    domains: ["AVLT", "MoCA", "NAART", "PHQ9", "MindCrowd_Flanker_Scores", "MindCrowd_Keep_Track_Scores", "MindCrowd_Letter_Number_Scores", "MindCrowd_Simple_and_Choice_Scores", "MindCrowd_Verbal_Paired_Associates_Scores"],
    harmonization: "Do not pool different cognitive instruments as raw values. Use instrument-aware derived scores, standardized scores, or a documented crosswalk."
  },
  {
    name: "Questionnaires and derived scores",
    domains: ["HML_Scored_Surveys", "ADL_Survey", "Anxiety_Survey_Raw_Data", "Perceived_Stress_Raw_Data", "Sleep_Survey_Raw_Data", "QPAR_Survey_Raw_Data", "Social_Stressor_Raw_Data", "Social_Support_Raw_Data", "SWLS_Survey_Raw_Data"],
    harmonization: "Distinguish raw item-level fields from PAN calculated totals; preserve scoring version, branching, and date/visit context."
  },
  {
    name: "Clinical, biometrics, and laboratory measures",
    domains: ["Biometrics", "Health_Intake", "Health_Medical_Survey", "AD_Plasma_Biomarkers", "APOE4", "Epigenetic_Clocks", "Millipore_Cytokine_Assay", "NULISAseq", "Polygenic_Risk_Scores", "Sonora_Quest_Blood_Chemistries", "Cortisol"],
    harmonization: "Require assay/platform, unit, transformation, collection date, and QC/limit-of-detection policy before direct comparison."
  },
  {
    name: "Imaging, sensor, and physical-function measures",
    domains: ["Carotid_Ultrasound", "LabFront_Garmin", "GeMAPS", "UEF_Frailty", "MRI_Anatomic_Measures", "MRI_Diffusion_Imaging", "MRI_Perfusion_ASL", "Resting_State_fMRI", "Resting_State_fMRI_corticocereb", "Resting_State_fMRI_wholebrain", "White_Matter_Hyperintensities"],
    harmonization: "Treat acquisition protocol, preprocessing pipeline, region/atlas definition, valid-recording rule, and units as required compatibility evidence."
  }
];

function normalized(value) {
  return String(value || "").toLowerCase().replace(/[_/-]+/g, " ").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function getPanCoreRule(target, variable = "") {
  const targetKey = Object.keys(coreRules).find((key) => normalized(target).includes(key));
  if (!targetKey) return null;
  const rule = coreRules[targetKey];
  if (variable && !rule.variables.includes(variable)) return null;
  return { key: targetKey, ...rule };
}

export function getProfessorRule(target, variable = "") {
  const targetText = normalized(target);
  const matchingKey = Object.keys(professorRules).find((key) => targetText.includes(key));
  if (!matchingKey) return null;
  const rule = professorRules[matchingKey];
  if (variable && rule.panVariables.length && !rule.panVariables.includes(variable)) return null;
  return { key: matchingKey, ...rule };
}

export function panReferencePreference(record, target) {
  if (normalized(record.cohortLabel) !== "precision aging network pan") return 0;
  const rule = getPanCoreRule(target);
  if (!rule) return 0;
  if (rule.variables.includes(record.variable)) return 0.24;
  if (rule.domains.includes(record.domain)) return 0.08;
  return 0;
}

export function enrichPanCrosswalk(report) {
  report.crosswalk = report.crosswalk.map((row) => {
    const rule = getPanCoreRule(row.targetVariable, row.publicVariable);
    if (!rule) return row;
    return {
      ...row,
      panDomain: rule.domains.join(", "),
      panCollectionContext: rule.collection,
      panHarmonizationNote: rule.harmonization,
      rationale: `${row.rationale} PAN context: ${rule.harmonization}`
    };
  });
  return report;
}

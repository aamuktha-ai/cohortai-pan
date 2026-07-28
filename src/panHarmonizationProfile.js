export const panProfileVersion = "2026-07-27.1";

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

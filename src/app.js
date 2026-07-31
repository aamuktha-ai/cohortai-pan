const sample = {
  question: "Which investigator variables can be compared or harmonized with the current PAN reference release?",
  diseaseArea: "Aging and dementia research",
  analysisGoal: "harmonized-pooling",
  localDataset: "local_age: Age at baseline visit in years\nsex: Sex assigned at birth, coded female/male\neducation_years: Years of formal education\nrace: Self-reported race\nmoca_score: Montreal Cognitive Assessment total score, 0-30\ntrail_a_seconds: Trail Making Test Part A completion time in seconds",
  variables: "age, sex, education, race, moca, trail making test a"
};

let latestReport = null;
let referenceReady = false;
let feedbackUrl = "";

const form = document.querySelector("#analysisForm");
const generateButton = document.querySelector("#generateButton");
const report = document.querySelector("#report");
const emptyState = document.querySelector("#emptyState");
const formError = document.querySelector("#formError");
const referenceStatus = document.querySelector("#referenceStatus");
const localDictionaryFile = document.querySelector("#localDictionaryFile");
const localFileStatus = document.querySelector("#localFileStatus");
const downloadButton = document.querySelector("#downloadButton");
const downloadCrosswalkButton = document.querySelector("#downloadCrosswalkButton");
const fields = {
  question: document.querySelector("#question"),
  diseaseArea: document.querySelector("#diseaseArea"),
  analysisGoal: document.querySelector("#analysisGoal"),
  localDataset: document.querySelector("#localDataset"),
  variables: document.querySelector("#variables"),
  userAttestation: document.querySelector("#userAttestation")
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showError(message) {
  formError.textContent = message;
  formError.classList.remove("hidden");
}

function clearError() {
  formError.textContent = "";
  formError.classList.add("hidden");
}

async function loadReferenceStatus() {
  try {
    const response = await fetch("/api/pan/reference-status");
    const status = await response.json();
    if (!response.ok) throw new Error(status.error || "The PAN reference is unavailable.");
    referenceStatus.textContent = `${status.version} | released ${status.releaseDate} | ${status.sourceLabel}`;
    feedbackUrl = status.feedbackUrl || "";
    referenceReady = true;
    generateButton.disabled = false;
  } catch (error) {
    referenceStatus.textContent = "PAN reference unavailable. Configure the approved PAN source on the API server.";
    showError(error.message || "The PAN reference is unavailable.");
  }
}

async function handleLocalUpload() {
  const [file] = localDictionaryFile.files;
  if (!file) return;
  fields.localDataset.value = await file.text();
  localFileStatus.textContent = `Uploaded ${file.name}`;
}

function collectInput() {
  return {
    question: fields.question.value.trim(),
    diseaseArea: fields.diseaseArea.value.trim(),
    analysisGoal: fields.analysisGoal.value,
    localDataset: fields.localDataset.value.trim(),
    variables: fields.variables.value.trim(),
    userAttestation: fields.userAttestation.checked
  };
}

function renderBadge(type) {
  return `<span class="match-badge ${escapeHtml(type).toLowerCase().replaceAll(" ", "-")}">${escapeHtml(type)}</span>`;
}

function renderReport(data) {
  latestReport = data;
  emptyState.classList.add("hidden");
  report.classList.remove("hidden");
  downloadButton.disabled = false;
  downloadCrosswalkButton.disabled = false;
  const panReference = data.provenance?.panReference;
  const reviewSummary = data.reviewSummary || {};
  const summary = data.matchSummary || [];
  const feedback = feedbackUrl ? `<p><a class="feedback-link" href="${escapeHtml(feedbackUrl)}" target="_blank" rel="noreferrer">Report a correction or concern</a></p>` : "";
  report.innerHTML = `
    <article class="report-card score">
      <div class="score-ring" style="--score: ${data.feasibilityScore}%">${data.feasibilityScore}</div>
      <div><span class="recommendation">${escapeHtml(data.recommendation)}</span><p>${escapeHtml(data.llmStatus)}</p></div>
    </article>
    <article class="report-card">
      <h3>PAN Reference Provenance</h3>
      <dl class="provenance-list">
        <div><dt>Release</dt><dd>${escapeHtml(panReference?.version || "Not recorded")}</dd></div>
        <div><dt>Release date</dt><dd>${escapeHtml(panReference?.releaseDate || "Not recorded")}</dd></div>
        <div><dt>Dictionary fingerprint</dt><dd>${escapeHtml(panReference?.dictionarySha256 || "Not recorded")}</dd></div>
      </dl>
    </article>
    <article class="report-card">
      <h3>Validation Controls</h3>
      <div class="summary-grid">
        ${summary.map((item) => `<div class="summary-item"><strong>${escapeHtml(item.count)}</strong><span>${escapeHtml(item.matchType)}</span></div>`).join("")}
        <div class="summary-item"><strong>${escapeHtml(reviewSummary.unresolvedCount || 0)}</strong><span>Unresolved review</span></div>
      </div>
      <p>Sample-overlap risk: <strong>${escapeHtml(data.sampleOverlapRisk?.level || "Not assessed")}</strong>. Metadata screen: <strong>${escapeHtml(data.metadataDisclosureRisk?.level || "Not assessed")}</strong>.</p>
      <p>${escapeHtml(data.disclaimer)}</p>
      ${feedback}
    </article>
    <article class="report-card">
      <h3>Variable Crosswalk</h3>
      <div class="table-wrap"><table><thead><tr><th>Target</th><th>Investigator</th><th>PAN</th><th>Match</th><th>Action</th></tr></thead><tbody>
        ${data.crosswalk.map((row) => `<tr><td>${escapeHtml(row.targetVariable)}</td><td>${escapeHtml(row.localVariable)}</td><td>${escapeHtml(row.publicVariable)}</td><td>${renderBadge(row.matchType)}</td><td>${escapeHtml(row.harmonizationAction)}</td></tr><tr class="rationale-row"><td colspan="5"><strong>Method:</strong> ${escapeHtml(row.rationale)}<br><strong>Proposed output:</strong> ${escapeHtml(row.proposedHarmonizedVariable || "Document after analyst review.")}<br><strong>Transform:</strong> ${escapeHtml(row.transformationRule)}<br><strong>Review:</strong> ${escapeHtml(row.reviewNotes)}</td></tr>`).join("")}
      </tbody></table></div>
    </article>
    <article class="report-card"><h3>Harmonization Flags</h3><ul>${data.flags.map((flag) => `<li>${escapeHtml(flag)}</li>`).join("")}</ul></article>
    <article class="report-card"><h3>Recommended Next Steps</h3><ul>${data.nextSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ul></article>
  `;
}

function downloadBlob(content, fileName, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildCrosswalkCsv(data) {
  const headers = ["target_variable", "pan_variable", "investigator_variable", "match_type", "confidence", "rationale", "proposed_harmonized_variable", "transformation_rule", "review_notes", "reviewer_status", "harmonization_action"];
  const escapeCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = data.crosswalk.map((row) => [row.targetVariable, row.publicVariable, row.localVariable, row.matchType, row.confidence, row.rationale, row.proposedHarmonizedVariable, row.transformationRule, row.reviewNotes, row.reviewerStatus, row.harmonizationAction]);
  return [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");
}

document.querySelector("#loadSampleButton").addEventListener("click", () => {
  Object.entries(sample).forEach(([key, value]) => { fields[key].value = value; });
  localDictionaryFile.value = "";
  localFileStatus.textContent = "Sample dictionary loaded";
  clearError();
});

localDictionaryFile.addEventListener("change", handleLocalUpload);

document.querySelector("#clearButton").addEventListener("click", () => {
  form.reset();
  localDictionaryFile.value = "";
  localFileStatus.textContent = "No file uploaded";
  latestReport = null;
  report.classList.add("hidden");
  emptyState.classList.remove("hidden");
  downloadButton.disabled = true;
  downloadCrosswalkButton.disabled = true;
  clearError();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();
  if (!referenceReady) return showError("The PAN reference is not ready yet.");
  if (!fields.userAttestation.checked) return showError("Please confirm you are authorized to use this metadata.");
  if (!fields.localDataset.value.trim()) return showError("Provide an investigator data dictionary before generating a crosswalk.");

  generateButton.disabled = true;
  generateButton.textContent = "Generating...";
  try {
    const response = await fetch("/api/pan/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(collectInput())
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "PAN analysis failed.");
    renderReport(payload);
  } catch (error) {
    showError(error.message || "PAN analysis failed.");
  } finally {
    generateButton.disabled = false;
    generateButton.textContent = "Generate PAN Crosswalk";
  }
});

downloadButton.addEventListener("click", () => {
  if (latestReport) downloadBlob(JSON.stringify(latestReport, null, 2), "cohortai-pan-report.json", "application/json");
});

downloadCrosswalkButton.addEventListener("click", () => {
  if (latestReport) downloadBlob(buildCrosswalkCsv(latestReport), "cohortai-pan-crosswalk.csv", "text/csv");
});

loadReferenceStatus();

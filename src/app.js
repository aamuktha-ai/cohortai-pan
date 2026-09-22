import { analyzeFeasibility, parseDictionary } from "./analysisEngine.js";
import { enrichPanCrosswalk, panProfileVersion } from "./panHarmonizationProfile.js";

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
let referenceRetryTimer = null;
const apiBaseUrl = String(globalThis.COHORTAI_API_BASE_URL || "").replace(/\/$/, "");
const staticPageMode = new URLSearchParams(location.search).has("static") || (location.hostname.endsWith("github.io") && !apiBaseUrl);
let bundledPanDictionary = "";
let bundledPanStatus = null;

const form = document.querySelector("#analysisForm");
const generateButton = document.querySelector("#generateButton");
const report = document.querySelector("#report");
const emptyState = document.querySelector("#emptyState");
const formError = document.querySelector("#formError");
const analysisProgress = document.querySelector("#analysisProgress");
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

function setAnalysisProgress(message = "") {
  analysisProgress.textContent = message;
  analysisProgress.classList.toggle("hidden", !message);
}

function apiUrl(path) {
  return `${apiBaseUrl}${path}`;
}

function isStaticPreviewWithoutApi() {
  return location.hostname.endsWith("github.io") && !apiBaseUrl;
}

async function requestApi(path, options) {
  const response = await fetch(apiUrl(path), options);
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("The configured CohortAI-PAN API did not return a valid response. This GitHub Pages link is a front-end preview, not the running PAN service.");
  }
  if (!response.ok) throw new Error(payload.error || "PAN API request failed.");
  return payload;
}

async function loadBundledPanReference() {
  const [dictionaryResponse, manifestResponse] = await Promise.all([
    fetch(new URL("../reference-data/PAN_Data_Dictionary.csv", import.meta.url)),
    fetch(new URL("../reference-data/pan-release.json", import.meta.url))
  ]);
  if (!dictionaryResponse.ok) throw new Error("The bundled PAN reference dictionary could not be loaded.");

  bundledPanDictionary = await dictionaryResponse.text();
  if (!bundledPanDictionary.trim()) throw new Error("The bundled PAN reference dictionary is empty.");
  parseDictionary(bundledPanDictionary, "Precision Aging Network (PAN)");
  const fallbackStatus = {
    cohort: "Precision Aging Network (PAN)",
    version: "Bundled PAN dictionary snapshot",
    releaseDate: "Release date not supplied",
    sourceLabel: "Public static reference snapshot",
    sourceType: "bundled static file",
    dictionarySha256: "d33458bd4646b50fa793a32f3bcb8e1daf9c50b84f00c61923d168069bd8b02d",
    retrievedAt: new Date().toISOString()
  };
  if (!manifestResponse.ok) {
    bundledPanStatus = fallbackStatus;
    return;
  }

  try {
    const manifest = await manifestResponse.json();
    bundledPanStatus = {
      ...fallbackStatus,
      ...manifest,
      retrievedAt: new Date().toISOString()
    };
  } catch {
    bundledPanStatus = fallbackStatus;
  }
}

function buildBundledPanReport(input) {
  const report = enrichPanCrosswalk(analyzeFeasibility({
    ...input,
    mode: "pan-reference",
    referenceCohort: "PAN",
    candidateDatasets: `### Precision Aging Network (PAN)\n${bundledPanDictionary}`
  }));
  report.mode = "pan-reference";
  report.llmStatus = "CohortAI-PAN static reference comparison using the bundled PAN dictionary snapshot and professor-method harmonization profile.";
  report.provenance.panReference = bundledPanStatus;
  report.provenance.panHarmonizationProfile = panProfileVersion;
  return report;
}

async function loadReferenceStatus() {
  if (referenceRetryTimer) {
    window.clearTimeout(referenceRetryTimer);
    referenceRetryTimer = null;
  }
  if (staticPageMode) {
    try {
      await loadBundledPanReference();
      referenceStatus.textContent = `${bundledPanStatus.version} | ${bundledPanStatus.sourceLabel}`;
      referenceReady = true;
      generateButton.disabled = false;
      clearError();
    } catch (error) {
      referenceReady = false;
      generateButton.disabled = true;
      referenceStatus.textContent = "Bundled PAN reference unavailable.";
      showError(error.message || "The bundled PAN reference is unavailable.");
    }
    return;
  }
  try {
    const status = await requestApi("/api/pan/reference-status");
    referenceStatus.textContent = `${status.version} | released ${status.releaseDate} | ${status.sourceLabel}`;
    feedbackUrl = status.feedbackUrl || "";
    referenceReady = true;
    generateButton.disabled = false;
    clearError();
  } catch (error) {
    referenceReady = false;
    generateButton.disabled = true;
    referenceStatus.textContent = "PAN reference unavailable. Configure the approved PAN source on the API server.";
    showError(`${error.message || "The PAN reference is unavailable."} Retrying automatically...`);
    referenceRetryTimer = window.setTimeout(loadReferenceStatus, 3000);
  }
}

async function handleLocalUpload() {
  const [file] = localDictionaryFile.files;
  if (!file) return;
  try {
    setAnalysisProgress(`Reading ${file.name}...`);
    const text = await readDictionaryFile(file);
    if (!text.trim() || text.includes("\u0000")) {
      throw new Error("This file could not be read as a data dictionary. Upload a text-based PDF, CSV, TSV, TXT, JSON, YAML, or Markdown dictionary.");
    }
    fields.localDataset.value = text;
    localFileStatus.textContent = `${isPdfFile(file) ? "Extracted" : "Uploaded"} ${file.name} (${text.length.toLocaleString()} characters)`;
    setAnalysisProgress();
    clearError();
  } catch (error) {
    localDictionaryFile.value = "";
    localFileStatus.textContent = "No file uploaded";
    setAnalysisProgress();
    showError(error.message || "The selected file could not be read.");
  }
}

function isPdfFile(file) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
}

function pdfPageText(items) {
  const lines = new Map();
  items.forEach((item) => {
    const text = String(item.str || "").trim();
    if (!text) return;
    const transform = Array.isArray(item.transform) ? item.transform : [];
    const y = Math.round(Number(transform[5]) || 0);
    const x = Number(transform[4]) || 0;
    const line = lines.get(y) || [];
    line.push({ text, x });
    lines.set(y, line);
  });

  return [...lines.entries()]
    .sort(([a], [b]) => b - a)
    .map(([, line]) => line.sort((a, b) => a.x - b.x).map((item) => item.text).join(" "))
    .join("\n");
}

async function extractPdfDictionaryText(file) {
  const pdfjs = await import(new URL("../vendor/pdfjs/pdf.min.mjs", import.meta.url));
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("../vendor/pdfjs/pdf.worker.min.mjs", import.meta.url).toString();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  task.onProgress = ({ loaded = 0, total = 0 }) => {
    if (total) setAnalysisProgress(`Reading ${file.name}: ${Math.round((loaded / total) * 100)}%`);
  };
  const pdf = await task.promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    setAnalysisProgress(`Extracting page ${pageNumber} of ${pdf.numPages} from ${file.name}...`);
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = pdfPageText(content.items);
    if (text) pages.push(`Page ${pageNumber}\n${text}`);
  }
  await task.destroy();

  const extracted = pages.join("\n\n");
  if (extracted.replace(/\s/g, "").length < 100) {
    throw new Error("This PDF does not contain enough selectable text to read as a data dictionary. Upload an OCRed/text-based PDF or a CSV/TSV export.");
  }
  return extracted;
}

async function readDictionaryFile(file) {
  return isPdfFile(file) ? extractPdfDictionaryText(file) : file.text();
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
  setAnalysisProgress();
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
  setAnalysisProgress();
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
  setAnalysisProgress("Generating your PAN crosswalk. This can take a few seconds for a large dictionary.");
  try {
    const payload = staticPageMode
      ? buildBundledPanReport(collectInput())
      : await requestApi("/api/pan/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(collectInput())
      });
    renderReport(payload);
    setAnalysisProgress("Crosswalk generated. Your report is ready below.");
    report.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showError(error.message || "PAN analysis failed.");
    setAnalysisProgress();
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

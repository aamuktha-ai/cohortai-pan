import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { analyzeFeasibility } from "./src/analysisEngine.js";
import { loadPanReference } from "./src/panReference.js";

const root = process.cwd();
const port = Number(process.env.PORT || 5180);
const host = process.env.HOST || "127.0.0.1";
const maxRequestBytes = 2 * 1024 * 1024;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > maxRequestBytes) {
      const error = new Error("Request is too large. Upload metadata/data dictionaries only, not subject-level data.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function resolvePath(url) {
  const pathname = decodeURIComponent(new URL(url, `http://localhost:${port}`).pathname);
  const target = pathname === "/" ? "/index.html" : pathname;
  return join(root, normalize(target).replace(/^(\.\.[/\\])+/, ""));
}

function validateAnalysisInput(input) {
  if (!String(input.localDataset || "").trim()) {
    const error = new Error("An investigator data dictionary is required.");
    error.statusCode = 400;
    throw error;
  }
  if (!input.userAttestation) {
    const error = new Error("Authorization attestation is required.");
    error.statusCode = 400;
    throw error;
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${port}`);
  try {
    if (req.method === "GET" && url.pathname === "/api/pan/reference-status") {
      const reference = await loadPanReference();
      sendJson(res, 200, reference.status);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/pan/analyze") {
      const input = await readJsonBody(req);
      validateAnalysisInput(input);
      const reference = await loadPanReference();
      const report = analyzeFeasibility({
        ...input,
        mode: "pan-reference",
        referenceCohort: "PAN",
        candidateDatasets: reference.candidateDatasets
      });
      report.mode = "pan-reference";
      report.llmStatus = "CohortAI-PAN reference API using the configured PAN release.";
      report.provenance.panReference = reference.status;
      sendJson(res, 200, report);
      return;
    }

    const data = await readFile(resolvePath(req.url || "/"));
    res.writeHead(200, { "Content-Type": types[extname(url.pathname)] || "application/octet-stream" });
    res.end(data);
  } catch (error) {
    if (url.pathname.startsWith("/api/")) {
      sendJson(res, error.statusCode || 503, { error: error.message || "PAN API request failed." });
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}).listen(port, host, () => {
  console.log(`CohortAI-PAN running at http://${host}:${port}`);
});

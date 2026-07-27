import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

let cachedReference = null;

function referenceConfig(overrides = {}) {
  return {
    referencePath: overrides.referencePath ?? process.env.PAN_REFERENCE_PATH,
    referenceUrl: overrides.referenceUrl ?? process.env.PAN_REFERENCE_URL,
    version: overrides.version ?? process.env.PAN_REFERENCE_VERSION ?? "Unspecified PAN release",
    releaseDate: overrides.releaseDate ?? process.env.PAN_REFERENCE_RELEASE_DATE ?? "Unspecified",
    sourceLabel: overrides.sourceLabel ?? process.env.PAN_REFERENCE_SOURCE_LABEL ?? "PAN approved data dictionary",
    cacheMinutes: Number(overrides.cacheMinutes ?? process.env.PAN_REFERENCE_CACHE_MINUTES ?? 60)
  };
}

async function retrieveReference(config) {
  if (config.referencePath) {
    return {
      text: await readFile(config.referencePath, "utf8"),
      sourceType: "approved server file"
    };
  }

  if (config.referenceUrl) {
    const url = new URL(config.referenceUrl);
    if (url.protocol !== "https:") throw new Error("PAN_REFERENCE_URL must use HTTPS.");
    const response = await fetch(url, { headers: { Accept: "text/csv,text/plain,application/json" } });
    if (!response.ok) throw new Error(`PAN reference download failed: ${response.status} ${response.statusText}`);
    return { text: await response.text(), sourceType: "approved HTTPS source" };
  }

  throw new Error("Configure PAN_REFERENCE_PATH or PAN_REFERENCE_URL before starting CohortAI-PAN.");
}

export async function loadPanReference(overrides = {}) {
  const config = referenceConfig(overrides);
  const cacheMs = Math.max(config.cacheMinutes, 0) * 60_000;
  const canUseCache = cachedReference && cacheMs > 0 && Date.now() - cachedReference.loadedAt < cacheMs;
  if (canUseCache) return cachedReference;

  const retrieved = await retrieveReference(config);
  const dictionaryText = String(retrieved.text || "").trim();
  if (!dictionaryText) throw new Error("The configured PAN reference dictionary is empty.");

  const sha256 = createHash("sha256").update(dictionaryText).digest("hex");
  cachedReference = {
    candidateDatasets: `### Precision Aging Network (PAN)\n${dictionaryText}`,
    loadedAt: Date.now(),
    status: {
      cohort: "Precision Aging Network (PAN)",
      version: config.version,
      releaseDate: config.releaseDate,
      sourceLabel: config.sourceLabel,
      sourceType: retrieved.sourceType,
      dictionarySha256: sha256,
      retrievedAt: new Date().toISOString()
    }
  };
  return cachedReference;
}

export function clearPanReferenceCache() {
  cachedReference = null;
}

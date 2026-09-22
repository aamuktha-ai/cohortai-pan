import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseDictionary } from "../src/analysisEngine.js";

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? "" : String(process.argv[index + 1] || "").trim();
}

function hasArgument(name) {
  return process.argv.includes(name);
}

function usage() {
  console.error("Usage: node scripts/update-pan-reference.js --file <csv> | --url <https-url> [--version <release>] [--release-date <YYYY-MM-DD>] [--source-label <label>] [--dry-run]");
}

async function readSource() {
  const file = readArgument("--file");
  const sourceUrl = readArgument("--url");
  if (Boolean(file) === Boolean(sourceUrl)) {
    usage();
    throw new Error("Provide exactly one source: --file or --url.");
  }

  if (file) return { text: await readFile(resolve(file), "utf8"), source: "file:" + resolve(file) };

  const url = new URL(sourceUrl);
  if (url.protocol !== "https:") throw new Error("The PAN update URL must use HTTPS.");
  const response = await fetch(url, { headers: { Accept: "text/csv,text/plain" } });
  if (!response.ok) throw new Error("PAN update download failed: " + response.status + " " + response.statusText);
  return { text: await response.text(), source: url.toString() };
}

async function main() {
  const result = await readSource();
  const dictionary = String(result.text || "").trim();
  if (!dictionary) throw new Error("The PAN dictionary source is empty.");

  const records = parseDictionary(dictionary, "Precision Aging Network (PAN)");
  if (records.length < 10) {
    throw new Error("The PAN dictionary source did not produce enough variable records. Use the approved CSV/text release, not a landing page or an access-error response.");
  }

  const now = new Date();
  const releaseDate = readArgument("--release-date") || now.toISOString().slice(0, 10);
  const manifest = {
    cohort: "Precision Aging Network (PAN)",
    version: readArgument("--version") || "PAN dictionary snapshot " + releaseDate,
    releaseDate,
    sourceLabel: readArgument("--source-label") || "Precision Aging Network approved data dictionary",
    sourceType: "bundled static file",
    dictionarySha256: createHash("sha256").update(dictionary).digest("hex"),
    updatedAt: now.toISOString()
  };

  if (hasArgument("--dry-run")) {
    console.log(JSON.stringify({ source: result.source, recordCount: records.length, manifest }, null, 2));
    return;
  }

  await writeFile(resolve("reference-data/PAN_Data_Dictionary.csv"), dictionary + "\n", "utf8");
  await writeFile(resolve("reference-data/pan-release.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log("Updated PAN reference from " + result.source + ". Parsed " + records.length + " variable records.");
  console.log("Release: " + manifest.version + " | SHA-256: " + manifest.dictionarySha256);
}

main().catch((error) => {
  console.error("PAN reference update failed: " + error.message);
  process.exitCode = 1;
});

#!/usr/bin/env node
/**
 * Validates protected Rahavahti Preview using the caller's EXISTING Vercel CLI login.
 * Does not create or print credentials, change deployment protection, or write user data.
 *
 * Run:
 *   vercel login                       # once, on your own machine
 *   node scripts/verify-vercel-preview.mjs
 */
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const ORIGIN = "https://rahavahti-preview-pt0koazv4-info-32533854s-projects.vercel.app";
const COMMIT = "3f9d52219504b57be68e75f11796d0357ec6c5a5";
const MARKER = "__RAHAVAHTI_HTTP_STATUS__:";
const BASE = new URL(ORIGIN);
assert.equal(BASE.protocol, "https:");
assert.equal(BASE.pathname, "/");
assert.equal(BASE.search, "");
assert.equal(BASE.hash, "");

function cli(args) {
  const result = spawnSync("vercel", args, {
    encoding: "utf8",
    timeout: 45000,
    maxBuffer: 2 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.error?.code === "ENOENT") {
    throw Error("Vercel CLI puuttuu. Asenna: npm install -g vercel");
  }
  if (result.error) throw result.error;
  if (result.status !== 0) {
    // Do not forward stderr: providers can include credentials/URLs in diagnostics.
    throw Error(`Vercel CLI epäonnistui (exit ${result.status}). Tarkista 'vercel login' ja projektin käyttöoikeus.`);
  }
  return result.stdout;
}

// Verify only that CLI authentication exists; do not show account identity.
cli(["whoami"]);
console.log("Vercel CLI -istunto: OK");

function get(path) {
  const output = cli([
    "curl", new URL(path, ORIGIN).toString(),
    "--silent", "--show-error", "--max-time", "35",
    "--write-out", `\\n${MARKER}%{http_code}`
  ]);
  const match = output.match(new RegExp(`\\n${MARKER}(\\d{3})\\s*$`));
  assert.ok(match, `HTTP-tilakoodi puuttuu: ${path}`);
  const status = Number(match[1]);
  const body = output.slice(0, match.index);
  assert.equal(status, 200, `${path}: HTTP ${status}; vaaditaan HTTP 200 (ei 302 SSO-ohjausta)`);
  return body;
}

for (const [path, title] of [
  ["/korkovertailu", "Vertaa kulutusluottosi korkoa"],
  ["/inflaatio", "Inflaatio ja oma ostovoima"]
]) {
  const html = get(path);
  assert.ok(html.includes(title), `${path}: odotettu sisältö puuttuu`);
  console.log(`PASS ${path} — HTTP 200 ja HTML`);
}

const rates = JSON.parse(get("/api/public-data/interest"));
assert.equal(rates.dataset, "MFI_PUBL");
assert.equal(rates.dataMode, "live_api_verified", "Historiallinen fallback ei täytä live-API-hyväksyntää");
assert.equal(rates.observations?.length, 2);
const byId = Object.fromEntries(rates.observations.map(x => [x.id, x]));
for (const [id, metric] of [["consumer_nominal", "nominal"], ["consumer_apr", "apr"]]) {
  const item = byId[id];
  assert.ok(item, `${id} puuttuu`);
  assert.equal(item.metric, metric);
  assert.equal(item.debtType, "consumer_loan");
  assert.equal(item.status, "verified_live_api");
  assert.ok(Number.isFinite(item.annualRatePercent) && item.annualRatePercent >= 0 && item.annualRatePercent < 100);
  assert.match(item.observationMonth, /^\\d{4}-\\d{2}$/);
}
console.log("PASS /api/public-data/interest — HTTP 200, MFI_PUBL, live JSON");
console.log(JSON.stringify({ nominal: byId.consumer_nominal.annualRatePercent, apr: byId.consumer_apr.annualRatePercent, month: byId.consumer_nominal.observationMonth }));

const inflation = JSON.parse(get("/api/public-data/inflation"));
assert.equal(inflation.dataMode, "live_api_verified");
assert.equal(inflation.observation?.table, "15b5");
assert.equal(inflation.observation?.source, "Tilastokeskus");
assert.equal(inflation.observation?.baseYear, 2025);
assert.equal(inflation.observation?.status, "verified_live_api");
assert.match(inflation.observation?.observationMonth, /^\\d{4}M(?:0[1-9]|1[0-2])$/);
for (const field of ["index", "annualChangePercent", "monthlyChangePercent"]) {
  assert.ok(Number.isFinite(inflation.observation?.[field]), `KHI: ${field} virheellinen`);
}
assert.ok(inflation.observation.index > 0);
console.log("PASS /api/public-data/inflation — HTTP 200, 15b5, live JSON");
console.log(JSON.stringify({ month: inflation.observation.observationMonth, index: inflation.observation.index, annual: inflation.observation.annualChangePercent, monthly: inflation.observation.monthlyChangePercent }));
console.log(`HYVÄKSYTTY: neljä suojatun Previewn autentikoitua HTTP 200 -tarkistusta. Commit ${COMMIT} (identiteetti vahvistettava erikseen Vercelistä).`);

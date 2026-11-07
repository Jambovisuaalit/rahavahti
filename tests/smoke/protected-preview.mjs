#!/usr/bin/env node
/**
 * Authenticated Vercel Preview smoke. No test data or secrets are persisted.
 * Run only from an approved, trusted environment with a short-lived or managed
 * Vercel automation bypass secret. The URL must be the reviewed deployment.
 */
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

const EXPECTED_HOST="rahavahti-preview-p76lnaerm-info-32533854s-projects.vercel.app";
const EXPECTED_COMMIT="60a959a2bba0f2b179f8cc121c1991862779e7b4";
const origin=new URL(process.env.PREVIEW_ORIGIN || `https://${EXPECTED_HOST}`);
const bypass=process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
assert.equal(origin.protocol,"https:","HTTPS required");
assert.equal(origin.hostname,EXPECTED_HOST,"Unexpected deployment host");
assert.equal(origin.pathname,"/","Origin must not contain path");
assert.equal(origin.search,"","Origin must not contain query");
assert.equal(origin.hash,"","Origin must not contain fragment");
assert.equal(process.env.REVIEWED_COMMIT_SHA,EXPECTED_COMMIT,"Reviewed deployment SHA mismatch");
assert.ok(bypass&&bypass.length>15,"Missing protected CI bypass secret");

async function request(path,headers={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  try{
    const res=await fetch(new URL(path,origin),{redirect:"manual",signal:controller.signal,headers});
    const location=res.headers.get("location");
    if(location){
      const destination=new URL(location,origin);
      assert.equal(destination.origin,origin.origin,"Unexpected external redirect");
    }
    return res;
  } finally {clearTimeout(timer)}
}

// One origin-scoped authentication exchange. Never send the secret to a redirect target.
const response=await request("/",{
  "x-vercel-protection-bypass":bypass,
  "x-vercel-set-bypass-cookie":"true"
});
assert.ok(response.status<400,"Vercel authentication handshake failed");
const cookies=(typeof response.headers.getSetCookie==="function"
  ?response.headers.getSetCookie():[response.headers.get("set-cookie")||""]);
const tokenCookie=cookies.map(x=>x.split(";")[0]).find(x=>x.startsWith("_vercel_jwt="));
assert.ok(tokenCookie,"No Vercel scoped session cookie returned");

const headers={Cookie:tokenCookie};
const paths=["/korkovertailu","/inflaatio"];
for(const path of paths){
  const res=await request(path,headers);
  assert.equal(res.status,200,`${path} HTTP != 200`);
  const html=await res.text();
  assert.match(res.headers.get("content-type")||"",/text\/html/);
  assert.match(html, path==="/korkovertailu"?/Vertaa kulutusluottosi korkoa/:/Inflaatio ja oma ostovoima/);
  assert.match(res.headers.get("content-security-policy")||"",/nonce-/);
  console.log(`PASS ${path} HTTP 200 + HTML/CSP`);
}
const ir=await request("/api/public-data/interest",headers);
assert.equal(ir.status,200,"Interest API HTTP != 200");
const interest=await ir.json();
assert.equal(interest.dataset,"MFI_PUBL");
assert.ok(["live_api_verified","static_fallback"].includes(interest.dataMode));
assert.equal(interest.observations?.length,2);
const nominal=interest.observations.find(x=>x.id==="consumer_nominal");
const apr=interest.observations.find(x=>x.id==="consumer_apr");
for(const item of [nominal,apr]){
  assert.ok(item&&Number.isFinite(item.annualRatePercent));
  assert.match(item.observationMonth,/^\d{4}-\d{2}$/);
  assert.ok(item.sourceUrl.startsWith("https://"));
}
assert.equal(nominal.metric,"nominal");assert.equal(apr.metric,"apr");
console.log(`PASS /api/public-data/interest HTTP 200 ${interest.dataMode}`);

const cr=await request("/api/public-data/inflation",headers);
assert.equal(cr.status,200,"Inflation API HTTP != 200");
const cpi=await cr.json();
assert.equal(cpi.dataMode,"live_api_verified");
assert.equal(cpi.observation?.table,"15b5");
assert.ok(Number.isFinite(cpi.observation?.index)&&cpi.observation.index>0);
assert.ok(Number.isFinite(cpi.observation?.annualChangePercent));
assert.ok(Number.isFinite(cpi.observation?.monthlyChangePercent));
assert.match(cpi.observation.observationMonth,/^\d{4}M(?:0[1-9]|1[0-2])$/);
console.log(`PASS /api/public-data/inflation HTTP 200 ${cpi.observation.observationMonth}`);
console.log("PASS protected Preview smoke (no production write tests)");

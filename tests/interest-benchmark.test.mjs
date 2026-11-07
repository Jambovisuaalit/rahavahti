import test from "node:test";
import assert from "node:assert/strict";
import {BENCHMARKS,compareLoanRate} from "../lib/market/interest-benchmark.mjs";
test("public snapshot carries source and observation month",()=>{
  for (const row of Object.values(BENCHMARKS)) {
    assert.equal(row.observationMonth,"2026-09");
    assert.ok(row.sourceUrl.startsWith("https://reports.suomenpankki.fi/"));
    assert.equal(row.status,"verified_static_snapshot");
  }
});
test("nominal consumer loan comparison computes percentage point gap",()=>{
  const r=compareLoanRate({annualRatePercent:15,metric:"nominal",debtType:"consumer_loan",benchmarkId:"consumer_nominal"});
  assert.equal(r.differencePercentagePoints,9.14);
  assert.equal(r.position,"above");
});
test("APR must not be compared to nominal rate",()=>{
  assert.throws(()=>compareLoanRate({annualRatePercent:15,metric:"apr",debtType:"consumer_loan",benchmarkId:"consumer_nominal"}));
});
test("mortgage/student/credit card not silently compared to consumer loan",()=>{
  for(const debtType of ["student_loan","credit_card","mortgage"]) assert.throws(()=>compareLoanRate({annualRatePercent:7,metric:"nominal",debtType,benchmarkId:"consumer_nominal"}));
});
test("unknown series and invalid input fail closed",()=>{
  assert.throws(()=>compareLoanRate({annualRatePercent:7,metric:"nominal",debtType:"consumer_loan",benchmarkId:"invented"}));
  assert.throws(()=>compareLoanRate({annualRatePercent:NaN,metric:"nominal",debtType:"consumer_loan",benchmarkId:"consumer_nominal"}));
});

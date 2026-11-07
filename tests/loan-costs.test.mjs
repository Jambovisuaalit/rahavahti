import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateLoan,screen2026CostCap,rankLoans,RATE_CEILING_2026_H2,REFERENCE_RATE_2026_H2} from '../lib/loan-costs.mjs';
const base={amountEuro:2000,nominalPct:10,openingEuro:0,monthlyFeeEuro:0,months:24,startDate:'2026-11-07'};
const approx=(actual,expected,tol=0.001)=>assert.ok(Math.abs(actual-expected)<=tol,actual+' expected '+expected);

test('2026 H2 statutory reference 2.5% yields nominal cap 17.5%',()=>{
 assert.equal(REFERENCE_RATE_2026_H2,2.5);assert.equal(RATE_CEILING_2026_H2,17.5);
});
test('no interest and no charges imply zero effective APR and exact repayment',()=>{
 const x=simulateLoan({...base,nominalPct:0,months:12});
 approx(x.aprPct,0,0.00001);
 assert.equal(x.totalRepayCents,200000);assert.equal(x.totalCostsCents,0);
 assert.equal(x.payments.length,12);assert.equal(x.payments.at(-1).date,'2027-11-07');
});
test('monthly annuity amortises to zero and repayments reconcile to cost',()=>{
 const x=simulateLoan(base);
 assert.equal(x.payments.reduce((sum,p)=>sum+p.repaymentCents,0),200000+x.interestCents);
 assert.equal(x.totalRepayCents,200000+x.totalCostsCents);
 assert.ok(x.aprPct>10);
 assert.ok(x.monthlyPaymentLastCents>0);
});
test('opening and ongoing fees increase real annual cost but not nominal rate',()=>{
 const clean=simulateLoan(base);
 const opening=simulateLoan({...base,openingEuro:40});
 const both=simulateLoan({...base,openingEuro:40,monthlyFeeEuro:3});
 assert.ok(clean.aprPct<opening.aprPct);assert.ok(opening.aprPct<both.aprPct);
 assert.equal(both.otherCostsCents,11200);
 assert.equal(both.nominalPct,10);
});
test('exact cap allowed, one basis point above fails',()=>{
 assert.equal(screen2026CostCap(simulateLoan({...base,nominalPct:17.5})).rateStatus,'PASS');
 assert.equal(screen2026CostCap(simulateLoan({...base,nominalPct:17.51})).rateStatus,'EXCEEDS');
 assert.equal(screen2026CostCap(simulateLoan({...base,nominalPct:20})).rateStatus,'EXCEEDS');
});
test('APR above 17.5% does not by itself violate nominal cap',()=>{
 const credit=simulateLoan({...base,nominalPct:17,openingEuro:2,monthlyFeeEuro:1});
 assert.ok(credit.aprPct>17.5);
 const outcome=screen2026CostCap(credit);
 assert.equal(outcome.rateStatus,'PASS');assert.equal(outcome.feeStatus,'PASS');
});
test('fee cap is evaluated separately from interest cap',()=>{
 const result=screen2026CostCap(simulateLoan({...base,nominalPct:8,openingEuro:100,monthlyFeeEuro:10}));
 assert.equal(result.rateStatus,'PASS');assert.equal(result.feeStatus,'EXCEEDS');
 assert.equal(result.status,'EXCEEDS');
});
test('statutory five euro floor can apply for loan over thirty days',()=>{
 const x=screen2026CostCap(simulateLoan({...base,amountEuro:100,months:1,nominalPct:0,openingEuro:4}));
 assert.equal(x.feeStatus,'PASS');
 assert.ok(x.feeLifetimeLimitCents>=500);
});
test('annual 150 euro other-cost ceiling is screened',()=>{
 const x=screen2026CostCap(simulateLoan({...base,amountEuro:20000,months:24,openingEuro:151}));
 assert.equal(x.feeStatus,'EXCEEDS');
});
test('old agreements and unsupported loan products have no legal pass or fail',()=>{
 const old=screen2026CostCap(simulateLoan({...base,startDate:'2022-11-07'}));
 const unsupported=screen2026CostCap(simulateLoan(base),{eligible:false});
 assert.equal(old.status,'NOT_ASSESSED');assert.equal(unsupported.status,'NOT_ASSESSED');
});
test('comparison is ordered by modelled APR',()=>{
 const a=simulateLoan(base);
 const b=simulateLoan({...base,nominalPct:12});
 assert.deepEqual(rankLoans([b,a]).map(x=>x.originalIndex),[1,0]);
});
test('validation rejects invalid terms and charges',()=>{
 assert.throws(()=>simulateLoan({...base,months:0}),/Luottoaika/);
 assert.throws(()=>simulateLoan({...base,months:12.5}),/kokonaisia/);
 assert.throws(()=>simulateLoan({...base,amountEuro:100,openingEuro:100}),/Avausmaksu/);
 assert.throws(()=>simulateLoan({...base,startDate:'2026-02-30'}),/sopimuspäivä/);
 assert.throws(()=>simulateLoan({...base,monthlyFeeEuro:-1}),/Tilinhoitomaksu/);
});
test('pure loan model has no fetch, storage or remote APIs',async()=>{
 const fs=await import('node:fs');
 const source=fs.readFileSync(new URL('../lib/loan-costs.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\bfetch\s*\(|\bXMLHttpRequest\b|\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/);
});

test('independent monthly cash-flow reference A: 2000 EUR at 10%, 24 months, no fees',()=>{
 const x=simulateLoan(base);
 approx(x.aprPct,10.47103282772374,0.000001);
 assert.equal(x.totalCostsCents,21495);
});
test('independent monthly cash-flow reference B: 2000 EUR at 9%, 25 EUR opening, 3 EUR monthly',()=>{
 const x=simulateLoan({...base,nominalPct:9,openingEuro:25,monthlyFeeEuro:3});
 approx(x.aprPct,14.380970325051305,0.000001);
 assert.equal(x.totalCostsCents,28990);
});
test('monthly periods yield same APR when drawdown shifts across leap year',()=>{
 const a=simulateLoan({...base,startDate:'2026-11-07'});
 const b=simulateLoan({...base,startDate:'2027-11-07'});
 approx(a.aprPct,b.aprPct,0.0000001);
});
test('2026 H2 screening rejects 2027 contract pending new reference rate',()=>{
 const future=screen2026CostCap(simulateLoan({...base,startDate:'2027-01-01'}));
 assert.equal(future.status,'NOT_ASSESSED');
});

test('multi-year fixed-rate example does not claim complete cap compliance',()=>{
 const outcome=screen2026CostCap(simulateLoan(base));
 assert.equal(outcome.crossesReferencePeriod,true);
 assert.equal(outcome.status,'REVIEW_REQUIRED');
 assert.equal(outcome.rateStatus,'PASS');
});
test('short contract inside 2026 H2 can pass preliminary cap screening',()=>{
 const outcome=screen2026CostCap(simulateLoan({...base,months:1,nominalPct:10,openingEuro:0,monthlyFeeEuro:0}));
 assert.equal(outcome.crossesReferencePeriod,false);
 assert.equal(outcome.status,'PRELIMINARY_PASS');
});

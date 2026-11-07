import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateLoan} from '../lib/loan-costs.mjs';

// Independent implementation: Newton-Raphson on log(1+X), instead of production
// bisection. Uses independently built discounted receipts to check the residual.
function independentApr(cashFlows, netProceedsCents, startDate){
 const start=Date.parse(startDate+'T00:00:00Z');
 const terms=cashFlows.map(p=>({amount:p.totalCents,
  years:(Date.parse(p.date+'T00:00:00Z')-start)/(365*86400000)}));
 let logFactor=Math.log(1.1);
 for(let i=0;i<80;i++){
  let f=-netProceedsCents,derivative=0;
  for(const payment of terms){
   const present=payment.amount*Math.exp(-logFactor*payment.years);
   f+=present;derivative-=payment.years*present;
  }
  if(Math.abs(f)<1e-8)break;
  if(Math.abs(derivative)<1e-15)throw Error('Singular independent APR validation');
  logFactor-=f/derivative;
  if(!Number.isFinite(logFactor)||Math.abs(logFactor)>20)throw Error('Nonconvergent APR');
 }
 return (Math.exp(logFactor)-1)*100;
}
const sample={amountEuro:2000,nominalPct:10,openingEuro:0,monthlyFeeEuro:0,months:24,startDate:'2026-11-07'};
test('independent Newton solver matches bisection APR within 0.00001 percentage points',()=>{
 for(const scenario of [
  sample,
  {...sample,nominalPct:9,openingEuro:25,monthlyFeeEuro:3},
  {...sample,nominalPct:0,openingEuro:5,monthlyFeeEuro:2},
  {...sample,months:1,nominalPct:17.5},
  {...sample,startDate:'2028-02-29',months:36,openingEuro:7.5,monthlyFeeEuro:1}
 ]){
  const got=simulateLoan(scenario);
  const expected=independentApr(got.payments,got.netProceedsCents,got.startDate);
  assert.ok(Math.abs(got.aprPct-expected)<0.00001,
   'APR differs: '+got.aprPct+' vs independent '+expected+' for '+JSON.stringify(scenario));
 }
});
test('every modelled APR zeroes independent discounted cash-flow balance',()=>{
 const result=simulateLoan({...sample,nominalPct:12,openingEuro:15,monthlyFeeEuro:4});
 const start=Date.parse(result.startDate+'T00:00:00Z');
 const balance=result.payments.reduce((acc,p)=>{
  const years=(Date.parse(p.date+'T00:00:00Z')-start)/86400000/365;
  return acc+p.totalCents/Math.pow(1+result.aprPct/100,years);
 },-result.netProceedsCents);
 assert.ok(Math.abs(balance)<0.0001,'cash flows do not net to zero: '+balance);
});
test('calendar date regression on leap day and month ends',()=>{
 const feb=simulateLoan({...sample,months:3,startDate:'2028-01-31'});
 assert.deepEqual(feb.payments.map(p=>p.date),['2028-02-29','2028-03-31','2028-04-30']);
});
test('no-fee APR reasonably approximates equal-month analytic effective annual interest',()=>{
 const annual=12;
 const input={...sample,months:annual,nominalPct:12,startDate:'2026-11-07'};
 const actual=simulateLoan(input).aprPct;
 const ideal=(Math.pow(1+input.nominalPct/1200,12)-1)*100;
 // Actual-day fractions and rounding generate small differences.
 assert.ok(Math.abs(actual-ideal)<0.05,actual+' vs '+ideal);
});

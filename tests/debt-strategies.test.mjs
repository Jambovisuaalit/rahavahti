import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateDebtPlan,compareDebtStrategies} from '../lib/debt-strategies.mjs';

const setup={netIncomeEuro:2400,fixedExpensesEuro:1400,cashEuro:800,bufferEuro:500,startMonth:'2026-11',
 loans:[{id:'a',label:'Demo A',balanceEuro:1800,nominalPct:16,minimumEuro:90,monthlyFeeEuro:3},
 {id:'b',label:'Demo B',balanceEuro:5500,nominalPct:7,minimumEuro:150,monthlyFeeEuro:2},
 {id:'c',label:'Demo C',balanceEuro:500,nominalPct:9,minimumEuro:40,monthlyFeeEuro:0}]};
test('all strategies pay off, interest and fees separately, with actual savings',()=>{
 const {results,allFeasible}=compareDebtStrategies(setup);
 assert.equal(allFeasible,true);
 assert.equal(results.minimum.savingsCents,0);
 assert.ok(results.avalanche.savingsCents>0);
 assert.ok(results.snowball.savingsCents>0);
 assert.ok(results.avalanche.months<results.minimum.months);
 assert.ok(results.avalanche.totalCostCents<=results.snowball.totalCostCents);
 for(const result of Object.values(results)){
  assert.ok(result.lowestCashCents>=setup.bufferEuro*100);
  assert.equal(result.totalCostCents,result.interestCents+result.feesCents);
  assert.ok(result.loans.every(x=>x.remainingAprPct!==null));
  assert.ok(result.paidOffMonth);
 }
});
test('monthly surplus below contractual debt minima denies a payoff projection',()=>{
 const data={...setup,netIncomeEuro:1500,fixedExpensesEuro:1400,cashEuro:500};
 const r=compareDebtStrategies(data);
 assert.ok(Object.values(r.results).every(x=>x.status==='INSUFFICIENT_CAPACITY'));
 assert.equal(r.results.avalanche.savingsCents,null);
});
test('no personal income and no buffer cannot generate invented debt-free date',()=>{
 const r=simulateDebtPlan({...setup,netIncomeEuro:0,cashEuro:0,bufferEuro:0},'avalanche');
 assert.notEqual(r.status,'OK');
 assert.equal(r.paidOffMonth,undefined);
});
test('initial cash below buffer is blocked',()=>{
 const r=simulateDebtPlan({...setup,cashEuro:200},'avalanche');
 assert.equal(r.status,'BUFFER_BELOW_LIMIT');
});
test('negative available monthly budget is rejected',()=>{
 const r=simulateDebtPlan({...setup,fixedExpensesEuro:2600},'avalanche');
 assert.equal(r.status,'NEGATIVE_CASHFLOW');
});
test('minimum below ongoing interest and fees is marked non-amortizing',()=>{
 const input={...setup,loans:[{id:'a',label:'Expensive debt',balanceEuro:1000,nominalPct:24,minimumEuro:1,monthlyFeeEuro:3}]};
 assert.equal(simulateDebtPlan(input,'minimum').status,'NON_AMORTIZING');
});
test('input validation refuses missing amounts and duplicate ids',()=>{
 assert.throws(()=>simulateDebtPlan({...setup,netIncomeEuro:NaN}),/Nettotulot/);
 assert.throws(()=>simulateDebtPlan({...setup,loans:[setup.loans[0],setup.loans[0]]}),/tunnisteet/);
 assert.throws(()=>simulateDebtPlan({...setup,startMonth:'2026-13'}),/Aloituskuukausi/);
 assert.throws(()=>simulateDebtPlan({...setup,loans:[]}),/Velkalista/);
});
test('more money never causes lower buffer in acceleration mode',()=>{
 const r=simulateDebtPlan({...setup,netIncomeEuro:5000,cashEuro:500,bufferEuro:500},'snowball');
 assert.equal(r.status,'OK');
 assert.ok(r.schedule.every(m=>m.cashCents>=50000));
});
test('fixed monthly account fee increases cost on an identical loan schedule',()=>{
 const initial={...setup,loans:[{id:'a',label:'Loan',balanceEuro:1200,nominalPct:0,minimumEuro:100,monthlyFeeEuro:0}]};
 const fee={...initial,loans:[{...initial.loans[0],monthlyFeeEuro:5}]};
 assert.ok(simulateDebtPlan(fee,'minimum').totalCostCents>simulateDebtPlan(initial,'minimum').totalCostCents);
});

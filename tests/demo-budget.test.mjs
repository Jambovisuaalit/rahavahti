import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../lib/demo-budget.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {budgetSummary,DEMO_TRANSACTIONS,DEMO_LIMITS,euro,fiDate}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('synthetic fixture has no external data source',()=>{
 assert.equal(DEMO_TRANSACTIONS.length,7);
 assert.doesNotMatch(source,/\bfetch\s*\(|\bXMLHttpRequest\b|\blocalStorage\b|\bsessionStorage\b/);
});
test('monthly totals are calculated from integer cents',()=>{
 const summary=budgetSummary(DEMO_TRANSACTIONS,DEMO_LIMITS);
 assert.equal(summary.incomeCents,220000);
 assert.equal(summary.spentCents,101350);
 assert.equal(summary.netCents,118650);
 assert.equal(summary.limitTotalCents,140000);
});
test('category balances and over-budget condition are deterministic',()=>{
 const result=budgetSummary(DEMO_TRANSACTIONS,{...DEMO_LIMITS,Ruoka:10000});
 const food=result.categories.find(x=>x.category==='Ruoka');
 assert.equal(food.spentCents,14950);
 assert.equal(food.remainingCents,-4950);
 assert.equal(food.usedPct,150);
});
test('empty transactions yield zero without invented income',()=>{
 const out=budgetSummary([],DEMO_LIMITS);
 assert.equal(out.incomeCents,0);
 assert.equal(out.spentCents,0);
 assert.equal(out.netCents,0);
});
test('Finnish formatting uses euros and local date',()=>{
 assert.match(euro(12345),/123,45/);
 assert.equal(fiDate('2026-11-07'),'07.11.2026');
});

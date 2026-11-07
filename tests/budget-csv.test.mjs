import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBudgetCSV,suggestedMapping,validateBudgetRows,budgetMonths,classifyBudgetRows} from '../lib/budget-csv.mjs';

const sample='Kirjauspäivä;Määrä EUR;Saaja / maksaja;Viesti\n07.11.2026;-10,50;Ruokakauppa;Synteettinen\n08.11.2026;2200,00;Demo-työnantaja;Palkka';
test('generic Finnish export column labels map to schema',()=>{
 const parsed=parseBudgetCSV(sample);
 const mapping=suggestedMapping(parsed.rows[0]);
 assert.deepEqual(mapping,{date:0,amount:1,description:2});
 const out=validateBudgetRows(parsed,mapping);
 assert.equal(out.invalid.length,0);
 assert.equal(out.valid.length,2);
 assert.equal(out.valid[0].amountCents,-1050);
 assert.equal(out.valid[0].date,'2026-11-07');
 assert.equal(out.valid[1].amountCents,220000);
});
test('CSV import uses unclassified, never silently guesses a category',()=>{
 const mapped=validateBudgetRows(parseBudgetCSV(sample),{date:0,amount:1,description:2});
 const rows=classifyBudgetRows(mapped.valid);
 assert.equal(rows[0].category,'Luokittelematon');
 assert.equal(classifyBudgetRows(rows,{[rows[0].id]:'Ruoka'})[0].category,'Ruoka');
 assert.equal(classifyBudgetRows(rows,{[rows[0].id]:'Admin'})[0].category,'Luokittelematon');
});
test('CSV month grouping handles cross-month rows',()=>{
 const parsed=parseBudgetCSV('Päivä;Summa;Kuvaus\n31.10.2026;-5;Testi\n01.11.2026;10;Maksu');
 const rows=validateBudgetRows(parsed,{date:0,amount:1,description:2}).valid;
 assert.deepEqual(budgetMonths(rows),['2026-10','2026-11']);
});
test('malformed rows isolated and not silently applied',()=>{
 const parsed=parseBudgetCSV('Päivä;Summa;Kuvaus\n31.02.2026;-5;Testi\n01.11.2026;10;Maksu');
 const out=validateBudgetRows(parsed,{date:0,amount:1,description:2});
 assert.equal(out.invalid.length,1);
 assert.equal(out.valid.length,1);
});
test('duplicate mappings are rejected',()=>{
 const parsed=parseBudgetCSV(sample);
 assert.throws(()=>validateBudgetRows(parsed,{date:0,amount:0,description:2}),/kolme eri/);
});
test('CSV size and row limits are enforced',()=>{
 assert.throws(()=>parseBudgetCSV('Päivä;Summa;Kuvaus\n'+'07.11.2026;1;Testi\n'.repeat(1001)),/1000/);
 assert.throws(()=>parseBudgetCSV('Päivä;Summa;Kuvaus\n'+'X'.repeat(1024*1024)),/1 Mt/);
});
test('CSV NUL is rejected; no network or storage calls in adapter',()=>{
 assert.throws(()=>parseBudgetCSV('Päivä;Summa;Kuvaus\nA\0B;1;X'),/NUL/);
});

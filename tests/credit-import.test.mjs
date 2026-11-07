import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../lib/credit-import.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {parseCreditCSV}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('parses synthetic Finnish CSV without network or persistence',()=>{
 const r=parseCreditCSV('luotonantaja;luottotyyppi;saldo_eur;kuukausierä_eur\nTestipankki;vakuudeton;1234,50;30,00');
 assert.equal(r.rows.length,1);assert.equal(r.errors.length,0);assert.equal(r.rows[0].balanceCents,123450);assert.equal(r.rows[0].monthlyCents,3000);
});
test('rejects missing required headers',()=>assert.throws(()=>parseCreditCSV('luotonantaja;saldo_eur\nTesti;30'),/luottotyyppi/));
test('isolates invalid records without displaying them as valid',()=>{
 const r=parseCreditCSV('luotonantaja;luottotyyppi;saldo_eur\nTesti;vakuudeton;-3\nToinen;jatkuva;10');
 assert.equal(r.rows.length,1);assert.equal(r.errors.length,1);
});
test('rejects more than 1000 rows',()=>assert.throws(()=>parseCreditCSV('luotonantaja;luottotyyppi;saldo_eur\n'+'A;jatkuva;1\n'.repeat(1001)),/1000/));
test('rejects malformed quotes',()=>{const r=parseCreditCSV('luotonantaja;luottotyyppi;saldo_eur\n"rikki;vakuudeton;1');assert.equal(r.errors.length,1)});

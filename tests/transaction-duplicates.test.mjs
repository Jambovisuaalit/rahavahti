import test from 'node:test';
import assert from 'node:assert/strict';
import {duplicateCandidates,acceptedRowsAfterReview} from '../lib/transaction-duplicates.mjs';
const a={id:'a',date:'2026-11-07',amountCents:-1000,description:'Kauppa Oy',sourceLine:2};
const b={id:'b',date:'2026-11-07',amountCents:-1000,description:' kauppa   oy ',sourceLine:3};
const c={id:'c',date:'2026-11-08',amountCents:-1000,description:'Kauppa Oy',sourceLine:4};
test('identical date, cents and normalized description flagged as possible',()=>{
 const result=duplicateCandidates([a,b,c],{accountId:'DEMO_ACCOUNT'});
 assert.equal(result.length,1);assert.equal(result[0].strength,'possible-match');
 assert.equal(result[0].index,1);assert.equal(result[0].previousLine,2);
});
test('same amount and description on different dates are distinct',()=>{
 assert.equal(duplicateCandidates([a,c]).length,0);
});
test('same external ID on same account flagged despite other fields',()=>{
 const x=duplicateCandidates([a,c],{accountId:'DEMO_ACCOUNT',externalIds:{a:'ref-1',c:'ref-1'}});
 assert.equal(x.length,1);assert.equal(x[0].strength,'id-match');
});
test('different bank accounts must be reviewed in separate imports',()=>{
 assert.equal(duplicateCandidates([a,b],{accountId:'ACCOUNT_A'}).length,1);
 assert.deepEqual(acceptedRowsAfterReview([a,b,c],[]),[a,b,c]);
});
test('duplicate removal requires an explicit selected row',()=>{
 assert.deepEqual(acceptedRowsAfterReview([a,b,c],[1]),[a,c]);
 assert.throws(()=>acceptedRowsAfterReview([a],[-1]),/Virheellinen/);
});

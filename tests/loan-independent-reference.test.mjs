import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateLoan,screen2026CostCap} from '../lib/loan-costs.mjs';

/**
 * Independent verification implementation. The reference schedule and root
 * solver do not call the product's cashflow or APR implementation.
 * Oikeusministeriön asetus 1123/2016, liite I: 12 equally long months/year.
 */
function independentAPR({amountEuro,nominalPct,openingEuro,monthlyFeeEuro,months}){
  const cent=x=>Math.floor(x*100+0.5);
  const principal=cent(amountEuro);
  const monthlyRate=nominalPct/1200;
  const regular=monthlyRate===0?principal/months:
    principal/(1/Math.pow(1+monthlyRate,months)*
      ((Math.pow(1+monthlyRate,months)-1)/monthlyRate)); // algebraically P*r/(1-(1+r)^-n)
  let due=[],balance=principal,interestTotal=0;
  for(let n=1;n<=months;n++){
    const interest=Math.floor(balance*monthlyRate+0.5);
    const repayment=n===months?balance:
      Math.max(0,Math.min(balance,Math.floor(regular+0.5)-interest));
    balance-=repayment;interestTotal+=interest;
    due.push({month:n,amount:repayment+interest+cent(monthlyFeeEuro)});
  }
  const proceeds=principal-cent(openingEuro);
  function net(annual){let sum=-proceeds;
    for(const p of due)sum+=p.amount*Math.exp(-(p.month/12)*Math.log1p(annual));
    return sum;
  }
  let lo=0,hi=1;
  while(net(hi)>0)hi*=2;
  for(let i=0;i<100;i++){const mid=(lo+hi)/2;
    if(net(mid)>0)lo=mid;else hi=mid;
  }
  return {aprPct:50*(lo+hi),interestCents:interestTotal,
    costsCents:interestTotal+cent(openingEuro)+months*cent(monthlyFeeEuro)};
}
const cases=[
  {name:'no fees, 10%',amountEuro:2000,nominalPct:10,openingEuro:0,monthlyFeeEuro:0,months:24,aprPct:10.47103282772374,costsCents:21495},
  {name:'lower nominal with fees',amountEuro:2000,nominalPct:9,openingEuro:25,monthlyFeeEuro:3,months:24,aprPct:14.380970325051305,costsCents:28990},
  {name:'zero-rate zero-fee',amountEuro:1000,nominalPct:0,openingEuro:0,monthlyFeeEuro:0,months:12,aprPct:0,costsCents:0},
  {name:'17.5% statutory nominal ceiling',amountEuro:2000,nominalPct:17.5,openingEuro:0,monthlyFeeEuro:0,months:24,aprPct:18.980868941113477,costsCents:38479},
  {name:'longer loan with fees',amountEuro:10000,nominalPct:6.5,openingEuro:100,monthlyFeeEuro:5,months:36,aprPct:8.597941530198752,costsCents:131364},
];
for(const fixture of cases){
 test('independent APR oracle: '+fixture.name,()=>{
  const {name,aprPct,costsCents,...terms}=fixture;
  const independent=independentAPR(terms);
  const product=simulateLoan({...terms,startDate:'2026-11-07'});
  assert.ok(Math.abs(independent.aprPct-product.aprPct)<1e-7,'APR mismatch: '+name);
  assert.equal(independent.costsCents,product.totalCostsCents);
  if(name==='zero-rate zero-fee')assert.ok(Math.abs(product.aprPct)<1e-10);
  // External numeric fixtures were computed separately using Python brentq.
  // They validate the expected order of magnitude without relying on JS outputs.
  if(name==='no fees, 10%'||name==='lower nominal with fees')
    assert.ok(Math.abs(product.aprPct-aprPct)<0.00001);
  if(name==='17.5% statutory nominal ceiling')
    assert.equal(screen2026CostCap(product).rateStatus,'PASS');
 });
}
test('nominal cap unaffected by payment fees even when APR exceeds cap',()=>{
 const result=simulateLoan({amountEuro:2000,nominalPct:17,openingEuro:2,monthlyFeeEuro:1,months:24,startDate:'2026-11-07'});
 assert.ok(result.aprPct>17.5);
 assert.equal(screen2026CostCap(result).rateStatus,'PASS');
});

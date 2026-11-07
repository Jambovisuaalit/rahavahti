/**
 * Synthetic-only fixed-rate, fully-amortising monthly instalment credit model.
 * This is a cost comparison / preliminary legal screen, not an official APR
 * disclosure or a compliance decision on a real credit agreement.
 */
export const REFERENCE_RATE_2026_H2 = 2.5;
export const RATE_CEILING_2026_H2 = Math.min(20, 15 + REFERENCE_RATE_2026_H2);
export const REFERENCE_PERIOD = '01.07.–31.12.2026';
const roundCents = value => Math.round(value);
const safe = (value, label, {min=0,max=100000000}={})=>{
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error(label+' ei ole sallitulla välillä');
  return value;
};
const toDay=(s)=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('Virheellinen sopimuspäivä');
  const time=Date.parse(s+'T00:00:00Z');
  if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==s)throw Error('Virheellinen sopimuspäivä');
  return new Date(time);
};
function nextMonthlyDate(date, monthIndex){
  const target=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+monthIndex,1));
  const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(),last));
  return target;
}
const daysBetween=(a,b)=>Math.round((b.getTime()-a.getTime())/86400000);

/** Uses monthly nominal interest on declining principal, cash rounding to cents. */
export function simulateLoan(input){
 const principalCents=roundCents(safe(input.amountEuro,'Pääoma',{min:100,max:100000})*100);
 const nominalPct=safe(input.nominalPct,'Nimelliskorko',{min:0,max:100});
 const openingCents=roundCents(safe(input.openingEuro,'Avausmaksu',{max:50000})*100);
 const monthlyFeeCents=roundCents(safe(input.monthlyFeeEuro,'Tilinhoitomaksu',{max:1000})*100);
 const months=safe(input.months,'Luottoaika',{min:1,max:120});
 if(!Number.isInteger(months))throw Error('Luottoajan on oltava kokonaisia kuukausia');
 const start=toDay(input.startDate);
 if(openingCents>=principalCents)throw Error('Avausmaksu ei voi olla yhtä suuri tai suurempi kuin luoton määrä');
 const monthlyRate=nominalPct/1200;
 const annuity=monthlyRate===0?principalCents/months:principalCents*monthlyRate/(1-Math.pow(1+monthlyRate,-months));
 let balance=principalCents, interestCents=0, repaymentsCents=0;
 const payments=[];
 for(let index=1;index<=months;index++){
  const interest=roundCents(balance*monthlyRate);
  let principal= index===months?balance:Math.max(0,Math.min(balance,roundCents(annuity)-interest));
  if(principal===0&&balance>0&&index<months)throw Error('Annuiteetti ei kata korkoa');
  const repayment=principal+interest;
  const total=repayment+monthlyFeeCents;
  balance-=principal;interestCents+=interest;repaymentsCents+=repayment;
  const date=nextMonthlyDate(start,index);
  payments.push({index,date:date.toISOString().slice(0,10),days:daysBetween(start,date),repaymentCents:repayment,interestCents:interest,feeCents:monthlyFeeCents,totalCents:total});
 }
 const proceedsCents=principalCents-openingCents;
 // Decree 1123/2016 Annex I permits 12 equal months per year for equally spaced monthly instalments.
 // We model the nth instalment as n/12 years after drawdown. Dates are retained for
 // instalment display and preliminary fee-cap day counts, not APR exponents.
 const npv=annual=>payments.reduce((sum,p)=>sum+p.totalCents/Math.pow(1+annual,p.index/12),0)-proceedsCents;
 let lo=0,hi=1;
 while(npv(hi)>0&&hi<1000000)hi*=2;
 if(npv(hi)>0)throw Error('Todellista vuosikorkoa ei saada rajattua');
 for(let k=0;k<90;k++){const mid=(lo+hi)/2;if(npv(mid)>0)lo=mid;else hi=mid}
 const aprPct=(lo+hi)*50;
 const otherCostsCents=openingCents+months*monthlyFeeCents;
 const totalCostsCents=interestCents+otherCostsCents;
 const totalRepayCents=repaymentsCents+otherCostsCents+openingCents;
 return {principalCents,nominalPct,openingCents,monthlyFeeCents,months,startDate:input.startDate,
  aprPct,totalCostsCents,otherCostsCents,interestCents,totalRepayCents,netProceedsCents:proceedsCents,
  payments,monthlyPaymentFirstCents:payments[0].totalCents,monthlyPaymentLastCents:payments.at(-1).totalCents};
}

/**
 * Preliminary KSL 7:17a screening for a new non-mortgage Finnish consumer
 * instalment loan made in 2026 H2, excludes old agreements and exceptions.
 * Fee restriction is checked on the whole term and in each 12-month bucket.
 * The legal interpretation, exact term and contract must be independently reviewed.
 */
export function screen2026CostCap(result,{eligible=true}={}){
 if(!eligible||result.startDate<'2026-07-01'||result.startDate>'2026-12-31')
  return {status:'NOT_ASSESSED',rateStatus:'NOT_ASSESSED',feeStatus:'NOT_ASSESSED',reason:'Soveltamisala tai viitekoron voimassaolojakso vaatii erillisen arvion'};
 const nominalCapPct=RATE_CEILING_2026_H2;
 const rateStatus=result.nominalPct<=nominalCapPct+1e-10?'PASS':'EXCEEDS';
 const days=result.payments.at(-1).days;
 const dailyLimitCents=result.principalCents*0.0001*days;
 // KSL permits up to EUR 5 in other costs when contractual duration >=30 days.
 const lifetimeLimitCents=Math.max(days>=30?500:0,dailyLimitCents);
 const buckets=new Map();
 buckets.set(0,result.openingCents);
 for(const p of result.payments){
  const bucket=Math.floor((p.index-1)/12);
  buckets.set(bucket,(buckets.get(bucket)||0)+p.feeCents);
 }
 const annualExceeds=[...buckets.values()].some(total=>total>15000);
 const feeStatus=result.otherCostsCents<=lifetimeLimitCents+1e-8&&!annualExceeds?'PASS':'EXCEEDS';
 return {status:rateStatus==='PASS'&&feeStatus==='PASS'?'PRELIMINARY_PASS':'EXCEEDS',
  rateStatus,feeStatus,nominalCapPct,referencePct:REFERENCE_RATE_2026_H2,
  feeLifetimeLimitCents:lifetimeLimitCents,annualCostCapCents:15000,
  reason:'Alustava kustannuskaton seulonta: soveltamisala, sopimusehdot, lisäkulut ja tarkka lainmukainen laskenta tarkistettava'};
}
export function rankLoans(results){
 return results.map((result,i)=>({...result,originalIndex:i})).sort((a,b)=>a.aprPct-b.aprPct||a.totalCostsCents-b.totalCostsCents);
}

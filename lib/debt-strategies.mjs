/**
 * Synthetic-only debt paydown. All money stored as integer euro cents.
 * Estimates monthly fixed-rate interest; never assumes missing credit terms.
 */
const round=value=>Math.round(value);
function cents(euro,label,min=0,max=1e7){
 if(typeof euro!=='number'||!Number.isFinite(euro)||euro<min||euro>max)throw Error(label+': virheellinen summa');
 return round(euro*100);
}
function amount(x,label,min=0,max=100){
 if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw Error(label+': virheellinen arvo');
 return x;
}
function validateMonth(text){
 if(!/^\d{4}-\d{2}$/.test(text)||!Number.isFinite(Date.parse(text+'-01T00:00:00Z')))throw Error('Aloituskuukausi puuttuu');
 return text;
}
function addMonth(month,index){
 const [year,m]=month.split('-').map(Number);
 return new Date(Date.UTC(year,m-1+index,1)).toISOString().slice(0,7);
}
function legalLoan(loan){
 if(typeof loan.id!=='string'||!loan.id||typeof loan.label!=='string'||!loan.label)throw Error('Velan tunniste tai nimi puuttuu');
 return {id:loan.id,label:loan.label,
  balance:cents(loan.balanceEuro,'Velan pääoma',0,1000000),
  rate:amount(loan.nominalPct,'Nimelliskorko',0,100),
  minimum:cents(loan.minimumEuro,'Vähimmäismaksu',0,100000),
  fee:cents(loan.monthlyFeeEuro,'Tilinhoitomaksu',0,1000)};
}
function prioritize(state,method){
 return [...state].filter(x=>x.balance>0).sort((a,b)=>{
  if(method==='avalanche')return b.rate-a.rate||a.balance-b.balance||a.id.localeCompare(b.id);
  return a.balance-b.balance||b.rate-a.rate||a.id.localeCompare(b.id);
 });
}
function estimateRemainingApr(balance,periods){
 if(balance<=0||!periods.length)return 0;
 const net=periods.map((p,i)=>({value:p,index:i+1}));
 const npv=r=>net.reduce((sum,p)=>sum+p.value/Math.pow(1+r,p.index/12),0)-balance;
 let lo=0,hi=1;
 while(npv(hi)>0&&hi<100000)hi*=2;
 if(npv(hi)>0)return null;
 for(let i=0;i<80;i++){const mid=(lo+hi)/2;if(npv(mid)>0)lo=mid;else hi=mid}
 return (lo+hi)*50;
}
export function simulateDebtPlan(input,method='minimum'){
 if(!['minimum','avalanche','snowball'].includes(method))throw Error('Tuntematon strategia');
 if(!Array.isArray(input.loans)||input.loans.length<1||input.loans.length>20)throw Error('Velkalista puuttuu tai on liian suuri');
 if(new Set(input.loans.map(x=>x.id)).size!==input.loans.length)throw Error('Velkojen tunnisteet eivät ole yksilöllisiä');
 const income=cents(input.netIncomeEuro,'Nettotulot');
 const fixed=cents(input.fixedExpensesEuro,'Kiinteät elinkustannukset');
 const initialCash=cents(input.cashEuro,'Tilivarat');
 const buffer=cents(input.bufferEuro,'Puskurin turvaraja');
 const month=validateMonth(input.startMonth);
 const loans=input.loans.map(legalLoan);
 if(loans.every(x=>x.balance===0))throw Error('Kaikki velat ovat jo maksettuja');
 const totalAvailable=income-fixed;
 const minimumContractual=loans.filter(x=>x.balance>0).reduce((s,x)=>s+x.minimum,0);
 if(initialCash<buffer)return {status:'BUFFER_BELOW_LIMIT',reason:'Lähtötilanteen rahat alittavat turvarajan',method,minimumContractualCents:minimumContractual,availableCents:totalAvailable};
 if(totalAvailable<0)return {status:'NEGATIVE_CASHFLOW',reason:'Kiinteät menot ylittävät nettotulot',method,availableCents:totalAvailable,minimumContractualCents:minimumContractual};
 const schedule=[],state=loans.map(x=>({...x,initialBalance:x.balance,interestTotal:0,feesTotal:0,payments:[]}));
 let cash=initialCash,totalInterest=0,totalFees=0,totalPayments=0,lowestCash=initialCash;
 const MAX_MONTHS=360;
 for(let step=0;step<MAX_MONTHS;step++){
  const active=state.filter(x=>x.balance>0);
  if(!active.length){
   return {status:'OK',method,months:step,paidOffMonth:step?addMonth(month,step-1):null,
    interestCents:totalInterest,feesCents:totalFees,totalCostCents:totalInterest+totalFees,
    totalPaidCents:totalPayments,lowestCashCents:lowestCash,endingCashCents:cash,
    monthlyBudgetCents:totalAvailable,minimumContractualCents:minimumContractual,
    loans:state.map(x=>({id:x.id,label:x.label,interestCents:x.interestTotal,feeCents:x.feesTotal,
      remainingAprPct:estimateRemainingApr(x.initialBalance,x.payments.map(p=>p.paidCents))})),
    schedule};
  }
  const priorCash=cash;
  cash+=totalAvailable;
  const expenses=active.map(x=>{
   const interest=round(x.balance*x.rate/1200),fee=x.fee;
   const due=x.balance+interest+fee;
   const amountDue=Math.min(due,x.minimum);
   return {loan:x,interest,fee,due,minimumPayment:amountDue};
  });
  const minRequired=expenses.reduce((s,x)=>s+x.minimumPayment,0);
  if(minRequired>totalAvailable && cash-minRequired<buffer)
   return {status:'INSUFFICIENT_CAPACITY',method,reason:'Vähimmäismaksut vaarantavat puskurin',month:addMonth(month,step),minimumRequiredCents:minRequired,availableCents:totalAvailable};
  // Reserve the buffer before any payments; minimum obligations are met first.
  const minimumPaid=new Map();
  let paidThisMonth=0;
  for(const item of expenses){
   const x=item.loan;
   x.interestTotal+=item.interest;x.feesTotal+=item.fee;
   totalInterest+=item.interest;totalFees+=item.fee;
   x.balance+=item.interest+item.fee;
   const payment=Math.min(x.balance,item.minimumPayment);
   if(payment===0||payment<item.interest+item.fee && x.balance>payment){
    return {status:'NON_AMORTIZING',method,reason:'Vähimmäismaksu ei kata korkoja ja kuluja',month:addMonth(month,step),loan:x.label};
   }
   x.balance-=payment;paidThisMonth+=payment;minimumPaid.set(x.id,payment);
  }
  cash-=paidThisMonth;
  if(cash<buffer)return {status:'BUFFER_BREACH',method,reason:'Turvapuskuri alittuisi',month:addMonth(month,step)};
  let remaining=method==='minimum'?0:Math.max(0,Math.min(totalAvailable-paidThisMonth,cash-buffer));
  for(const x of prioritize(state,method)){
   if(remaining<=0)break;
   const extra=Math.min(x.balance,remaining);
   x.balance-=extra;paidThisMonth+=extra;remaining-=extra;minimumPaid.set(x.id,(minimumPaid.get(x.id)||0)+extra);
   cash-=extra;
  }
  // Money not allocated to debt payments remains cash, never negative.
  lowestCash=Math.min(lowestCash,cash);
  if(cash<buffer||!Number.isSafeInteger(cash))return {status:'BUFFER_BREACH',method,reason:'Turvapuskuri alittuisi',month:addMonth(month,step)};
  for(const x of active)x.payments.push({month:addMonth(month,step),paidCents:minimumPaid.get(x.id)||0});
  totalPayments+=paidThisMonth;
  schedule.push({month:addMonth(month,step),paidCents:paidThisMonth,cashCents:cash,
   balanceCents:state.reduce((s,x)=>s+x.balance,0)});
 }
 return {status:'TIMEOUT',method,reason:'Velat eivät lyhene 360 kuukaudessa'};
}
export function compareDebtStrategies(input){
 const methods=['minimum','avalanche','snowball'];
 const results=Object.fromEntries(methods.map(method=>[method,simulateDebtPlan(input,method)]));
 const reference=results.minimum;
 const comparison=Object.fromEntries(methods.map(method=>{
  const result=results[method];
  return [method,{...result,savingsCents:reference.status==='OK'&&result.status==='OK'?reference.totalCostCents-result.totalCostCents:null}];
 }));
 return {results:comparison,allFeasible:methods.every(m=>comparison[m].status==='OK')};
}

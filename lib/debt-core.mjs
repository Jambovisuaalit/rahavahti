/** Rahavahti: viitteellinen luottolaskenta, ei tuotantotallennusta tai oikeudellista ratkaisua. */
const okC=x=>Number.isSafeInteger(x)&&x>=0;
const okR=x=>Number.isFinite(x)&&x>=0&&x<=100;
const validate=(x,k)=>{if(!okC(x))throw Error(k+" ei kelpaa");return x};
const rnd=x=>{if(!Number.isFinite(x)||Math.abs(x)>Number.MAX_SAFE_INTEGER)throw Error("Laskennan raja ylittyy");return Math.round(x)};
export const REFERENCE_2026={pct:2.5,from:"2026-07-01",to:"2026-12-31",source:"https://www.suomenpankki.fi/fi/ajankohtaista/lehdistotiedotteet-ja-uutiset/tiedotteet/2026/korkolain-mukainen-viitekorko-ja-viivastyskorot-1.7.31.12.2026/"};

export function amortization({principalCents,nominalAnnualPct,openingFeeCents=0,monthlyFeeCents=0,months}){
 validate(principalCents,"Pääoma");validate(openingFeeCents,"Avausmaksu");validate(monthlyFeeCents,"Tilinhoito");
 if(!principalCents||!okR(nominalAnnualPct)||!Number.isInteger(months)||months<1||months>600)throw Error("Lainan lähtötiedot eivät kelpaa");
 const r=nominalAnnualPct/1200;
 const payment=r?principalCents*r/(1-Math.pow(1+r,-months)):principalCents/months;
 const base=rnd(payment);let remaining=principalCents,interestTotal=0,paid=0;const payments=[];
 for(let m=1;m<=months;m++){
  const interest=rnd(remaining*r),principal=m===months?remaining:Math.min(remaining,Math.max(0,base-interest));
  remaining-=principal;const amount=principal+interest+monthlyFeeCents;
  paid+=amount;interestTotal+=interest;
  payments.push({month:m,amountCents:amount,interestCents:interest,principalCents:principal,feeCents:monthlyFeeCents,balanceCents:remaining});
 }
 const fees=openingFeeCents+months*monthlyFeeCents;
 return {payments,monthlyPaymentCents:payments[0].amountCents,totalInterestCents:interestTotal,totalFeesCents:fees,totalCostCents:interestTotal+fees,totalPaidCents:paid+openingFeeCents,netProceedsCents:principalCents-openingFeeCents};
}
export function effectiveApr(input){
 const a=amortization(input);if(a.netProceedsCents<=0)return null;
 const diff=r=>a.payments.reduce((s,p)=>s+p.amountCents/Math.pow(1+r,p.month),0)-a.netProceedsCents;
 if(diff(0)<-0.0001)return null;
 let lo=0,hi=1;while(diff(hi)>0&&hi<1024)hi*=2;
 if(diff(hi)>0)return null;
 for(let k=0;k<100;k++){const mid=(lo+hi)/2;if(diff(mid)>0)lo=mid;else hi=mid}
 return 100*(Math.pow(1+(lo+hi)/2,12)-1);
}
export function preliminaryCapCheck({principalCents,nominalAnnualPct,openingFeeCents=0,monthlyFeeCents=0,months,referencePct=2.5,inScope=null,contractDate=null}){
 validate(principalCents,"Lainamäärä");validate(openingFeeCents,"Avausmaksu");validate(monthlyFeeCents,"Tilinhoito");
 if(!principalCents||!okR(nominalAnnualPct)||!okR(referencePct)||!Number.isInteger(months)||months<1||months>600)throw Error("Korkotarkistuksen lähtötiedot eivät kelpaa");
 const nominalCapPct=Math.min(20,15+referencePct),days=Math.round(months*365.2425/12);
 const fees=openingFeeCents+months*monthlyFeeCents;
 // Arvio. Lopullinen tarkastus vaatii sopimus- ja erääntymispäivät.
 const feeLimit=Math.min(Math.max(principalCents*0.0001*days,days>=30?500:0),15000*Math.ceil(months/12));
 const flags=[];
 if(nominalAnnualPct>nominalCapPct+1e-9)flags.push("Nimelliskorko ylittää vertailukauden enimmäismäärän");
 if(fees>feeLimit+1)flags.push("Muut luottokustannukset ylittävät alustavan kulurajan");
 if(monthlyFeeCents*12>15000)flags.push("Tilinhoito ylittää 150 €/vuosi");
 const applicable=inScope===true&&typeof contractDate==="string"&&contractDate>="2023-10-01"&&contractDate<="2026-11-07";
 return {nominalCapPct,referencePct,flags,assumedDays:days,feeLimitCents:rnd(feeLimit),status:inScope===false?"EI_SOVELLU":applicable?(flags.length?"TARKISTETTAVA":"ALUSTAVASTI_RAJOISSA"):"SOVELTUVUUS_SELVITETTÄVÄ",provisional:true,note:"Nimelliskorkoa verrataan korkokattoon. Todellinen vuosikorko saa olla suurempi. Kulurajat ja soveltamisala vaativat sopimuskohtaisen tarkastuksen."};
}
export function compareOffers(offers){
 if(!Array.isArray(offers)||!offers.length||offers.length>20)throw Error("Anna 1–20 tarjousta");
 return offers.map((o,i)=>({id:o.id??String(i+1),...amortization(o),effectiveAprPct:effectiveApr(o),capCheck:preliminaryCapCheck(o)})).sort((a,b)=>a.totalCostCents-b.totalCostCents);
}
function debtsOk(debts){
 if(!Array.isArray(debts)||!debts.length||debts.length>30)throw Error("Anna 1–30 velkaa");
 const ids=new Set();
 return debts.map((d,i)=>{
  if(typeof d.id!=="string"||!d.id.trim()||ids.has(d.id)||!okC(d.balanceCents)||!d.balanceCents||!okR(d.nominalAnnualPct)||!okC(d.minPaymentCents)||!okC(d.monthlyFeeCents??0))throw Error("Velan "+(i+1)+" tiedot eivät kelpaa");
  ids.add(d.id);return {...d,monthlyFeeCents:d.monthlyFeeCents??0};
 });
}
export function repaymentPlan(debts,{strategy="avalanche",monthlyBudgetCents,maxMonths=600}={}){
 const rows=debtsOk(debts);validate(monthlyBudgetCents,"Maksubudjetti");
 if(!["avalanche","snowball"].includes(strategy)||!Number.isInteger(maxMonths)||maxMonths<1||maxMonths>600)throw Error("Virheellinen maksustrategia");
 const minimum=rows.reduce((sum,d)=>sum+d.minPaymentCents,0);
 if(monthlyBudgetCents<minimum)return {status:"EI_TOTEUTUSKELPOINEN",reason:"Budjetti alittaa vähimmäiserien yhteissumman",minimumCents:minimum};
 const state=rows.map(d=>({...d,paidOffMonth:null,interestCents:0,feesCents:0,paidCents:0}));const schedule=[];
 for(let month=1;month<=maxMonths;month++){
  const active=state.filter(d=>d.balanceCents>0);if(!active.length)break;
  let budget=monthlyBudgetCents,paid=0,monthInterest=0,monthFees=0;
  for(const d of active){const interest=rnd(d.balanceCents*d.nominalAnnualPct/1200);d.balanceCents+=interest+d.monthlyFeeCents;d.interestCents+=interest;d.feesCents+=d.monthlyFeeCents;monthInterest+=interest;monthFees+=d.monthlyFeeCents}
  for(const d of active){const p=Math.min(d.balanceCents,d.minPaymentCents);budget-=p;paid+=p;d.balanceCents-=p;d.paidCents+=p}
  if(budget<0)return {status:"EI_TOTEUTUSKELPOINEN",reason:"Minimierät eivät mahdu kuukausibudjettiin",month};
  const order=[...active].sort((a,b)=>strategy==="avalanche"?b.nominalAnnualPct-a.nominalAnnualPct||a.balanceCents-b.balanceCents:a.balanceCents-b.balanceCents||b.nominalAnnualPct-a.nominalAnnualPct);
  for(const d of order){const p=Math.min(budget,d.balanceCents);d.balanceCents-=p;d.paidCents+=p;paid+=p;budget-=p}
  for(const d of active)if(d.balanceCents===0&&d.paidOffMonth===null)d.paidOffMonth=month;
  schedule.push({month,paidCents:paid,interestCents:monthInterest,feesCents:monthFees,remainingCents:state.reduce((s,d)=>s+d.balanceCents,0)});
 }
 if(state.some(d=>d.balanceCents>0))return {status:"EI_MAKSETTU",reason:"Velkoja jäi jäljelle enimmäistarkasteluajalla",remainingCents:state.reduce((s,d)=>s+d.balanceCents,0)};
 return {status:"VALMIS",strategy,months:schedule.length,totalInterestCents:state.reduce((s,d)=>s+d.interestCents,0),totalFeesCents:state.reduce((s,d)=>s+d.feesCents,0),totalPaidCents:state.reduce((s,d)=>s+d.paidCents,0),payoffOrder:state.sort((a,b)=>a.paidOffMonth-b.paidOffMonth).map(d=>({id:d.id,paidOffMonth:d.paidOffMonth})),schedule};
}
export function compareStrategies(debts,monthlyBudgetCents){
 const avalanche=repaymentPlan(debts,{strategy:"avalanche",monthlyBudgetCents}),snowball=repaymentPlan(debts,{strategy:"snowball",monthlyBudgetCents});
 return {avalanche,snowball,recommended:avalanche.status==="VALMIS"&&snowball.status==="VALMIS"?(avalanche.totalInterestCents+avalanche.totalFeesCents<=snowball.totalInterestCents+snowball.totalFeesCents?"avalanche":"snowball"):null};
}
export function consolidation({debts,newOffer,monthlyBudgetCents,payoffFeesCents=0}){
 const current=debtsOk(debts);validate(payoffFeesCents,"Kuittauskulut");
 const original=repaymentPlan(current,{strategy:"avalanche",monthlyBudgetCents});
 const principal=current.reduce((s,d)=>s+d.balanceCents,0)+payoffFeesCents;
 if(newOffer.principalCents!==principal)throw Error("Yhdistelylainan summan on katettava kaikki velat ja kuittauskulut");
 const next=amortization(newOffer);
 if(original.status!=="VALMIS")return {status:"EI_VERTAILUKELPOINEN",reason:"Nykyistä takaisinmaksuohjelmaa ei voitu laskea",newOffer:next};
 const oldCost=original.totalInterestCents+original.totalFeesCents,newCost=next.totalCostCents+payoffFeesCents;
 return {status:"VERTAILTU",savingsCents:oldCost-newCost,oldCostCents:oldCost,newCostCents:newCost,oldMonths:original.months,newMonths:newOffer.months,newMonthlyCents:next.monthlyPaymentCents,oldBudgetCents:monthlyBudgetCents,newOffer:next,note:"Vertailussa laina-ajat eroavat mahdollisesti. Säästö ei tarkoita lainan hyväksyntää."};
}
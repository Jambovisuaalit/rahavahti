"use client";
import {useMemo,useState} from "react";
// @ts-ignore JS reference engine is tested with node:test.
import {compareOffers,compareStrategies,consolidation,preliminaryCapCheck} from "../lib/debt-core.mjs";
type Offer={id:string;principal:string;rate:string;months:string;opening:string;fee:string};
type Debt={id:string;balance:string;rate:string;minimum:string;fee:string};
const euros=(v:number)=>new Intl.NumberFormat("fi-FI",{style:"currency",currency:"EUR"}).format(v/100);
const percent=(v:number|null)=>v===null?"Ei laskettavissa":new Intl.NumberFormat("fi-FI",{minimumFractionDigits:2,maximumFractionDigits:2}).format(v)+" %";
function cents(value:string){const s=value.trim().replace(/[\s\u00a0\u202f]/g,"").replace(",",".");if(!/^\d+(\.\d{1,2})?$/.test(s))throw Error("Anna summa euroina, esim. 125,50");const n=Math.round(Number(s)*100);if(!Number.isSafeInteger(n))throw Error("Summa on liian suuri");return n}
function pcent(s:string){const n=Number(s.replace(",","."));if(!Number.isFinite(n)||n<0||n>100)throw Error("Korkoprosentin on oltava välillä 0–100");return n}
function months(s:string){const n=Number(s);if(!Number.isInteger(n)||n<1||n>600)throw Error("Laina-ajan on oltava 1–600 kuukautta");return n}
function Field({name,value,set}:{name:string;value:string;set:(value:string)=>void}){return <label style={{display:"grid",gap:5,margin:"5px 0",fontWeight:500}}>{name}<input value={value} onChange={e=>set(e.target.value)} inputMode="decimal"/></label>}
const defaultOffers:Offer[]=[{id:"Tarjous A (demo)",principal:"3000",rate:"10",months:"24",opening:"50",fee:"3"},{id:"Tarjous B (demo)",principal:"3000",rate:"12",months:"24",opening:"0",fee:"0"}];
const defaultDebts:Debt[]=[{id:"Laina A (demo)",balance:"1800",rate:"19",minimum:"80",fee:"3"},{id:"Laina B (demo)",balance:"900",rate:"8",minimum:"45",fee:"0"}];
export default function DebtTools(){
 const [offers,setOffers]=useState(defaultOffers),[debts,setDebts]=useState(defaultDebts);
 const [budget,setBudget]=useState("220"),[rate,setRate]=useState("7"),[term,setTerm]=useState("36"),[opening,setOpening]=useState("49"),[fee,setFee]=useState("2"),[payoffFees,setPayoffFees]=useState("0");
 const [scope,setScope]=useState("unknown"),[contractDate,setContractDate]=useState("2026-11-07");
 const changeOffer=(i:number,k:keyof Offer,v:string)=>setOffers(xs=>xs.map((x,j)=>i===j?{...x,[k]:v}:x));
 const changeDebt=(i:number,k:keyof Debt,v:string)=>setDebts(xs=>xs.map((x,j)=>i===j?{...x,[k]:v}:x));
 const result:any=useMemo(()=>{
  try{
   const o=offers.map(x=>({id:x.id,principalCents:cents(x.principal),nominalAnnualPct:pcent(x.rate),months:months(x.months),openingFeeCents:cents(x.opening),monthlyFeeCents:cents(x.fee)}));
   const d=debts.map(x=>({id:x.id,balanceCents:cents(x.balance),nominalAnnualPct:pcent(x.rate),minPaymentCents:cents(x.minimum),monthlyFeeCents:cents(x.fee)}));
   const capCheck:any=preliminaryCapCheck;
   const offersCompared=compareOffers(o).map((x:any)=>({...x,capCheck:capCheck({...o.find(y=>y.id===x.id),inScope:scope==="unknown"?null:scope==="yes",contractDate})}));
   const monthlyBudget=cents(budget),settlementFees=cents(payoffFees);
   const strategies=compareStrategies(d,monthlyBudget);
   const allPrincipal=d.reduce((s,x)=>s+x.balanceCents,0)+settlementFees;
   const combined=consolidation({debts:d,monthlyBudgetCents:monthlyBudget,payoffFeesCents:settlementFees,newOffer:{principalCents:allPrincipal,nominalAnnualPct:pcent(rate),months:months(term),openingFeeCents:cents(opening),monthlyFeeCents:cents(fee)}});
   return {offersCompared,strategies,combined,error:null};
  }catch(e){return {offersCompared:null,strategies:null,combined:null,error:e instanceof Error?e.message:"Virheelliset lähtötiedot"}}
 },[offers,debts,budget,rate,term,opening,fee,payoffFees,scope,contractDate]);
 return <div style={{display:"grid",gap:24}}>
  <div className="info"><strong>DEMO – ei tuotantotietoja.</strong> Kaikki laskenta tapahtuu selaimessa ja esimerkkitiedot ovat kuvitteellisia. Tietoja ei lähetetä Neoniin. Vuosikorko on laskennallinen arvio kuukausieriin perustuen, ei virallinen luottoasiakirjan vuosikorko.</div>
  <section className="card"><h2>Tarjousten kululaskuri</h2>
   <p className="muted">Vertaile nimelliskorkoa, avausmaksua, tilinhoitokuluja, kuukausierää ja kokonaiskuluja. Korkokatto 7.11.2026: soveltuvissa luotoissa nimelliskorko enintään 17,5 %.</p>
   <div className="fields"><label>Sovelletaanko nykyistä kuluttajaluottojen korkosääntelyä?<select value={scope} onChange={e=>setScope(e.target.value)}><option value="unknown">Ei tiedossa</option><option value="yes">Kyllä (alustava oletus)</option><option value="no">Ei</option></select></label><Field name="Sopimuspäivä YYYY-MM-DD" value={contractDate} set={setContractDate}/></div>
   {offers.map((x,i)=><div key={i} style={{padding:14,border:"1px solid #dde4ef",borderRadius:12,marginTop:12}}><div className="fields">
    <Field name="Tarjouksen nimi" value={x.id} set={v=>changeOffer(i,"id",v)}/><Field name="Lainamäärä €" value={x.principal} set={v=>changeOffer(i,"principal",v)}/>
    <Field name="Nimelliskorko %" value={x.rate} set={v=>changeOffer(i,"rate",v)}/><Field name="Laina-aika kk" value={x.months} set={v=>changeOffer(i,"months",v)}/>
    <Field name="Avausmaksu €" value={x.opening} set={v=>changeOffer(i,"opening",v)}/><Field name="Tilinhoitomaksu €/kk" value={x.fee} set={v=>changeOffer(i,"fee",v)}/>
   </div></div>)}
   <button disabled={offers.length>=20} onClick={()=>setOffers(xs=>[...xs,{id:"Tarjous "+(xs.length+1),principal:"3000",rate:"10",months:"24",opening:"0",fee:"0"}])}>Lisää tarjous</button>
   {result.offersCompared&&<div className="tablewrap" style={{marginTop:18}}><table><thead><tr><th>Tarjous</th><th>Arvioitu todellinen vuosikorko</th><th>Kuukausierä</th><th>Korot ja kulut</th><th>Alustava korko-/kulutarkistus</th></tr></thead><tbody>
    {result.offersCompared.map((x:any)=><tr key={x.id}><td>{x.id}</td><td>{percent(x.effectiveAprPct)}</td><td>{euros(x.monthlyPaymentCents)}</td><td>{euros(x.totalCostCents)}</td><td>{x.capCheck.status}{x.capCheck.flags.length?": "+x.capCheck.flags.join("; "):""}</td></tr>)}
   </tbody></table></div>}
   <p className="muted">Korkokatto koskee nimelliskorkoa, ei todellista vuosikorkoa. Kulurajojen ja poikkeusten arvio vaatii sopimusehdot.</p>
  </section>
  <section className="card"><h2>Takaisinmaksustrategiat</h2><p className="muted">Vyörytys kohdentaa lisämaksun suurimpaan korkoon. Lumipallo kohdentaa lisämaksun pienimpään velkasaldoon. Minimierät maksetaan ensin.</p>
   {debts.map((x,i)=><div key={i} style={{padding:14,border:"1px solid #dde4ef",borderRadius:12,marginTop:12}}><div className="fields">
    <Field name="Velan nimi" value={x.id} set={v=>changeDebt(i,"id",v)}/><Field name="Velkasaldo €" value={x.balance} set={v=>changeDebt(i,"balance",v)}/>
    <Field name="Nimelliskorko %" value={x.rate} set={v=>changeDebt(i,"rate",v)}/><Field name="Vähimmäiserä €/kk" value={x.minimum} set={v=>changeDebt(i,"minimum",v)}/>
    <Field name="Tilinhoito €/kk" value={x.fee} set={v=>changeDebt(i,"fee",v)}/>
   </div></div>)}
   <button disabled={debts.length>=30} onClick={()=>setDebts(xs=>[...xs,{id:"Velka "+(xs.length+1),balance:"500",rate:"15",minimum:"25",fee:"0"}])}>Lisää velka</button>
   <div style={{marginTop:18}}><Field name="Koko kuukausibudjetti velkoihin €" value={budget} set={setBudget}/></div>
   {result.strategies&&<div className="grid" style={{marginTop:18}}>{([["Vyörytys",result.strategies.avalanche],["Lumipallo",result.strategies.snowball]] as const).map(([label,x]:any)=><div className="summary" key={label}><b>{label}</b><p>{x.status==="VALMIS"?x.months+" kuukautta":x.reason}</p>{x.status==="VALMIS"&&<><div className="stat">{euros(x.totalInterestCents+x.totalFeesCents)}</div><p>Korot ja kulut yhteensä</p><p>Järjestys: {x.payoffOrder.map((z:any)=>z.id).join(" → ")}</p></>}</div>)}</div>}
   {result.strategies?.recommended&&<p><b>Kustannusten perusteella suositeltava: {result.strategies.recommended==="avalanche"?"vyörytys":"lumipallo"}.</b></p>}
  </section>
  <section className="card"><h2>Yhdistelylaskuri</h2><p className="muted">Vertailussa oletetaan, että uusi laina kuittaa nykyiset velat ja mahdolliset kuittauskulut.</p>
   <div className="fields"><Field name="Uuden lainan nimelliskorko %" value={rate} set={setRate}/><Field name="Laina-aika kk" value={term} set={setTerm}/><Field name="Avausmaksu €" value={opening} set={setOpening}/><Field name="Tilinhoito €/kk" value={fee} set={setFee}/><Field name="Ennenaikaisen kuittauksen kulut €" value={payoffFees} set={setPayoffFees}/></div>
   {result.combined?.status==="VERTAILTU"&&<div className="summary"><p>Arvioitu kokonaiskulusäästö (negatiivinen = lisäkulu)</p><div className="stat">{euros(result.combined.savingsCents)}</div>
    <p>Nykyisten velkojen jäljellä olevat korot ja kulut: {euros(result.combined.oldCostCents)} / {result.combined.oldMonths} kk</p>
    <p>Yhdistelylainan kulut ja kuittauskulut: {euros(result.combined.newCostCents)} / {result.combined.newMonths} kk</p>
    <p>Uusi kuukausierä {euros(result.combined.newMonthlyCents)}, vertailubudjetti {euros(result.combined.oldBudgetCents)}.</p>
    <p>Vertailu perustuu eri maksuaikoihin ja oletettuihin ehtoihin. Säästö ei ole luottopäätös.</p></div>}
   {result.combined?.status!=="VERTAILTU"&&result.combined&&<p>{result.combined.reason}</p>}
  </section>
  {result.error&&<p className="error" role="alert">{result.error}</p>}
  <div className="info"><strong>Ostoauditoinnin yhteys:</strong> ennustettaessa hankinnan maksukykyä velkojen minimierät ja muut erääntyvät maksut on huomioitava. Tämä laskentaversio ei kirjoita velkoja kassavirtaan; integraatio edellyttää hyväksyttyä tietoturvaporttia.</div>
 </div>;
}
'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
// @ts-ignore -- JS calculation core is tested through node and Playwright.
import {simulateLoan,screen2026CostCap,rankLoans,RATE_CEILING_2026_H2,REFERENCE_RATE_2026_H2} from '../../lib/loan-costs.mjs';

type Offer={id:string;label:string;amountEuro:number;nominalPct:number;openingEuro:number;monthlyFeeEuro:number;months:number;startDate:string;eligible:boolean};
const EXAMPLES:Offer[]=[
 {id:'a',label:'Vaihtoehto A (demo)',amountEuro:2000,nominalPct:10,openingEuro:0,monthlyFeeEuro:0,months:24,startDate:'2026-11-07',eligible:true},
 {id:'b',label:'Vaihtoehto B (demo)',amountEuro:2000,nominalPct:9,openingEuro:25,monthlyFeeEuro:3,months:24,startDate:'2026-11-07',eligible:true},
];
const money=(c:number)=>new Intl.NumberFormat('fi-FI',{style:'currency',currency:'EUR'}).format(c/100);
const percent=(x:number)=>new Intl.NumberFormat('fi-FI',{minimumFractionDigits:2,maximumFractionDigits:2}).format(x)+' %';
const stateText=(s:string)=>s==='PASS'?'Rajan sisällä':s==='EXCEEDS'?'Raja ylittyy':'Ei arvioitu';
export default function LoanComparisonPage(){
 const [offers,setOffers]=useState<Offer[]>(EXAMPLES.map(x=>({...x})));
 const [forceUnsupported,setForceUnsupported]=useState(false);
 const calculations=useMemo(()=>offers.map(offer=>{
   try{
    const result=simulateLoan(offer);
    const legality=screen2026CostCap(result,{eligible:offer.eligible&&!forceUnsupported});
    return {offer,result,legality,error:null as string|null};
   }catch(e){return {offer,result:null,legality:null,error:e instanceof Error?e.message:'Laskenta epäonnistui'}}
 }),[offers,forceUnsupported]);
 const ranked=useMemo(()=>rankLoans(calculations.filter(x=>x.result!==null).map(x=>x.result)),[calculations]);
 function change(id:string,key:keyof Offer,value:string|boolean){
  setOffers(list=>list.map(x=>x.id!==id?x:{...x,[key]:key==='eligible'?value:key==='label'||key==='startDate'?value:Number(value)}));
 }
 function reset(){setOffers(EXAMPLES.map(x=>({...x})));setForceUnsupported(false)}
 return <main id="main-content">
  <div className="page-eyebrow">LUOTOT / SYNTEETTINEN LASKENTA</div>
  <div className="page-heading"><div><h1>Todellinen vuosikorko ja lainavertailu</h1>
   <p className="muted">Kertaluoton annuiteettimalli · kuvitteelliset lainatarjoukset</p></div><span className="demo-tag">DEMO · HOLD</span></div>
  <div className="info"><b>HOLD – ei oikeita taloustietoja.</b> Laskuri käyttää vain synteettisiä lainaehtoja. Se ei hae luottotietoja, arvioi luottokelpoisuutta eikä tee luottopäätöksiä. Todellinen vuosikorko on tässä mallinnettu laskennallinen arvio, ei virallisen luottosopimuksen APR-ilmoitus.</div>
  <section className="card" style={{marginTop:20}}>
   <h2>Lakisääteinen kustannusraja – soveltamisala</h2>
   <p>Uudet sääntelyn piiriin kuuluvat kuluttajaluotot, sopimuspäivä 01.07.–31.12.2026: <b>nimelliskoron yläraja {percent(RATE_CEILING_2026_H2)}</b> (= 15 prosenttiyksikköä + viitekorko {percent(REFERENCE_RATE_2026_H2)}, enintään 20 %).</p>
   <p className="muted">Luoton avausmaksu ja tilinhoitomaksut vaikuttavat todelliseen vuosikorkoon, mutta niitä arvioidaan lainmukaisuutta varten erillisen kulukaton perusteella. Korkokattoa ei verrata todelliseen vuosikorkoon.</p>
   <label className="duplicate-option"><input type="checkbox" checked={forceUnsupported} onChange={e=>setForceUnsupported(e.target.checked)}/> Tarkasteltava sopimus on vanha tai erityinen luottotyyppi – älä tee lakirajapäätelmää.</label>
   <p className="muted">Malli olettaa yhden noston, kiinteän nimelliskoron, kuukausittaisen tasalyhennys-/annuiteettiaikataulun, avausmaksun nostopäivänä ja kuukausittaisen tilinhoitomaksun. Ei sovellu suoraan jatkuvaan luottoon, asuntoluottoon, muuttuviin korkoihin tai sopimuskohtaisiin poikkeuksiin.</p>
   <p className="muted">Lähteet: <a href="https://finlex.fi/fi/lainsaadanto/saadoskokoelma/2023/449" target="_blank" rel="noopener noreferrer">KSL 7:17 a §</a> · <a href="https://www.suomenpankki.fi/fi/ajankohtaista/lehdistotiedotteet-ja-uutiset/tiedotteet/2026/korkolain-mukainen-viitekorko-ja-viivastyskorot-1.7.31.12.2026/" target="_blank" rel="noopener noreferrer">Suomen Pankki 1.7.–31.12.2026</a> · <a href="https://www.kkv.fi/kuluttaja-asiat/tietoa-ja-ohjeita-yrityksille/kuluttaja-asiamiehen-linjaukset/kuluttajaluottojen-tarjoaminen/" target="_blank" rel="noopener noreferrer">KKV: luottokustannukset</a>.</p>
  </section>
  <div className="grid" style={{marginTop:22}}>
   {offers.map((offer,i)=>{
    const found=calculations[i];
    return <section className="card" key={offer.id} aria-label={offer.label}>
     <div className="section-heading"><h2>{offer.label}</h2><span className="demo-tag">TESTI {offer.id.toUpperCase()}</span></div>
     <div className="fields">
      <div><label htmlFor={'principal-'+offer.id}>Lainapääoma (€)</label><input id={'principal-'+offer.id} type="number" min="100" max="100000" step="1" value={offer.amountEuro} onChange={e=>change(offer.id,'amountEuro',e.target.value)}/></div>
      <div><label htmlFor={'nominal-'+offer.id}>Nimelliskorko (% vuodessa)</label><input id={'nominal-'+offer.id} type="number" min="0" max="100" step="0.01" value={offer.nominalPct} onChange={e=>change(offer.id,'nominalPct',e.target.value)}/></div>
      <div><label htmlFor={'opening-'+offer.id}>Avausmaksu (€)</label><input id={'opening-'+offer.id} type="number" min="0" step="0.01" value={offer.openingEuro} onChange={e=>change(offer.id,'openingEuro',e.target.value)}/></div>
      <div><label htmlFor={'monthly-'+offer.id}>Tilinhoitomaksu (€/kk)</label><input id={'monthly-'+offer.id} type="number" min="0" step="0.01" value={offer.monthlyFeeEuro} onChange={e=>change(offer.id,'monthlyFeeEuro',e.target.value)}/></div>
      <div><label htmlFor={'months-'+offer.id}>Laina-aika (kuukautta)</label><input id={'months-'+offer.id} type="number" min="1" max="120" step="1" value={offer.months} onChange={e=>change(offer.id,'months',e.target.value)}/></div>
      <div><label htmlFor={'date-'+offer.id}>Sopimuspäivä</label><input id={'date-'+offer.id} type="date" value={offer.startDate} onChange={e=>change(offer.id,'startDate',e.target.value)}/></div>
     </div>
     <label className="duplicate-option"><input type="checkbox" checked={offer.eligible} onChange={e=>change(offer.id,'eligible',e.target.checked)}/> Uusi tavanomainen, korkokattosäännöksen piiriin kuuluva kuluttajaluotto</label>
     {found.error&&<p role="alert" className="error">{found.error}</p>}
     {found.result&&found.legality&&<div aria-label={'Laskelman tulos '+offer.id}>
      <div className="loan-results">
       <div><span>Arvioitu todellinen vuosikorko</span><strong>{percent(found.result.aprPct)}</strong></div>
       <div><span>Kuukausierä sisältäen kulut (1. kk)</span><strong>{money(found.result.monthlyPaymentFirstCents)}</strong></div>
       <div><span>Korot yhteensä</span><strong>{money(found.result.interestCents)}</strong></div>
       <div><span>Muut luottokustannukset yhteensä</span><strong>{money(found.result.otherCostsCents)}</strong></div>
       <div><span>Kokonaiskustannus</span><strong>{money(found.result.totalCostsCents)}</strong></div>
       <div><span>Takaisinmaksu yhteensä</span><strong>{money(found.result.totalRepayCents)}</strong></div>
      </div>
      <div className="loan-legal">
       <b>Korkokatto: {stateText(found.legality.rateStatus)}</b>
       <span>Muut luottokustannukset: {stateText(found.legality.feeStatus)}</span>
       <small>{found.legality.status==='EXCEEDS'?'Alustava rajanylitys – tarkistettava sopimus ja sääntelyn soveltuvuus':found.legality.reason}</small>
      </div>
     </div>}
    </section>
   })}
  </div>
  <section className="card" style={{marginTop:22}}>
   <h2>Tarjousten vertailu</h2>
   {ranked.length===2?<div className="loan-comparison">
    <p>Alhaisempi arvioitu todellinen vuosikorko: <b>{offers[ranked[0].originalIndex].label}</b>.</p>
    <p>APR-ero: <b>{percent(Math.abs(ranked[1].aprPct-ranked[0].aprPct))} prosenttiyksikköä vastaava lukuarvo</b>. Kulujen absoluuttinen vertailu on mielekäs vain samalla lainapääomalla ja laina-ajalla.</p>
    {offers[0].amountEuro!==offers[1].amountEuro||offers[0].months!==offers[1].months?<p className="info">Tarjouksilla on eri pääoma tai laina-aika. Kokonaiskulujen eurovertailu ei kerro yksin edullisuudesta.</p>:<p>Kokonaiskulujen ero: <b>{money(Math.abs(ranked[1].totalCostsCents-ranked[0].totalCostsCents))}</b>.</p>}
   </div>:<p className="muted">Täytä molemmat tarjoukset kelvollisilla synteettisillä arvoilla.</p>}
   <button type="button" onClick={reset}>Palauta synteettiset esimerkit</button>
   <p className="muted">Käytössä on päivien määrään perustuva kassavirtojen diskonttaus (365 päivän vuosipohja) ja kuukausittain senttiin pyöristetty annuiteettimalli. Laskenta ei kata lain edellyttämiä kaikkia poikkeusoletuksia, joten lakitestien tulos on alustava.</p>
   <p><Link href="/luotonantajat">Luotonantajahakemisto</Link></p>
  </section>
 </main>;
}

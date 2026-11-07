"use client";
import {useEffect,useState} from "react";
type Cpi={source:string;table:string;observationMonth:string;updatedAt:string;index:number;annualChangePercent:number;monthlyChangePercent:number;status:string;sourceUrl:string};
const number=(n:number)=>new Intl.NumberFormat("fi-FI",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
export default function InflaatioPage(){
  const [cpi,setCpi]=useState<Cpi|null>(null);
  const [message,setMessage]=useState("Haetaan Tilastokeskuksen inflaatiotietoja…");
  const [budget,setBudget]=useState("240");
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/public-data/inflation",{cache:"no-store",signal:controller.signal})
      .then(async r=>{if(!r.ok)throw Error("Tietoja ei voitu hakea");return r.json()})
      .then(p=>{if(p.dataMode!=="live_api_verified"||!p.observation)throw Error("Aineistoa ei varmennettu");setCpi(p.observation);setMessage("");})
      .catch(e=>{if(e?.name!=="AbortError")setMessage("Tilastokeskuksen vahvistettu aineisto ei ole saatavilla.");});
    return ()=>controller.abort();
  },[]);
  const euros=Number(budget.replace(",","."));
  const valid=budget.trim()!==""&&Number.isFinite(euros)&&euros>=0&&euros<=100000;
  return <main style={{maxWidth:840,margin:"48px auto",padding:"0 20px",fontFamily:"system-ui,sans-serif"}}>
    <p style={{fontSize:14,opacity:0.7}}>Tietovahti / Julkinen talousdata</p>
    <h1>Inflaatio ja oma ostovoima</h1>
    {message&&<p role="status">{message}</p>}
    {cpi&&<section style={{padding:24,border:"1px solid #8885",borderRadius:16,display:"grid",gap:16}}>
      <p>Tilastokeskuksen viimeisin vahvistettu kuukausihavainto: <strong>{cpi.observationMonth}</strong>.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:16}}>
        <div><small>Inflaatio vuodessa</small><h2>{number(cpi.annualChangePercent)} %</h2></div>
        <div><small>Kuukausimuutos</small><h2>{number(cpi.monthlyChangePercent)} %</h2></div>
        <div><small>KHI 2025 = 100</small><h2>{number(cpi.index)}</h2></div>
      </div>
      <label htmlFor="budget">Oma kuukausibudjetti (€) – paikallinen havainnollistus</label>
      <input id="budget" value={budget} inputMode="decimal" onChange={e=>setBudget(e.target.value)} style={{padding:12}}/>
      {valid?<p>Jos oma ostoskori kallistuisi täsmälleen yleisen vuosimuutoksen verran, samaan ostovoimaan tarvittaisiin <strong>{number(euros*(1+cpi.annualChangePercent/100))} €</strong> kuukaudessa. Erotus olisi <strong>{number(euros*cpi.annualChangePercent/100)} €</strong>.</p>:<p role="alert">Syötä kelvollinen euromäärä.</p>}
      <p style={{fontSize:14,opacity:0.75}}>Kyse on havainnollistavasta laskelmasta, ei henkilökohtaisesta inflaatioennusteesta. Käyttäjän ostoskori voi kehittyä eri tavalla kuin yleinen kuluttajahintaindeksi. Budjettia ei tallenneta tai lähetetä Tilastokeskukselle.</p>
      <p style={{fontSize:13,opacity:0.75}}>Lähde: {cpi.source}, taulu {cpi.table}, päivitetty {cpi.updatedAt.slice(0,10)}.</p>
      <a href={cpi.sourceUrl} target="_blank" rel="noopener noreferrer">Tilastokeskuksen taulukot</a>
    </section>}
  </main>;
}

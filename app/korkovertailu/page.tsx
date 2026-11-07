"use client";
import { useEffect, useMemo, useState } from "react";
// @ts-ignore -- JS calculation core is tested with node --test.
import { compareLoanRate, BENCHMARKS } from "../../lib/market/interest-benchmark.mjs";
const fmt = (value: number) => new Intl.NumberFormat("fi-FI", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value);
type Metric = "nominal" | "apr";
export default function KorkovertailuPage() {
  const [rate, setRate] = useState("15");
  const [metric, setMetric] = useState<Metric>("nominal");
  const [balance, setBalance] = useState("3000");
  const [benchmarks,setBenchmarks] = useState<Record<string,{id:string;label:string;metric:string;debtType:string;annualRatePercent:number;observationMonth:string;source:string;sourceUrl:string;status:string}>>(BENCHMARKS);
  const [sourceStatus,setSourceStatus] = useState("Haetaan julkista korkoaineistoa…");
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/public-data/interest",{signal:controller.signal,cache:"no-store"})
      .then(async res=>{if(!res.ok)throw Error("Korkodatan haku epäonnistui");return res.json()})
      .then(body=>{
        if(!Array.isArray(body.observations)||body.observations.length!==2)throw Error("Puuttuva korkoaineisto");
        const map=Object.fromEntries(body.observations.map((r:{id:string})=>[r.id,r]));
        if(!map.consumer_nominal||!map.consumer_apr)throw Error("Puuttuva korkosarja");
        setBenchmarks(map);
        setSourceStatus(body.dataMode==="live_api_verified"?"Suomen Pankin live-rajapinnasta haettu tilasto":"Live-rajapinta ei käytettävissä – historiallinen tilastohavainto");
      }).catch(e=>{if(e?.name!=="AbortError")setSourceStatus("Live-dataa ei voitu tarkistaa – näytetään historiallinen tilastohavainto")});
    return ()=>controller.abort();
  },[]);

  const rateNumber = Number(rate.replace(",", "."));
  const balanceNumber = Number(balance.replace(",", "."));
  const result = useMemo(() => {
    try {
      if (!rate.trim() || !Number.isFinite(rateNumber)) throw Error("Syötä lainan korko");
      if (!balance.trim() || !Number.isFinite(balanceNumber) || balanceNumber < 0 || balanceNumber > 100000000) throw Error("Syötä kelvollinen lainasaldo");
      return { data: compareLoanRate({ annualRatePercent: rateNumber, metric, debtType: "consumer_loan", benchmarkId: metric === "nominal" ? "consumer_nominal" : "consumer_apr", benchmarks }), error: "" };
    } catch (e) { return { data: null, error: e instanceof Error ? e.message : "Vertailu epäonnistui" }; }
  }, [rateNumber, balanceNumber, metric, rate, balance, benchmarks]);
  const difference = result.data?.differencePercentagePoints ?? 0;
  return <main style={{maxWidth:840,margin:"48px auto",padding:"0 20px",fontFamily:"system-ui,sans-serif"}}>
    <p style={{fontSize:14,opacity:0.7}}>Tietovahti / Julkinen talousdata</p>
    <h1>Vertaa kulutusluottosi korkoa</h1><p role="status">{sourceStatus}</p>
    <p>Vertaa oman kulutusluottosi korkoa Suomen Pankin uusien kulutusluottosopimusten tilastolliseen keskiarvoon. Vertailu ei ole uusi lainatarjous.</p>
    <section style={{padding:24,border:"1px solid #8885",borderRadius:16,display:"grid",gap:14}}>
      <label htmlFor="rate-kind">Verrattava korkomittari</label>
      <select id="rate-kind" value={metric} onChange={e=>setMetric(e.target.value as Metric)} style={{padding:12}}>
        <option value="nominal">Nimelliskorko / sopimuskorko</option>
        <option value="apr">Todellinen vuosikorko</option>
      </select>
      <label htmlFor="my-rate">Oman kulutusluoton {metric==="nominal"?"sopimuskorko":"todellinen vuosikorko"} (%)</label>
      <input id="my-rate" value={rate} onChange={e=>setRate(e.target.value)} inputMode="decimal" style={{padding:12}}/>
      <label htmlFor="my-balance">Jäljellä oleva lainasaldo (€) — havainnollistavaa laskelmaa varten</label>
      <input id="my-balance" value={balance} onChange={e=>setBalance(e.target.value)} inputMode="decimal" style={{padding:12}}/>
      {result.error ? <p role="alert">{result.error}</p> : result.data && <>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:16}}>
          <div><small>Oma korko</small><h2>{fmt(rateNumber)} %</h2></div>
          <div><small>Tilaston keskikorko</small><h2>{fmt(result.data.benchmark.annualRatePercent)} %</h2></div>
          <div><small>Erotus</small><h2>{difference>0?"+":""}{fmt(difference)} %-yks.</h2></div>
        </div>
        <p>{difference>0?"Oma korkosi ylittää tilastollisen vertailuarvon.":difference<0?"Oma korkosi alittaa tilastollisen vertailuarvon.":"Oma korkosi vastaa tilastollista vertailuarvoa."}</p>
        {metric==="nominal" && <p style={{fontSize:14}}>Yksinkertainen vuosikorkoeron havainnollistus nykyiselle {fmt(balanceNumber)} € saldolle: <strong>{fmt(Math.abs(balanceNumber*difference/100))} € vuodessa</strong> ({difference>=0?"oma korkosi korkeampi":"oma korkosi matalampi"}). Ei maksusuunnitelma eikä säästölupaus: saldo muuttuu lyhennyksissä, eikä laskelma sisällä kuluja.</p>}
        <p style={{fontSize:13,opacity:0.8}}>Lähde: {result.data.benchmark.source}, havaintokuukausi {result.data.benchmark.observationMonth}. {result.data.benchmark.status==="verified_live_api"?"Suomen Pankin API:sta tarkistettu havainto.":"Historiallinen tilastohavainto, ei reaaliaikainen API-data."} Vertailussa on huomioitava lainan ehdot, luottokelpoisuus ja se, että tilasto koskee uusia sopimuksia.</p>
        <a href={result.data.benchmark.sourceUrl} target="_blank" rel="noopener noreferrer">Avaa Suomen Pankin lähdetaulukko</a>
      </>}
    </section>
    <p style={{fontSize:13,opacity:0.75}}>Tietoja käsitellään tässä näkymässä selaimessa. Näkymä ei tallenna annettuja velkatietoja eikä tee henkilökohtaisia luottorekisterikyselyjä.</p>
  </main>;
}

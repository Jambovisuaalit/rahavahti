"use client";
import {useEffect,useMemo,useState} from "react";
// @ts-ignore JS core is tested independently.
import {parseCSV,validateMappedRows} from "../../../lib/talous-core.mjs";
type Account={id:string;name:string};
type Mapping={date:number;amount:number;description:number;externalId:number};
const labels:{[K in keyof Mapping]:string}={date:"Kirjauspäivä",amount:"Summa",description:"Kuvaus",externalId:"Pankin yksilöivä tapahtumatunniste"};
export default function ImportPage(){
 const [accounts,setAccounts]=useState<Account[]>([]);
 const [accountId,setAccountId]=useState("");
 const [name,setName]=useState("Oma testitili");
 const [csv,setCsv]=useState("");
 const [filename,setFilename]=useState("");
 const [headers,setHeaders]=useState<string[]>([]);
 const [mapping,setMapping]=useState<Mapping>({date:0,amount:1,description:2,externalId:3});
 const [preview,setPreview]=useState<Array<{bookedOn:string;amountCents:number;description:string}>>([]);
 const [invalid,setInvalid]=useState(0);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 async function refresh(){
   try{const r=await fetch("/api/accounts",{cache:"no-store"});const j=await r.json();if(!r.ok)throw Error(j.error||"Tilien haku epäonnistui");
    setAccounts(j.accounts||[]);setAccountId(x=>x||j.accounts?.[0]?.id||"");
   }catch(e){setError(e instanceof Error?e.message:"Tilien haku epäonnistui")}
 }
 useEffect(()=>{void refresh()},[]);
 async function createAccount(){
   setError("");setMessage("");setBusy(true);
   try{const r=await fetch("/api/accounts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name})});
    const j=await r.json();if(!r.ok)throw Error(j.error||"Tilin luominen epäonnistui");
    await refresh();setAccountId(j.account.id);setMessage("Testitili luotu");
   }catch(e){setError(e instanceof Error?e.message:"Tilin luominen epäonnistui")}finally{setBusy(false)}
 }
 async function readFile(file:File|null){
   setCsv("");setHeaders([]);setPreview([]);setInvalid(0);setError("");setMessage("");
   if(!file)return;
   if(file.size>1_000_000){setError("CSV saa olla enintään 1 Mt");return}
   try{const raw=new TextDecoder("utf-8",{fatal:true}).decode(await file.arrayBuffer());
    const parsed=parseCSV(raw);if(parsed.rows.length<2)throw Error("CSV-tiedostossa ei ole tapahtumia");
    setFilename(file.name);setCsv(raw);setHeaders(parsed.rows[0]);
   }catch(e){setError(e instanceof Error?e.message:"CSV:n luku epäonnistui")}
 }
 useEffect(()=>{
   if(!csv)return;
   try{const p=parseCSV(csv);const r=validateMappedRows(p,mapping);setPreview(r.valid.slice(0,10));setInvalid(r.invalid.length)}
   catch{setPreview([]);setInvalid(1)}
 },[csv,mapping]);
 const safeMapping=useMemo(()=>new Set(Object.values(mapping)).size===4,[mapping]);
 async function save(){
   setError("");setMessage("");
   if(!accountId){setError("Valitse ensin testitili");return}
   if(!safeMapping||invalid){setError("Korjaa sarakekartoitus ja virheelliset rivit");return}
   setBusy(true);
   try{const r=await fetch("/api/import",{method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({accountId,csv,filename,mapping})});
    const j=await r.json();if(!r.ok)throw Error(j.error||"Tuonti epäonnistui");
    setMessage(j.status==="already_imported"?"Tämä tiedosto on jo tuotu":String(j.imported)+" tapahtumaa tallennettu, "+String(j.duplicates)+" aiempaa tapahtumaa ohitettu");
   }catch(e){setError(e instanceof Error?e.message:"Tuonti epäonnistui")}finally{setBusy(false)}
 }
 return <main><p><a href="/dashboard">← Takaisin</a></p><h1>CSV-tuonti</h1>
  <div className="info"><b>HOLD:</b> Älä lataa oikeaa tiliotetta. Käytä vain synteettistä testidataa. Tallennus on palvelimessa oletuksena estetty.</div>
  <section className="card" style={{marginTop:20}}><h2>1. Testitili</h2>
   <label htmlFor="account">Valitse tili</label><select id="account" value={accountId} onChange={e=>setAccountId(e.target.value)}>
    <option value="">Valitse testitili</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
   <label htmlFor="account-name">Uusi testitili</label><input id="account-name" value={name} onChange={e=>setName(e.target.value)}/>
   <button disabled={busy} onClick={createAccount}>Luo testitili</button>
  </section>
  <section className="card" style={{marginTop:20}}><h2>2. Valitse CSV</h2>
   <label htmlFor="file">UTF-8, enintään 1 Mt / 1000 tapahtumaa, pysyvä tapahtumatunniste pakollinen</label>
   <input id="file" type="file" accept=".csv,text/csv" onChange={e=>void readFile(e.target.files?.[0]??null)}/>
   {csv&&<><h2>3. Sarakkeet</h2><div className="fields">{(Object.keys(labels) as (keyof Mapping)[]).map(key=>
     <div key={key}><label htmlFor={key}>{labels[key]}</label><select id={key} value={mapping[key]} onChange={e=>setMapping(m=>({...m,[key]:Number(e.target.value)}))}>
     {headers.map((h,i)=><option value={i} key={i}>{h||("Sarake "+(i+1))}</option>)}</select></div>)}</div>
    {!safeMapping&&<p className="error">Jokaiselle kentälle on valittava eri sarake.</p>}
    <p>Esikatselussa {preview.length} tapahtumaa, virheellisiä rivejä {invalid}.</p>
    <div className="tablewrap"><table><thead><tr><th>Päivä</th><th>Kuvaus</th><th>Summa €</th></tr></thead><tbody>{preview.map((r,i)=><tr key={i}><td>{r.bookedOn}</td><td>{r.description}</td><td>{(r.amountCents/100).toLocaleString("fi-FI",{minimumFractionDigits:2})}</td></tr>)}</tbody></table></div>
    <button disabled={busy||!safeMapping||invalid>0} onClick={()=>void save()}>Tallenna tapahtumat (turvaportti)</button>
   </>}
  </section>{error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status">{message}</p>}
 </main>
}
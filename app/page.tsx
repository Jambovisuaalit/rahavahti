'use client';
import {useMemo,useState,type ChangeEvent} from 'react';
// @ts-ignore -- JS reference core is covered by node tests.
import {parseCSV,validateMappedRows,euroCents,purchaseAudit} from '../lib/talous-core.mjs';
type ValidRow={sourceLine:number;bookedOn:string;monthKey:string;amountCents:number;description:string};
type BadRow={sourceLine:number;message:string};
const euro=(c:number)=>new Intl.NumberFormat('fi-FI',{style:'currency',currency:'EUR'}).format(c/100);
const txt=(e:unknown)=>e instanceof Error?e.message:'Tuntematon virhe';
export default function Home(){
 const [filename,setFilename]=useState(''),[parsed,setParsed]=useState<{rows:string[][];delimiter:string}|null>(null),[error,setError]=useState('');
 const [cols,setCols]=useState({date:0,amount:1,description:2});
 const [balance,setBalance]=useState('850,00'),[buffer,setBuffer]=useState('150,00'),[price,setPrice]=useState('299,00'),[income,setIncome]=useState('1200,00'),[expense,setExpense]=useState('1100,00');
 const [start,setStart]=useState('2026-11-07');
 const mapped=useMemo<{valid:ValidRow[];invalid:BadRow[]}>(()=>parsed?validateMappedRows(parsed,cols):{valid:[],invalid:[]},[parsed,cols]);
 async function importFile(e:ChangeEvent<HTMLInputElement>){
  setError('');setParsed(null);const f=e.target.files?.[0];if(!f)return;setFilename(f.name);
  if(f.size>10_000_000){setError('Tiedosto ylittää 10 Mt');return}
  try{const raw=new TextDecoder('utf-8',{fatal:true}).decode(await f.arrayBuffer());const p=parseCSV(raw);if(p.rows.length<2)throw Error('Tiedostossa ei ole tapahtumarivejä');setParsed(p)}catch(err){setError(txt(err))}
 }
 const audit=useMemo(()=>{
  try{
   const b=euroCents(balance),p=euroCents(price),i=euroCents(income),ex=euroCents(expense),buf=euroCents(buffer);
   if([b,p,i,ex,buf].some(v=>v<0))throw Error('Syötteet eivät voi olla negatiivisia');
   const d=new Date(start+'T00:00:00Z');if(Number.isNaN(d.getTime()))throw Error('Päiväys virheellinen');
   const day=(n:number)=>{const x=new Date(d);x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
   return purchaseAudit({balanceCents:b,bufferCents:buf,horizonStart:start,horizonDays:30,flows:[{date:day(5),cents:i},{date:day(10),cents:-ex}],purchaseFlows:[{date:start,cents:-p}]});
  }catch(err){return {tier:'EI_ARVIOITAVISSA',reason:txt(err)}}
 },[balance,buffer,price,income,expense,start]);
 return <><header><strong>Rahavahti</strong><span className="pill">KEHITYSESikatselu · HOLD</span></header><main>
  <p className="muted">Itsenäinen suomalainen taloudenhallinnan prototyyppi</p><h1>Ymmärrä taloutesi ennen ostopäätöstä.</h1>
  <div className="info"><b>Ei tuotantokäyttöön.</b> CSV käsitellään ainoastaan selaimen muistissa. Tietoja ei tallenneta eikä lähetetä palvelimelle. Käytä vain kuvitteellista tai anonymisoitua testidataa. Kirjautuminen ja Supabase-tietokantatallennus eivät ole käytössä.</div>
  <div className="grid" style={{marginTop:24}}>
  <section className="card"><h2>1. CSV-tuonnin esikatselu</h2><label htmlFor="csv">Valitse testitiedosto (CSV, enintään 10 Mt)</label><input id="csv" type="file" accept=".csv,text/csv,text/plain" onChange={importFile}/>
  {filename&&<p className="muted">{filename}</p>}{error&&<p role="alert" className="error">{error}</p>}
  {parsed&&<><p>{parsed.rows.length-1} datariviä · erotin: {JSON.stringify(parsed.delimiter)}</p>
    <div className="fields">{(['date','amount','description'] as const).map(k=><div key={k}><label>{({date:'Päivämäärä',amount:'Summa',description:'Kuvaus'} as const)[k]}</label><select value={cols[k]} onChange={e=>setCols(v=>({...v,[k]:Number(e.target.value)}))}>{parsed.rows[0].map((h,j)=><option key={j} value={j}>{h||'Sarake '+(j+1)}</option>)}</select></div>)}</div>
    <p><b>{mapped.valid.length}</b> hyväksyttyä · <b>{mapped.invalid.length}</b> virheellistä</p>
    {mapped.invalid[0]&&<p role="alert" className="error">Rivi {mapped.invalid[0].sourceLine}: {mapped.invalid[0].message}</p>}
    <div className="tablewrap"><table><thead><tr><th>Päivä</th><th>Kuvaus</th><th>Summa</th></tr></thead><tbody>{mapped.valid.slice(0,8).map(r=><tr key={r.sourceLine}><td>{r.bookedOn.split('-').reverse().join('.')}</td><td>{r.description}</td><td>{euro(r.amountCents)}</td></tr>)}</tbody></table></div>
    <button disabled>Tallenna tapahtumat (HOLD)</button><p className="muted">Tallennus avataan vasta G1/G2-turvatestien jälkeen.</p>
  </>}</section>
  <section className="card"><h2>2. Ostoauditointi</h2><p className="muted">Viitelaskenta. Syötä vain kuvitteellisia summia.</p><div className="fields">
    {([{id:'balance',name:'Alkusaldo (€)',value:balance,set:setBalance},{id:'price',name:'Ostoksen hinta (€)',value:price,set:setPrice},{id:'income',name:'Tulot 5 päivän päästä (€)',value:income,set:setIncome},{id:'expense',name:'Menot 10 päivän päästä (€)',value:expense,set:setExpense},{id:'buffer',name:'Turvapuskuri (€)',value:buffer,set:setBuffer}] as const).map(f=><div key={f.id}><label htmlFor={f.id}>{f.name}</label><input id={f.id} value={f.value} onChange={e=>f.set(e.target.value)}/></div>)}
    <div><label htmlFor="start">Aloituspäivä</label><input id="start" type="date" value={start} onChange={e=>setStart(e.target.value)}/></div>
  </div><div className="summary"><span className="muted">30 päivän pienin ennustettu saldo</span><div className="stat">{audit.tier==='EI_ARVIOITAVISSA'?'Ei arvioitavissa':euro(audit.minProjectedBalanceCents)}</div><b>{audit.tier.replaceAll('_',' ')}</b>{audit.reason&&<p>{audit.reason}</p>}</div></section>
  </div><section className="card" style={{marginTop:24}}><h2>Julkaisuportit</h2><p>G0 Määrittely · G1 Auth/RLS <b>HOLD</b> · G2 Tallentava CSV <b>HOLD</b> · G3 Laskentatestaus <b>KESKEN</b> · G4 Viranomaisdata <b>HOLD</b> · G5 Tuotanto <b>HOLD</b></p></section>
 </main><footer>Rahavahti · EUR · fi-FI · Kehityskäyttö</footer></>;
}

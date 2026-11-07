'use client';
import {useMemo,useState,type ChangeEvent} from 'react';
import {CREDITORS} from '../../lib/creditors';
import {parseCreditCSV} from '../../lib/credit-import';
type Preview=ReturnType<typeof parseCreditCSV>;
export default function CreditorsPage(){
 const [query,setQuery]=useState(''),[preview,setPreview]=useState<Preview|null>(null),[error,setError]=useState(''),[filename,setFilename]=useState('');
 const filtered=useMemo(()=>CREDITORS.filter(x=>x.name.toLocaleLowerCase('fi').includes(query.toLocaleLowerCase('fi'))),[query]);
 async function load(e:ChangeEvent<HTMLInputElement>){
  setPreview(null);setError('');setFilename('');const file=e.target.files?.[0];if(!file)return;setFilename(file.name);
  if(!file.name.toLowerCase().endsWith('.csv')||file.size>1_048_576){setError('Valitse CSV-tiedosto, jonka koko on enintään 1 Mt');return}
  try{const content=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());setPreview(parseCreditCSV(content))}
  catch(err){setError(err instanceof Error?err.message:'Tuontia ei voitu käsitellä')}
  finally{e.target.value=''}
 }
 return <><main id="main-content">
 <a href="/">← Etusivu</a><h1>Luotonantajat ja omien luottotietojen tuonti</h1>
 <div className="info"><b>HOLD – vain synteettinen testidata.</b> Tiedosto luetaan selaimen muistissa. Tietoja ei lähetetä eikä tallenneta palvelimelle. Älä lataa aitoja henkilökohtaisia luottotietoja. Viralliseen luottotietorekisteriin ei ole yhteyttä.</div>
 <div className="grid" style={{marginTop:24}}>
 <section className="card"><h2>Luotonantajahakemisto ({CREDITORS.length})</h2><p className="muted">Käyttäjän ilmoittama luettelo. Ajantasainen osallistuminen ja oikeudelliset tunnisteet vahvistamatta.</p>
 <label htmlFor="creditor-search">Hae nimellä</label><input id="creditor-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Hae luotonantajaa"/>
 <p>{filtered.length} tulosta</p><div className="tablewrap"><table><thead><tr><th>Nimi</th><th>Varmennus</th></tr></thead><tbody>{filtered.map(item=><tr key={item.id}><td>{item.name}</td><td>{item.verification}</td></tr>)}</tbody></table></div></section>
 <section className="card"><h2>Luottotietojen paikallinen esikatselu</h2>
 <p className="muted">Valitse vain synteettinen testitiedosto. Otsikot: luotonantaja;luottotyyppi;saldo_eur. Valinnaiset: kuukausierä_eur;luottoraja_eur;alkupäivä;maksuviive_päiviä. Tyypit: vakuudellinen, vakuudeton tai jatkuva.</p>
 <label htmlFor="credit-csv">CSV-tiedosto (UTF-8, enintään 1 Mt, enintään 1000 riviä)</label><input id="credit-csv" type="file" accept=".csv,text/csv" onChange={load}/>
 {filename&&<p className="muted">Tiedosto: {filename}</p>}{error&&<p role="alert" className="error">{error}</p>}
 {preview&&<><p>Hyväksyttyjä rivejä: <b>{preview.rows.length}</b> / {preview.total}. Virheitä: <b>{preview.errors.length}</b>.</p>
 {preview.errors.slice(0,10).map(x=><p className="error" role="alert" key={x.line}>Rivi {x.line}: {x.message}</p>)}
 <div className="tablewrap"><table><thead><tr><th>Luotonantaja</th><th>Tyyppi</th><th>Saldo</th></tr></thead><tbody>{preview.rows.slice(0,20).map(x=><tr key={x.line}><td>{x.creditor}</td><td>{x.type}</td><td>{(x.balanceCents/100).toLocaleString('fi-FI',{style:'currency',currency:'EUR'})}</td></tr>)}</tbody></table></div>
 <button disabled>Tallenna luottotiedot (HOLD)</button></>}
 <p className="muted">Esikatselu ei ole automaattinen rekisteritietojen tulkinta eikä luottopäätös. Maksukykyanalyysi lisätään vasta testauksen jälkeen.</p>
 </section></div></main></>;
}

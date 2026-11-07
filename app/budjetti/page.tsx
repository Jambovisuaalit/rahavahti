'use client';
import {useMemo,useState,type ChangeEvent} from 'react';
import {DEMO_LIMITS,DEMO_MONTH,DEMO_TRANSACTIONS,budgetSummary,euro,fiDate,type SampleTransaction} from '../../lib/demo-budget';
// @ts-ignore -- adapter is JS and covered with Node / Playwright tests.
import {parseBudgetCSV,suggestedMapping,validateBudgetRows,budgetMonths,classifyBudgetRows} from '../../lib/budget-csv.mjs';

type ImportedRow={id:string;date:string;bookedOn:string;monthKey:string;description:string;amountCents:number;category:string;sourceLine:number};
type RowError={sourceLine:number;message:string};
const CATEGORIES=['Luokittelematon','Asuminen','Ruoka','Liikkuminen','Muut'];
export default function BudgetPage(){
 const [limits,setLimits]=useState<Record<string,number>>({...DEMO_LIMITS});
 const [error,setError]=useState('');
 const [source,setSource]=useState<'demo'|'csv'>('demo');
 const [parsed,setParsed]=useState<{rows:string[][];delimiter:string}|null>(null);
 const [mapping,setMapping]=useState({date:0,amount:1,description:2});
 const [fileError,setFileError]=useState('');
 const [filename,setFilename]=useState('');
 const [month,setMonth]=useState(DEMO_MONTH);
 const [categories,setCategories]=useState<Record<string,string>>({});
 const [imported,setImported]=useState<ImportedRow[]|null>(null);
 const [excluded,setExcluded]=useState<number[]>([]);
 const [duplicateReviewed,setDuplicateReviewed]=useState(false);
 const [accountScope,setAccountScope]=useState('DEMO_ACCOUNT');
 const [selectedBank,setSelectedBank]=useState('generic');
 const validation=useMemo<{valid:ImportedRow[];invalid:RowError[];fatal?:string}>(()=>{
  if(!parsed)return {valid:[],invalid:[]};
  try{return validateBudgetRows(parsed,mapping)}
  catch(e){return {valid:[],invalid:[],fatal:e instanceof Error?e.message:'Virheellinen sarakekartoitus'}}
 },[parsed,mapping]);
 const availableMonths=useMemo<string[]>(()=>budgetMonths(imported||[]),[imported]);
 const duplicateMatches=useMemo<{index:number;sourceLine:number;previousIndex:number;previousLine:number;strength:string;message:string}[]>(()=>duplicateCandidates(validation.valid,{accountId:accountScope}),[validation.valid,accountScope]);
 const allTransactions=useMemo<SampleTransaction[]>(()=>source==='csv'&&imported?classifyBudgetRows(imported,categories):[...DEMO_TRANSACTIONS],[source,imported,categories]);
 const visibleTransactions=useMemo(()=>allTransactions.filter(t=>t.date.startsWith(month)),[allTransactions,month]);
 const activeLimits=useMemo(()=>source==='csv'?{...limits,Luokittelematon:0}:limits,[source,limits]);
 const summary=useMemo(()=>budgetSummary(visibleTransactions,activeLimits),[visibleTransactions,activeLimits]);
 function setLimit(category:string,value:string){
  if(!/^(0|[1-9]\d{0,6})([,.]\d{0,2})?$/.test(value.trim())){setError('Syötä positiivinen summa enintään kahdella desimaalilla.');return}
  const [whole,dec='']=value.replace(',','.').split('.');
  const cents=Number(whole)*100+Number(dec.padEnd(2,'0'));
  if(!Number.isSafeInteger(cents)){setError('Virheellinen summa');return}
  setLimits(current=>({...current,[category]:cents}));setError('');
 }
 async function loadCSV(event:ChangeEvent<HTMLInputElement>){
  setFileError('');setParsed(null);setImported(null);setSource('demo');setCategories({});setExcluded([]);setDuplicateReviewed(false);
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  setFilename(file.name);
  if(!file.name.toLowerCase().endsWith('.csv')||file.size>1024*1024){setFileError('Valitse enintään 1 Mt:n UTF-8 CSV-testitiedosto');return}
  try{
   const raw=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());
   const result=parseBudgetCSV(raw);
   setParsed(result);setMapping(suggestedMapping(result.rows[0]));
  }catch(e){setFileError(e instanceof Error?e.message:'Tuonti epäonnistui')}
 }
 function applyImport(){
  if(!parsed||validation.fatal||validation.invalid.length||!validation.valid.length){setFileError('Korjaa kaikki virheet ennen budjettilaskentaa');return}
  if(duplicateMatches.length&&!duplicateReviewed){setFileError('Tarkista ensin mahdolliset kaksoiskappaleet');return}
  const selected=acceptedRowsAfterReview(validation.valid,excluded);
  if(!selected.length){setFileError('Tuontiin ei jää hyväksyttyjä tapahtumia');return}
  setImported(selected);setCategories({});
  setMonth(budgetMonths(validation.valid)[0]||DEMO_MONTH);
  setSource('csv');setFileError('');
 }
 function resetDemo(){
  setSource('demo');setParsed(null);setImported(null);setCategories({});
  setMonth(DEMO_MONTH);setFilename('');setFileError('');setExcluded([]);setDuplicateReviewed(false);
 }
 return <main id="main-content">
  <div className="page-eyebrow">TALOUDENHALLINTA / TESTI</div>
  <div className="page-heading"><div><h1>Kuukausibudjetti</h1><p className="muted">{source==='csv'?'Synteettinen CSV · '+month:'Marraskuu 2026 · keksitty esimerkkiaineisto'}</p></div><span className="demo-tag">DEMO · HOLD</span></div>
  <div className="info"><b>Ei tuotantokäyttöön.</b> Käytä vain keksittyä synteettistä testidataa. CSV ja budjettirajat käsitellään selaimen muistissa; mitään ei tallenneta eikä lähetetä palvelimelle. Pankkikohtaisia vientimuotoja ei ole varmennettu.</div>
  <section className="card" aria-label="CSV-budjettituonti" style={{marginTop:22}}>
   <div className="section-heading"><h2>CSV-tuonti budjettiin</h2><span className="demo-tag">SYNTEETTINEN TESTI</span></div>
   <p className="muted">Yleinen UTF-8 CSV: puolipiste, pilkku tai tabulaattori. Valitse päivä, summa ja kuvaus. Negatiivinen summa = meno; positiivinen = tulo. Kulut luokitellaan aluksi luokittelemattomiksi.</p>
   <label htmlFor="bank-export-source">Pankin vientimuoto (tietolähteen tila)</label>
   <select id="bank-export-source" value={selectedBank} onChange={e=>setSelectedBank(e.target.value)}>
    <option value="generic">Yleinen CSV (vain synteettinen testi)</option>
    {BANK_EXPORTS.map(bank=><option key={bank.id} value={bank.id}>{bank.name}</option>)}
   </select>
   {selectedBank!=='generic'&&BANK_EXPORTS.filter(bank=>bank.id===selectedBank).map(bank=><p className="info" key={bank.id}><b>{bank.status}.</b> {bank.note} <a href={bank.source} rel="noreferrer noopener" target="_blank">Pankin lähdeohje</a>. Tämä valinta ei muuta jäsennystä eikä vahvista yhteensopivuutta.</p>)}
   <label htmlFor="account-scope">Testitilin tunniste (kaksoiskappaleiden tarkistus)</label>
   <input id="account-scope" value={accountScope} onChange={e=>{setAccountScope(e.target.value);setDuplicateReviewed(false);setExcluded([])}} maxLength={60} placeholder="DEMO_ACCOUNT"/>
   <p className="muted">Älä syötä oikeaa IBANia. Käytä vain kuvitteellista tilitunnistetta.</p>
   <label htmlFor="budget-csv">Valitse synteettinen CSV (enintään 1 Mt, enintään 1 000 riviä)</label>
   <input id="budget-csv" type="file" accept=".csv,text/csv" onChange={loadCSV}/>
   {filename&&<p className="muted">Tiedosto: {filename}</p>}
   {fileError&&<p role="alert" className="error">{fileError}</p>}
   {parsed&&<>
    <div className="fields">{(['date','amount','description'] as const).map(key=><div key={key}>
     <label htmlFor={'budget-map-'+key}>{({date:'Päivämääräsarake',amount:'Summasarake',description:'Kuvaussarake'} as const)[key]}</label>
     <select id={'budget-map-'+key} value={mapping[key]} onChange={e=>setMapping(current=>({...current,[key]:Number(e.target.value)}))}>
      {parsed.rows[0].map((header,i)=><option value={i} key={i}>{header||'Sarake '+(i+1)}</option>)}
     </select></div>)}</div>
    {validation.fatal&&<p role="alert" className="error">{validation.fatal}</p>}
    <p><b>{validation.valid.length}</b> hyväksyttyä · <b>{validation.invalid.length}</b> virheellistä riviä</p>
    {validation.invalid.slice(0,10).map(x=><p key={x.sourceLine} role="alert" className="error">Rivi {x.sourceLine}: {x.message}</p>)}
    <div className="tablewrap"><table><thead><tr><th>Päivä</th><th>Kuvaus</th><th>Summa</th></tr></thead><tbody>
     {validation.valid.slice(0,8).map(t=><tr key={t.id}><td>{fiDate(t.date)}</td><td>{t.description}</td><td>{euro(t.amountCents)}</td></tr>)}
    </tbody></table></div>
    {duplicateMatches.length>0&&<div className="info" aria-label="Mahdolliset kaksoiskappaleet">
     <b>{duplicateMatches.length} mahdollista kaksoiskappaletta</b>
     <p>Sama päivä, summa ja kuvaus voi tarkoittaa myös kahta oikeaa erillistä tapahtumaa. Mitään ei poisteta automaattisesti. Päätä rivikohtaisesti, mitkä testirivit jätetään pois.</p>
     {duplicateMatches.map(match=><label key={match.index} className="duplicate-option">
      <input type="checkbox" checked={excluded.includes(match.index)} onChange={e=>{setDuplicateReviewed(false);setExcluded(prev=>e.target.checked?[...prev,match.index]:prev.filter(i=>i!==match.index))}}/>
      Jätä pois rivi {match.sourceLine} (vastaa riviä {match.previousLine}). {match.message}
     </label>)}
     <label className="duplicate-option">
      <input type="checkbox" checked={duplicateReviewed} onChange={e=>setDuplicateReviewed(e.target.checked)}/>
      Olen tarkistanut mahdolliset kaksoiskappaleet; valitsemattomat rivit säilytetään
     </label>
    </div>}
    <button type="button" disabled={Boolean(validation.fatal)||validation.invalid.length>0||validation.valid.length===0||(duplicateMatches.length>0&&!duplicateReviewed)} onClick={applyImport}>Käytä testitapahtumia budjetissa</button>
   </>}
   {source==='csv'&&<div className="info" style={{marginTop:16}}>CSV-testitapahtumat käytössä. Luokittelemattomia menoja: {visibleTransactions.filter(t=>t.category==='Luokittelematon'&&t.amountCents<0).length}. Tarkista kategoriat ennen tulkintaa.</div>}
   <button type="button" onClick={resetDemo}>Palauta esimerkkiaineisto</button>
  </section>
  {source==='csv'&&availableMonths.length>1&&<div className="month-picker"><label htmlFor="budget-month">Tarkasteltava kuukausi</label>
   <select id="budget-month" value={month} onChange={e=>setMonth(e.target.value)}>{availableMonths.map(m=><option key={m} value={m}>{m}</option>)}</select>
  </div>}
  <section aria-label="Budjetin tunnusluvut" className="metric-grid">
   <div className="metric"><span>Tulot</span><strong>{euro(summary.incomeCents)}</strong><small>{source==='csv'?'CSV-testitapahtumat':'Esimerkkitapahtumat'}</small></div>
   <div className="metric"><span>Menot</span><strong>{euro(summary.spentCents)}</strong><small>{source==='csv'?'CSV-testitapahtumat':'Esimerkkitapahtumat'}</small></div>
   <div className="metric"><span>Netto</span><strong>{euro(summary.netCents)}</strong><small>Tulot − menot</small></div>
   <div className="metric"><span>Budjettikatto</span><strong>{euro(summary.limitTotalCents)}</strong><small>Kategorioiden rajat</small></div>
  </section>
  <div className="grid">
   <section className="card"><div className="section-heading"><h2>Menot kategorioittain</h2><span className="muted">{month}</span></div>
    {summary.categories.map(c=><div key={c.category} className="budget-category">
     <div className="category-line"><b>{c.category}</b><span>{euro(c.spentCents)} / {c.limitCents===0?'Ei rajaa':euro(c.limitCents)}</span></div>
     <div className="progress-track" role="progressbar" aria-label={c.category+' budjetin käyttö'} aria-valuenow={Math.min(100,c.usedPct??0)} aria-valuemin={0} aria-valuemax={100}>
      <span className={'progress-fill '+(c.remainingCents<0?'over':'')} style={{width:Math.min(100,c.usedPct??0)+'%'}}/>
     </div>
     <div className="category-line muted"><span>{c.usedPct===null?'Raja puuttuu':c.usedPct+'% käytetty'}</span><span>{c.limitCents===0?'Luokittele / määritä raja':c.remainingCents<0?'Ylitys: '+euro(-c.remainingCents):'Jäljellä: '+euro(c.remainingCents)}</span></div>
    </div>)}
   </section>
   <section className="card"><h2>Muokkaa budjettirajoja</h2><p className="muted">Muutokset ovat väliaikaisia. Päivitä yksi raja kerrallaan.</p>
    <div className="limit-fields">{Object.entries(limits).map(([category,cents])=><div key={category}><label htmlFor={'limit-'+category}>{category} (€)</label>
      <input id={'limit-'+category} type="number" min="0" step="0.01" key={category+'-'+cents} defaultValue={(cents/100).toFixed(2)} onBlur={e=>setLimit(category,e.target.value)} /></div>)}</div>
    {error&&<p className="error" role="alert">{error}</p>}
    <button type="button" onClick={()=>{setLimits({...DEMO_LIMITS});setError('')}}>Palauta esimerkkirajat</button>
    <p className="muted">Tietoja ei siirretä muihin istuntoihin.</p>
   </section>
  </div>
  <section className="card" style={{marginTop:22}}><div className="section-heading"><h2>Kuukauden tapahtumat</h2><span className="muted">{visibleTransactions.length} {source==='csv'?'CSV-testitapahtumaa':'demotapahtumaa'}</span></div>
    <div className="tablewrap"><table><thead><tr><th>Päivä</th><th>Kuvaus</th><th>Kategoria</th><th>Summa</th></tr></thead>
    <tbody>{visibleTransactions.map(t=><tr key={t.id}><td>{fiDate(t.date)}</td><td>{t.description}</td>
      <td>{source==='csv'&&t.amountCents<0?<select aria-label={'Kategoria: '+t.description} value={t.category} onChange={e=>setCategories(v=>({...v,[t.id]:e.target.value}))}>
       {CATEGORIES.map(category=><option key={category} value={category}>{category}</option>)}
      </select>:t.category}</td><td>{euro(t.amountCents)}</td></tr>)}</tbody></table></div>
  </section>
  <p className="muted">Lähde: {source==='csv'?'synteettinen CSV':'sisäänrakennettu esimerkki'}. Oikeiden henkilökohtaisten taloustietojen tuonti, kirjautuminen ja tallennus ovat HOLD-tilassa.</p>
 </main>;
}

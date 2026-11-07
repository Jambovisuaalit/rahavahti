'use client';
import {useMemo,useState} from 'react';
import {DEMO_LIMITS,DEMO_MONTH,DEMO_TRANSACTIONS,budgetSummary,euro,fiDate} from '../../lib/demo-budget';

export default function BudgetPage(){
 const [limits,setLimits]=useState<Record<string,number>>({...DEMO_LIMITS});
 const [error,setError]=useState('');
 const summary=useMemo(()=>budgetSummary(DEMO_TRANSACTIONS,limits),[limits]);
 function setLimit(category:string,value:string){
  if(!/^(0|[1-9]\d{0,6})([,.]\d{0,2})?$/.test(value.trim())){setError('Syötä positiivinen summa enintään kahdella desimaalilla.');return}
  const [whole,dec='']=value.replace(',','.').split('.');
  const cents=Number(whole)*100+Number(dec.padEnd(2,'0'));
  if(!Number.isSafeInteger(cents)){setError('Virheellinen summa');return}
  setLimits(current=>({...current,[category]:cents}));setError('');
 }
 return <main id="main-content">
  <div className="page-eyebrow">TALOUDENHALLINTA / DEMO</div>
  <div className="page-heading"><div><h1>Kuukausibudjetti</h1><p className="muted">Marraskuu 2026 · vain keksitty esimerkkiaineisto</p></div><span className="demo-tag">DEMO · HOLD</span></div>
  <div className="info"><b>Ei tuotantokäyttöön.</b> Kaikki tapahtumat ovat kuvitteellisia. Budjettirajat muuttuvat vain selaimen muistissa; mitään ei tallenneta palvelimelle tai selaimen pysyvään tallennustilaan.</div>
  <section aria-label="Budjetin tunnusluvut" className="metric-grid">
   <div className="metric"><span>Tulot</span><strong>{euro(summary.incomeCents)}</strong><small>Esimerkkitapahtumat</small></div>
   <div className="metric"><span>Menot</span><strong>{euro(summary.spentCents)}</strong><small>Esimerkkitapahtumat</small></div>
   <div className="metric"><span>Netto</span><strong>{euro(summary.netCents)}</strong><small>Tulot − menot</small></div>
   <div className="metric"><span>Budjettikatto</span><strong>{euro(summary.limitTotalCents)}</strong><small>Kategorioiden rajat</small></div>
  </section>
  <div className="grid">
   <section className="card"><div className="section-heading"><h2>Menot kategorioittain</h2><span className="muted">01.–30.11.2026</span></div>
    {summary.categories.map(c=><div key={c.category} className="budget-category">
     <div className="category-line"><b>{c.category}</b><span>{euro(c.spentCents)} / {euro(c.limitCents)}</span></div>
     <div className="progress-track" role="progressbar" aria-label={c.category+' budjetin käyttö'} aria-valuenow={Math.min(100,c.usedPct??0)} aria-valuemin={0} aria-valuemax={100}>
      <span className={'progress-fill '+(c.remainingCents<0?'over':'')} style={{width:Math.min(100,c.usedPct??0)+'%'}}/>
     </div>
     <div className="category-line muted"><span>{c.usedPct??0}% käytetty</span><span>{c.remainingCents<0?'Ylitys: '+euro(-c.remainingCents):'Jäljellä: '+euro(c.remainingCents)}</span></div>
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
  <section className="card" style={{marginTop:22}}><div className="section-heading"><h2>Kuukauden tapahtumat</h2><span className="muted">{DEMO_TRANSACTIONS.length} demotapahtumaa</span></div>
    <div className="tablewrap"><table><thead><tr><th>Päivä</th><th>Kuvaus</th><th>Kategoria</th><th>Summa</th></tr></thead>
    <tbody>{DEMO_TRANSACTIONS.map(t=><tr key={t.id}><td>{fiDate(t.date)}</td><td>{t.description}</td><td>{t.category}</td><td>{euro(t.amountCents)}</td></tr>)}</tbody></table></div>
  </section>
  <p className="muted">Esimerkkiaineiston kuukausi: {DEMO_MONTH}. Oikeiden henkilökohtaisten taloustietojen tuonti, kirjautuminen ja tallennus ovat HOLD-tilassa.</p>
 </main>;
}

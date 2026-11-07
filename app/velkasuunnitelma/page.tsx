'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
// @ts-ignore -- JS core is covered by node tests
import {compareDebtStrategies} from '../../lib/debt-strategies.mjs';
type Debt={id:string;label:string;balanceEuro:number;nominalPct:number;minimumEuro:number;monthlyFeeEuro:number};
type Finance={netIncomeEuro:number;fixedExpensesEuro:number;cashEuro:number;bufferEuro:number;startMonth:string;loans:Debt[]};
const EXAMPLE:Finance={netIncomeEuro:2400,fixedExpensesEuro:1400,cashEuro:800,bufferEuro:500,startMonth:'2026-11',
 loans:[{id:'a',label:'Demo A',balanceEuro:1800,nominalPct:16,minimumEuro:90,monthlyFeeEuro:3},
 {id:'b',label:'Demo B',balanceEuro:5500,nominalPct:7,minimumEuro:150,monthlyFeeEuro:2},
 {id:'c',label:'Demo C',balanceEuro:500,nominalPct:9,minimumEuro:40,monthlyFeeEuro:0}]};
const euro=(c:number|null|undefined)=>typeof c==='number'&&Number.isFinite(c)?new Intl.NumberFormat('fi-FI',{style:'currency',currency:'EUR'}).format(c/100):'Ei laskettavissa';
const names:Record<string,string>={minimum:'Nykytila – vähimmäismaksut',avalanche:'Vyörytys – korkein korko ensin',snowball:'Lumipallo – pienin velka ensin'};
const debtFields=[['balanceEuro','Jäljellä oleva pääoma (€)'],['nominalPct','Nimelliskorko (%)'],['minimumEuro','Vähimmäismaksu (€/kk)'],['monthlyFeeEuro','Tilinhoito (€/kk)']] as const;
const mainFields=[['netIncomeEuro','Nettotulot (€/kk)'],['fixedExpensesEuro','Kiinteät elinkustannukset (€/kk)'],['cashEuro','Tilivarat (€)'],['bufferEuro','Puskurin turvaraja (€)']] as const;
export default function DebtPlanner(){
 const [input,setInput]=useState<Finance>(()=>structuredClone(EXAMPLE));
 const [selected,setSelected]=useState('avalanche');
 const calculated=useMemo(()=>{try{return {result:compareDebtStrategies(input),error:''}}
 catch(e){return {result:null,error:e instanceof Error?e.message:'Laskenta epäonnistui'}}},[input]);
 const plans=calculated.result?.results;
 const chosen=plans?.[selected];
 const current=plans?.minimum;
 const feasible=chosen?.status==='OK'&&current?.status==='OK';
 function change(key:keyof Omit<Finance,'loans'>,value:string){setInput(v=>({...v,[key]:key==='startMonth'?value:Number(value)}))}
 function updateLoan(id:string,key:keyof Debt,value:string){setInput(v=>({...v,loans:v.loans.map(x=>x.id===id?{...x,[key]:Number(value)}:x)}))}
 return <main id="main-content">
  <div className="page-eyebrow">VELAT / SYNTEETTINEN SUUNNITELMA</div>
  <div className="page-heading"><div><h1>Velkojen maksusuunnitelma</h1><p className="muted">Nykytila, vyörytys ja lumipallo</p></div><span className="demo-tag">DEMO · HOLD</span></div>
  <div className="info"><b>Ei oikeita henkilötietoja.</b> Testaa vain kuvitteellisia summia. Laskenta tapahtuu selaimen muistissa. Malli ei käsittele perintäkuluja, maksuhäiriöitä tai muuttuvia korkoja.</div>
  <section className="card" style={{marginTop:22}}>
   <h2>1. Datan keruu</h2><div className="fields">{mainFields.map(([key,label])=><div key={key}><label htmlFor={key}>{label}</label><input id={key} type="number" min="0" step="0.01" value={input[key]} onChange={e=>change(key,e.target.value)}/></div>)}
   <div><label htmlFor="startMonth">Aloituskuukausi</label><input id="startMonth" type="month" value={input.startMonth} onChange={e=>change('startMonth',e.target.value)}/></div></div>
   <p className="muted">Kiinteisiin menoihin sisällytetään välttämättömät elinkustannukset mutta ei alla lueteltuja velan maksueriä. Puuttuvia eriä ei oleteta nollaksi.</p>
  </section>
  <section className="card" style={{marginTop:22}}><h2>2. Velkojen kustannukset</h2>
   <p className="muted">Vuosikorkoarvio perustuu velan jäljellä olevaan maksuaikatauluun, ei alkuperäiseen sopimuksen todelliseen vuosikorkoon. Alkuperäisen avausmaksun vaikutus vaatii sopimusasiakirjat.</p>
   <div className="debt-loan-grid">{input.loans.map(loan=><div className="debt-loan-card" key={loan.id}><h3>{loan.label}</h3><div className="fields">
    {debtFields.map(([key,label])=><div key={key}><label htmlFor={loan.id+'-'+key}>{label}</label>
      <input id={loan.id+'-'+key} type="number" min="0" step="0.01" value={loan[key]} onChange={e=>updateLoan(loan.id,key,e.target.value)}/></div>)}
   </div></div>)}</div></section>
  <section className="card" style={{marginTop:22}}><h2>3. Skenaarioiden vertailu</h2>
   {calculated.error&&<p role="alert" className="error">{calculated.error}</p>}
   {plans&&<div className="debt-plan-grid">{(['minimum','avalanche','snowball'] as const).map(key=>{
    const r=plans[key];
    return <button key={key} type="button" className={'debt-choice '+(selected===key?'is-selected':'')} onClick={()=>setSelected(key)} aria-pressed={selected===key}>
     <b>{names[key]}</b><span>{r.status==='OK'?'Velaton '+r.paidOffMonth:r.reason||r.status}</span>
     <span>{r.status==='OK'?'Korot ja kulut '+euro(r.totalCostCents):'Ei luotettavaa ennustetta'}</span>
     <span>{r.savingsCents!==null?'Säästö nykytilaan '+euro(r.savingsCents):'Säästö ei laskettavissa'}</span>
    </button>;
   })}</div>}
  </section>
  <section className="card" style={{marginTop:22}}><h2>4. Puskuririskin tarkistus</h2>
   {chosen?.status==='OK'?<><div className="metric-grid">
    <div className="metric"><span>Pienin simuloitu tilivara</span><strong>{euro(chosen.lowestCashCents)}</strong></div>
    <div className="metric"><span>Turvaraja</span><strong>{euro(Math.round(input.bufferEuro*100))}</strong></div>
    <div className="metric"><span>Kuukausittainen maksuvara</span><strong>{euro(chosen.monthlyBudgetCents)}</strong></div>
    <div className="metric"><span>Velattomuusaika</span><strong>{chosen.months} kk</strong></div>
   </div><p className="info">Turvaraja ei alitu kuukausitasolla. Päiväkohtaisia eräpäiviä ja tilitapahtumia ei ole varmennettu.</p></>:
    <p role="alert" className="info">{chosen?.reason||'Riittävää maksukykyä ei ole voitu todentaa.'} Maksusuunnitelmaa ei suositella.</p>}
  </section>
  <section className="card" style={{marginTop:22}}><h2>5. Selkokielinen yhteenveto</h2>
   {feasible?<div aria-label="Maksusuunnitelman yhteenveto">
    <p>{names[selected]} säästää tässä kuvitteellisessa esimerkissä <b>{euro(chosen.savingsCents)}</b> korkoja ja tilinhoitokuluja vähimmäismaksuihin verrattuna.</p>
    <p>Velat tulisivat maksetuiksi {chosen.paidOffMonth} loppuun mennessä. Alin simuloitu tilivara on {euro(chosen.lowestCashCents)} ja turvaraja {euro(Math.round(input.bufferEuro*100))}.</p>
    <p><b>Seuraava askel:</b> varmista lainojen maksuerät ja kulut velkojilta ennen muutoksia.</p>
    <div className="tablewrap"><table><thead><tr><th>Velka</th><th>Jäljellä oleva korkoarvio</th><th>Korot</th><th>Tilinhoito</th></tr></thead><tbody>
     {chosen.loans.map((loan:{id:string;label:string;remainingAprPct:number|null;interestCents:number;feeCents:number})=><tr key={loan.id}>
      <td>{loan.label}</td><td>{loan.remainingAprPct===null?'Ei arvioitavissa':loan.remainingAprPct.toFixed(2).replace('.',',')+' %'}</td><td>{euro(loan.interestCents)}</td><td>{euro(loan.feeCents)}</td>
     </tr>)}</tbody></table></div></div>:
     <p>Säästöä euroina ja velattomuuspäivää ei voida arvioida luotettavasti. {chosen?.reason||'Tarkista lähtötiedot.'} Seuraava askel on selvittää maksukyvyn este ja velkojen vähimmäismaksut.</p>}
   <button type="button" onClick={()=>{setInput(structuredClone(EXAMPLE));setSelected('avalanche')}}>Palauta kuvitteelliset esimerkit</button>
   <p><Link href="/korkolaskuri">Lainojen kustannusvertailuun</Link></p>
  </section>
 </main>;
}

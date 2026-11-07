'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

type NavItem={href:string;label:string;symbol:string;active:(pathname:string)=>boolean};
const items:NavItem[]=[
 {href:'/',label:'Etusivu',symbol:'⌂',active:p=>p==='/'},
 {href:'/budjetti',label:'Budjetti',symbol:'▤',active:p=>p.startsWith('/budjetti')},
 {href:'/luotonantajat',label:'Luotot',symbol:'▣',active:p=>p.startsWith('/luotonantajat')},
 {href:'/#audit',label:'Ostoauditointi',symbol:'◇',active:()=>false},
 {href:'/korkolaskuri',label:'Korkolaskuri',symbol:'%',active:p=>p.startsWith('/korkolaskuri')},
];

export default function AppNavigation(){
 const path=usePathname();
 const [more,setMore]=useState(false);
 const link=(item:NavItem)=><Link
   key={item.label} href={item.href} className={'nav-link '+(item.active(path)?'is-active':'')}
   aria-current={item.active(path)?'page':undefined} onClick={()=>setMore(false)}>
   <span className="nav-symbol" aria-hidden="true">{item.symbol}</span><span>{item.label}</span>
 </Link>;
 return <>
  <a className="skip-link" href="#main-content">Siirry sisältöön</a>
  <div className="app-topbar">
   <Link href="/" className="brand" aria-label="Rahavahti – etusivu"><span aria-hidden="true" className="brand-mark">R</span><span>Rahavahti</span></Link>
   <span className="pill">KEHITYSESikatselu · HOLD</span>
  </div>
  <aside className="app-sidebar" aria-label="Päänavigaatio">
   <nav>{items.map(item=>link(item))}</nav>
   <div className="side-divider"/>
   <p className="nav-section-title">Myöhemmin</p>
   <span className="nav-disabled" aria-disabled="true">Raportit · HOLD</span>
   <span className="nav-disabled" aria-disabled="true">Asetukset · HOLD</span>
   <div className="sidebar-footer">Vain synteettinen testidata<br/>Ei henkilötietojen käsittelyä</div>
  </aside>
  <nav className="app-bottomnav" aria-label="Mobiilinavigaatio">
   {items.slice(0,3).map(item=>link(item))}
   <button type="button" className={'mobile-more '+(more?'is-active':'')} aria-expanded={more} aria-controls="mobile-more-panel" onClick={()=>setMore(v=>!v)}>
    <span className="nav-symbol" aria-hidden="true">☰</span><span>Valikko</span>
   </button>
  </nav>
  {more&&<div className="mobile-more-panel" id="mobile-more-panel"><nav aria-label="Lisävalinnat">
   <Link href="/#audit" onClick={()=>setMore(false)}>Ostoauditointi</Link>
   <Link href="/korkolaskuri" onClick={()=>setMore(false)}>Korkolaskuri</Link>
   <span aria-disabled="true">Raportit · HOLD</span>
   <span aria-disabled="true">Asetukset · HOLD</span>
  </nav></div>}
 </>;
}

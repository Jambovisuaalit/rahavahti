/** Keksitty esimerkkiaineisto. Ei henkilötietoja, pankki- tai API-yhteyksiä. */
export type SampleTransaction = {id:string;date:string;description:string;category:string;amountCents:number};
export const DEMO_MONTH='2026-11';
export const DEMO_TRANSACTIONS:readonly SampleTransaction[]=[
 {id:'d1',date:'2026-11-02',description:'Esimerkkipalkka',category:'Tulot',amountCents:220000},
 {id:'d2',date:'2026-11-03',description:'Esimerkkivuokra',category:'Asuminen',amountCents:-79000},
 {id:'d3',date:'2026-11-04',description:'Ruokakauppa (demo)',category:'Ruoka',amountCents:-5230},
 {id:'d4',date:'2026-11-05',description:'Matkalippu (demo)',category:'Liikkuminen',amountCents:-4500},
 {id:'d5',date:'2026-11-06',description:'Kauppa (demo)',category:'Ruoka',amountCents:-3180},
 {id:'d6',date:'2026-11-07',description:'Puhelin (demo)',category:'Muut',amountCents:-2900},
 {id:'d7',date:'2026-11-08',description:'Ruokakauppa (demo)',category:'Ruoka',amountCents:-6540},
];
export const DEMO_LIMITS:Readonly<Record<string,number>>={Asuminen:85000,Ruoka:30000,Liikkuminen:10000,Muut:15000};
export const euro=(cents:number)=>new Intl.NumberFormat('fi-FI',{style:'currency',currency:'EUR'}).format(cents/100);
export const fiDate=(iso:string)=>iso.slice(8,10)+'.'+iso.slice(5,7)+'.'+iso.slice(0,4);
export function budgetSummary(transactions:readonly SampleTransaction[],limits:Readonly<Record<string,number>>){
 const incomeCents=transactions.reduce((s,t)=>s+(t.amountCents>0?t.amountCents:0),0);
 const spentCents=transactions.reduce((s,t)=>s+(t.amountCents<0?-t.amountCents:0),0);
 const categories=Object.keys(limits).map(category=>{
 const spent=transactions.filter(t=>t.category===category&&t.amountCents<0).reduce((s,t)=>s-t.amountCents,0);
 const limit=limits[category];
 return {category,spentCents:spent,limitCents:limit,remainingCents:limit-spent,usedPct:limit?Math.round(spent/limit*100):null};
 });
 return {incomeCents,spentCents,netCents:incomeCents-spentCents,limitTotalCents:Object.values(limits).reduce((a,b)=>a+b,0),categories};
}

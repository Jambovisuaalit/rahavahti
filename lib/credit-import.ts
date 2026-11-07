/** Local-only preview. NEVER upload sensitive content to an API or telemetry. */
export const REQUIRED = ['luotonantaja','luottotyyppi','saldo_eur'] as const;
export const OPTIONAL = ['kuukausierä_eur','luottoraja_eur','alkupäivä','maksuviive_päiviä'] as const;
const limit = 1024 * 1024;
export function parseCreditCSV(raw: string) {
 if (new TextEncoder().encode(raw).length > limit) throw Error('Enimmäiskoko on 1 Mt');
 if (raw.includes('\0')) throw Error('Tiedosto sisältää virheellisiä merkkejä');
 const lines=raw.replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());
 if(lines.length<2 || lines.length>1001)throw Error('Tiedostossa pitää olla otsikko ja 1–1000 luottoriviä');
 const split=(line:string,delim:string)=>{const out:string[]=[];let cell='',quoted=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(ch===delim&&!quoted){out.push(cell.trim());cell=''}else cell+=ch}if(quoted)throw Error('Virheellinen lainausmerkki');out.push(cell.trim());return out};
 const delimiter=lines[0].includes(';')?';':',';
 const headers=split(lines[0],delimiter).map(h=>h.toLowerCase());
 if(new Set(headers).size!==headers.length)throw Error('Päällekkäisiä sarakenimiä');
 for(const key of REQUIRED)if(!headers.includes(key))throw Error('Puuttuva sarake: '+key);
 const index=(key:string)=>headers.indexOf(key);
 const money=(s:string)=>{const n=s.replace(/\s/g,'').replace(',','.');if(!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(n))throw Error('Virheellinen euromäärä');const [euros,cents='']=n.split('.');const value=Number(euros)*100+Number(cents.padEnd(2,'0'));if(!Number.isSafeInteger(value))throw Error('Liian suuri euromäärä');return value};
 const errors:{line:number;message:string}[]=[];
 const rows:{line:number;creditor:string;type:string;balanceCents:number;monthlyCents:number|null;creditLimitCents:number|null;startDate:string|null;lateDays:number|null}[]=[];
 lines.slice(1).forEach((line,i)=>{try{const cells=split(line,delimiter);if(cells.length!==headers.length)throw Error('Sarakekäytön määrä poikkeaa otsikosta');const val=(key:string)=>index(key)<0?'':cells[index(key)];const creditor=val('luotonantaja'),type=val('luottotyyppi');if(!creditor||creditor.length>200)throw Error('Luotonantaja puuttuu tai on liian pitkä');if(!['vakuudellinen','vakuudeton','jatkuva'].includes(type))throw Error('Tuntematon luottotyyppi');const monthly=val('kuukausierä_eur'),creditLimit=val('luottoraja_eur'),start=val('alkupäivä'),late=val('maksuviive_päiviä');if(start&&!/^\d{4}-\d{2}-\d{2}$/.test(start))throw Error('Päivämäärän muoto: YYYY-MM-DD');if(start&&new Date(start).toISOString().slice(0,10)!==start)throw Error('Virheellinen päivämäärä');if(late&&!/^(0|[1-9]\d{0,4})$/.test(late))throw Error('Virheellinen maksuviive');rows.push({line:i+2,creditor,type,balanceCents:money(val('saldo_eur')),monthlyCents:monthly?money(monthly):null,creditLimitCents:creditLimit?money(creditLimit):null,startDate:start||null,lateDays:late?Number(late):null})}catch(e){errors.push({line:i+2,message:e instanceof Error?e.message:'Virhe'})}});
 return {rows,errors,total:lines.length-1,delimiter};
}

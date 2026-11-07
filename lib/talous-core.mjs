/** Deterministinen viitelaskenta. Ei verkkokutsuja tai tietokantayhteyksiä. */
export function euroCents(value) {
  if (typeof value !== 'string') throw Error('Summa on annettava tekstinä');
  let s=value.trim().replace(/[\u00a0\u202f ]/g,'');
  if(!s)throw Error('Summa puuttuu');
  let sign=1;
  if(/^\(.*\)$/.test(s)){sign=-1;s=s.slice(1,-1)}
  if(s.startsWith('-')){sign=-1;s=s.slice(1)}else if(s.startsWith('+'))s=s.slice(1);
  if(s.includes(',')&&s.includes('.')){
    if(s.lastIndexOf(',')>s.lastIndexOf('.')){
      if(!/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(s))throw Error('Epäselvä rahamuoto');
      s=s.replace(/\./g,'').replace(',','.');
    }else{
      if(!/^\d{1,3}(,\d{3})+\.\d{1,2}$/.test(s))throw Error('Epäselvä rahamuoto');
      s=s.replace(/,/g,'');
    }
  }else if(s.includes(',')){
    if(/^\d{1,3}(,\d{3})+$/.test(s))throw Error('Epäselvä tuhaterotin');
    s=s.replace(',','.');
  }else if(/^\d{1,3}(\.\d{3})+$/.test(s))throw Error('Epäselvä tuhaterotin');
  if(!/^\d+(\.\d{1,2})?$/.test(s))throw Error('Virheellinen rahamuoto');
  const [w,f='']=s.split('.');
  const cents=Number(w)*100+Number(f.padEnd(2,'0'));
  if(!Number.isSafeInteger(cents))throw Error('Summa liian suuri');
  return sign*cents;
}
export function finnishDate(value){
 const s=String(value??'').trim();let y,m,d;
 if(/^\d{2}\.\d{2}\.\d{4}$/.test(s)){[d,m,y]=s.split('.').map(Number)}
 else if(/^\d{4}-\d{2}-\d{2}$/.test(s)){[y,m,d]=s.split('-').map(Number)}
 else throw Error('Päiväys virheellinen');
 const check=new Date(Date.UTC(y,m-1,d));
 if(check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==d)throw Error('Päiväys ei ole kalenterissa');
 return [y,String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-');
}
export function parseCSV(input,delimiter){
 if(typeof input!=='string')throw Error('CSV-teksti puuttuu');
 const txt=input.replace(/^\uFEFF/,'');
 if(txt.length>10*1024*1024)throw Error('CSV ylittää 10 Mt');
 delimiter=delimiter??detectDelimiter(txt);
 if(![';',',','\t'].includes(delimiter))throw Error('Erotin ei ole tuettu');
 let rows=[],row=[],field='',quoted=false,afterQuote=false;
 for(let i=0;i<txt.length;i++){
  const c=txt[i];
  if(quoted){if(c==='"'){if(txt[i+1]==='"'){field+='"';i++}else{quoted=false;afterQuote=true}}else field+=c;continue}
  if(afterQuote){if(c===delimiter){row.push(field);field='';afterQuote=false;continue}if(c==='\n'||c==='\r'){row.push(field);rows.push(row);row=[];field='';afterQuote=false;if(c==='\r'&&txt[i+1]==='\n')i++;continue}if(c===' '||c==='\t')continue;throw Error('Virhe lainausmerkkien jälkeen')}
  if(c==='"'){if(field)throw Error('Odottamaton lainausmerkki');quoted=true}
  else if(c===delimiter){row.push(field);field=''}
  else if(c==='\n'||c==='\r'){row.push(field);rows.push(row);row=[];field='';if(c==='\r'&&txt[i+1]==='\n')i++}
  else field+=c;
 }
 if(quoted)throw Error('Sulkematon lainausmerkki');
 if(field!==''||row.length||afterQuote){row.push(field);rows.push(row)}
 rows=rows.filter(r=>r.some(c=>c.trim()));
 const width=rows[0]?.length??0;
 if(rows.some(r=>r.length!==width))throw Error('CSV:n sarakemäärä vaihtelee');
 return {delimiter,rows};
}
export function detectDelimiter(text){
 const count=d=>{let q=false,n=0;for(let i=0;i<text.length;i++){if(text[i]==='"'){if(q&&text[i+1]==='"')i++;else q=!q}else if(!q&&text[i]===d)n++}return n};
 const best=[';',',','\t'].map(d=>({d,n:count(text.slice(0,8192))})).sort((a,b)=>b.n-a.n)[0];
 if(!best.n)throw Error('Erotinta ei löydy');
 return best.d;
}
export function validateMappedRows(parsed,columns){
 const valid=[],invalid=[];
 parsed.rows.slice(1).forEach((row,i)=>{try{
  const bookedOn=finnishDate(row[columns.date]);
  const amountCents=euroCents(row[columns.amount]);
  const description=String(row[columns.description]??'').trim();
  if(!description)throw Error('Kuvaus puuttuu');
  valid.push({sourceLine:i+2,bookedOn,monthKey:bookedOn.slice(0,7),amountCents,description});
 }catch(e){invalid.push({sourceLine:i+2,message:e.message})}});
 return {valid,invalid};
}
export function purchaseAudit({balanceCents,bufferCents,horizonStart,horizonDays,flows,purchaseFlows,complete=true}){
 if(!Number.isSafeInteger(balanceCents)||!Number.isSafeInteger(bufferCents)||!complete||!Array.isArray(flows)||!Array.isArray(purchaseFlows))return {tier:'EI_ARVIOITAVISSA',reason:'Pakollisia tietoja puuttuu'};
 if(bufferCents<0||![30,60,90].includes(horizonDays))return {tier:'EI_ARVIOITAVISSA',reason:'Virheellinen puskuri tai ajanjakso'};
 let start;try{start=finnishDate(horizonStart)}catch{return {tier:'EI_ARVIOITAVISSA',reason:'Päiväys puuttuu'}}
 const all=[...flows,...purchaseFlows], schedule=new Map();
 try{for(const f of all){if(!Number.isSafeInteger(f.cents))throw Error();const d=finnishDate(f.date);schedule.set(d,(schedule.get(d)??0)+f.cents);if(!Number.isSafeInteger(schedule.get(d)))throw Error()}}catch{return {tier:'EI_ARVIOITAVISSA',reason:'Virheellinen erä'}}
 let balance=balanceCents,min=balanceCents,minDate=start;const date=new Date(start+'T00:00:00Z');
 for(let i=0;i<horizonDays;i++){const d=date.toISOString().slice(0,10);balance+=schedule.get(d)??0;if(!Number.isSafeInteger(balance))return {tier:'EI_ARVIOITAVISSA',reason:'Summa ylittää laskentarajat'};if(balance<min){min=balance;minDate=d}date.setUTCDate(date.getUTCDate()+1)}
 return {tier:min<0?'KORKEA_RISKI':min<bufferCents?'VAROITUS':'MAHTUU_SUUNNITELMAAN',minProjectedBalanceCents:min,endingBalanceCents:balance,bufferGapCents:min-bufferCents,minDate,calculationVersion:'reference-0.1'};
}

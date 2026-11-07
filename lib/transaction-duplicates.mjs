/** Conservative duplicate review. Does NOT auto-delete any financial transaction. */
const normalize=(text)=>String(text??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('fi');
export function duplicateCandidates(rows,{accountId='',externalIds={}}={}){
 const byKey=new Map(), candidates=[];
 rows.forEach((row,index)=>{
  const external=String(externalIds[row.id]??'').trim();
  const signature=external?['external',normalize(accountId),external].join('|'):
    ['possible',normalize(accountId),row.date,row.amountCents,normalize(row.description)].join('|');
  const prior=byKey.get(signature);
  if(prior!==undefined){
   candidates.push({index,sourceLine:row.sourceLine,previousIndex:prior,previousLine:rows[prior].sourceLine,
    strength:external?'id-match':'possible-match',
    message:external?'Tapahtumatunnus on sama':'Sama päivä, summa ja kuvaus – voi olla myös erillinen tapahtuma'});
  }else byKey.set(signature,index);
 });
 return candidates;
}
export function acceptedRowsAfterReview(rows,excludedIndices){
 const omit=new Set(excludedIndices);
 if([...omit].some(n=>!Number.isInteger(n)||n<0||n>=rows.length))throw Error('Virheellinen poistovalinta');
 return rows.filter((_,i)=>!omit.has(i));
}

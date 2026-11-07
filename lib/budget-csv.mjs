/** Validated CSV-to-budget adapter. Local-only, no bank-specific schema claims. */
import {parseCSV,validateMappedRows} from './talous-core.mjs';

export const MAX_BUDGET_CSV_BYTES=1024*1024;
export const MAX_BUDGET_CSV_ROWS=1000;
export const CATEGORY_NAMES=['Asuminen','Ruoka','Liikkuminen','Muut','Luokittelematon'];

export function parseBudgetCSV(raw){
 if(typeof raw!=='string')throw Error('CSV-teksti puuttuu');
 if(new TextEncoder().encode(raw).byteLength>MAX_BUDGET_CSV_BYTES)throw Error('CSV ylittää 1 Mt');
 if(raw.includes('\0'))throw Error('CSV sisältää virheellisen NUL-merkin');
 const result=parseCSV(raw);
 if(result.rows.length<2)throw Error('Otsikon lisäksi tarvitaan tapahtumia');
 if(result.rows.length-1>MAX_BUDGET_CSV_ROWS)throw Error('Enintään 1000 tapahtumaa');
 if(result.rows[0].length<3)throw Error('Tarvitaan vähintään kolme saraketta');
 return result;
}
export function suggestedMapping(headers){
 const normalized=headers.map(s=>String(s).toLowerCase().replace(/[^a-zåäö0-9]/g,''));
 const find=keys=>normalized.findIndex(s=>keys.some(key=>s===key));
 const date=find(['päivämäärä','paivamaara','kirjauspäivä','kirjauspaiva','date','bookingdate']);
 const amount=find(['summa','määräeur','maaraeur','amount','amounteur','eur']);
 const description=find(['kuvaus','viesti','selite','saajamaksaja','saajamaksaja','description','details']);
 return {date:date>=0?date:0,amount:amount>=0?amount:1,description:description>=0?description:2};
}
export function validateBudgetRows(parsed,mapping){
 const indices=[mapping.date,mapping.amount,mapping.description];
 if(indices.some(x=>!Number.isInteger(x)||x<0||x>=parsed.rows[0].length)||new Set(indices).size!==3)
  throw Error('Valitse kolme eri saraketta: päivä, summa ja kuvaus');
 const result=validateMappedRows(parsed,mapping);
 return {...result,valid:result.valid.map(x=>({...x,id:'csv-'+x.sourceLine, date:x.bookedOn, category:'Luokittelematon'}))};
}
export function budgetMonths(rows){
 return [...new Set(rows.map(x=>x.date.slice(0,7)))].sort();
}
export function classifyBudgetRows(rows,categories={}){
 return rows.map(t=>({...t,category:CATEGORY_NAMES.includes(categories[t.id])?categories[t.id]:'Luokittelematon'}));
}

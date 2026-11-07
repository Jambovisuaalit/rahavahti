import { createHash } from "node:crypto";
// @ts-ignore The reference core is a plain ECMAScript module tested separately.
import { parseCSV, validateMappedRows } from "./talous-core.mjs";

export type ImportMapping = { date: number; amount: number; description: number; externalId: number };
export type ImportRow = { externalId: string; bookedOn: string; amountCents: number; description: string };

export function prepareImport(csv: string, mapping: ImportMapping) {
 if(typeof csv!=="string"||Buffer.byteLength(csv,"utf8")>1_000_000) throw Error("CSV saa olla enintään 1 Mt");
 if(!mapping||!Object.values(mapping).every(x=>Number.isInteger(x)&&x>=0))throw Error("Sarakekartoitus puuttuu");
 if(new Set(Object.values(mapping)).size!==4)throw Error("Jokaisella kentällä on oltava oma sarake");
 const parsed=parseCSV(csv);
 if(parsed.rows.length<2||parsed.rows.length>1001)throw Error("CSV: 1–1000 tapahtumariviä sallitaan");
 const mapped=validateMappedRows(parsed,mapping);
 if(mapped.invalid.length||mapped.valid.length!==parsed.rows.length-1)throw Error("CSV sisältää virheellisiä tapahtumarivejä");
 const ids=new Set<string>();
 const rows:ImportRow[]=mapped.valid.map((row:{sourceLine:number;bookedOn:string;amountCents:number;description:string})=>{
   const externalId=parsed.rows[row.sourceLine-1][mapping.externalId]?.trim();
   if(!externalId||externalId.length>255)throw Error("Pankin yksilöivä tapahtumatunniste puuttuu tai on liian pitkä");
   if(ids.has(externalId))throw Error("CSV sisältää saman tapahtumatunnisteen useammin kuin kerran");
   ids.add(externalId);
   if(!Number.isSafeInteger(row.amountCents)||Math.abs(row.amountCents)>9_000_000_000_000)throw Error("Tapahtuman rahamäärä ei kelpaa");
   return {externalId,bookedOn:row.bookedOn,amountCents:row.amountCents,description:row.description.slice(0,1000)};
 });
 return {rows,sha256:createHash("sha256").update(csv,"utf8").digest("hex")};
}

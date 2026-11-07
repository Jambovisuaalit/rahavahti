import test from "node:test";
import assert from "node:assert/strict";
import { prepareImport } from "../lib/import-service.ts";
const columns={date:0,amount:1,description:2,externalId:3};
const header="Päivä;Summa;Kuvaus;Pankin tapahtumatunniste\n";
test("Tallennusvalmistelu: kelvollinen suomalainen CSV",()=>{
 const p=prepareImport(header+'01.11.2026;-12,34;Kahvi;TX-1\n',columns);
 assert.equal(p.rows[0].amountCents,-1234);
 assert.equal(p.rows[0].externalId,'TX-1');
 assert.match(p.sha256,/^[a-f0-9]{64}$/);
});
test("Tallennusvalmistelu: pankin tunniste pakollinen",()=>{
 assert.throws(()=>prepareImport(header+'01.11.2026;-12,34;Kahvi;\n',columns),/tapahtumatunniste/i);
});
test("Tallennusvalmistelu: toistuva pankin tunniste estetään",()=>{
 assert.throws(()=>prepareImport(header+'01.11.2026;-1,00;A;TX-1\n02.11.2026;-2,00;B;TX-1\n',columns),/saman tapahtumatunnisteen/i);
});
test("Tallennusvalmistelu: virheellinen rivi estää koko erän",()=>{
 assert.throws(()=>prepareImport(header+'01.11.2026;-1,00;A;TX-1\n31.11.2026;-2,00;B;TX-2\n',columns),/virheellisiä/i);
});
test("Tallennusvalmistelu: puuttuvat sarakkeet estetään",()=>{
 assert.throws(()=>prepareImport(header+'01.11.2026;-1,00;A;TX-1\n',{date:0,amount:1,description:2,externalId:2}),/oma sarake/i);
});
test("Tallennusvalmistelu: sama tiedosto antaa saman hashin",()=>{
 const txt=header+'01.11.2026;-1,00;A;TX-1\n';
 assert.equal(prepareImport(txt,columns).sha256,prepareImport(txt,columns).sha256);
});
test("Tallennusvalmistelu: yli tuhannen tapahtuman erä estetään",()=>{
 const txt=header+Array.from({length:1001},(_,i)=>'01.11.2026;-1,00;A;TX-'+i).join('\n');
 assert.throws(()=>prepareImport(txt,columns),/1000 tapahtumariviä/i);
});
test("Tallennusvalmistelu: yli 1 Mt erä estetään",()=>{
 assert.throws(()=>prepareImport('a'.repeat(1000001),columns),/1 Mt/i);
});

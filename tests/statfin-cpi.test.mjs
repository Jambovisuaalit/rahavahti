import test from "node:test";
import assert from "node:assert/strict";
import {CPI_URL,selectCpiPeriods,cpiQuery,parseCpiResponse,fetchCpi} from "../lib/market/statfin-cpi.mjs";
function periods() {
  const end=new Date();end.setUTCMonth(end.getUTCMonth()-2);
  return Array.from({length:13},(_,i)=>{
    const d=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()-12+i,1));
    return d.getUTCFullYear()+"M"+String(d.getUTCMonth()+1).padStart(2,"0");
  });
}
function metadata(){return {variables:[
  {code:"timeperiod_m",values:periods()},
  {code:"coicop_46_20231201",values:["SSS"]},
  {code:"contentscode",values:["ip_khi","vm_khi","km_khi"]}
]}}
function observation(){
 const ps=periods();return {
  version:"2.0",class:"dataset",updated:"2026-10-14T05:00:00Z",
  id:["timeperiod_m","coicop_46_20231201","contentscode"],size:[13,1,3],
  dimension:{timeperiod_m:{category:{index:Object.fromEntries(ps.map((p,i)=>[p,i]))}},
    coicop_46_20231201:{category:{index:{SSS:0}}},
    contentscode:{category:{index:{ip_khi:0,vm_khi:1,km_khi:2}}}},
  value:Array.from({length:13},(_,i)=>i===0?[100.11,0.5,0.3]:i===12?[102.63,2.5,0.7]:[101,1,0]).flat()
 }}
test("metadata codes and periods are verified",()=>{
  assert.equal(selectCpiPeriods(metadata()).length,13);
  assert.equal(cpiQuery(periods()).query[1].selection.values[0],"SSS");
});
test("parse validated JSON-stat2 CPI and annual change",()=>{
  const x=parseCpiResponse(observation(),periods());
  assert.equal(x.annualChangePercent,2.5);
  assert.equal(x.monthlyChangePercent,0.7);
  assert.equal(x.index,102.63);
});
test("missing total series and wrong dimension rejected",()=>{
 const m=metadata();m.variables[1].values=["01"];
 assert.throws(()=>selectCpiPeriods(m));
 const o=observation();o.dimension.contentscode.category.index.vm_khi=2;
 assert.throws(()=>parseCpiResponse(o,periods()));
});
test("bad index and inconsistent annual inflation rejected",()=>{
 const o=observation();o.value[36]=0;
 assert.throws(()=>parseCpiResponse(o,periods()));
 const o2=observation();o2.value[37]=80;
 assert.throws(()=>parseCpiResponse(o2,periods()));
});
test("only official StatFin endpoint called with fixed body",async()=>{
 let calls=0;
 const result=await fetchCpi(async(url,options={})=>{
   assert.equal(url,CPI_URL);calls++;
   if(calls===1){assert.equal(options.method,undefined);return {ok:true,json:async()=>metadata()};}
   assert.equal(options.method,"POST");
   const body=JSON.parse(options.body);
   assert.deepEqual(body.query[1].selection.values,["SSS"]);
   return {ok:true,json:async()=>observation()};
 });
 assert.equal(calls,2);assert.equal(result.index,102.63);
});
test("source HTTP failure rejects and never manufactures numbers",async()=>{
 await assert.rejects(fetchCpi(async()=>({ok:false,status:503})));
});

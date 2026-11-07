import test from "node:test";
import assert from "node:assert/strict";
import {INTEREST_SERIES,parseSeriesPayload,fetchLiveBenchmarks} from "../lib/market/bof-live.mjs";
const good=(key,value)=>({items:[{dataset:"MFI_PUBL",name:INTEREST_SERIES[key].name,
  observations:[{period:"2026-09-30",periodCode:"2026M9",value}]}]});
test("validated nominal and APR series match September 2026 official snapshot",()=>{
 const nominal=parseSeriesPayload(good("consumer_nominal",5.85993403234024),"consumer_nominal");
 const apr=parseSeriesPayload(good("consumer_apr",8.219787358538891),"consumer_apr");
 assert.equal(nominal.annualRatePercent,5.86);
 assert.equal(apr.annualRatePercent,8.22);
 assert.equal(nominal.observationMonth,"2026-09");
});
test("misidentified series or dataset never becomes market interest",()=>{
 assert.throws(()=>parseSeriesPayload(good("consumer_apr",8.22),"consumer_nominal"));
 const wrong=good("consumer_nominal",5.86);wrong.items[0].dataset="WRONG";
 assert.throws(()=>parseSeriesPayload(wrong,"consumer_nominal"));
});
test("reject absent, nonnumeric, and future data",()=>{
 assert.throws(()=>parseSeriesPayload({items:[]},"consumer_nominal"));
 assert.throws(()=>parseSeriesPayload(good("consumer_nominal","5.86"),"consumer_nominal"));
 const future=good("consumer_nominal",5);future.items[0].observations[0].period="2099-09-30";
 future.items[0].observations[0].periodCode="2099M9";
 assert.throws(()=>parseSeriesPayload(future,"consumer_nominal"));
});
test("fetcher calls only fixed official API series URLs",async()=>{
 const requested=[];
 const mock=async url=>{requested.push(url);
  const key=url.includes(encodeURIComponent(INTEREST_SERIES.consumer_nominal.name))?"consumer_nominal":"consumer_apr";
  return {ok:true,json:async()=>good(key,key==="consumer_nominal"?5.85993403234024:8.219787358538891)};
 };
 const rows=await fetchLiveBenchmarks(mock);
 assert.deepEqual(Object.keys(rows).sort(),["consumer_apr","consumer_nominal"]);
 assert.equal(requested.length,2);
 assert.ok(requested.every(x=>x.startsWith("https://api.boffsaopendata.fi/v4/observations/MFI_PUBL?seriesName=")));
});
test("API error fails closed",async()=>{
 await assert.rejects(fetchLiveBenchmarks(async()=>({ok:false,status:502})));
});

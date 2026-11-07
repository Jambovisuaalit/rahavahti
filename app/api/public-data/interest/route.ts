import { NextResponse } from "next/server";
// @ts-ignore -- CommonJS-free JS module tested by node tests.
import { BENCHMARKS } from "../../../../lib/market/interest-benchmark.mjs";
// @ts-ignore -- JS live adapter tested by node tests.
import { fetchLiveBenchmarks } from "../../../../lib/market/bof-live.mjs";
export const runtime = "nodejs";
export async function GET() {
  try {
    const live=await fetchLiveBenchmarks();
    return NextResponse.json({
      source:"Suomen Pankki / Finanssivalvonta",dataset:"MFI_PUBL",
      dataMode:"live_api_verified",observations:Object.values(live),
      disclaimer:"Tilastollisia uusien sopimusten korkoja, ei lainatarjouksia."
    },{headers:{"Cache-Control":"public,max-age=300,s-maxage=3600"}});
  } catch {
    // Fail closed: explicitly label the pinned fallback snapshot, never call it live.
    return NextResponse.json({
      source:"Suomen Pankki / Finanssivalvonta",dataset:"MFI_PUBL",
      dataMode:"static_fallback",liveIntegrationStatus:"LIVE_UNAVAILABLE",
      observations:Object.values(BENCHMARKS),
      disclaimer:"Live-data ei ole nyt saatavilla. Näytetään vain syyskuun 2026 erikseen merkitty vertailutilasto."
    },{headers:{"Cache-Control":"no-store","X-Interest-Data-Status":"fallback"}});
  }
}

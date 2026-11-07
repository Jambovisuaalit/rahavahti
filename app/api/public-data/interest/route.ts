import { NextResponse } from "next/server";
// @ts-ignore: JavaScript core validated separately by node tests.
import { BENCHMARKS } from "../../../../lib/market/interest-benchmark.mjs";
export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json({
    source: "Suomen Pankki / Finanssivalvonta",
    dataset: "MFI_PUBL",
    apiVersion: "Timeseries API v4 (live retrieval not yet verified)",
    dataMode: "static_verified_snapshot",
    observations: Object.values(BENCHMARKS),
    liveIntegrationStatus: "HOLD_SERIES_ID_UNVERIFIED",
    disclaimer: "Nämä ovat syyskuun 2026 julkaistuja havaintoja, eivät reaaliaikaisia korkoja.",
  }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=86400" } });
}

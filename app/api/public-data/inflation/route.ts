import { NextResponse } from "next/server";
// @ts-ignore -- standalone JS adapter validated with node tests.
import { fetchCpi } from "../../../../lib/market/statfin-cpi.mjs";
export const runtime="nodejs";
export async function GET() {
  try {
    const data=await fetchCpi();
    return NextResponse.json({dataMode:"live_api_verified",observation:data},{
      headers:{"Cache-Control":"public,max-age=300,s-maxage=3600"}
    });
  } catch {
    // Do not silently substitute dated observations for a live source.
    return NextResponse.json({error:"Tilastokeskuksen KHI ei ole saatavilla",dataMode:"unavailable"},{
      status:503,headers:{"Cache-Control":"no-store"}
    });
  }
}

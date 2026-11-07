import {test,expect} from "@playwright/test";

/**
 * Tests actual Next.js HTTP routes in the CI-built production server.
 * This does not authenticate to the Vercel-protected Preview deployment.
 */
test("public interest page serves HTML, not a sign-in redirect",async({request})=>{
 const response=await request.get("/korkovertailu",{maxRedirects:0});
 expect(response.status()).toBe(200);
 expect(response.headers()["content-type"]).toContain("text/html");
 expect(await response.text()).toContain("Vertaa kulutusluottosi korkoa");
 expect(response.headers()["content-security-policy"]).toContain("nonce-");
});

test("public inflation page serves HTML, not a sign-in redirect",async({request})=>{
 const response=await request.get("/inflaatio",{maxRedirects:0});
 expect(response.status()).toBe(200);
 expect(response.headers()["content-type"]).toContain("text/html");
 expect(await response.text()).toContain("Inflaatio ja oma ostovoima");
 expect(response.headers()["content-security-policy"]).toContain("nonce-");
});

test("live Finnish central-bank interest API returns verified type-safe JSON",async({request})=>{
 const response=await request.get("/api/public-data/interest",{maxRedirects:0,timeout:45000});
 expect(response.status()).toBe(200);
 expect(response.headers()["content-type"]).toContain("application/json");
 const json=await response.json();
 expect(json.dataset).toBe("MFI_PUBL");
 expect(json.dataMode).toBe("live_api_verified");
 expect(json.observations).toHaveLength(2);
 const byId=Object.fromEntries(json.observations.map((r:{id:string})=>[r.id,r]));
 expect(Object.keys(byId).sort()).toEqual(["consumer_apr","consumer_nominal"]);
 for(const [id,metric] of [["consumer_nominal","nominal"],["consumer_apr","apr"]] as const){
   const obs=byId[id];
   expect(obs.metric).toBe(metric);
   expect(obs.debtType).toBe("consumer_loan");
   expect(Number.isFinite(obs.annualRatePercent)).toBe(true);
   expect(obs.annualRatePercent).toBeGreaterThanOrEqual(0);
   expect(obs.annualRatePercent).toBeLessThan(100);
   expect(obs.observationMonth).toMatch(/^\d{4}-\d{2}$/);
   expect(obs.status).toBe("verified_live_api");
 }
});

test("live Statistics Finland CPI API returns verified numeric JSON",async({request})=>{
 const response=await request.get("/api/public-data/inflation",{maxRedirects:0,timeout:45000});
 expect(response.status()).toBe(200);
 expect(response.headers()["content-type"]).toContain("application/json");
 const json=await response.json();
 expect(json.dataMode).toBe("live_api_verified");
 const obs=json.observation;
 expect(obs.source).toBe("Tilastokeskus");
 expect(obs.table).toBe("15b5");
 expect(obs.baseYear).toBe(2025);
 expect(obs.observationMonth).toMatch(/^\d{4}M(?:0[1-9]|1[0-2])$/);
 expect(obs.status).toBe("verified_live_api");
 expect(Number.isFinite(obs.index)).toBe(true);
 expect(obs.index).toBeGreaterThan(0);
 expect(Number.isFinite(obs.annualChangePercent)).toBe(true);
 expect(Number.isFinite(obs.monthlyChangePercent)).toBe(true);
});

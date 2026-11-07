import {test,expect,chromium} from "@playwright/test";
import {randomBytes} from "node:crypto";
import {existsSync} from "node:fs";

/**
 * Protected Preview E2E.
 * Requires legitimate Vercel SSO browser state supplied at runtime.
 * Never bypasses Vercel's protection and never accepts real bank data.
 * Requires an isolated TEST preview with FINANCE_WRITES_ENABLED=true.
 * On ordinary HOLD Preview, fail closed instead of silently skipping.
 */
test("Neon Auth A/B isolation, atomic CSV, replay, rollback",async()=>{
 const base=process.env.E2E_BASE_URL;
 const sso=process.env.E2E_VERCEL_STORAGE_STATE;
 if(!base||!/^https:\/\/[^/]+\.vercel\.app\/?$/.test(base))throw Error("E2E_BASE_URL: suojattu vercel.app-Preview puuttuu");
 if(!sso||!existsSync(sso))throw Error("E2E_VERCEL_STORAGE_STATE: aidon Vercel-kirjautumisen tallennettu tila puuttuu");
 if(process.env.E2E_SYNTHETIC_WRITES_APPROVED!=="true")throw Error("Synteettisten E2E-kirjoitusten hyväksyntä puuttuu");
 const browser=await chromium.launch({headless:true});
 const suffix=randomBytes(9).toString("hex");
 const password="Rv!"+randomBytes(20).toString("hex");
 const state=JSON.parse(await (await import("node:fs/promises")).readFile(sso,"utf8"));
 async function user(label){
   const context=await browser.newContext({baseURL:base,storageState:state});
   const page=await context.newPage();
   const email="rahavahti-e2e-"+label+"-"+suffix+"@example.com";
   const response=await page.goto("/auth/sign-up");
   if(response?.status()!==200)throw Error("Vercelin suojaus ei hyväksynyt autentikoitua testi-istuntoa");
   await page.getByLabel("Nimi").fill("Synteettinen E2E "+label);
   await page.getByLabel("Sähköposti").fill(email);
   await page.getByLabel("Salasana").fill(password);
   await page.getByRole("button",{name:"Luo tili"}).click();
   await expect(page).toHaveURL(/\/dashboard(?:\/)?$/, {timeout:20000});
   await page.reload();
   await expect(page.getByRole("heading",{name:"Rahavahti"})).toBeVisible();
   const authUser=await context.request.get("/api/accounts",{maxRedirects:0});
   expect(authUser.status()).toBe(200);
   return {context,page,email};
 }
 try{
   const a=await user("a");
   const b=await user("b");
   const post=(context,path,body)=>context.request.post(path,{data:body,headers:{"content-type":"application/json"}});
   const createdA=await post(a.context,"/api/accounts",{name:"E2E_SYNTHETIC_A"});
   expect(createdA.status()).toBe(201);
   const accountA=(await createdA.json()).account.id;
   const createdB=await post(b.context,"/api/accounts",{name:"E2E_SYNTHETIC_B"});
   expect(createdB.status()).toBe(201);
   const accountB=(await createdB.json()).account.id;
   expect(accountA).not.toBe(accountB);
   const aAccounts=await (await a.context.request.get("/api/accounts")).json();
   const bAccounts=await (await b.context.request.get("/api/accounts")).json();
   expect(aAccounts.accounts.map(x=>x.id)).toContain(accountA);
   expect(aAccounts.accounts.map(x=>x.id)).not.toContain(accountB);
   expect(bAccounts.accounts.map(x=>x.id)).toContain(accountB);
   expect(bAccounts.accounts.map(x=>x.id)).not.toContain(accountA);

   const mapping={date:0,amount:1,description:2,externalId:3};
   const header="Päivä;Summa;Kuvaus;Tunniste\n";
   const csv=header+"01.11.2026;-12,34;SYNTHETIC_A_COFFEE;E2E-A-"+suffix+"-1\n"+
                   "02.11.2026;-24,00;SYNTHETIC_A_FOOD;E2E-A-"+suffix+"-2\n";
   const input={accountId:accountA,filename:"E2E_FAKE_A.csv",csv,mapping};
   const first=await post(a.context,"/api/import",input);
   expect(first.status()).toBe(200);
   expect((await first.json()).imported).toBe(2);
   const listing=await a.context.request.get("/api/transactions?accountId="+accountA);
   expect(listing.status()).toBe(200);
   expect((await listing.json()).transactions).toHaveLength(2);

   const replay=await post(a.context,"/api/import",input);
   expect(replay.status()).toBe(200);
   expect((await replay.json()).status).toBe("already_imported");
   expect((await (await a.context.request.get("/api/transactions?accountId="+accountA)).json()).transactions).toHaveLength(2);

   const deniedRead=await b.context.request.get("/api/transactions?accountId="+accountA,{maxRedirects:0});
   expect(deniedRead.status()).toBe(404);
   const deniedWrite=await post(b.context,"/api/import",{...input,csv:csv.replace("E2E-A-","E2E-B-")});
   expect(deniedWrite.status()).toBe(404);

   // First new row must be rolled back after conflicting existing bank event ID.
   const conflicting=header+"03.11.2026;-1,00;MUST_ROLLBACK;E2E-A-"+suffix+"-3\n"+
                           "01.11.2026;-9,99;CHANGED_DESCRIPTION;E2E-A-"+suffix+"-1\n";
   const conflict=await post(a.context,"/api/import",{...input,csv:conflicting,filename:"E2E_FAKE_CONFLICT.csv"});
   expect(conflict.status()).toBe(409);
   const afterConflict=(await (await a.context.request.get("/api/transactions?accountId="+accountA)).json()).transactions;
   expect(afterConflict).toHaveLength(2);
   expect(afterConflict.some(x=>x.externalId.endsWith("-3"))).toBe(false);

   const invalid=await post(a.context,"/api/import",{...input,filename:"E2E_FAKE_INVALID.csv",csv:header+"31.11.2026;-1,00;BAD_DATE;E2E-A-"+suffix+"-4\n"});
   expect(invalid.status()).toBe(422);
   expect((await (await a.context.request.get("/api/transactions?accountId="+accountA)).json()).transactions).toHaveLength(2);

   // User B may use the same bank reference ID on their own account.
   const csvB=header+"01.11.2026;-3,00;SYNTHETIC_B;E2E-A-"+suffix+"-1\n";
   const B=await post(b.context,"/api/import",{accountId:accountB,filename:"E2E_FAKE_B.csv",csv:csvB,mapping});
   expect(B.status()).toBe(200);
   const bTx=(await (await b.context.request.get("/api/transactions?accountId="+accountB)).json()).transactions;
   expect(bTx).toHaveLength(1);
   expect((await (await a.context.request.get("/api/transactions?accountId="+accountA)).json()).transactions).toHaveLength(2);

   await a.page.getByRole("button",{name:"Kirjaudu ulos"}).click();
   const afterLogout=await a.context.request.get("/api/accounts",{maxRedirects:0});
   expect(afterLogout.status()).not.toBe(200);
   await a.context.close();await b.context.close();
 }finally{await browser.close()}
});

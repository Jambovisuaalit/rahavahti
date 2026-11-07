import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../lib/auth/server";
import { getDb } from "../../../lib/db";
import { prepareImport } from "../../../lib/import-service";
import type { ImportMapping } from "../../../lib/import-service";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
 const { data: session } = await auth.getSession();
 const userId = session?.user?.id;
 if(!userId) return NextResponse.json({error:"Kirjautuminen vaaditaan"}, {status:401});
 // Default deny. Only explicitly enabled in isolated test deployments.
 if(process.env.FINANCE_WRITES_ENABLED!=="true")
   return NextResponse.json({error:"Tapahtumien tallennus on estetty. Julkaisuportti HOLD."},{status:423});
 let body: {accountId?:string;csv?:string;mapping?:ImportMapping;filename?:string};
 try { body=await request.json(); } catch { return NextResponse.json({error:"Virheellinen pyyntö"}, {status:400}); }
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(!body.accountId||!uuid.test(body.accountId)||typeof body.filename!=="string"||body.filename.length>180)
   return NextResponse.json({error:"Tili tai tiedostonimi virheellinen"},{status:400});
 let prepared: ReturnType<typeof prepareImport>;
 try{prepared=prepareImport(body.csv??"",body.mapping!)}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Virheellinen CSV"},{status:422})}
 const db=getDb();
 const client=await db.connect();
 try {
   await client.query("BEGIN");
   // Prevent simultaneous imports for the same user/account combination.
   await client.query("SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))",[userId,body.accountId]);
   const account=await client.query("SELECT id FROM finance.accounts WHERE id=$1 AND user_id=$2 FOR UPDATE",[body.accountId,userId]);
   if(account.rowCount!==1){await client.query("ROLLBACK");return NextResponse.json({error:"Tiliä ei löydy"},{status:404})}
   const already=await client.query("SELECT id,imported_count FROM finance.import_batches WHERE user_id=$1 AND account_id=$2 AND file_sha256=$3",[userId,body.accountId,prepared.sha256]);
   if(already.rowCount){await client.query("COMMIT");return NextResponse.json({status:"already_imported",importId:already.rows[0].id,imported:0})}
   // Validate cross-import bank event IDs; same ID with different content is an error.
   let existing=0;
   for(const row of prepared.rows){
     const found=await client.query("SELECT booked_on,amount_cents,description FROM finance.transactions WHERE user_id=$1 AND account_id=$2 AND external_id=$3",[userId,body.accountId,row.externalId]);
     if(found.rowCount){
       const old=found.rows[0];
       if(old.booked_on.toISOString().slice(0,10)!==row.bookedOn||Number(old.amount_cents)!==row.amountCents||old.description!==row.description)
         throw Error("Tapahtumatunniste on ristiriidassa aiemman tuonnin kanssa");
       existing++;
     }
   }
   const batch=await client.query("INSERT INTO finance.import_batches(user_id,account_id,file_sha256,filename,imported_count) VALUES($1,$2,$3,$4,0) RETURNING id",[userId,body.accountId,prepared.sha256,body.filename]);
   const importId=batch.rows[0].id;
   let imported=0;
   for(const row of prepared.rows){
     const result=await client.query("INSERT INTO finance.transactions(user_id,account_id,import_id,external_id,booked_on,amount_cents,description) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(user_id,account_id,external_id) DO NOTHING",[userId,body.accountId,importId,row.externalId,row.bookedOn,row.amountCents,row.description]);
     imported+=result.rowCount??0;
   }
   await client.query("UPDATE finance.import_batches SET imported_count=$2 WHERE id=$1",[importId,imported]);
   await client.query("INSERT INTO finance.audit_events(user_id,action,entity_type,entity_id) VALUES($1,'csv_import','import_batch',$2)",[userId,importId]);
   await client.query("COMMIT");
   return NextResponse.json({status:"imported",importId,imported,duplicates:existing});
 }catch(e){
   await client.query("ROLLBACK").catch(()=>{});
   // No CSV body or bank data in logs or errors.
   const conflict=e instanceof Error&&e.message.includes("ristiriidassa");
   return NextResponse.json({error:conflict?"Tapahtuman tunniste on ristiriidassa aiemman tuonnin kanssa":"Tuontia ei tallennettu. Mitään osittaista erää ei hyväksytty."},{status:conflict?409:500});
 }finally{client.release()}
}

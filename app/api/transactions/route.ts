import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../lib/auth/server";
import { getDb } from "../../../lib/db";

export const runtime = "nodejs";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request:NextRequest) {
 const {data:session}=await auth.getSession();
 if(!session?.user?.id) return NextResponse.json({error:"Kirjautuminen vaaditaan"},{status:401});
 const accountId=new URL(request.url).searchParams.get("accountId");
 if(!accountId||!uuid.test(accountId))return NextResponse.json({error:"Virheellinen tilitunniste"},{status:400});
 const client=await getDb().connect();
 try{
  await client.query("BEGIN READ ONLY");
  await client.query("SELECT set_config('app.user_id',$1,true)",[session.user.id]);
  const account=await client.query("SELECT id FROM finance.accounts WHERE id=$1 AND user_id=$2",[accountId,session.user.id]);
  if(!account.rowCount){await client.query("ROLLBACK");return NextResponse.json({error:"Tiliä ei löydy"},{status:404})}
  const rows=await client.query(
   "SELECT id,booked_on,amount_cents,description,external_id FROM finance.transactions WHERE user_id=$1 AND account_id=$2 ORDER BY booked_on DESC,created_at DESC,id DESC LIMIT 100",
   [session.user.id,accountId]
  );
  await client.query("COMMIT");
  return NextResponse.json({transactions:rows.rows.map(r=>({
   id:r.id,bookedOn:r.booked_on instanceof Date?r.booked_on.toISOString().slice(0,10):String(r.booked_on),
   amountCents:Number(r.amount_cents),description:r.description,externalId:r.external_id
  }))},{headers:{"Cache-Control":"no-store"}});
 }catch{
  await client.query("ROLLBACK").catch(()=>{});
  return NextResponse.json({error:"Tapahtumien luku epäonnistui"},{status:500});
 }finally{client.release()}
}

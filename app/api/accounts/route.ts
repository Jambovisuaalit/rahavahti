import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth/server";
import { getDb } from "../../../lib/db";
export const runtime="nodejs";
async function forUser<T>(userId:string,fn:(client: import("pg").PoolClient)=>Promise<T>):Promise<T> {
 const client=await getDb().connect();
 try{
  await client.query("BEGIN");
  await client.query("SELECT set_config('app.user_id', $1, true)",[userId]);
  const value=await fn(client);
  await client.query("COMMIT");
  return value;
 }catch(e){await client.query("ROLLBACK").catch(()=>{});throw e}
 finally{client.release()}
}
export async function GET(){
 const {data:session}=await auth.getSession();
 if(!session?.user)return NextResponse.json({error:"Kirjautuminen vaaditaan"},{status:401});
 const r=await forUser(session.user.id,client=>client.query("SELECT id,name FROM finance.accounts WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30",[session.user.id]));
 return NextResponse.json({accounts:r.rows});
}
export async function POST(request:Request){
 const {data:session}=await auth.getSession();
 if(!session?.user)return NextResponse.json({error:"Kirjautuminen vaaditaan"},{status:401});
 if(process.env.FINANCE_WRITES_ENABLED!=="true")return NextResponse.json({error:"Tallennus estetty (HOLD)"},{status:423});
 let body:{name?:string};
 try{body=await request.json()}catch{return NextResponse.json({error:"Virheellinen pyyntö"},{status:400})}
 if(typeof body.name!=="string"||body.name.trim().length<1||body.name.length>80)return NextResponse.json({error:"Tilin nimi ei kelpaa"},{status:422});
 const r=await forUser(session.user.id,client=>client.query("INSERT INTO finance.accounts(user_id,name) VALUES($1,$2) RETURNING id,name",[session.user.id,body.name!.trim()]));
 return NextResponse.json({account:r.rows[0]},{status:201});
}

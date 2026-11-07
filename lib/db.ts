import { Pool } from "pg";
// Never import this file into a Client Component.
let pool: Pool | undefined;
export function getDb(){
 const url=process.env.DATABASE_URL;
 if(!url)throw new Error("DATABASE_URL ei ole määritetty");
 pool??=new Pool({connectionString:url,ssl:{rejectUnauthorized:true},max:3,connectionTimeoutMillis:5000,idleTimeoutMillis:10000});
 return pool;
}

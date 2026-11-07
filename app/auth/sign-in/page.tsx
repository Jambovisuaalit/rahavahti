"use client";
import { useState } from "react";
import { authClient } from "../../../lib/auth/client";
export default function SignIn(){
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[pending,setPending]=useState(false);
  return <main><h1>Kirjaudu Rahavahtiin</h1><form onSubmit={async e=>{e.preventDefault();setPending(true);setError("");try{const r=await authClient.signIn.email({email,password});if(r.error)setError(r.error.message||"Kirjautuminen epäonnistui");else window.location.href="/dashboard";}catch{setError("Yhteysvirhe")}finally{setPending(false)}}}>
  <label htmlFor="email">Sähköposti</label><input id="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/>
  <label htmlFor="password">Salasana</label><input id="password" type="password" required value={password} onChange={e=>setPassword(e.target.value)}/>
  <button disabled={pending}>{pending?"Kirjaudutaan…":"Kirjaudu"}</button><p role="alert" className="error">{error}</p></form><a href="/auth/sign-up">Luo tili</a></main>;
}

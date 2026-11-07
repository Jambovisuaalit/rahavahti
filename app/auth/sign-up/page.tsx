"use client";
import { useState } from "react";
import { authClient } from "../../../lib/auth/client";
export default function SignUp(){
 const [name,setName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[pending,setPending]=useState(false);
 return <main><h1>Luo Rahavahti-tili</h1><form onSubmit={async e=>{e.preventDefault();setError("");setPending(true);try{const r=await authClient.signUp.email({name,email,password});if(r.error)setError(r.error.message||"Rekisteröityminen epäonnistui");else window.location.href="/dashboard";}catch{setError("Yhteysvirhe")}finally{setPending(false)}}}><label htmlFor="name">Nimi</label><input id="name" required value={name} onChange={e=>setName(e.target.value)}/><label htmlFor="email">Sähköposti</label><input id="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/><label htmlFor="password">Salasana</label><input id="password" type="password" minLength={10} required value={password} onChange={e=>setPassword(e.target.value)}/><button disabled={pending}>{pending?"Tallennetaan…":"Luo tili"}</button><p role="alert" className="error">{error}</p></form><a href="/auth/sign-in">Kirjaudu sisään</a></main>;
}

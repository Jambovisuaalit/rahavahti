"use client";
import { useState } from "react";
import { authClient } from "../lib/auth/client";
export function SignOut(){const [pending,setPending]=useState(false);return <button disabled={pending} onClick={async()=>{setPending(true);try{await authClient.signOut();window.location.href="/auth/sign-in"}finally{setPending(false)}}}>{pending?"Kirjaudutaan ulos…":"Kirjaudu ulos"}</button>}

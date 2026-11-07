import { redirect } from "next/navigation";
import { auth } from "../../../lib/auth/server";
import DebtTools from "../../../components/debt-tools";
export const metadata={title:"Velat ja Ostoauditointi | Rahavahti"};
export default async function VelatPage(){
 const {data}=await auth.getSession();
 if(!data?.user)redirect("/auth/sign-in");
 return <main><p><a href="/dashboard">← Takaisin</a></p><h1>Velat ja luottotarjoukset</h1><p className="muted">Tarjousten kululaskuri, takaisinmaksustrategiat ja yhdistelyarvio – synteettinen demo.</p><DebtTools/></main>;
}

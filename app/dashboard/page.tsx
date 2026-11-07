import { redirect } from "next/navigation";
import { auth } from "../../lib/auth/server";
export default async function Dashboard(){const {data}=await auth.getSession();if(!data?.user)redirect("/auth/sign-in");return <main><h1>Rahavahti</h1><p>Kirjautunut käyttäjä: {data.user.email}</p><p>Tuotantokäyttö HOLD. Taloustietojen importti edellyttää hyväksyttyjä eristys- ja turvallisuustestejä.</p><p><a href="/dashboard/import">Avaa CSV-tuonti</a></p></main>}

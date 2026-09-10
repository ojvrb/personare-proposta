import { redirect } from "next/navigation";

// Sem landing publica ainda (MVP e interno) — quem entra vai direto pro login/painel.
export default function Home() {
  redirect("/painel");
}

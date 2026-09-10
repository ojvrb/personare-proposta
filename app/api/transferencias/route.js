import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/perfil";

// GET (admin-only): lista transferencias pendentes, com nome do cliente e email dos envolvidos.
export async function GET() {
  const supabase = await createClient();
  const negado = await requireRole(supabase, ["admin"]);
  if (negado) return negado;

  const { data: pendentes, error } = await supabase
    .from("transferencias_lead")
    .select("*, clientes(nome, nome_conjuge)")
    .eq("status", "pendente")
    .order("solicitado_em");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: authList } = await adminClient().auth.admin.listUsers();
  const emailPorId = Object.fromEntries(authList.users.map((u) => [u.id, u.email]));

  const itens = pendentes.map((t) => ({
    ...t,
    de_email: t.de_atendente_id ? emailPorId[t.de_atendente_id] : "sem dono",
    para_email: emailPorId[t.para_atendente_id],
  }));

  return NextResponse.json({ pendentes: itens });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/perfil";

// PATCH (admin-only): aprova ou rejeita. Aprovar so aqui muda o dono de verdade do cliente.
export async function PATCH(req, { params }) {
  const supabase = await createClient();
  const negado = await requireRole(supabase, ["admin"]);
  if (negado) return negado;

  const { id } = await params;
  const { data: { user } } = await supabase.auth.getUser();
  const { aprovar } = await req.json();

  const { data: transferencia, error: buscaErr } = await supabase
    .from("transferencias_lead")
    .select("*")
    .eq("id", id)
    .single();
  if (buscaErr) return NextResponse.json({ error: buscaErr.message }, { status: 404 });
  if (transferencia.status !== "pendente") {
    return NextResponse.json({ error: "essa transferencia ja foi resolvida" }, { status: 400 });
  }

  if (aprovar) {
    const { error: updErr } = await supabase
      .from("clientes")
      .update({ atendente_id: transferencia.para_atendente_id })
      .eq("id", transferencia.cliente_id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("transferencias_lead")
    .update({ status: aprovar ? "aprovada" : "rejeitada", resolvido_por: user.id, resolvido_em: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ transferencia: data });
}

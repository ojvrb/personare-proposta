import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPerfil } from "@/lib/perfil";

// GET: eventos recentes que merecem atencao do staff -- propostas aceitas
// pelo cliente (self-service) e transferencias de lead pendentes. Sem tabela
// propria de notificacao: deriva dos dados que ja existem (interacoes e
// transferencias_lead ja documentam o evento, isso so agrega pra exibir).
export async function GET() {
  const supabase = await createClient();
  const perfil = await getPerfil(supabase);
  if (!perfil) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  let aceitasQuery = supabase
    .from("propostas")
    .select("id, total, aceita_em, slug, eventos(clientes(id, nome, nome_conjuge, atendente_id))")
    .not("aceita_em", "is", null)
    .order("aceita_em", { ascending: false })
    .limit(10);

  const [{ data: aceitas }, transferenciasRes] = await Promise.all([
    aceitasQuery,
    perfil.role === "admin"
      ? supabase.from("transferencias_lead").select("id, solicitado_em, clientes(nome, nome_conjuge)").eq("status", "pendente").order("solicitado_em")
      : supabase.from("transferencias_lead").select("id, solicitado_em, clientes(nome, nome_conjuge)").eq("status", "pendente").eq("para_atendente_id", perfil.user.id).order("solicitado_em"),
  ]);

  const propostasAceitas = (aceitas || [])
    .filter((p) => {
      const atendenteId = p.eventos?.clientes?.atendente_id;
      return perfil.role === "admin" || !atendenteId || atendenteId === perfil.user.id;
    })
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      total: p.total,
      aceita_em: p.aceita_em,
      cliente_id: p.eventos?.clientes?.id,
      cliente_nome: p.eventos?.clientes ? `${p.eventos.clientes.nome}${p.eventos.clientes.nome_conjuge ? ` & ${p.eventos.clientes.nome_conjuge}` : ""}` : "—",
    }));

  const transferenciasPendentes = (transferenciasRes.data || []).map((t) => ({
    id: t.id,
    solicitado_em: t.solicitado_em,
    cliente_nome: t.clientes ? `${t.clientes.nome}${t.clientes.nome_conjuge ? ` & ${t.clientes.nome_conjuge}` : ""}` : "—",
  }));

  return NextResponse.json({ propostasAceitas, transferenciasPendentes });
}

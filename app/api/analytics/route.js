import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getPerfil } from "@/lib/perfil";

// GET (admin+financeiro): manda os registros crus (nao pre-agregados) --
// o front filtra por periodo, recalcula os KPIs, monta os alertas (sprint5)
// e o desempenho por atendente na hora, sem view/endpoint por corte. Volume
// e' baixo (CRM interno, nao analytics de produto), entao computar no
// cliente e' suficiente e evita complexidade de query por data no backend.
export async function GET() {
  const supabase = await createClient();

  // getPerfil roda UMA vez: checa auth + role, e o mesmo objeto e' reusado
  // pra decidir se busca a lista de emails. Antes essa checagem acontecia
  // duas vezes (via requireRole + getPerfil separado), gastando duas
  // chamadas ao supabase no caminho quente do analytics.
  const perfil = await getPerfil(supabase);
  if (!perfil) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });
  if (!["admin", "financeiro"].includes(perfil.role)) {
    return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
  }

  // Todas as queries paralelas -- incluindo listUsers (admin) + perfis (nomes),
  // que antes esperavam o Promise.all das 7 queries antes de comecar. Agora
  // vao junto. Retorna nome cadastrado em perfis, com fallback pro email --
  // atendente aparece com nome amigavel no analytics em vez do email.
  const promessaAtendentes = perfil.role === "admin"
    ? Promise.all([
        adminClient().auth.admin.listUsers(),
        supabase.from("perfis").select("user_id, nome"),
      ]).then(([{ data }, { data: perfisData }]) => {
        const nomeById = Object.fromEntries((perfisData || []).map((p) => [p.user_id, p.nome]));
        return Object.fromEntries((data?.users || []).map((u) => [u.id, nomeById[u.id] || u.email]));
      })
    : Promise.resolve({});

  const [
    { data: clientes }, { data: eventos }, { data: propostas },
    { data: contratos }, { data: buffets }, { data: extras }, { data: interacoes },
    atendentesPorId,
  ] = await Promise.all([
    supabase.from("clientes").select("id, nome, nome_conjuge, status, origem, atendente_id, created_at"),
    supabase.from("eventos").select("id, cliente_id, data_evento"),
    supabase.from("propostas").select("id, evento_id, buffet_id, extras_selecionados, total, desconto, status, valida_ate, atendente_id, created_at"),
    supabase.from("contratos").select("id, evento_id, status, valor_contratado, created_at"),
    supabase.from("buffets").select("id, nome"),
    supabase.from("extras").select("id, nome"),
    supabase.from("interacoes").select("cliente_id, created_at"),
    promessaAtendentes,
  ]);

  // atendentesPorId: nome (do perfil) com fallback pro email. Alias emailPorId
  // preservado pra nao quebrar o front antigo enquanto migra.
  return NextResponse.json({ clientes, eventos, propostas, contratos, buffets, extras, interacoes, atendentesPorId, emailPorId: atendentesPorId });
}

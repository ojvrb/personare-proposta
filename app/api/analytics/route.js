import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getPerfil, requireRole } from "@/lib/perfil";

// GET (admin+financeiro): manda os registros crus (nao pre-agregados) --
// o front filtra por periodo, recalcula os KPIs, monta os alertas (sprint5)
// e o desempenho por atendente na hora, sem view/endpoint por corte. Volume
// e' baixo (CRM interno, nao analytics de produto), entao computar no
// cliente e' suficiente e evita complexidade de query por data no backend.
export async function GET() {
  const supabase = await createClient();
  const negado = await requireRole(supabase, ["admin", "financeiro"]);
  if (negado) return negado;

  const [{ data: clientes }, { data: eventos }, { data: propostas }, { data: contratos }, { data: buffets }, { data: extras }, { data: interacoes }] = await Promise.all([
    supabase.from("clientes").select("id, nome, nome_conjuge, status, origem, atendente_id, created_at"),
    supabase.from("eventos").select("id, cliente_id, data_evento"),
    supabase.from("propostas").select("id, evento_id, buffet_id, extras_selecionados, total, desconto, status, valida_ate, atendente_id, created_at"),
    supabase.from("contratos").select("id, evento_id, status, valor_contratado, created_at"),
    supabase.from("buffets").select("id, nome"),
    supabase.from("extras").select("id, nome"),
    supabase.from("interacoes").select("cliente_id, created_at"),
  ]);

  // email do atendente so' pra quem ja pode ver tudo (admin) -- "desempenho
  // por atendente" existe justamente pra comparar vendedores, nao faz
  // sentido pro proprio atendente comum.
  const perfil = await getPerfil(supabase);
  let emailPorId = {};
  if (perfil?.role === "admin") {
    const { data: authList } = await adminClient().auth.admin.listUsers();
    emailPorId = Object.fromEntries(authList.users.map((u) => [u.id, u.email]));
  }

  return NextResponse.json({ clientes, eventos, propostas, contratos, buffets, extras, interacoes, emailPorId });
}

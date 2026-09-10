import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/perfil";

// GET (admin+financeiro): agrega os KPIs a partir dos dados que ja existem --
// nada e pre-calculado/armazenado, roda em cima do que ta no banco agora.
export async function GET() {
  const supabase = await createClient();
  const negado = await requireRole(supabase, ["admin", "financeiro"]);
  if (negado) return negado;

  const [{ data: clientes }, { data: eventos }, { data: propostas }, { data: contratos }, { data: buffets }, { data: extras }] = await Promise.all([
    supabase.from("clientes").select("id, status, created_at"),
    supabase.from("eventos").select("id, cliente_id"),
    supabase.from("propostas").select("id, evento_id, buffet_id, extras_selecionados, total, desconto, status, created_at"),
    supabase.from("contratos").select("id, evento_id, status, valor_contratado, created_at"),
    supabase.from("buffets").select("id, nome"),
    supabase.from("extras").select("id, nome"),
  ]);

  const totalLeads = clientes.length;
  const totalPropostas = propostas.length;
  const contratosAssinados = contratos.filter((c) => c.status === "assinado");
  const conversao = totalPropostas > 0 ? (contratosAssinados.length / totalPropostas) * 100 : 0;

  const ticketMedio = contratosAssinados.length > 0
    ? contratosAssinados.reduce((s, c) => s + Number(c.valor_contratado), 0) / contratosAssinados.length
    : 0;

  const descontoMedio = propostas.length > 0
    ? propostas.reduce((s, p) => s + Number(p.desconto || 0), 0) / propostas.length
    : 0;

  // tempo medio de fechamento: do 1o contato (cliente criado) ate o contrato assinado, em dias
  const temposFechamento = contratosAssinados
    .map((c) => {
      const evento = eventos.find((e) => e.id === c.evento_id);
      const cliente = evento && clientes.find((cl) => cl.id === evento.cliente_id);
      if (!cliente) return null;
      return (new Date(c.created_at) - new Date(cliente.created_at)) / (1000 * 60 * 60 * 24);
    })
    .filter((d) => d !== null);
  const tempoMedioFechamentoDias = temposFechamento.length > 0
    ? temposFechamento.reduce((s, d) => s + d, 0) / temposFechamento.length
    : null;

  // buffet mais escolhido (contagem de propostas por buffet_id)
  const contagemBuffet = {};
  propostas.forEach((p) => {
    if (p.buffet_id) contagemBuffet[p.buffet_id] = (contagemBuffet[p.buffet_id] || 0) + 1;
  });
  const buffetTop = Object.entries(contagemBuffet).sort((a, b) => b[1] - a[1])[0];
  const buffetMaisEscolhido = buffetTop ? { nome: buffets.find((b) => b.id === buffetTop[0])?.nome, count: buffetTop[1] } : null;

  // extra mais vendido (conta ocorrencias dentro do jsonb extras_selecionados de cada proposta)
  const contagemExtra = {};
  propostas.forEach((p) => {
    (p.extras_selecionados || []).forEach((sel) => {
      contagemExtra[sel.extra_id] = (contagemExtra[sel.extra_id] || 0) + 1;
    });
  });
  const extraTop = Object.entries(contagemExtra).sort((a, b) => b[1] - a[1])[0];
  const extraMaisVendido = extraTop ? { nome: extras.find((e) => e.id === extraTop[0])?.nome, count: extraTop[1] } : null;

  const porStatus = {};
  clientes.forEach((c) => { porStatus[c.status] = (porStatus[c.status] || 0) + 1; });

  return NextResponse.json({
    totalLeads,
    totalPropostas,
    contratosAssinados: contratosAssinados.length,
    conversao,
    ticketMedio,
    descontoMedio,
    tempoMedioFechamentoDias,
    buffetMaisEscolhido,
    extraMaisVendido,
    porStatus,
  });
}

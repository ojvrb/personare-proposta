import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: KPIs pro card resumo do Board CRM -- MES ATUAL vs mes anterior. Nao
// duplica /api/analytics (que retorna registros crus e agrega no cliente):
// aqui devolvemos so' os numeros ja calculados, pra o widget carregar rapido
// sem baixar historico inteiro.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const inicioMesPassado = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const fimMesPassado = new Date(inicioMes.getTime() - 1);

  const [{ data: clientes }, { data: propostas }, { data: contratos }] = await Promise.all([
    supabase.from("clientes").select("id, created_at, status"),
    supabase.from("propostas").select("id, created_at, total, status"),
    supabase.from("contratos").select("id, created_at, valor_contratado, status"),
  ]);

  const kpi = (recorte) => {
    const desde = recorte.inicio, ate = recorte.fim;
    const dentro = (d) => { const t = new Date(d); return t >= desde && t <= ate; };
    const c = clientes.filter((x) => dentro(x.created_at));
    const p = propostas.filter((x) => dentro(x.created_at));
    const co = contratos.filter((x) => x.status === "assinado" && dentro(x.created_at));
    const receita = co.reduce((s, x) => s + Number(x.valor_contratado || 0), 0);
    const ticket = co.length > 0 ? receita / co.length : 0;
    const conversao = p.length > 0 ? (co.length / p.length) * 100 : 0;
    return { leads: c.length, propostas: p.length, contratos: co.length, receita, ticket, conversao };
  };

  const atual = kpi({ inicio: inicioMes, fim: agora });
  const anterior = kpi({ inicio: inicioMesPassado, fim: fimMesPassado });

  const pct = (a, b) => (b > 0 ? ((a - b) / b) * 100 : a > 0 ? 100 : 0);
  return NextResponse.json({
    mes: {
      leads: atual.leads,
      propostas: atual.propostas,
      contratos: atual.contratos,
      receita: atual.receita,
      ticket: atual.ticket,
      conversao: atual.conversao,
    },
    delta: {
      leads: pct(atual.leads, anterior.leads),
      propostas: pct(atual.propostas, anterior.propostas),
      contratos: pct(atual.contratos, anterior.contratos),
      receita: pct(atual.receita, anterior.receita),
      ticket: pct(atual.ticket, anterior.ticket),
      conversao: atual.conversao - anterior.conversao,
    },
    ativos: {
      leadsAtivos: clientes.filter((c) => !["negocio_fechado", "perdido"].includes(c.status)).length,
      propostasEnviadas: propostas.filter((p) => ["enviada", "em_negociacao"].includes(p.status)).length,
    },
  });
}

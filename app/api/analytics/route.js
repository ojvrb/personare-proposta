import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/perfil";

// GET (admin+financeiro): manda os registros crus (nao pre-agregados) --
// o front filtra por periodo e recalcula os KPIs na hora, sem precisar de
// uma chamada por range. Volume e' baixo (CRM interno, nao analytics de
// produto), entao filtrar no cliente e' suficiente e evita complexidade de
// query por data no backend.
export async function GET() {
  const supabase = await createClient();
  const negado = await requireRole(supabase, ["admin", "financeiro"]);
  if (negado) return negado;

  const [{ data: clientes }, { data: eventos }, { data: propostas }, { data: contratos }, { data: buffets }, { data: extras }] = await Promise.all([
    supabase.from("clientes").select("id, nome, nome_conjuge, status, origem, created_at"),
    supabase.from("eventos").select("id, cliente_id"),
    supabase.from("propostas").select("id, evento_id, buffet_id, extras_selecionados, total, desconto, status, created_at"),
    supabase.from("contratos").select("id, evento_id, status, valor_contratado, created_at"),
    supabase.from("buffets").select("id, nome"),
    supabase.from("extras").select("id, nome"),
  ]);

  return NextResponse.json({ clientes, eventos, propostas, contratos, buffets, extras });
}

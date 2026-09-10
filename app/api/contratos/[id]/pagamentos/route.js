import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/perfil";

// POST: adiciona uma parcela/pagamento ao contrato.
export async function POST(req, { params }) {
  const supabase = await createClient();
  const negado = await requireRole(supabase, ["admin", "financeiro"]);
  if (negado) return negado;

  const { id } = await params;
  const { descricao, valor, vencimento } = await req.json();
  if (!valor) return NextResponse.json({ error: "valor e obrigatorio" }, { status: 400 });

  const { data, error } = await supabase
    .from("pagamentos")
    .insert({ contrato_id: id, descricao: descricao || "Parcela", valor, vencimento: vencimento || null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ pagamento: data });
}

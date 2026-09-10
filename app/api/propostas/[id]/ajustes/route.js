import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST: ajusta o desconto de uma proposta ja criada (ex: "cliente pediu desconto")
// e grava o historico em propostas_ajustes. Recalcula o total a partir do subtotal
// ja salvo -- nao mexe em pacote/buffet/extras, so no desconto.
export async function POST(req, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const { id } = await params;
  const { novo_desconto, motivo } = await req.json();
  if (novo_desconto == null) return NextResponse.json({ error: "novo_desconto e obrigatorio" }, { status: 400 });

  const { data: proposta, error: buscaErr } = await supabase.from("propostas").select("*").eq("id", id).single();
  if (buscaErr) return NextResponse.json({ error: buscaErr.message }, { status: 404 });

  const valorAnterior = Number(proposta.total);
  const novoTotal = Math.max(0, Number(proposta.subtotal) - Number(novo_desconto));

  const { error: ajusteErr } = await supabase.from("propostas_ajustes").insert({
    proposta_id: id,
    valor_anterior: valorAnterior,
    valor_novo: novoTotal,
    motivo: motivo || null,
    ajustado_por: user.id,
  });
  if (ajusteErr) return NextResponse.json({ error: ajusteErr.message }, { status: 500 });

  const { data, error } = await supabase
    .from("propostas")
    .update({ desconto: novo_desconto, total: novoTotal })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ proposta: data });
}

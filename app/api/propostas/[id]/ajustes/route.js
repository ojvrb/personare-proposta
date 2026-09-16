import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { expurgar } from "@/lib/proposta";

// POST: ajusta o desconto de uma proposta ja criada (ex: "cliente pediu desconto")
// e grava o historico em propostas_ajustes. Recalcula o total a partir do subtotal
// ja salvo -- nao mexe em pacote/buffet/extras, so no desconto.
export async function POST(req, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const { id } = await params;
  const { novo_desconto, motivo } = await req.json();
  const descontoNum = Number(novo_desconto);
  if (novo_desconto == null || !Number.isFinite(descontoNum) || descontoNum < 0) {
    return NextResponse.json({ error: "desconto invalido" }, { status: 400 });
  }

  const { data: proposta, error: buscaErr } = await supabase.from("propostas").select("*").eq("id", id).single();
  if (buscaErr) { console.error(buscaErr); return NextResponse.json({ error: "nao encontrado" }, { status: 404 }); }

  const subtotal = Number(proposta.subtotal);
  if (descontoNum > subtotal) {
    return NextResponse.json({ error: `desconto nao pode exceder o subtotal (R$ ${subtotal.toLocaleString("pt-BR")})` }, { status: 400 });
  }
  const valorAnterior = Number(proposta.total);
  const novoTotal = Math.max(0, subtotal - descontoNum);

  const { error: ajusteErr } = await supabase.from("propostas_ajustes").insert({
    proposta_id: id,
    valor_anterior: valorAnterior,
    valor_novo: novoTotal,
    motivo: motivo || null,
    ajustado_por: user.id,
  });
  if (ajusteErr) { console.error(ajusteErr); return NextResponse.json({ error: "erro ao processar" }, { status: 500 }); }

  const { data, error } = await supabase
    .from("propostas")
    .update({ desconto: descontoNum, total: novoTotal })
    .eq("id", id)
    .select()
    .single();
  if (error) { console.error(error); return NextResponse.json({ error: "erro ao processar" }, { status: 500 }); }

  return NextResponse.json({ proposta: expurgar(data) });
}

import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

// POST publico (sem auth) -- o proprio cliente clica "Aceitar proposta" no
// link da proposta e o pipeline avanca sozinho, sem depender do staff
// perceber e mudar manualmente (sprint3_experiencia_proposta.md). Usa
// service role porque quem chama e' o cliente final, nunca logado.
export async function POST(req, { params }) {
  const { id } = await params;
  const supabase = adminClient();

  const { data: proposta, error: buscaErr } = await supabase
    .from("propostas")
    .select("*, eventos(cliente_id)")
    .eq("id", id)
    .single();
  if (buscaErr || !proposta) return NextResponse.json({ error: "proposta nao encontrada" }, { status: 404 });

  if (proposta.status === "aceita") {
    return NextResponse.json({ proposta }); // idempotente -- ja aceita, nao faz nada de novo
  }
  if (proposta.status === "perdida") {
    return NextResponse.json({ error: "proposta ja foi marcada como perdida" }, { status: 400 });
  }

  const { data: atualizada, error } = await supabase
    .from("propostas")
    .update({ status: "aceita", aceita_em: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const clienteId = proposta.eventos?.cliente_id;
  if (clienteId) {
    await supabase.from("interacoes").insert({
      cliente_id: clienteId,
      nota: `Cliente aceitou a proposta às ${new Date().toLocaleString("pt-BR")} — iniciar contrato.`,
    });
  }

  return NextResponse.json({ proposta: atualizada });
}

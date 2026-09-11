import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

// POST publico (sem auth) -- o proprio cliente clica "Aceitar proposta" no
// link da proposta e o pipeline avanca sozinho, sem depender do staff
// perceber e mudar manualmente (sprint3_experiencia_proposta.md). Usa
// service role porque quem chama e' o cliente final, nunca logado.
export async function POST(req, { params }) {
  const { id } = await params;
  const supabase = adminClient();
  const { motivo_categoria } = await req.json().catch(() => ({}));

  const { data: proposta, error: buscaErr } = await supabase
    .from("propostas")
    .select("*, eventos(cliente_id)")
    .eq("id", id)
    .single();
  if (buscaErr || !proposta) return NextResponse.json({ error: "proposta nao encontrada" }, { status: 404 });

  if (proposta.status === "aceita") {
    // ja aceita -- so aceita feedback opcional (tela pos-aceite, ver
    // sprint3_experiencia_proposta.md), nunca reabre o aceite em si.
    if (motivo_categoria && !proposta.motivo_categoria) {
      const { data: comFeedback, error: fbErr } = await supabase
        .from("propostas")
        .update({ motivo_categoria })
        .eq("id", id)
        .select()
        .single();
      if (fbErr) return NextResponse.json({ error: fbErr.message }, { status: 500 });
      return NextResponse.json({ proposta: comFeedback });
    }
    return NextResponse.json({ proposta });
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

    // move o card no board pra "Contrato" sozinho -- o aceite ja documenta o
    // porque (a interacao acima), entao nao precisa do modal de motivo do
    // board pra isso. So avanca (nunca reabre um card ja mais adiante, tipo
    // negocio_fechado/perdido).
    const { data: cliente } = await supabase.from("clientes").select("status").eq("id", clienteId).single();
    if (cliente && !["contrato", "negocio_fechado", "perdido"].includes(cliente.status)) {
      await supabase.from("clientes").update({ status: "contrato" }).eq("id", clienteId);
    }
  }

  return NextResponse.json({ proposta: atualizada });
}

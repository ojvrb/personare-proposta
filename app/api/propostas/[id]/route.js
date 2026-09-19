import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { expurgar } from "@/lib/proposta";
import { confirmarReserva, soltarHold, expiraEmDaValidade } from "@/lib/reservas";

const STATUS_FINAIS = ["aceita", "perdida"];

// PATCH: move a proposta no pipeline de negociacao (rascunho|enviada|em_negociacao|
// pre_aprovada|aceita|perdida). Perdida exige motivo_categoria; qualquer status final
// grava decidido_em automaticamente.
export async function PATCH(req, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const { id } = await params;
  const { status, motivo_categoria, motivo_detalhe, valida_ate } = await req.json();
  if (!status) return NextResponse.json({ error: "status e obrigatorio" }, { status: 400 });
  if (status === "perdida" && !motivo_categoria) {
    return NextResponse.json({ error: "motivo_categoria e obrigatorio pra marcar como perdida" }, { status: 400 });
  }

  const campos = { status, motivo_categoria: motivo_categoria || null, motivo_detalhe: motivo_detalhe || null };
  if (STATUS_FINAIS.includes(status)) campos.decidido_em = new Date().toISOString();
  if (valida_ate) campos.valida_ate = valida_ate;

  // Marcar "aceita" pelo painel tambem tem que passar pela trava de agenda --
  // senao da pra confirmar dois eventos no mesmo dia sem o cliente clicar em nada.
  if (status === "aceita") {
    const { data: atual } = await supabase.from("propostas").select("eventos(data_evento)").eq("id", id).single();
    const reserva = await confirmarReserva(supabase, { propostaId: id, dataEvento: atual?.eventos?.data_evento });
    if (reserva.erro) { console.error(reserva.erro); return NextResponse.json({ error: "erro ao processar" }, { status: 500 }); }
    if (reserva.conflito) return NextResponse.json({ error: "essa data ja tem outra proposta aceita" }, { status: 409 });
  }

  const { data, error } = await supabase.from("propostas").update(campos).eq("id", id).select().single();
  if (error) { console.error(error); return NextResponse.json({ error: "erro ao processar" }, { status: 500 }); }

  if (status === "perdida") await soltarHold(supabase, id);
  if (valida_ate) await supabase.from("reservas").update({ expira_em: expiraEmDaValidade(valida_ate) }).eq("proposta_id", id).eq("tipo", "hold");

  return NextResponse.json({ proposta: expurgar(data) });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { data, error } = await supabase.from("propostas").update(campos).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ proposta: data });
}

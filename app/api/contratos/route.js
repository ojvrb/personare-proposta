import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/perfil";

// POST: cria o contrato de um evento (rascunho por padrao).
export async function POST(req) {
  const supabase = await createClient();
  const negado = await requireRole(supabase, ["admin", "financeiro"]);
  if (negado) return negado;

  const { evento_id, valor_contratado } = await req.json();
  if (!evento_id) return NextResponse.json({ error: "evento_id e obrigatorio" }, { status: 400 });

  const { data, error } = await supabase
    .from("contratos")
    .insert({ evento_id, valor_contratado: valor_contratado || 0 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ contrato: data });
}

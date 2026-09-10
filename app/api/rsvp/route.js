import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

// POST publico (sem login) -- o convidado confirma presenca pelo link da proposta.
// Resolve o evento pelo slug da proposta e casa o nome (case-insensitive); se nao
// achar na lista, cria como convidado avulso (nao previsto pela equipe).
export async function POST(req) {
  const { slug, nome, status } = await req.json();
  if (!slug || !nome?.trim() || !["confirmado", "nao_vai"].includes(status)) {
    return NextResponse.json({ error: "dados invalidos" }, { status: 400 });
  }

  const supabase = adminClient();

  const { data: proposta } = await supabase.from("propostas").select("evento_id").eq("slug", slug).single();
  if (!proposta) return NextResponse.json({ error: "proposta nao encontrada" }, { status: 404 });

  const nomeLimpo = nome.trim();
  const { data: existente } = await supabase
    .from("convidados")
    .select("id")
    .eq("evento_id", proposta.evento_id)
    .ilike("nome", nomeLimpo)
    .maybeSingle();

  if (existente) {
    const { data, error } = await supabase
      .from("convidados")
      .update({ status })
      .eq("id", existente.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ convidado: data });
  }

  const { data, error } = await supabase
    .from("convidados")
    .insert({ evento_id: proposta.evento_id, nome: nomeLimpo, status })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ convidado: data });
}

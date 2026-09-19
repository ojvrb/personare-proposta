import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { limitarPorIp } from "@/lib/rateLimit";
import { escaparLike } from "@/lib/like";

// POST publico (sem login) -- o convidado confirma presenca pelo link da proposta.
// Resolve o evento pelo slug da proposta e casa o nome (case-insensitive); se nao
// achar na lista, cria como convidado avulso (nao previsto pela equipe).
export async function POST(req) {
  const limitado = await limitarPorIp(req);
  if (limitado) return limitado;

  const { slug, nome, status } = await req.json().catch(() => ({}));
  const nomeLimpo = typeof nome === "string" ? nome.trim() : "";
  if (typeof slug !== "string" || !nomeLimpo || nomeLimpo.length > 120 || !["confirmado", "nao_vai"].includes(status)) {
    return NextResponse.json({ error: "dados invalidos" }, { status: 400 });
  }

  const supabase = adminClient();

  const { data: proposta } = await supabase.from("propostas").select("evento_id, status").eq("slug", slug).single();
  if (!proposta) return NextResponse.json({ error: "proposta nao encontrada" }, { status: 404 });
  // RSVP e' pos-fechamento: proposta so' enviada nao abre lista de convidados
  // (senao qualquer um com o link enche de nomes o evento de um lead em aberto).
  if (proposta.status !== "aceita") return NextResponse.json({ error: "a lista de convidados ainda nao foi aberta" }, { status: 403 });

  // escaparLike: "%"/"_" digitados nao podem virar curinga e sobrescrever o
  // status de outro convidado.
  const { data: existente } = await supabase
    .from("convidados")
    .select("id")
    .eq("evento_id", proposta.evento_id)
    .ilike("nome", escaparLike(nomeLimpo))
    .maybeSingle();

  if (existente) {
    const { data, error } = await supabase
      .from("convidados")
      .update({ status })
      .eq("id", existente.id)
      .select()
      .single();
    if (error) { console.error(error); return NextResponse.json({ error: "erro ao processar" }, { status: 500 }); }
    return NextResponse.json({ convidado: data });
  }

  const { data, error } = await supabase
    .from("convidados")
    .insert({ evento_id: proposta.evento_id, nome: nomeLimpo, status })
    .select()
    .single();
  if (error) { console.error(error); return NextResponse.json({ error: "erro ao processar" }, { status: 500 }); }
  return NextResponse.json({ convidado: data });
}

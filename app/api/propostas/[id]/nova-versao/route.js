import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calcularProposta, gerarSlug } from "@/lib/pricing";
import { expurgar } from "@/lib/proposta";

// POST: cria uma nova versao (v2, v3...) da proposta quando o buffet ou o
// numero de convidados muda antes do aceite (ex: cliente pediu pra trocar
// buffet, ou aumentou a lista de convidados). A proposta antiga fica intacta
// (historico congelado com o total de entao) e vira uma nova linha em
// `propostas` com versao+1 e slug novo -- mesmo padrao de link publico por
// proposta que ja existia, so' nunca tinha sido usado pra criar v2+.
// num_convidados vive em `eventos` (compartilhado entre as versoes), entao
// atualiza-lo aqui reflete em todas as versoes desse evento -- e' o dado
// "atual" do evento, mesmo que o total de cada versao antiga fique congelado.
export async function POST(req, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const { id } = await params;
  const { buffet_id, num_convidados, motivo } = await req.json();
  if (buffet_id === undefined && num_convidados === undefined) {
    return NextResponse.json({ error: "informe buffet_id e/ou num_convidados" }, { status: 400 });
  }

  const { data: atual, error: atualErr } = await supabase
    .from("propostas")
    .select("*, eventos(*)")
    .eq("id", id)
    .single();
  if (atualErr) return NextResponse.json({ error: atualErr.message }, { status: 404 });

  const convidadosAnterior = atual.eventos.num_convidados;
  const buffetIdAnterior = atual.buffet_id;
  const numConvidadosNovo = num_convidados !== undefined ? Number(num_convidados) : convidadosAnterior;
  const buffetIdNovo = buffet_id !== undefined ? (buffet_id || null) : buffetIdAnterior;

  if (num_convidados !== undefined) {
    const { error } = await supabase.from("eventos").update({ num_convidados: numConvidadosNovo }).eq("id", atual.evento_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const [{ data: maxVersaoRow }, { data: pacote }, { data: buffet }, { data: extras }] = await Promise.all([
    supabase.from("propostas").select("versao").eq("evento_id", atual.evento_id).order("versao", { ascending: false }).limit(1).single(),
    atual.pacote_id ? supabase.from("pacotes").select("*").eq("id", atual.pacote_id).single() : Promise.resolve({ data: null }),
    buffetIdNovo ? supabase.from("buffets").select("*").eq("id", buffetIdNovo).single() : Promise.resolve({ data: null }),
    supabase.from("extras").select("*"),
  ]);

  const { subtotal, total } = calcularProposta({
    pacote,
    buffet,
    numConvidados: numConvidadosNovo,
    extras: extras || [],
    extrasSelecionados: atual.extras_selecionados,
    desconto: atual.desconto,
  });

  const slug = gerarSlug(atual.slug.split("-").slice(0, -1).join("-") || atual.slug);

  const { data: nova, error: novaErr } = await supabase
    .from("propostas")
    .insert({
      evento_id: atual.evento_id,
      pacote_id: atual.pacote_id,
      buffet_id: buffetIdNovo,
      buffets_sugeridos: atual.buffets_sugeridos,
      extras_selecionados: atual.extras_selecionados,
      desconto: atual.desconto,
      subtotal,
      total,
      slug,
      status: "rascunho",
      versao: (maxVersaoRow?.versao || atual.versao) + 1,
      valida_ate: atual.valida_ate,
      atendente_id: atual.atendente_id,
    })
    .select()
    .single();
  if (novaErr) return NextResponse.json({ error: novaErr.message }, { status: 500 });

  const campo = buffet_id !== undefined && num_convidados !== undefined ? "buffet_e_convidados" : buffet_id !== undefined ? "buffet" : "convidados";
  await supabase.from("propostas_ajustes").insert({
    proposta_id: atual.id,
    valor_anterior: atual.total,
    valor_novo: total,
    motivo: motivo || null,
    ajustado_por: user.id,
    campo,
    contexto: { nova_proposta_id: nova.id, nova_versao: nova.versao, buffet_id_anterior: buffetIdAnterior, buffet_id_novo: buffetIdNovo, convidados_anterior: convidadosAnterior, convidados_novo: numConvidadosNovo },
  });

  return NextResponse.json({ proposta: expurgar(nova) });
}

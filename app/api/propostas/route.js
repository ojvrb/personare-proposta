import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calcularProposta, gerarSlug } from "@/lib/pricing";

// GET: lista clientes + eventos + propostas pro painel (CRM + configurador).
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const [clientesRes, pacotesRes, buffetsRes, extrasRes] = await Promise.all([
    supabase
      .from("clientes")
      .select("*, eventos(*, propostas(*))")
      .order("created_at", { ascending: false }),
    supabase.from("pacotes").select("*").eq("ativo", true),
    supabase.from("buffets").select("*").eq("ativo", true),
    supabase.from("extras").select("*").eq("ativo", true),
  ]);

  if (clientesRes.error) return NextResponse.json({ error: clientesRes.error.message }, { status: 500 });

  return NextResponse.json({
    clientes: clientesRes.data,
    pacotes: pacotesRes.data || [],
    buffets: buffetsRes.data || [],
    extras: extrasRes.data || [],
  });
}

// POST: cria cliente + evento + proposta numa tacada so (o configurador manda tudo junto).
// O preco e SEMPRE recalculado aqui com os dados do banco — nunca confia no total que o client mandou.
export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const body = await req.json();
  const { cliente, evento, pacote_id, buffet_id, extras_selecionados = [], desconto = 0 } = body;

  if (!cliente?.nome) return NextResponse.json({ error: "nome do cliente e obrigatorio" }, { status: 400 });
  if (!evento?.num_convidados && evento?.num_convidados !== 0) {
    return NextResponse.json({ error: "numero de convidados e obrigatorio" }, { status: 400 });
  }

  const { data: clienteRow, error: clienteErr } = await supabase
    .from("clientes")
    .insert({
      nome: cliente.nome,
      nome_conjuge: cliente.nome_conjuge || null,
      telefone: cliente.telefone || null,
      cidade: cliente.cidade || null,
      status: "proposta_enviada",
    })
    .select()
    .single();
  if (clienteErr) return NextResponse.json({ error: clienteErr.message }, { status: 500 });

  const { data: eventoRow, error: eventoErr } = await supabase
    .from("eventos")
    .insert({
      cliente_id: clienteRow.id,
      tipo: evento.tipo || "casamento",
      data_evento: evento.data_evento || null,
      num_convidados: evento.num_convidados,
    })
    .select()
    .single();
  if (eventoErr) return NextResponse.json({ error: eventoErr.message }, { status: 500 });

  const [pacoteRes, buffetRes, extrasRes] = await Promise.all([
    pacote_id ? supabase.from("pacotes").select("*").eq("id", pacote_id).single() : Promise.resolve({ data: null }),
    buffet_id ? supabase.from("buffets").select("*").eq("id", buffet_id).single() : Promise.resolve({ data: null }),
    supabase.from("extras").select("*"),
  ]);

  const { subtotal, total } = calcularProposta({
    pacote: pacoteRes.data,
    buffet: buffetRes.data,
    numConvidados: eventoRow.num_convidados,
    extras: extrasRes.data || [],
    extrasSelecionados: extras_selecionados,
    desconto,
  });

  const slug = gerarSlug(cliente.nome);

  const { data: propostaRow, error: propostaErr } = await supabase
    .from("propostas")
    .insert({
      evento_id: eventoRow.id,
      pacote_id: pacote_id || null,
      buffet_id: buffet_id || null,
      extras_selecionados,
      desconto,
      subtotal,
      total,
      slug,
      status: "enviada",
    })
    .select()
    .single();
  if (propostaErr) return NextResponse.json({ error: propostaErr.message }, { status: 500 });

  return NextResponse.json({ proposta: propostaRow, link: `/proposta/${slug}` });
}

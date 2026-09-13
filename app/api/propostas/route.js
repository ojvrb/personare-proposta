import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getPerfil } from "@/lib/perfil";
import { calcularProposta, gerarSlug } from "@/lib/pricing";
import { COLUNAS_PROPOSTA_PUBLICA } from "@/lib/proposta";

// GET: lista clientes + eventos + propostas pro painel (CRM + configurador).
// Visibilidade por papel: atendente ve so os proprios leads (+ os sem dono, caso
// legado); admin/financeiro veem tudo -- e' o admin quem compara desempenho entre vendedores.
export async function GET() {
  const supabase = await createClient();
  const perfil = await getPerfil(supabase);
  if (!perfil) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  let query = supabase
    .from("clientes")
    .select(`*, eventos(*, propostas(${COLUNAS_PROPOSTA_PUBLICA}))`)
    .order("created_at", { ascending: false });

  if (perfil.role === "atendente") {
    query = query.or(`atendente_id.eq.${perfil.user.id},atendente_id.is.null`);
  }

  const [clientesRes, pacotesRes, buffetsRes, extrasRes] = await Promise.all([
    query,
    supabase.from("pacotes").select("*").eq("ativo", true).order("ordem"),
    supabase.from("buffets").select("*").eq("ativo", true).order("ordem"),
    supabase.from("extras").select("*").eq("ativo", true).order("ordem"),
  ]);

  if (clientesRes.error) return NextResponse.json({ error: clientesRes.error.message }, { status: 500 });

  let clientes = clientesRes.data;
  if (perfil.role === "admin") {
    const { data: authList } = await adminClient().auth.admin.listUsers();
    const emailPorId = Object.fromEntries(authList.users.map((u) => [u.id, u.email]));
    clientes = clientes.map((c) => ({ ...c, atendente_email: c.atendente_id ? emailPorId[c.atendente_id] : null }));
  }

  return NextResponse.json({
    clientes,
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
  const { cliente, evento, pacote_id, buffet_id, buffets_sugeridos = [], extras_selecionados = [], desconto = 0, validade_dias = 15 } = body;

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
      origem: cliente.origem || null,
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
  const validaAte = new Date(Date.now() + Number(validade_dias) * 86400000).toISOString().slice(0, 10);

  const { data: propostaRow, error: propostaErr } = await supabase
    .from("propostas")
    .insert({
      evento_id: eventoRow.id,
      pacote_id: pacote_id || null,
      buffet_id: buffet_id || null,
      buffets_sugeridos,
      extras_selecionados,
      desconto,
      subtotal,
      total,
      slug,
      status: "enviada",
      valida_ate: validaAte,
    })
    .select()
    .single();
  if (propostaErr) return NextResponse.json({ error: propostaErr.message }, { status: 500 });

  return NextResponse.json({ proposta: propostaRow, link: `/proposta/${slug}` });
}

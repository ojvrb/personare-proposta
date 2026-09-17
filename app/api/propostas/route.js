import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getPerfil } from "@/lib/perfil";
import { calcularProposta, gerarSlug } from "@/lib/pricing";
import { COLUNAS_PROPOSTA_PUBLICA } from "@/lib/proposta";

// GET: lista clientes + eventos + propostas pro painel (CRM + configurador).
// Visibilidade por papel: atendente ve so os proprios leads (+ os sem dono, caso
// legado); admin/financeiro veem tudo -- e' o admin quem compara desempenho entre vendedores.
// `?leve=1` -- so' o que o board CRM precisa (sem catalogo, colunas enxutas). O
// configurador de nova proposta usa a versao completa (sem `leve`).
export async function GET(req) {
  const supabase = await createClient();
  const perfil = await getPerfil(supabase);
  if (!perfil) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const leve = new URL(req.url).searchParams.get("leve") === "1";

  const colsCliente = leve ? "id, nome, nome_conjuge, telefone, cidade, status, origem, atendente_id, created_at" : "*";
  const colsEvento = leve ? "id, tipo, data_evento, num_convidados" : "*";
  const colsProposta = leve ? "id, slug, total, versao, status" : COLUNAS_PROPOSTA_PUBLICA;

  let query = supabase
    .from("clientes")
    .select(`${colsCliente}, eventos(${colsEvento}, propostas(${colsProposta}))`)
    .order("created_at", { ascending: false });

  if (perfil.role === "atendente") {
    query = query.or(`atendente_id.eq.${perfil.user.id},atendente_id.is.null`);
  }

  // listUsers em paralelo com as outras queries -- antes era sequencial,
  // esperando o Promise.all das queries pra so ai buscar emails de atendente.
  const promessaEmails = perfil.role === "admin"
    ? adminClient().auth.admin.listUsers().then(({ data }) => Object.fromEntries((data?.users || []).map((u) => [u.id, u.email])))
    : Promise.resolve(null);

  const promessas = [query, promessaEmails];
  if (!leve) {
    promessas.push(
      supabase.from("pacotes").select("*").eq("ativo", true).order("ordem"),
      supabase.from("buffets").select("*").eq("ativo", true).order("ordem"),
      supabase.from("extras").select("*").eq("ativo", true).order("ordem"),
    );
  }
  const [clientesRes, emailPorId, pacotesRes, buffetsRes, extrasRes] = await Promise.all(promessas);

  if (clientesRes.error) { console.error(clientesRes.error); return NextResponse.json({ error: "erro ao processar" }, { status: 500 }); }

  let clientes = clientesRes.data;
  if (emailPorId) {
    clientes = clientes.map((c) => ({ ...c, atendente_email: c.atendente_id ? emailPorId[c.atendente_id] : null }));
  }

  return NextResponse.json({
    clientes,
    pacotes: pacotesRes?.data || [],
    buffets: buffetsRes?.data || [],
    extras: extrasRes?.data || [],
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
      email: cliente.email || null,
      cidade: cliente.cidade || null,
      origem: cliente.origem || null,
      status: "proposta_enviada",
    })
    .select()
    .single();
  if (clienteErr) { console.error(clienteErr); return NextResponse.json({ error: "erro ao processar" }, { status: 500 }); }

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
  if (eventoErr) { console.error(eventoErr); return NextResponse.json({ error: "erro ao processar" }, { status: 500 }); }

  const [pacoteRes, buffetRes, extrasRes] = await Promise.all([
    pacote_id ? supabase.from("pacotes").select("*").eq("id", pacote_id).single() : Promise.resolve({ data: null }),
    buffet_id ? supabase.from("buffets").select("*").eq("id", buffet_id).single() : Promise.resolve({ data: null }),
    supabase.from("extras").select("*"),
  ]);

  // Se qualquer extra selecionado tem substitui_buffet=true (taxa de cozinha
  // pra buffet externo, etc), o buffet interno sai da proposta -- forca
  // buffet_id=null e ignora o buffet no calculo, mesmo que o vendedor tenha
  // enviado um id.
  const substituiBuffet = (extras_selecionados || []).some((sel) => (extrasRes.data || []).find((e) => e.id === sel.extra_id)?.substitui_buffet);
  const buffetFinal = substituiBuffet ? null : buffetRes.data;
  const buffetIdFinal = substituiBuffet ? null : (buffet_id || null);

  const { subtotal, total } = calcularProposta({
    pacote: pacoteRes.data,
    buffet: buffetFinal,
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
      buffet_id: buffetIdFinal,
      buffets_sugeridos: substituiBuffet ? [] : buffets_sugeridos,
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
  if (propostaErr) { console.error(propostaErr); return NextResponse.json({ error: "erro ao processar" }, { status: 500 }); }

  return NextResponse.json({ proposta: propostaRow, link: `/proposta/${slug}` });
}

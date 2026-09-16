import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { expurgar, mascararCPF } from "@/lib/proposta";
import { calcularProposta } from "@/lib/pricing";
import { limitarPorIp } from "@/lib/rateLimit";

// POST publico -- aceite da proposta pelo cliente. Sob a lei brasileira, uma
// "assinatura eletronica simples" (aceite por clique) so' vale como prova se
// coletar (a) declaracao inequivoca de aceite dos termos (checkbox+CPF+nome
// afirmativos), (b) evidencia auditavel (IP, User-Agent, timestamp),
// (c) versao dos termos vigente. MP 2.200-2/2001 + Lei 14.063/2020 + CC art.
// 219 + CDC art. 46. Isso NAO substitui um contrato assinado por ICP-Brasil
// (necessario pra atos que exigem publicidade formal), mas serve pra prestacao
// de servico civil quando as partes admitem esse meio (Codigo Civil art. 107).
export async function POST(req, { params }) {
  const limitado = await limitarPorIp(req);
  if (limitado) return limitado;

  const { id } = await params;
  const supabase = adminClient();
  const body = await req.json().catch(() => ({}));
  const { motivo_categoria, cpf, nome_completo, termos_versao, extras_cliente } = body;

  const { data: proposta, error: buscaErr } = await supabase
    .from("propostas")
    .select("*, eventos(cliente_id, num_convidados)")
    .eq("id", id)
    .single();
  if (buscaErr || !proposta) return NextResponse.json({ error: "proposta nao encontrada" }, { status: 404 });

  if (proposta.status === "aceita") {
    // ja aceita -- so aceita feedback opcional; nunca reabre o aceite.
    if (motivo_categoria && !proposta.motivo_categoria) {
      const { data: comFeedback, error: fbErr } = await supabase
        .from("propostas").update({ motivo_categoria }).eq("id", id).select().single();
      if (fbErr) { console.error(fbErr); return NextResponse.json({ error: "erro ao processar" }, { status: 500 }); }
      return NextResponse.json({ proposta: expurgar(comFeedback) });
    }
    return NextResponse.json({ proposta: expurgar(proposta) });
  }
  if (proposta.status === "perdida") {
    return NextResponse.json({ error: "proposta ja foi marcada como perdida" }, { status: 400 });
  }

  // Validacao dos dados de aceite -- exigimos identidade (CPF + nome) e a
  // versao dos termos, senao o clique nao tem valor probatorio.
  const cpfLimpo = String(cpf || "").replace(/\D/g, "");
  if (!validarCPF(cpfLimpo)) {
    return NextResponse.json({ error: "CPF invalido" }, { status: 400 });
  }
  if (!nome_completo || String(nome_completo).trim().split(/\s+/).length < 2) {
    return NextResponse.json({ error: "informe seu nome completo (nome e sobrenome)" }, { status: 400 });
  }
  // Aceita so' semver curto (ex: "1.1.0"). Sem isso, o cliente poderia mandar
  // "concordo" ou lixo qualquer e a evidencia gravada nao permitiria reconstituir
  // qual texto foi lido, invalidando o valor probatorio do aceite.
  if (!termos_versao || !/^\d+\.\d+\.\d+$/.test(String(termos_versao))) {
    return NextResponse.json({ error: "voce precisa concordar com os termos" }, { status: 400 });
  }

  // IP: pega o primeiro do X-Forwarded-For (Cloudflare Workers/proxies) e cai
  // pro cabecalho CF-Connecting-IP se houver. Nao confia em IP privado (proxy interno).
  const ip = (req.headers.get("cf-connecting-ip")
    || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "").trim() || null;
  const userAgent = req.headers.get("user-agent") || null;

  // Merge extras que o cliente adicionou na proposta publica -- valida contra
  // catalogo (so' extras ativos existentes) e recalcula subtotal/total pra
  // gravar o valor certo. Nao confia no total do client.
  const extrasCliente = Array.isArray(extras_cliente) ? extras_cliente : [];
  let extrasSelecionadosFinal = proposta.extras_selecionados || [];
  let subtotalFinal = Number(proposta.subtotal);
  let totalFinal = Number(proposta.total);
  let buffetIdFinal = proposta.buffet_id;
  let adicionadosPeloCliente = [];
  if (extrasCliente.length > 0) {
    const idsPedidos = extrasCliente.map((e) => e.extra_id).filter(Boolean);
    // Busca catalogo COMPLETO de extras da proposta (vendedor + pedidos do cliente)
    // pra recalcular corretamente + checar flag substitui_buffet.
    const idsCatalogoNecessario = [
      ...(proposta.extras_selecionados || []).map((e) => e.extra_id),
      ...idsPedidos,
    ].filter(Boolean);
    const [{ data: extrasCat }, { data: pacote }, { data: buffet }] = await Promise.all([
      idsCatalogoNecessario.length
        ? supabase.from("extras").select("*").in("id", idsCatalogoNecessario)
        : Promise.resolve({ data: [] }),
      proposta.pacote_id ? supabase.from("pacotes").select("*").eq("id", proposta.pacote_id).single() : Promise.resolve({ data: null }),
      proposta.buffet_id ? supabase.from("buffets").select("*").eq("id", proposta.buffet_id).single() : Promise.resolve({ data: null }),
    ]);
    const idsSelVendedor = new Set((proposta.extras_selecionados || []).map((e) => e.extra_id));
    adicionadosPeloCliente = (extrasCat || [])
      .filter((ex) => ex.ativo && idsPedidos.includes(ex.id) && !idsSelVendedor.has(ex.id))
      .map((ex) => {
        const pedido = extrasCliente.find((e) => e.extra_id === ex.id);
        return { extra_id: ex.id, quantidade: Math.max(1, Number(pedido?.quantidade) || 1), pelo_cliente: true };
      });
    if (adicionadosPeloCliente.length > 0) {
      extrasSelecionadosFinal = [...(proposta.extras_selecionados || []), ...adicionadosPeloCliente];
    }
    // Se qualquer extra da proposta (vendedor OU cliente) tem substitui_buffet,
    // o buffet interno sai do calculo E o buffet_id fica null na proposta salva.
    const substituiBuffet = extrasSelecionadosFinal.some((sel) => (extrasCat || []).find((e) => e.id === sel.extra_id)?.substitui_buffet);
    const buffetPraCalc = substituiBuffet ? null : buffet;
    if (substituiBuffet) buffetIdFinal = null;
    if (adicionadosPeloCliente.length > 0 || substituiBuffet) {
      const { subtotal, total } = calcularProposta({
        pacote, buffet: buffetPraCalc, numConvidados: proposta.eventos?.num_convidados || 0,
        extras: extrasCat || [], extrasSelecionados: extrasSelecionadosFinal,
        desconto: proposta.desconto || 0,
      });
      subtotalFinal = subtotal; totalFinal = total;
    }
  }

  // Guarda contra dois requests simultaneos aceitando a mesma proposta --
  // o update so' pega se o status ainda NAO for "aceita". Se pegou zero linhas,
  // e' porque outro request ja aceitou; devolve o estado atual sem sobrescrever
  // o CPF/nome de quem chegou primeiro (a evidencia daquele aceite fica valida).
  const { data: atualizada, error } = await supabase
    .from("propostas")
    .update({
      status: "aceita",
      aceita_em: new Date().toISOString(),
      aceite_ip: ip,
      aceite_user_agent: userAgent,
      aceite_cpf: cpfLimpo,
      aceite_nome_completo: String(nome_completo).trim(),
      aceite_termos_versao: String(termos_versao),
      extras_selecionados: extrasSelecionadosFinal,
      subtotal: subtotalFinal,
      total: totalFinal,
      buffet_id: buffetIdFinal,
    })
    .eq("id", id).neq("status", "aceita").select().maybeSingle();
  if (error) { console.error(error); return NextResponse.json({ error: "erro ao processar" }, { status: 500 }); }
  if (!atualizada) {
    const { data: jaAceita } = await supabase.from("propostas").select("*").eq("id", id).single();
    return NextResponse.json({ proposta: expurgar(jaAceita) });
  }

  const clienteId = proposta.eventos?.cliente_id;
  if (clienteId) {
    const notaBase = `Proposta aceita eletronicamente por ${String(nome_completo).trim()} (CPF ${mascararCPF(cpfLimpo)}) em ${new Date().toLocaleString("pt-BR")} — IP ${ip || "n/d"}. Termos v${termos_versao}.`;
    let notaExtras = "";
    if (adicionadosPeloCliente.length > 0) {
      const { data: nomes } = await supabase.from("extras").select("id, nome").in("id", adicionadosPeloCliente.map((e) => e.extra_id));
      const rotulos = adicionadosPeloCliente.map((e) => {
        const cat = (nomes || []).find((n) => n.id === e.extra_id);
        return `${cat?.nome || e.extra_id}${e.quantidade > 1 ? ` x${e.quantidade}` : ""}`;
      });
      notaExtras = ` Cliente adicionou: ${rotulos.join(", ")}. Novo total: R$ ${totalFinal.toLocaleString("pt-BR")}.`;
    }
    await supabase.from("interacoes").insert({
      cliente_id: clienteId,
      nota: notaBase + notaExtras,
    });

    const { data: cliente } = await supabase.from("clientes").select("status").eq("id", clienteId).single();
    if (cliente && !["contrato", "negocio_fechado", "perdido"].includes(cliente.status)) {
      await supabase.from("clientes").update({ status: "contrato" }).eq("id", clienteId);
    }
  }

  return NextResponse.json({ proposta: expurgar(atualizada) });
}

// Validacao de CPF (algoritmo do modulo 11) -- rejeita sequencias repetidas
// (11111111111) que passam formalmente mas nao sao CPFs reais. Sem lib externa.
function validarCPF(cpf) {
  if (!/^\d{11}$/.test(cpf)) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const nums = cpf.split("").map(Number);
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += nums[i] * (t + 1 - i);
    const dv = ((soma * 10) % 11) % 10;
    if (dv !== nums[t]) return false;
  }
  return true;
}


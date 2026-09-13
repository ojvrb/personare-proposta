import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { expurgar, mascararCPF } from "@/lib/proposta";

// POST publico -- aceite da proposta pelo cliente. Sob a lei brasileira, uma
// "assinatura eletronica simples" (aceite por clique) so' vale como prova se
// coletar (a) declaracao inequivoca de aceite dos termos (checkbox+CPF+nome
// afirmativos), (b) evidencia auditavel (IP, User-Agent, timestamp),
// (c) versao dos termos vigente. MP 2.200-2/2001 + Lei 14.063/2020 + CC art.
// 219 + CDC art. 46. Isso NAO substitui um contrato assinado por ICP-Brasil
// (necessario pra atos que exigem publicidade formal), mas serve pra prestacao
// de servico civil quando as partes admitem esse meio (Codigo Civil art. 107).
export async function POST(req, { params }) {
  const { id } = await params;
  const supabase = adminClient();
  const body = await req.json().catch(() => ({}));
  const { motivo_categoria, cpf, nome_completo, termos_versao } = body;

  const { data: proposta, error: buscaErr } = await supabase
    .from("propostas")
    .select("*, eventos(cliente_id)")
    .eq("id", id)
    .single();
  if (buscaErr || !proposta) return NextResponse.json({ error: "proposta nao encontrada" }, { status: 404 });

  if (proposta.status === "aceita") {
    // ja aceita -- so aceita feedback opcional; nunca reabre o aceite.
    if (motivo_categoria && !proposta.motivo_categoria) {
      const { data: comFeedback, error: fbErr } = await supabase
        .from("propostas").update({ motivo_categoria }).eq("id", id).select().single();
      if (fbErr) return NextResponse.json({ error: fbErr.message }, { status: 500 });
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
  if (!termos_versao) {
    return NextResponse.json({ error: "voce precisa concordar com os termos" }, { status: 400 });
  }

  // IP: pega o primeiro do X-Forwarded-For (Cloudflare Workers/proxies) e cai
  // pro cabecalho CF-Connecting-IP se houver. Nao confia em IP privado (proxy interno).
  const ip = (req.headers.get("cf-connecting-ip")
    || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "").trim() || null;
  const userAgent = req.headers.get("user-agent") || null;

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
    })
    .eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const clienteId = proposta.eventos?.cliente_id;
  if (clienteId) {
    await supabase.from("interacoes").insert({
      cliente_id: clienteId,
      nota: `Proposta aceita eletronicamente por ${String(nome_completo).trim()} (CPF ${mascararCPF(cpfLimpo)}) em ${new Date().toLocaleString("pt-BR")} — IP ${ip || "n/d"}. Termos v${termos_versao}.`,
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


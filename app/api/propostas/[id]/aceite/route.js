import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { requireRole, getPerfil } from "@/lib/perfil";

// GET (admin-only): retorna a evidencia forense COMPLETA do aceite -- CPF
// integral, IP, User-Agent, timestamp, versao dos termos. Cada consulta e'
// LOGADA na timeline do cliente (interacao "acessou comprovante") pra rastrear
// quem visualizou o dado sensivel -- LGPD art. 37 (registro de operacoes).
export async function GET(_req, { params }) {
  const supabase = await createClient();
  const negado = await requireRole(supabase, ["admin"]);
  if (negado) return negado;

  const { id } = await params;
  const admin = adminClient();
  const { data: proposta, error } = await admin
    .from("propostas")
    .select("id, aceita_em, aceite_ip, aceite_user_agent, aceite_cpf, aceite_nome_completo, aceite_termos_versao, eventos(cliente_id)")
    .eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!proposta.aceita_em) return NextResponse.json({ error: "proposta ainda nao foi aceita" }, { status: 400 });

  // Log de acesso ao dado sensivel -- LGPD art. 37 (registro de operacoes de
  // tratamento). Await de proposito: em Cloudflare Workers, promise sem await
  // pode ser abortada quando a response e' devolvida.
  const perfil = await getPerfil(supabase);
  const clienteId = proposta.eventos?.cliente_id;
  if (clienteId && perfil) {
    await admin.from("interacoes").insert({
      cliente_id: clienteId,
      nota: `${perfil.user.email} consultou comprovante de aceite (CPF integral) em ${new Date().toLocaleString("pt-BR")}.`,
    });
  }

  return NextResponse.json({
    aceita_em: proposta.aceita_em,
    nome_completo: proposta.aceite_nome_completo,
    cpf: proposta.aceite_cpf,
    ip: proposta.aceite_ip,
    user_agent: proposta.aceite_user_agent,
    termos_versao: proposta.aceite_termos_versao,
  });
}

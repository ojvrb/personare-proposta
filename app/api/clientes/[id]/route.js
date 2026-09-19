import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getPerfil } from "@/lib/perfil";
import { expurgar } from "@/lib/proposta";

// GET: detalhe completo do cliente -- evento(s), propostas (+ ajustes de valor),
// timeline de notas, contrato/pagamentos, atendente responsavel e transferencia pendente.
export async function GET(req, { params }) {
  const supabase = await createClient();
  const perfil = await getPerfil(supabase);
  if (!perfil) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const { id } = await params;

  const [{ data: cliente, error: clienteErr }, { data: interacoes }, { data: transferenciaPendente }] = await Promise.all([
    supabase
      .from("clientes")
      .select("*, eventos(*, propostas(*, propostas_ajustes(*), proposta_analytics(*)), contratos(*, pagamentos(*)))")
      .eq("id", id)
      .single(),
    supabase.from("interacoes").select("*").eq("cliente_id", id).order("created_at", { ascending: false }),
    supabase.from("transferencias_lead").select("*").eq("cliente_id", id).eq("status", "pendente").maybeSingle(),
  ]);
  if (clienteErr) { console.error(clienteErr); return NextResponse.json({ error: "nao encontrado" }, { status: 404 }); }

  // propostas(*) traz aceite_cpf/ip/user_agent -- CPF integral so' sai pela rota
  // admin que registra o acesso (propostas/[id]/aceite), nunca neste payload.
  cliente.eventos = (cliente.eventos || []).map((e) => ({ ...e, propostas: expurgar(e.propostas) }));

  const { data: authList } = await adminClient().auth.admin.listUsers();
  const emailPorId = Object.fromEntries(authList.users.map((u) => [u.id, u.email]));
  cliente.atendente_email = cliente.atendente_id ? emailPorId[cliente.atendente_id] : null;

  return NextResponse.json({
    cliente,
    interacoes: interacoes || [],
    transferenciaPendente: transferenciaPendente
      ? { ...transferenciaPendente, para_email: emailPorId[transferenciaPendente.para_atendente_id] }
      : null,
    meuRole: perfil.role,
  });
}

// PATCH: move o cliente no pipeline do CRM, edita origem, ou (admin) reatribui atendente direto.
export async function PATCH(req, { params }) {
  const supabase = await createClient();
  const perfil = await getPerfil(supabase);
  if (!perfil) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const campos = {};
  if (body.status) campos.status = body.status;
  if ("origem" in body) campos.origem = body.origem || null;
  if ("email" in body) campos.email = body.email || null;
  if ("atendente_id" in body) {
    if (perfil.role !== "admin") return NextResponse.json({ error: "so admin reatribui direto" }, { status: 403 });
    campos.atendente_id = body.atendente_id;
  }
  if (Object.keys(campos).length === 0) return NextResponse.json({ error: "nada pra atualizar" }, { status: 400 });

  const { error } = await supabase.from("clientes").update(campos).eq("id", id);
  if (error) { console.error(error); return NextResponse.json({ error: "erro ao processar" }, { status: 500 }); }

  return NextResponse.json({ ok: true });
}

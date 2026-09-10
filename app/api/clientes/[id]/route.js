import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: detalhe completo do cliente -- evento(s), propostas, timeline de notas e contrato/pagamentos.
export async function GET(req, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const { id } = await params;

  const [{ data: cliente, error: clienteErr }, { data: interacoes }] = await Promise.all([
    supabase
      .from("clientes")
      .select("*, eventos(*, propostas(*), contratos(*, pagamentos(*)))")
      .eq("id", id)
      .single(),
    supabase.from("interacoes").select("*").eq("cliente_id", id).order("created_at", { ascending: false }),
  ]);
  if (clienteErr) return NextResponse.json({ error: clienteErr.message }, { status: 404 });

  return NextResponse.json({ cliente, interacoes: interacoes || [] });
}

// PATCH: move o cliente no pipeline do CRM (drag-and-drop no board).
export async function PATCH(req, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();
  if (!status) return NextResponse.json({ error: "status e obrigatorio" }, { status: 400 });

  const { error } = await supabase.from("clientes").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

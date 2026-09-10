import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPerfil } from "@/lib/perfil";

// POST: qualquer staff solicita transferir um lead pra outro atendente.
// Nunca transfere na hora -- fica pendente ate um admin aprovar (decisao do Joao).
export async function POST(req, { params }) {
  const supabase = await createClient();
  const perfil = await getPerfil(supabase);
  if (!perfil) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const { id } = await params;
  const { para_atendente_id } = await req.json();
  if (!para_atendente_id) return NextResponse.json({ error: "para_atendente_id e obrigatorio" }, { status: 400 });

  const { data: cliente } = await supabase.from("clientes").select("atendente_id").eq("id", id).single();

  const { data, error } = await supabase
    .from("transferencias_lead")
    .insert({
      cliente_id: id,
      de_atendente_id: cliente?.atendente_id || null,
      para_atendente_id,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ transferencia: data });
}

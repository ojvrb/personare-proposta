import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET/POST: gestao da lista de convidados pelo staff (autenticado).
export async function GET(req, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase
    .from("convidados")
    .select("*")
    .eq("evento_id", id)
    .order("nome");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ convidados: data });
}

export async function POST(req, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const { id } = await params;
  const { nome } = await req.json();
  if (!nome?.trim()) return NextResponse.json({ error: "nome e obrigatorio" }, { status: 400 });

  const { data, error } = await supabase
    .from("convidados")
    .insert({ evento_id: id, nome: nome.trim() })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ convidado: data });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST: adiciona uma nota na timeline do cliente/lead.
export async function POST(req, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const { id } = await params;
  const { nota } = await req.json();
  if (!nota?.trim()) return NextResponse.json({ error: "nota e obrigatoria" }, { status: 400 });

  const { data, error } = await supabase
    .from("interacoes")
    .insert({ cliente_id: id, nota: nota.trim() })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ interacao: data });
}

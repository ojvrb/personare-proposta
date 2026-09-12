import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/perfil";

// Singleton (id=1) -- textos da narrativa da proposta publica. GET pra
// qualquer staff logado, PATCH so' admin. Public proposta usa publicClient
// direto no server-side, nao passa por essa rota.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });
  const { data, error } = await supabase.from("proposta_textos").select("*").eq("id", 1).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function PATCH(req) {
  const supabase = await createClient();
  const negado = await requireRole(supabase, ["admin"]);
  if (negado) return negado;
  const body = await req.json();
  const { data, error } = await supabase.from("proposta_textos").update({ ...body, atualizado_em: new Date().toISOString() }).eq("id", 1).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

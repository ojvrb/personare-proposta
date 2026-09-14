import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH: usuario logado troca a propria senha. Usa o client autenticado
// (nao adminClient) -- o Supabase Auth valida contra a sessao atual.
export async function PATCH(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const { senha } = await req.json();
  if (!senha || String(senha).length < 8) {
    return NextResponse.json({ error: "senha precisa ter pelo menos 8 caracteres" }, { status: 400 });
  }

  const { error } = await supabase.auth.updateUser({ password: String(senha) });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

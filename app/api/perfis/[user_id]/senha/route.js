import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/perfil";

// PATCH (admin-only): reseta a senha de outro usuario. Usa service role
// (adminClient) pra atualizar sem precisar do token do usuario alvo.
// Auth do proprio admin e' checada via requireRole.
export async function PATCH(req, { params }) {
  const supabase = await createClient();
  const negado = await requireRole(supabase, ["admin"]);
  if (negado) return negado;

  const { user_id } = await params;
  const { senha } = await req.json();
  if (!senha || String(senha).length < 8) {
    return NextResponse.json({ error: "senha precisa ter pelo menos 8 caracteres" }, { status: 400 });
  }

  const { error } = await adminClient().auth.admin.updateUserById(user_id, { password: String(senha) });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

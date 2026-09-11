import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/perfil";

const PAPEIS_VALIDOS = ["admin", "atendente", "financeiro"];

// PATCH (admin-only): define o cargo de um usuario.
export async function PATCH(req, { params }) {
  const supabase = await createClient();
  const negado = await requireRole(supabase, ["admin"]);
  if (negado) return negado;

  const { user_id } = await params;
  const { role } = await req.json();
  if (!PAPEIS_VALIDOS.includes(role)) return NextResponse.json({ error: "cargo invalido" }, { status: 400 });

  const { data, error } = await supabase
    .from("perfis")
    .upsert({ user_id, role }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ perfil: data });
}

// DELETE (admin-only): remove o usuario. Os leads dele ficam "sem dono" (nao
// apaga nada de cliente/proposta) -- so' desatrela antes, senao a FK trava a
// remocao do usuario.
export async function DELETE(req, { params }) {
  const supabase = await createClient();
  const negado = await requireRole(supabase, ["admin"]);
  if (negado) return negado;

  const { user_id } = await params;
  const admin = adminClient();

  await admin.from("clientes").update({ atendente_id: null }).eq("atendente_id", user_id);
  await admin.from("propostas").update({ atendente_id: null }).eq("atendente_id", user_id);
  await admin.from("perfis").delete().eq("user_id", user_id);

  const { error } = await admin.auth.admin.deleteUser(user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

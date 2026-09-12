import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/perfil";

const PAPEIS_VALIDOS = ["admin", "atendente", "financeiro"];

// PATCH (admin-only): cargo, nome e whatsapp -- nome e whatsapp aparecem
// no rodape da proposta publica, o cliente clica no telefone e cai no whats.
export async function PATCH(req, { params }) {
  const supabase = await createClient();
  const negado = await requireRole(supabase, ["admin"]);
  if (negado) return negado;

  const { user_id } = await params;
  const body = await req.json();
  const patch = {};
  if ("role" in body) {
    if (!PAPEIS_VALIDOS.includes(body.role)) return NextResponse.json({ error: "cargo invalido" }, { status: 400 });
    patch.role = body.role;
  }
  if ("nome" in body) patch.nome = body.nome?.trim() || null;
  if ("telefone_whatsapp" in body) patch.telefone_whatsapp = normalizarTelefone(body.telefone_whatsapp);

  const { data, error } = await supabase
    .from("perfis")
    .upsert({ user_id, ...patch }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ perfil: data });
}

// Guarda so' digitos (formato E.164 sem +). Facil de renderizar depois: se
// nao comeca com 55, prependa; wa.me aceita numero puro.
function normalizarTelefone(t) {
  const digitos = String(t || "").replace(/\D/g, "");
  if (!digitos) return null;
  return digitos.startsWith("55") ? digitos : `55${digitos}`;
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

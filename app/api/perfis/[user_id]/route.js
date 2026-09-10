import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

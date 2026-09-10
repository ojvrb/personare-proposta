import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { requireRole, getPerfil } from "@/lib/perfil";

// GET: quem sou eu (qualquer staff) + lista de colegas (id+email, qualquer staff --
// precisa pra escolher pra quem transferir um lead) + lista completa com cargo (admin-only).
export async function GET() {
  const supabase = await createClient();
  const perfil = await getPerfil(supabase);
  if (!perfil) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const admin = adminClient();
  const [{ data: authList }, { data: roles }] = await Promise.all([
    admin.auth.admin.listUsers(),
    supabase.from("perfis").select("*"),
  ]);

  const colegas = authList.users
    .filter((u) => u.id !== perfil.user.id)
    .map((u) => ({ user_id: u.id, email: u.email }));

  if (perfil.role !== "admin") {
    return NextResponse.json({ eu: { user_id: perfil.user.id, email: perfil.user.email, role: perfil.role }, colegas });
  }

  const usuarios = authList.users.map((u) => ({
    user_id: u.id,
    email: u.email,
    role: roles.find((r) => r.user_id === u.id)?.role || "atendente",
  }));

  return NextResponse.json({ eu: { user_id: perfil.user.id, email: perfil.user.email, role: perfil.role }, colegas, usuarios });
}

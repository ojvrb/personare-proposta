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

  const usuarios = authList.users.map((u) => {
    const p = roles.find((r) => r.user_id === u.id);
    return {
      user_id: u.id, email: u.email,
      role: p?.role || "atendente",
      nome: p?.nome || null,
      telefone_whatsapp: p?.telefone_whatsapp || null,
    };
  });

  return NextResponse.json({ eu: { user_id: perfil.user.id, email: perfil.user.email, role: perfil.role }, colegas, usuarios });
}

const PAPEIS_VALIDOS = ["admin", "atendente", "financeiro"];

// POST (admin-only): convida um novo usuario por email (link magico do
// proprio Supabase Auth, sem senha pra distribuir manualmente) e ja cria o
// perfil com o cargo escolhido.
export async function POST(req) {
  const supabase = await createClient();
  const negado = await requireRole(supabase, ["admin"]);
  if (negado) return negado;

  const { email, role = "atendente" } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "email e obrigatorio" }, { status: 400 });
  if (!PAPEIS_VALIDOS.includes(role)) return NextResponse.json({ error: "cargo invalido" }, { status: 400 });

  const { data, error } = await adminClient().auth.admin.inviteUserByEmail(email.trim());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("perfis").upsert({ user_id: data.user.id, role }, { onConflict: "user_id" });

  return NextResponse.json({ usuario: { user_id: data.user.id, email: data.user.email, role } });
}

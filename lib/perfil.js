import { NextResponse } from "next/server";

// Sem linha em `perfis` == atendente (privilegio minimo por padrao, admin
// e sempre atribuido explicitamente via /painel/usuarios ou pelo seed inicial).
export async function getPerfil(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("perfis").select("role").eq("user_id", user.id).maybeSingle();
  return { user, role: data?.role || "atendente" };
}

// Uso: const negado = await requireRole(supabase, ["admin", "financeiro"]); if (negado) return negado;
export async function requireRole(supabase, allowed) {
  const perfil = await getPerfil(supabase);
  if (!perfil) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });
  if (!allowed.includes(perfil.role)) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
  return null;
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/perfil";

const TIPOS_VALIDOS = ["casamento", "15_anos", "corporativo", "aniversario", "outro"];

// GET: retorna todos os overrides por tipo (o painel usa isso pra saber
// quais tipos ja tem textos customizados sem precisar buscar um por um).
// Rota autenticada -- so' staff logado. Publica renderiza via publicClient
// direto no server component da /proposta/[slug].
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });
  const { data, error } = await supabase.from("proposta_textos_tipo").select("*");
  if (error) { console.error(error); return NextResponse.json({ error: "erro ao processar" }, { status: 500 }); }
  return NextResponse.json({ items: data });
}

// PATCH: upsert de um tipo especifico. Body deve trazer `evento_tipo` +
// os campos a atualizar. Admin-only (mesma restricao do PATCH do singleton).
export async function PATCH(req) {
  const supabase = await createClient();
  const negado = await requireRole(supabase, ["admin"]);
  if (negado) return negado;

  const body = await req.json();
  const { evento_tipo, ...patch } = body;
  if (!TIPOS_VALIDOS.includes(evento_tipo)) {
    return NextResponse.json({ error: "evento_tipo invalido" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("proposta_textos_tipo")
    .upsert({ evento_tipo, ...patch, atualizado_em: new Date().toISOString() }, { onConflict: "evento_tipo" })
    .select().single();
  if (error) { console.error(error); return NextResponse.json({ error: "erro ao processar" }, { status: 500 }); }
  return NextResponse.json({ item: data });
}

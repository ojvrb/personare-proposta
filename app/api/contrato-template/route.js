import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/perfil";

// GET: qualquer staff logado pode ver o template (usado tanto pelo editor
// quanto pela pagina que renderiza um contrato especifico).
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });
  const { data, error } = await supabase.from("contrato_template").select("*").eq("id", 1).maybeSingle();
  if (error) { console.error(error); return NextResponse.json({ error: "erro ao processar" }, { status: 500 }); }
  return NextResponse.json({ item: data || { intro: null, clausulas: [] } });
}

// PATCH admin-only: edita o template global de contrato. `clausulas` deve
// ser um array de {titulo, texto}. Nao valida forma alem disso -- confio no
// admin, que digita direto no editor.
export async function PATCH(req) {
  const supabase = await createClient();
  const negado = await requireRole(supabase, ["admin"]);
  if (negado) return negado;
  const body = await req.json();
  const { data, error } = await supabase
    .from("contrato_template")
    .update({ ...body, atualizado_em: new Date().toISOString() })
    .eq("id", 1).select().single();
  if (error) { console.error(error); return NextResponse.json({ error: "erro ao processar" }, { status: 500 }); }
  return NextResponse.json({ item: data });
}

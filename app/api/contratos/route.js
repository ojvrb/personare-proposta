import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, getPerfil } from "@/lib/perfil";

// GET: lista contratos com o cliente + evento associado. Qualquer staff ve
// (menu Contratos usa isso); a acao de mudar status/valor exige admin ou
// financeiro (POST/PATCH permanecem restritos).
export async function GET() {
  const supabase = await createClient();
  const perfil = await getPerfil(supabase);
  if (!perfil) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const { data, error } = await supabase
    .from("contratos")
    .select("id, status, valor_contratado, created_at, eventos(id, data_evento, tipo, num_convidados, clientes(id, nome, nome_conjuge))")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contratos: data });
}

// POST: cria o contrato de um evento (rascunho por padrao).
export async function POST(req) {
  const supabase = await createClient();
  const negado = await requireRole(supabase, ["admin", "financeiro"]);
  if (negado) return negado;

  const { evento_id, valor_contratado } = await req.json();
  if (!evento_id) return NextResponse.json({ error: "evento_id e obrigatorio" }, { status: 400 });

  const { data, error } = await supabase
    .from("contratos")
    .insert({ evento_id, valor_contratado: valor_contratado || 0 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ contrato: data });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST: adiciona uma parcela/pagamento ao contrato.
export async function POST(req, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const { id } = await params;
  const { descricao, valor, vencimento } = await req.json();
  if (!valor) return NextResponse.json({ error: "valor e obrigatorio" }, { status: 400 });

  const { data, error } = await supabase
    .from("pagamentos")
    .insert({ contrato_id: id, descricao: descricao || "Parcela", valor, vencimento: vencimento || null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ pagamento: data });
}

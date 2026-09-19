import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPerfil } from "@/lib/perfil";
import { resumoDisponibilidade } from "@/lib/reservas";

// GET ?data=YYYY-MM-DD: o dia esta livre, em disputa (holds de propostas em
// aberto) ou ja confirmado? So' contagem -- nao expoe quem segurou a data.
export async function GET(req) {
  const supabase = await createClient();
  const perfil = await getPerfil(supabase);
  if (!perfil) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const data = new URL(req.url).searchParams.get("data");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data || "")) return NextResponse.json({ error: "data invalida" }, { status: 400 });

  const { data: reservas, error } = await supabase.from("reservas").select("tipo, expira_em, proposta_id").eq("data", data);
  if (error) { console.error(error); return NextResponse.json({ error: "erro ao processar" }, { status: 500 }); }

  return NextResponse.json(resumoDisponibilidade(reservas));
}

import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { limitarPorIp } from "@/lib/rateLimit";

const TIPOS_CAPITULO = ["espaco", "decoracao", "buffet", "pacote", "depoimentos", "investimento"];

// POST publico (sem login) -- a proposta publica manda 1 evento de "abertura"
// no mount e, no pagehide, 1 evento "capitulo" por secao que o casal ficou
// olhando (sendBeacon, corpo com varios capitulos de uma vez).
export async function POST(req) {
  const limitado = await limitarPorIp(req);
  if (limitado) return limitado;

  const { slug, tipo, capitulos } = await req.json();
  if (!slug || !["abertura", "capitulo"].includes(tipo)) {
    return NextResponse.json({ error: "dados invalidos" }, { status: 400 });
  }

  const supabase = adminClient();
  const { data: proposta } = await supabase.from("propostas").select("id").eq("slug", slug).single();
  if (!proposta) return NextResponse.json({ error: "proposta nao encontrada" }, { status: 404 });

  if (tipo === "abertura") {
    await supabase.from("proposta_analytics").insert({ proposta_id: proposta.id, tipo: "abertura" });
    return NextResponse.json({ ok: true });
  }

  const linhas = (capitulos || [])
    .filter((c) => TIPOS_CAPITULO.includes(c.capitulo) && Number(c.duracao_ms) > 500)
    .map((c) => ({ proposta_id: proposta.id, tipo: "capitulo", capitulo: c.capitulo, duracao_ms: Math.round(c.duracao_ms) }));
  if (linhas.length > 0) await supabase.from("proposta_analytics").insert(linhas);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { limitarPorIp } from "@/lib/rateLimit";
import { extrasAceitosDoCliente } from "@/lib/extras";

// PUT publico -- o cliente marcou/desmarcou extras na proposta. Guarda so' como
// sinal pro vendedor (extras_cliente_pendente); nao mexe em total nem em
// extras_selecionados. Body e' sanitizado contra o catalogo (mesma regra do
// aceite): so' extras ativos, liberados pro cliente e que o vendedor nao tinha
// escolhido. Depois de aceita/perdida a proposta nao muda mais.
export async function PUT(req, { params }) {
  const limitado = await limitarPorIp(req);
  if (limitado) return limitado;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const pedidos = Array.isArray(body.extras_cliente) ? body.extras_cliente.slice(0, 50) : [];

  const supabase = adminClient();
  const { data: proposta } = await supabase.from("propostas").select("status, extras_selecionados").eq("id", id).maybeSingle();
  if (!proposta) return NextResponse.json({ error: "proposta nao encontrada" }, { status: 404 });
  if (["aceita", "perdida"].includes(proposta.status)) return NextResponse.json({ ok: true, ignorado: true });

  const ids = pedidos.map((p) => p?.extra_id).filter((v) => typeof v === "string");
  const { data: catalogo } = ids.length ? await supabase.from("extras").select("*").in("id", ids) : { data: [] };
  const sanitizados = extrasAceitosDoCliente({
    extrasCatalogo: catalogo,
    pedidos,
    idsVendedor: new Set((proposta.extras_selecionados || []).map((e) => e.extra_id)),
  }).map(({ extra_id, quantidade }) => ({ extra_id, quantidade }));

  const { error } = await supabase.from("propostas").update({ extras_cliente_pendente: sanitizados }).eq("id", id);
  if (error) { console.error(error); return NextResponse.json({ error: "erro ao processar" }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}

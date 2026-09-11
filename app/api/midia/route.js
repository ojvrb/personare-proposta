import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/perfil";

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAX = 8 * 1024 * 1024; // 8MB

// POST: staff sobe uma foto (pacote/buffet/extra/depoimento) pro bucket
// publico catalogo-midia. Sobe com service role (o bucket nao tem policy de
// insert por usuario -- a autorizacao acontece aqui, antes do upload).
export async function POST(req) {
  const supabase = await createClient();
  const negado = await requireRole(supabase, ["admin"]);
  if (negado) return negado;

  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ error: "arquivo e obrigatorio" }, { status: 400 });
  if (!TIPOS_ACEITOS.includes(file.type)) return NextResponse.json({ error: "envie um jpg, png ou webp" }, { status: 400 });
  if (file.size > TAMANHO_MAX) return NextResponse.json({ error: "arquivo maior que 8MB" }, { status: 400 });

  const ext = file.name.split(".").pop() || "jpg";
  const caminho = `${crypto.randomUUID()}.${ext}`;

  const { error } = await adminClient().storage.from("catalogo-midia").upload(caminho, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = adminClient().storage.from("catalogo-midia").getPublicUrl(caminho);
  return NextResponse.json({ url: data.publicUrl });
}

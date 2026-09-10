import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH: move o cliente no pipeline do CRM (drag-and-drop no board).
export async function PATCH(req, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();
  if (!status) return NextResponse.json({ error: "status e obrigatorio" }, { status: 400 });

  const { error } = await supabase.from("clientes").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Invalida a sessao no Supabase Auth e apaga os cookies httpOnly (o browser
// nao consegue apagar sozinho um cookie httpOnly).
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limitarPorIp } from "@/lib/rateLimit";

// Login feito NO SERVIDOR: o Set-Cookie da sessao sai daqui com httpOnly
// (ver lib/supabase/cookieOptions.js), entao JS no browser -- inclusive um XSS
// -- nunca le o token. Por isso nao existe mais createBrowserClient no app.
export async function POST(req) {
  const limitado = await limitarPorIp(req);
  if (limitado) return limitado;

  const { email, password } = await req.json().catch(() => ({}));
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return NextResponse.json({ error: "Informe email e senha." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    // mensagem propria (nao repassa a do Supabase); mesma resposta pra email
    // inexistente e senha errada -- sem enumeracao de usuario.
    const m = (error.message || "").toLowerCase();
    if (m.includes("email not confirmed")) return NextResponse.json({ error: "Confirme seu email antes de entrar." }, { status: 401 });
    if (m.includes("invalid login")) return NextResponse.json({ error: "Email ou senha incorretos." }, { status: 401 });
    console.error(error);
    return NextResponse.json({ error: "Nao foi possivel entrar agora. Tente de novo." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

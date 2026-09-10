import { createClient } from "@supabase/supabase-js";

// Cliente com service role (ignora RLS) — usado so no servidor pra ler a
// proposta pelo link publico, sem exigir sessao do cliente final.
// NUNCA importar isso em codigo que roda no browser.
export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

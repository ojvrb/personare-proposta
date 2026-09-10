import { createClient } from "@supabase/supabase-js";

// Cliente anonimo (sem sessao) pra leituras publicas cobertas por RLS proprio
// (ex: depoimentos ativos) -- diferente do admin.js, que usa service role e
// ignora RLS. Usar este sempre que a tabela ja tiver uma politica de leitura
// publica de verdade, em vez de recorrer a service role por padrao.
export function publicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
}

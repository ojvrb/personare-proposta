import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/perfil";

// CRUD generico pra tabelas de catalogo (pacotes/buffets/extras) e financeiro
// (contratos/pagamentos): mesma forma nas 5 -- listar, criar, atualizar, apagar.
// Leitura liberada pra qualquer staff logado. Escrita pode ser restrita por papel
// via `mutateRoles` (ex: so admin edita preco, admin+financeiro marcam pagamento) --
// sem isso, qualquer staff autenticado pode escrever (comportamento antigo).
export function crudHandlers(table, { mutateRoles } = {}) {
  async function requireAuth(supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });
    return null;
  }

  async function requireWriteAccess(supabase) {
    if (!mutateRoles) return requireAuth(supabase);
    return requireRole(supabase, mutateRoles);
  }

  return {
    async GET() {
      const supabase = await createClient();
      const authErr = await requireAuth(supabase);
      if (authErr) return authErr;

      const { data, error } = await supabase.from(table).select("*").order("created_at");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ items: data });
    },

    async POST(req) {
      const supabase = await createClient();
      const authErr = await requireWriteAccess(supabase);
      if (authErr) return authErr;

      const body = await req.json();
      const { data, error } = await supabase.from(table).insert(body).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ item: data });
    },

    async PATCH(req, { params }) {
      const supabase = await createClient();
      const authErr = await requireWriteAccess(supabase);
      if (authErr) return authErr;

      const { id } = await params;
      const body = await req.json();
      const { data, error } = await supabase.from(table).update(body).eq("id", id).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ item: data });
    },

    async DELETE(req, { params }) {
      const supabase = await createClient();
      const authErr = await requireWriteAccess(supabase);
      if (authErr) return authErr;

      const { id } = await params;
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    },
  };
}

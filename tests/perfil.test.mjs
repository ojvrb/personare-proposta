import { test } from "node:test";
import assert from "node:assert/strict";
import { getPerfil, requireRole } from "../lib/perfil.js";

// Mock minimo do client supabase: so os metodos que getPerfil/requireRole usam.
function mockSupabase({ user, role }) {
  return {
    auth: { getUser: async () => ({ data: { user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: role ? { role } : null }),
        }),
      }),
    }),
  };
}

test("getPerfil retorna null sem sessao", async () => {
  const perfil = await getPerfil(mockSupabase({ user: null }));
  assert.equal(perfil, null);
});

test("getPerfil cai pra 'atendente' quando nao tem linha em perfis", async () => {
  const perfil = await getPerfil(mockSupabase({ user: { id: "u1" } }));
  assert.equal(perfil.role, "atendente");
  assert.equal(perfil.user.id, "u1");
});

test("getPerfil retorna o role explicito quando existe", async () => {
  const perfil = await getPerfil(mockSupabase({ user: { id: "u1" }, role: "admin" }));
  assert.equal(perfil.role, "admin");
});

test("requireRole deixa passar (retorna null) quando o role bate", async () => {
  const negado = await requireRole(mockSupabase({ user: { id: "u1" }, role: "admin" }), ["admin", "financeiro"]);
  assert.equal(negado, null);
});

test("requireRole bloqueia sem sessao (401)", async () => {
  const negado = await requireRole(mockSupabase({ user: null }), ["admin"]);
  assert.equal(negado.status, 401);
});

test("requireRole bloqueia role fora da lista (403)", async () => {
  const negado = await requireRole(mockSupabase({ user: { id: "u1" }, role: "atendente" }), ["admin"]);
  assert.equal(negado.status, 403);
});

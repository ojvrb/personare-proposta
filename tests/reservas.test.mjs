import { test } from "node:test";
import assert from "node:assert/strict";
import { reservaAtiva, resumoDisponibilidade, expiraEmDaValidade } from "../lib/reservas.js";

const agora = new Date("2026-09-20T12:00:00-03:00");
const passado = "2026-09-10T23:59:59-03:00";
const futuro = "2026-09-30T23:59:59-03:00";

test("reservaAtiva: confirmada nunca expira, hold vale ate expira_em", () => {
  assert.equal(reservaAtiva({ tipo: "confirmada", expira_em: passado }, agora), true);
  assert.equal(reservaAtiva({ tipo: "hold", expira_em: futuro }, agora), true);
  assert.equal(reservaAtiva({ tipo: "hold", expira_em: passado }, agora), false);
  assert.equal(reservaAtiva({ tipo: "hold", expira_em: null }, agora), true);
});

test("resumoDisponibilidade conta so' holds ativos e detecta confirmada", () => {
  const reservas = [
    { tipo: "hold", expira_em: futuro, proposta_id: "p1" },
    { tipo: "hold", expira_em: passado, proposta_id: "p2" },
    { tipo: "hold", expira_em: futuro, proposta_id: "p3" },
  ];
  assert.deepEqual(resumoDisponibilidade(reservas, { agora }), { confirmada: false, holds: 2 });
  assert.equal(resumoDisponibilidade([...reservas, { tipo: "confirmada", proposta_id: "p9" }], { agora }).confirmada, true);
});

test("resumoDisponibilidade ignora a propria proposta (nao disputa consigo mesma)", () => {
  const reservas = [{ tipo: "hold", expira_em: futuro, proposta_id: "p1" }];
  assert.deepEqual(resumoDisponibilidade(reservas, { agora, ignorarPropostaId: "p1" }), { confirmada: false, holds: 0 });
});

test("resumoDisponibilidade sem reservas", () => {
  assert.deepEqual(resumoDisponibilidade(undefined, { agora }), { confirmada: false, holds: 0 });
});

test("expiraEmDaValidade vai ate o fim do dia no fuso do espaco", () => {
  assert.equal(expiraEmDaValidade("2026-10-05"), "2026-10-05T23:59:59-03:00");
  assert.equal(expiraEmDaValidade(null), null);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { expurgar, mascararCPF } from "../lib/proposta.js";

test("expurgar remove CPF/IP/UA mas mantem o resto", () => {
  const bruta = { id: "1", total: 5000, aceite_cpf: "12345678900", aceite_ip: "1.2.3.4", aceite_user_agent: "Mozilla" };
  const limpa = expurgar(bruta);
  assert.equal(limpa.id, "1");
  assert.equal(limpa.total, 5000);
  assert.equal("aceite_cpf" in limpa, false);
  assert.equal("aceite_ip" in limpa, false);
  assert.equal("aceite_user_agent" in limpa, false);
  // nao muta o objeto original
  assert.equal(bruta.aceite_cpf, "12345678900");
});

test("expurgar funciona em array de propostas", () => {
  const limpas = expurgar([{ id: "1", aceite_ip: "x" }, { id: "2", aceite_ip: "y" }]);
  assert.equal(limpas.length, 2);
  assert.ok(limpas.every((p) => !("aceite_ip" in p)));
});

test("expurgar com null/undefined nao quebra", () => {
  assert.equal(expurgar(null), null);
  assert.equal(expurgar(undefined), undefined);
});

test("mascararCPF so mostra 3 primeiros e 2 ultimos digitos", () => {
  assert.equal(mascararCPF("123.456.789-00"), "123.***.***-00");
  assert.equal(mascararCPF("abc"), "***");
});

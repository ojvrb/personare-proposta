import { test } from "node:test";
import assert from "node:assert/strict";
import { filtrarCampos } from "../lib/allowlist.js";

test("filtrarCampos descarta coluna fora da allowlist (mass assignment)", () => {
  const body = { nome: "Clássico", preco_pessoa: 60, atendente_id: "hackeado", id: "outro" };
  const out = filtrarCampos(body, ["nome", "preco_pessoa"]);
  assert.deepEqual(out, { nome: "Clássico", preco_pessoa: 60 });
});

test("filtrarCampos mantem patch parcial (so o que veio)", () => {
  const out = filtrarCampos({ ativo: false }, ["nome", "preco_pessoa", "ativo"]);
  assert.deepEqual(out, { ativo: false });
});

test("filtrarCampos preserva valores falsy validos", () => {
  const out = filtrarCampos({ ativo: false, valor: 0, descricao: "" }, ["ativo", "valor", "descricao"]);
  assert.deepEqual(out, { ativo: false, valor: 0, descricao: "" });
});

test("filtrarCampos sem allowlist deixa o body passar inteiro (rotas legadas)", () => {
  const body = { qualquer: 1 };
  assert.equal(filtrarCampos(body, undefined), body);
});

test("filtrarCampos nao inventa chave que nao veio no body", () => {
  const out = filtrarCampos({ nome: "x" }, ["nome", "preco"]);
  assert.equal("preco" in out, false);
});

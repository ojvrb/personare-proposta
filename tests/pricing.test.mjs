import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularProposta, gerarSlug } from "../lib/pricing.js";

test("calcularProposta soma pacote + buffet*convidados + extras, sem desconto", () => {
  const r = calcularProposta({
    pacote: { preco: 5000 },
    buffet: { preco_pessoa: 150 },
    numConvidados: 100,
    extras: [
      { id: "e1", tipo_preco: "fixo", valor: 300 },
      { id: "e2", tipo_preco: "pessoa", valor: 20 },
      { id: "e3", tipo_preco: "unidade", valor: 50 },
    ],
    extrasSelecionados: [{ extra_id: "e1" }, { extra_id: "e2" }, { extra_id: "e3", quantidade: 4 }],
    desconto: 0,
  });
  // pacote 5000 + buffet 150*100=15000 + extras (300 + 20*100=2000 + 50*4=200) = 22500
  assert.equal(r.precoPacote, 5000);
  assert.equal(r.precoBuffet, 15000);
  assert.equal(r.precoExtras, 2500);
  assert.equal(r.subtotal, 22500);
  assert.equal(r.total, 22500);
});

test("calcularProposta aplica desconto sem deixar total negativo", () => {
  const r = calcularProposta({ pacote: null, buffet: null, numConvidados: 10, extras: [], extrasSelecionados: [], desconto: 999999 });
  assert.equal(r.subtotal, 0);
  assert.equal(r.total, 0);
});

test("calcularProposta sem buffet (substitui_buffet) ignora preco_pessoa", () => {
  const r = calcularProposta({ pacote: { preco: 1000 }, buffet: null, numConvidados: 200, extras: [], extrasSelecionados: [], desconto: 100 });
  assert.equal(r.precoBuffet, 0);
  assert.equal(r.total, 900);
});

test("gerarSlug normaliza acentos e sempre tem sufixo unico", () => {
  const s1 = gerarSlug("João & Maria");
  const s2 = gerarSlug("João & Maria");
  assert.match(s1, /^joao-maria-[a-z0-9]{5}$/);
  assert.notEqual(s1, s2);
});

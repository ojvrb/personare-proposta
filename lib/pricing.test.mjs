import assert from "node:assert";
import { calcularProposta, gerarSlug } from "./pricing.js";

// Reproduz o exemplo do documento: pacote R$17.800 + buffet R$75/pessoa x150
// + flores naturais R$4.000 + painel LED R$1.800 + 2 TVs x R$150 + 3 garcons x R$240
const extras = [
  { id: "flores", tipo_preco: "fixo", valor: 4000 },
  { id: "led", tipo_preco: "fixo", valor: 1800 },
  { id: "tv", tipo_preco: "unidade", valor: 150 },
  { id: "garcom", tipo_preco: "unidade", valor: 240 },
];

const r = calcularProposta({
  pacote: { preco: 17800 },
  buffet: { preco_pessoa: 75 },
  numConvidados: 150,
  extras,
  extrasSelecionados: [
    { extra_id: "flores", quantidade: 1 },
    { extra_id: "led", quantidade: 1 },
    { extra_id: "tv", quantidade: 2 },
    { extra_id: "garcom", quantidade: 3 },
  ],
  desconto: 0,
});

assert.strictEqual(r.precoPacote, 17800);
assert.strictEqual(r.precoBuffet, 11250);
assert.strictEqual(r.precoExtras, 4000 + 1800 + 300 + 720);
assert.strictEqual(r.total, 35870); // bate com o exemplo do doc (secao 10)

const comDesconto = calcularProposta({
  pacote: { preco: 100 }, buffet: { preco_pessoa: 0 }, numConvidados: 0, extras: [], extrasSelecionados: [], desconto: 500,
});
assert.strictEqual(comDesconto.total, 0); // nunca fica negativo

const slug = gerarSlug("João & Maria");
assert.match(slug, /^joao-maria-[a-z0-9]{5}$/);

console.log("pricing.test.mjs: OK");

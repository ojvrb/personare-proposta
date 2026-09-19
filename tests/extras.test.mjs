import { test } from "node:test";
import assert from "node:assert/strict";
import { substituiBuffet, extrasAceitosDoCliente } from "../lib/extras.js";

const catalogo = [
  { id: "a", ativo: true, disponivel_cliente: true },
  { id: "b", ativo: true, disponivel_cliente: false },
  { id: "c", ativo: false, disponivel_cliente: true },
  { id: "d", ativo: true }, // coluna disponivel_cliente ainda nao existe no banco
  { id: "cozinha", ativo: true, substitui_buffet: true },
];

test("substituiBuffet: true se algum selecionado tem a flag", () => {
  assert.equal(substituiBuffet([{ extra_id: "a" }, { extra_id: "cozinha" }], catalogo), true);
});

test("substituiBuffet: false sem flag, sem selecao ou selecao desconhecida", () => {
  assert.equal(substituiBuffet([{ extra_id: "a" }], catalogo), false);
  assert.equal(substituiBuffet([], catalogo), false);
  assert.equal(substituiBuffet(undefined, undefined), false);
  assert.equal(substituiBuffet([{ extra_id: "fantasma" }], catalogo), false);
});

test("extrasAceitosDoCliente barra extra marcado como so-vendedor (bypass via API direta)", () => {
  const out = extrasAceitosDoCliente({ extrasCatalogo: catalogo, pedidos: [{ extra_id: "b" }], idsVendedor: new Set() });
  assert.deepEqual(out, []);
});

test("extrasAceitosDoCliente barra extra inativo e duplicado do vendedor", () => {
  const pedidos = [{ extra_id: "c" }, { extra_id: "a" }];
  assert.deepEqual(extrasAceitosDoCliente({ extrasCatalogo: catalogo, pedidos, idsVendedor: new Set() }).map((e) => e.extra_id), ["a"]);
  assert.deepEqual(extrasAceitosDoCliente({ extrasCatalogo: catalogo, pedidos, idsVendedor: new Set(["a"]) }), []);
});

test("extrasAceitosDoCliente trata coluna disponivel_cliente inexistente como liberado", () => {
  const out = extrasAceitosDoCliente({ extrasCatalogo: catalogo, pedidos: [{ extra_id: "d" }], idsVendedor: new Set() });
  assert.equal(out.length, 1);
});

test("extrasAceitosDoCliente marca pelo_cliente e normaliza quantidade minima 1", () => {
  const out = extrasAceitosDoCliente({
    extrasCatalogo: catalogo,
    pedidos: [{ extra_id: "a", quantidade: -5 }, { extra_id: "d", quantidade: "3" }],
    idsVendedor: new Set(),
  });
  assert.deepEqual(out, [
    { extra_id: "a", quantidade: 1, pelo_cliente: true },
    { extra_id: "d", quantidade: 3, pelo_cliente: true },
  ]);
});

test("extrasAceitosDoCliente ignora id inexistente no catalogo", () => {
  assert.deepEqual(extrasAceitosDoCliente({ extrasCatalogo: catalogo, pedidos: [{ extra_id: "x" }, {}], idsVendedor: new Set() }), []);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { montarCapitulos, numCapitulo } from "../lib/capitulosProposta.js";

test("montarCapitulos inclui investimento mesmo sem nenhum outro capitulo", () => {
  const capitulos = montarCapitulos({});
  assert.deepEqual(capitulos, ["investimento"]);
});

test("montarCapitulos mantem a ordem narrativa fixa", () => {
  const capitulos = montarCapitulos({
    temEspaco: true,
    temDecoracao: true,
    temBuffet: true,
    temPacote: true,
    temDepoimentos: true,
  });
  assert.deepEqual(capitulos, ["espaco", "decoracao", "buffet", "pacote", "depoimentos", "investimento"]);
});

test("montarCapitulos pula secao sem conteudo (sem decoracao)", () => {
  const capitulos = montarCapitulos({ temEspaco: true, temBuffet: true, temPacote: true });
  assert.deepEqual(capitulos, ["espaco", "buffet", "pacote", "investimento"]);
});

test("numCapitulo numera 01/02/... na ordem em que os capitulos realmente aparecem", () => {
  const capitulos = montarCapitulos({ temEspaco: true, temBuffet: true, temPacote: true });
  assert.equal(numCapitulo(capitulos, "espaco"), "01");
  assert.equal(numCapitulo(capitulos, "buffet"), "02");
  assert.equal(numCapitulo(capitulos, "pacote"), "03");
  assert.equal(numCapitulo(capitulos, "investimento"), "04");
});

test("numCapitulo reflete a mudanca de numeracao quando decoracao entra no meio", () => {
  const semDecoracao = montarCapitulos({ temEspaco: true, temBuffet: true });
  const comDecoracao = montarCapitulos({ temEspaco: true, temDecoracao: true, temBuffet: true });
  assert.equal(numCapitulo(semDecoracao, "buffet"), "02");
  assert.equal(numCapitulo(comDecoracao, "buffet"), "03");
});

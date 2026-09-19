import { test } from "node:test";
import assert from "node:assert/strict";
import { validarCPF } from "../lib/cpf.js";

test("validarCPF aceita CPF com digitos verificadores corretos", () => {
  assert.equal(validarCPF("52998224725"), true);
});

test("validarCPF rejeita digito verificador errado", () => {
  assert.equal(validarCPF("52998224724"), false);
});

test("validarCPF rejeita sequencia repetida (passa no modulo 11, nao e' CPF real)", () => {
  assert.equal(validarCPF("11111111111"), false);
  assert.equal(validarCPF("00000000000"), false);
});

test("validarCPF rejeita tamanho errado e nao-numerico (espera so' digitos)", () => {
  assert.equal(validarCPF("5299822472"), false);
  assert.equal(validarCPF("529.982.247-25"), false);
  assert.equal(validarCPF(""), false);
});

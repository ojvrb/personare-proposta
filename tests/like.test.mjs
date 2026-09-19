import { test } from "node:test";
import assert from "node:assert/strict";
import { escaparLike } from "../lib/like.js";

test("escaparLike neutraliza curingas do LIKE", () => {
  assert.equal(escaparLike("%"), "\\%");
  assert.equal(escaparLike("Ana_Maria"), "Ana\\_Maria");
  assert.equal(escaparLike("a\\b"), "a\\\\b");
});

test("escaparLike deixa nome normal intacto", () => {
  assert.equal(escaparLike("Joao da Silva"), "Joao da Silva");
});

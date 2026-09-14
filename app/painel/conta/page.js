"use client";

import { useState } from "react";
import { showToast } from "@/app/components/Toast";

export default function MinhaContaPage() {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const igual = novaSenha === confirmacao;
  const forte = novaSenha.length >= 8;
  const pode = igual && forte && !salvando;

  async function salvar(e) {
    e.preventDefault();
    if (!pode) return;
    setSalvando(true); setErro("");
    const res = await fetch("/api/conta/senha", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha: novaSenha }),
    });
    setSalvando(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); return setErro(d.error || "erro ao trocar senha"); }
    setNovaSenha(""); setConfirmacao("");
    showToast("Senha trocada com sucesso.", "ok");
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h1>Minha conta</h1>
      <p style={{ color: "var(--granite)", marginTop: -10, marginBottom: 20 }}>
        Trocar a senha que você usa pra entrar no painel.
      </p>
      <form onSubmit={salvar} className="card">
        <h3 style={{ marginTop: 0 }}>Nova senha</h3>
        {erro && <div className="alert err">{erro}</div>}
        <div className="field">
          <label htmlFor="nova">Nova senha</label>
          <input id="nova" type="password" autoComplete="new-password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required minLength={8} />
        </div>
        <div className="field">
          <label htmlFor="conf">Repita a nova senha</label>
          <input id="conf" type="password" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} required />
        </div>
        <div style={{ fontSize: 12, color: forte ? "var(--sage-dark)" : "var(--granite)", marginBottom: 6 }}>
          {forte ? "✓ mínimo 8 caracteres" : "mínimo 8 caracteres"}
        </div>
        <div style={{ fontSize: 12, color: novaSenha && confirmacao ? (igual ? "var(--sage-dark)" : "var(--bad)") : "var(--granite)", marginBottom: 14 }}>
          {novaSenha && confirmacao ? (igual ? "✓ as duas senhas batem" : "as senhas não batem") : "confirme repetindo a senha"}
        </div>
        <button className="btn primary" disabled={!pode} type="submit">{salvando ? "Salvando…" : "Trocar senha"}</button>
      </form>
    </div>
  );
}

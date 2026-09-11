"use client";

import { useEffect, useState } from "react";

const PAPEIS = { admin: "Admin", atendente: "Atendente", financeiro: "Financeiro" };

export default function UsuariosPage() {
  const [dados, setDados] = useState(null);
  const [pendentes, setPendentes] = useState([]);
  const [erro, setErro] = useState("");

  async function carregar() {
    const res = await fetch("/api/perfis");
    const data = await res.json();
    if (!res.ok) return setErro(data.error || "erro ao carregar");
    setDados(data);
    if (data.eu.role === "admin") {
      const t = await fetch("/api/transferencias").then((r) => r.json());
      setPendentes(t.pendentes || []);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function mudarPapel(userId, role) {
    await fetch(`/api/perfis/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    carregar();
  }

  async function resolverTransferencia(id, aprovar) {
    await fetch(`/api/transferencias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aprovar }),
    });
    carregar();
  }

  if (erro) return <div className="alert err">{erro}</div>;
  if (!dados) return <p style={{ color: "var(--granite)" }}>Carregando…</p>;

  if (dados.eu.role !== "admin") {
    return <div className="alert err">Acesso restrito a administradores.</div>;
  }

  return (
    <div>
      <h1>Usuários</h1>

      {pendentes.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Transferências pendentes</h3>
          {pendentes.map((t) => (
            <div key={t.id} className="resumo-linha">
              <span>
                <b>{t.clientes?.nome}{t.clientes?.nome_conjuge ? ` & ${t.clientes.nome_conjuge}` : ""}</b>: {t.de_email} → {t.para_email}
              </span>
              <span style={{ display: "flex", gap: 6 }}>
                <button className="btn primary" onClick={() => resolverTransferencia(t.id, true)}>Aprovar</button>
                <button className="btn" onClick={() => resolverTransferencia(t.id, false)}>Rejeitar</button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Equipe</h3>
        {dados.usuarios.map((u) => (
          <div key={u.user_id} className="resumo-linha">
            <span>{u.email}</span>
            <select value={u.role} onChange={(e) => mudarPapel(u.user_id, e.target.value)}>
              {Object.entries(PAPEIS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

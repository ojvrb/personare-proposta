"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const PAPEIS = { admin: "Admin", atendente: "Atendente", financeiro: "Financeiro" };

export default function UsuariosPage() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");

  async function carregar() {
    const res = await fetch("/api/perfis");
    const data = await res.json();
    if (!res.ok) return setErro(data.error || "erro ao carregar");
    setDados(data);
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

  if (erro) return <div className="wrap"><div className="alert err">{erro}</div></div>;
  if (!dados) return <div className="wrap">Carregando…</div>;

  if (dados.eu.role !== "admin") {
    return (
      <div className="wrap">
        <div className="alert err">Acesso restrito a administradores.</div>
        <Link href="/painel" className="btn">← Voltar</Link>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="top">
        <h1>Usuários</h1>
        <Link href="/painel" className="btn">← Voltar</Link>
      </div>
      <div className="card">
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

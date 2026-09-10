"use client";

import { useEffect, useState, use } from "react";

export default function RsvpPage({ params }) {
  const { slug } = use(params);
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState("");

  async function confirmar(status) {
    if (!nome.trim()) return setErro("Digite seu nome.");
    setErro("");
    setEnviando(true);
    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, nome, status }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) return setErro(data.error || "erro ao confirmar");
    setResultado(status);
  }

  if (resultado) {
    return (
      <div className="wrap" style={{ maxWidth: 480, textAlign: "center", marginTop: 60 }}>
        <div className="card">
          <h2>{resultado === "confirmado" ? "Presença confirmada! 🎉" : "Tudo bem, obrigado por avisar."}</h2>
          <p style={{ color: "var(--granite)" }}>
            {resultado === "confirmado" ? "Já anotamos você na lista." : "Sentiremos sua falta."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ maxWidth: 480, marginTop: 60 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Confirmar presença</h2>
        <p style={{ color: "var(--granite)" }}>Digite seu nome como está no convite.</p>
        {erro && <div className="alert err">{erro}</div>}
        <div className="field">
          <label>Nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn primary" disabled={enviando} onClick={() => confirmar("confirmado")} style={{ flex: 1 }}>
            Vou! 🎉
          </button>
          <button className="btn" disabled={enviando} onClick={() => confirmar("nao_vai")} style={{ flex: 1 }}>
            Não vou conseguir
          </button>
        </div>
      </div>
    </div>
  );
}

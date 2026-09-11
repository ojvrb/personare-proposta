"use client";

import { useState } from "react";

// Botao self-service: o cliente aceita a proposta direto no link publico,
// sem precisar ligar/mandar mensagem pra alguem mudar o status por ele.
export default function AceitarProposta({ propostaId, statusInicial, aceitaEmInicial }) {
  const [status, setStatus] = useState(statusInicial);
  const [aceitaEm, setAceitaEm] = useState(aceitaEmInicial);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function aceitar() {
    setCarregando(true);
    setErro("");
    const res = await fetch(`/api/propostas/${propostaId}/aceitar`, { method: "POST" });
    const data = await res.json();
    setCarregando(false);
    if (!res.ok) return setErro(data.error || "não foi possível aceitar agora, tenta de novo em instantes.");
    setStatus(data.proposta.status);
    setAceitaEm(data.proposta.aceita_em);
  }

  if (status === "aceita") {
    return (
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div className="badge" style={{ background: "var(--sage-wash)", color: "var(--sage-dark)", fontSize: 12, padding: "8px 16px" }}>
          ✓ Proposta aceita {aceitaEm ? `em ${new Date(aceitaEm).toLocaleDateString("pt-BR")}` : ""}
        </div>
        <p style={{ fontSize: 12, color: "var(--granite)", marginTop: 8 }}>A gente já foi avisado — em breve entramos em contato pra seguir com o contrato.</p>
      </div>
    );
  }

  if (status === "perdida") return null;

  return (
    <div style={{ textAlign: "center", padding: "8px 0" }}>
      <button className="btn primary" onClick={aceitar} disabled={carregando} style={{ fontSize: 16, padding: "14px 36px" }}>
        {carregando ? "Confirmando…" : "Aceitar proposta"}
      </button>
      {erro && <p style={{ fontSize: 12, color: "var(--red)", marginTop: 8 }}>{erro}</p>}
    </div>
  );
}

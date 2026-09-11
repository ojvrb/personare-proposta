"use client";

import { useState } from "react";

// Chips do "por que voce escolheu a gente" pos-aceite -- reaproveita o
// vocabulario de MOTIVO_FECHAMENTO (lib/motivos.js) pra ficar consistente com
// o que o staff ja ve no CRM, so com rotulo mais simples/cliente-facing.
const CHIPS_FEEDBACK = {
  atendimento: "Atendimento",
  localizacao: "Espaço",
  buffet_agradou: "Buffet",
  preco_adequado: "Preço",
  indicacao: "Indicação",
};

// Botao self-service: o cliente aceita a proposta direto no link publico,
// sem precisar ligar/mandar mensagem pra alguem mudar o status por ele.
// Depois do clique (aceite ja garantido, nunca antes), uma tela puxa um
// feedback opcional e pulavel -- sprint3_experiencia_proposta.md.
export default function AceitarProposta({ propostaId, statusInicial, aceitaEmInicial, motivoInicial }) {
  const [status, setStatus] = useState(statusInicial);
  const [aceitaEm, setAceitaEm] = useState(aceitaEmInicial);
  const [motivo, setMotivo] = useState(motivoInicial);
  const [feedbackVisivel, setFeedbackVisivel] = useState(!motivoInicial);
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

  async function enviarFeedback(chave) {
    setMotivo(chave); // otimista -- o aceite ja esta garantido, isso e' so' feedback
    setFeedbackVisivel(false);
    await fetch(`/api/propostas/${propostaId}/aceitar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo_categoria: chave }),
    });
  }

  if (status === "aceita") {
    return (
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div className="badge" style={{ background: "var(--sage-wash)", color: "var(--sage-dark)", fontSize: 12, padding: "8px 16px" }}>
          ✓ Proposta aceita {aceitaEm ? `em ${new Date(aceitaEm).toLocaleDateString("pt-BR")}` : ""}
        </div>
        <p style={{ fontSize: 12, color: "var(--granite)", marginTop: 8 }}>A gente já foi avisado — em breve entramos em contato pra seguir com o contrato.</p>

        {feedbackVisivel && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 13, color: "var(--stone)", marginBottom: 10 }}>O que mais pesou na sua decisão?</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {Object.entries(CHIPS_FEEDBACK).map(([v, l]) => (
                <button key={v} className="btn" style={{ fontSize: 13 }} onClick={() => enviarFeedback(v)}>{l}</button>
              ))}
              <button className="btn" style={{ fontSize: 13, color: "var(--granite)" }} onClick={() => setFeedbackVisivel(false)}>Pular</button>
            </div>
          </div>
        )}
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

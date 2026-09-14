"use client";

import { useState } from "react";

// Carrossel de depoimentos inspirado no dashboard Lendora (Behance):
// um card por vez, gradient de creme→gold→sage-wash suave, aspas grandes,
// foto+nome no rodape com um "selo" de aspas. Setas laterais no lugar de
// numeros 1/2/3 -- pra fluir sem parar em cada indice.
export default function DepoimentosCarrossel({ depoimentos, tipoEvento }) {
  const [i, setI] = useState(0);
  const d = depoimentos[i];
  const ir = (delta) => setI((atual) => (atual + delta + depoimentos.length) % depoimentos.length);

  return (
    <div style={{ position: "relative", maxWidth: 720, margin: "40px auto 0" }}>
      <div className="depoimento-card">
        <svg className="depoimento-aspas" viewBox="0 0 32 24" aria-hidden="true">
          <path d="M0 24V12C0 5.4 5.4 0 12 0v4c-4.4 0-8 3.6-8 8v0h8v12H0zm20 0V12C20 5.4 25.4 0 32 0v4c-4.4 0-8 3.6-8 8v0h8v12H20z" fill="currentColor" opacity="0.35" />
        </svg>

        <p className="depoimento-texto">{d.texto}</p>

        <div className="depoimento-autor">
          {d.foto ? (
            <img src={d.foto} alt={d.autor_nome} className="depoimento-foto" />
          ) : (
            <span className="depoimento-foto depoimento-foto--placeholder" aria-hidden="true">
              {d.autor_nome.charAt(0)}
            </span>
          )}
          <div>
            <b>{d.autor_nome}</b>
            {mostraCargo(d, tipoEvento) && (
              <div className="depoimento-cargo">{rotuloEvento(tipoEvento)}</div>
            )}
          </div>
        </div>
      </div>

      {depoimentos.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20 }}>
          <button type="button" onClick={() => ir(-1)} aria-label="Depoimento anterior" className="depoimento-nav">‹</button>
          <span style={{ display: "inline-flex", alignItems: "center", fontFamily: "var(--mono)", fontSize: 12, color: "var(--granite)", padding: "0 8px" }}>
            {i + 1} / {depoimentos.length}
          </span>
          <button type="button" onClick={() => ir(1)} aria-label="Próximo depoimento" className="depoimento-nav">›</button>
        </div>
      )}
    </div>
  );
}

function rotuloEvento(t) {
  return { casamento: "Casamento", "15_anos": "15 anos", corporativo: "Corporativo", aniversario: "Aniversário" }[t] || t;
}

// Cargo (rotulo tipo do evento embaixo do nome) so' aparece quando o depoimento
// e' dedicado ao tipo atual (unico ou entre varios explicitos). Curinga (array
// vazio) nao mostra rotulo -- e' generico.
function mostraCargo(d, tipoEvento) {
  const tipos = d.evento_tipos || [];
  if (tipos.length === 0) return false;
  if (!tipoEvento || tipoEvento === "outro") return false;
  return tipos.includes(tipoEvento);
}

"use client";

import { useState } from "react";

// Slider de verdade (nao so um scroll horizontal de cards pequenos): foto
// grande de um lado, cardapio detalhado do outro, navegacao entre as opcoes
// que o atendente curou. O recomendado (buffet_id da proposta) vem destacado.
export default function BuffetSlider({ buffets, recomendadoId, numConvidados }) {
  const [indice, setIndice] = useState(() => Math.max(0, buffets.findIndex((b) => b.id === recomendadoId)));
  const atual = buffets[indice];
  const recomendado = atual.id === recomendadoId;

  function ir(delta) {
    setIndice((i) => (i + delta + buffets.length) % buffets.length);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 220px", minWidth: 220 }}>
          {atual.fotos?.[0] ? (
            <img src={atual.fotos[0]} alt={atual.nome} style={{ width: "100%", height: 220, objectFit: "cover", borderRadius: 8 }} />
          ) : (
            <div style={{ width: "100%", height: 220, borderRadius: 8, background: "var(--lift)" }} />
          )}
        </div>

        <div style={{ flex: "1 1 220px", minWidth: 220 }}>
          {recomendado && <div className="badge" style={{ borderColor: "var(--gold)", color: "var(--gold)", marginBottom: 8 }}>★ Recomendado pra você</div>}
          <h4 style={{ margin: "0 0 4px" }}>{atual.nome}</h4>
          <p style={{ fontSize: 13, color: "var(--stone)", margin: "0 0 8px" }}>{atual.descricao}</p>
          <div style={{ color: "var(--gold)", fontWeight: 600, marginBottom: 10 }}>
            R$ {Number(atual.preco_pessoa).toLocaleString("pt-BR")}/pessoa × {numConvidados} convidados
          </div>
          {atual.itens?.length > 0 && (
            <div>
              {atual.itens.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, padding: "3px 0", color: "var(--bone)" }}>
                  <span style={{ color: "var(--green)" }}>✓</span> {item}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {buffets.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 16 }}>
          <button type="button" className="btn" onClick={() => ir(-1)} aria-label="Opção anterior">‹</button>
          <div style={{ display: "flex", gap: 6 }}>
            {buffets.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setIndice(i)}
                aria-label={`Ver ${b.nome}`}
                style={{ width: 8, height: 8, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer", background: i === indice ? "var(--gold)" : "var(--stroke)" }}
              />
            ))}
          </div>
          <button type="button" className="btn" onClick={() => ir(1)} aria-label="Próxima opção">›</button>
        </div>
      )}
    </div>
  );
}

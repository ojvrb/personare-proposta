"use client";

import { useState } from "react";
import PhotoSlider from "@/app/components/PhotoSlider";
import { useEscolhaBuffet } from "./EscolhaBuffetContext";

// Slider dos buffets curados pelo staff. A foto e' o destaque quando existe
// (arraste pra trocar), mas se algum buffet nao tem foto o slider mantem
// controles proprios (setas + pilulas por buffet) -- assim o cliente sempre
// consegue navegar entre as opcoes e escolher, com ou sem foto.
export default function BuffetSlider({ buffets, recomendadoId, numConvidados }) {
  const { escolhidoId, setEscolhidoId } = useEscolhaBuffet();
  const [indice, setIndice] = useState(() => {
    const alvo = escolhidoId || recomendadoId;
    return Math.max(0, buffets.findIndex((b) => b.id === alvo));
  });
  const atual = buffets[indice];
  const recomendado = atual.id === recomendadoId;
  const escolhido = atual.id === escolhidoId;
  const temAlgumaFoto = buffets.some((b) => b.fotos?.[0]);

  return (
    <div>
      {temAlgumaFoto && (
        <PhotoSlider
          fotos={buffets.map((b) => b.fotos?.[0])}
          legendas={buffets.map((b) => b.nome)}
          indice={indice}
          onIndiceChange={setIndice}
          altura="min(520px, 64vh)"
        />
      )}

      {buffets.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: temAlgumaFoto ? 20 : 0, marginBottom: 16 }}>
          {buffets.map((b, i) => (
            <button
              key={b.id} type="button" onClick={() => setIndice(i)}
              className="btn"
              style={{
                padding: "8px 16px", fontSize: 13, fontWeight: 500,
                background: i === indice ? "var(--sage-wash)" : "transparent",
                borderColor: i === indice ? "var(--sage)" : "var(--stroke)",
                color: i === indice ? "var(--sage-dark)" : "var(--stone)",
              }}
            >
              {b.nome}{b.id === escolhidoId ? " ✓" : ""}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: "16px 4px 4px" }}>
        {recomendado && <div className="badge" style={{ marginBottom: 10 }}>★ Recomendado pra você</div>}
        <h4 style={{ fontFamily: "var(--display)", fontSize: 28, fontWeight: 500, margin: "0 0 6px", letterSpacing: "-0.01em" }}>{atual.nome}</h4>
        <p style={{ fontSize: 15, color: "var(--stone)", margin: "0 0 12px", lineHeight: 1.5 }}>{atual.descricao}</p>
        <div style={{ color: "var(--gold-dark)", fontWeight: 600, marginBottom: 20, fontFamily: "var(--display)", fontSize: 20 }}>
          R$ {Number(atual.preco_pessoa).toLocaleString("pt-BR")}/pessoa × {numConvidados} convidados
        </div>
        {atual.itens?.length > 0 && (
          <ul className="checklist" style={{ marginTop: 0, marginBottom: 24 }}>
            {atual.itens.map((item, i) => <li key={i} className="stagger-item">{item}</li>)}
          </ul>
        )}
        {buffets.length > 1 && (
          <button
            type="button"
            onClick={() => setEscolhidoId(atual.id)}
            className={`btn ${escolhido ? "" : "primary"}`}
            style={{ width: "100%", padding: "14px 24px", fontSize: 15, fontWeight: 600 }}
            disabled={escolhido}
          >
            {escolhido ? "✓ Buffet escolhido — atualizou o total lá embaixo" : "Escolher este buffet"}
          </button>
        )}
      </div>
    </div>
  );
}

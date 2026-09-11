"use client";

import { useState } from "react";
import PhotoSlider from "@/app/components/PhotoSlider";

// Foto grande arrastavel no topo, cardapio embaixo -- navegacao entre as
// opcoes que o atendente curou. O recomendado (buffet_id da proposta) vem
// destacado. Arrastar a foto troca de buffet (PhotoSlider ja sincroniza).
export default function BuffetSlider({ buffets, recomendadoId, numConvidados }) {
  const [indice, setIndice] = useState(() => Math.max(0, buffets.findIndex((b) => b.id === recomendadoId)));
  const atual = buffets[indice];
  const recomendado = atual.id === recomendadoId;

  return (
    <PhotoSlider fotos={buffets.map((b) => b.fotos?.[0])} indice={indice} onIndiceChange={setIndice} altura={320}>
      <div style={{ marginTop: 16 }}>
        {recomendado && <div className="badge" style={{ marginBottom: 8 }}>★ Recomendado pra você</div>}
        <h4 style={{ margin: "0 0 4px" }}>{atual.nome}</h4>
        <p style={{ fontSize: 13, color: "var(--stone)", margin: "0 0 8px" }}>{atual.descricao}</p>
        <div style={{ color: "var(--gold-dark)", fontWeight: 600, marginBottom: 10 }}>
          R$ {Number(atual.preco_pessoa).toLocaleString("pt-BR")}/pessoa × {numConvidados} convidados
        </div>
        {atual.itens?.length > 0 && (
          <div>
            {atual.itens.map((item, i) => (
              <div key={i} className="stagger-item" style={{ display: "flex", gap: 8, fontSize: 13, padding: "3px 0", color: "var(--bone)" }}>
                <span style={{ color: "var(--sage)" }}>✓</span> {item}
              </div>
            ))}
          </div>
        )}
      </div>
    </PhotoSlider>
  );
}

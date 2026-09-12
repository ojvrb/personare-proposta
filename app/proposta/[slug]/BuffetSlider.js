"use client";

import { useState } from "react";
import PhotoSlider from "@/app/components/PhotoSlider";

// Foto grande + cardapio embaixo. Recomendado (buffet_id da proposta) vem
// destacado. Arrastar a foto troca de buffet.
export default function BuffetSlider({ buffets, recomendadoId, numConvidados }) {
  const [indice, setIndice] = useState(() => Math.max(0, buffets.findIndex((b) => b.id === recomendadoId)));
  const atual = buffets[indice];
  const recomendado = atual.id === recomendadoId;
  const nomesLegenda = buffets.map((b) => b.nome);

  return (
    <div>
      <PhotoSlider
        fotos={buffets.map((b) => b.fotos?.[0])}
        legendas={nomesLegenda}
        indice={indice}
        onIndiceChange={setIndice}
        altura="min(520px, 64vh)"
      />
      <div style={{ padding: "28px 4px 4px" }}>
        {recomendado && <div className="badge" style={{ marginBottom: 10 }}>★ Recomendado pra você</div>}
        <h4 style={{ fontFamily: "var(--display)", fontSize: 26, fontWeight: 500, margin: "0 0 6px", letterSpacing: "-0.01em" }}>{atual.nome}</h4>
        <p style={{ fontSize: 15, color: "var(--stone)", margin: "0 0 12px", lineHeight: 1.5 }}>{atual.descricao}</p>
        <div style={{ color: "var(--gold-dark)", fontWeight: 600, marginBottom: 20, fontFamily: "var(--display)", fontSize: 20 }}>
          R$ {Number(atual.preco_pessoa).toLocaleString("pt-BR")}/pessoa × {numConvidados} convidados
        </div>
        {atual.itens?.length > 0 && (
          <ul className="checklist" style={{ marginTop: 0 }}>
            {atual.itens.map((item, i) => <li key={i} className="stagger-item">{item}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

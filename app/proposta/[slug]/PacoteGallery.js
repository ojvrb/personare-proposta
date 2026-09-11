"use client";

import { useState } from "react";
import PhotoSlider from "@/app/components/PhotoSlider";

// Mesma foto grande arrastavel do buffet, agora pro pacote -- galeria de
// verdade se tiver mais de uma foto, nao so' a primeira estatica.
export default function PacoteGallery({ pacote }) {
  const [indice, setIndice] = useState(0);
  const fotos = pacote.fotos?.length ? pacote.fotos : [null];

  return (
    <PhotoSlider fotos={fotos} indice={indice} onIndiceChange={setIndice} altura={340}>
      <div style={{ padding: "20px 4px 4px" }}>
        <h3 style={{ marginTop: 0 }}>{pacote.nome}</h3>
        <p style={{ color: "var(--gold-dark)", fontSize: 22, fontWeight: 600 }}>R$ {Number(pacote.preco).toLocaleString("pt-BR")}</p>
        {(pacote.itens_inclusos || []).length > 0 && (
          <div style={{ marginTop: 10 }}>
            {pacote.itens_inclusos.map((item, i) => (
              <div key={i} className="stagger-item" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, padding: "4px 0", color: "var(--bone)" }}>
                <span style={{ color: "var(--sage)", fontWeight: 700 }}>✓</span> {item}
              </div>
            ))}
          </div>
        )}
        {pacote.itens_nao_inclusos?.length > 0 && (
          <p style={{ fontSize: 12, color: "var(--granite)", marginTop: 10 }}><b>Não inclui:</b> {pacote.itens_nao_inclusos.join(", ")}</p>
        )}
      </div>
    </PhotoSlider>
  );
}

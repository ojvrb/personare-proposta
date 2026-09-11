"use client";

import { useState } from "react";
import PhotoSlider from "@/app/components/PhotoSlider";

// "Antes de ver o preco, olhe mais esse lugar" -- galeria cheia (sem card,
// sem borda arredondada) montada pelo atendente em /painel/catalogo, na
// ordem que ele escolher (a "historia" do espaco).
export default function EspacoStory({ fotos }) {
  const [indice, setIndice] = useState(0);
  return (
    <PhotoSlider
      fotos={fotos.map((f) => f.url)}
      legendas={fotos.map((f) => f.legenda)}
      indice={indice}
      onIndiceChange={setIndice}
      altura={480}
      arredondado={false}
    />
  );
}

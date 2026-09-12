"use client";

import { useState } from "react";
import PhotoSlider from "@/app/components/PhotoSlider";

// Galeria imersiva do espaco, quase full-viewport de altura pra bater
// como uma foto de campanha (mesma cara de hero de app do Airbnb/Apple).
export default function EspacoStory({ fotos }) {
  const [indice, setIndice] = useState(0);
  return (
    <PhotoSlider
      fotos={fotos.map((f) => f.url)}
      legendas={fotos.map((f) => f.legenda)}
      indice={indice}
      onIndiceChange={setIndice}
      altura="min(620px, 74vh)"
      arredondado={true}
    />
  );
}

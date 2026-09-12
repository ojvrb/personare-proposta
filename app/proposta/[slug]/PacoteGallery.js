"use client";

import { useState } from "react";
import PhotoSlider from "@/app/components/PhotoSlider";

// So' as fotos do pacote -- o "o que esta incluso" mora fora agora,
// separado numa lista completa (checklist), e o preco vai pro bloco final.
export default function PacoteGallery({ pacote }) {
  const [indice, setIndice] = useState(0);
  const fotos = pacote.fotos?.length ? pacote.fotos : [null];
  return (
    <PhotoSlider fotos={fotos} indice={indice} onIndiceChange={setIndice} altura="min(560px, 68vh)" />
  );
}

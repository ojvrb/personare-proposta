"use client";

// Segura a escolha do buffet no client-side pra que a interatividade entre
// o slider (capitulo 02) e o bloco de investimento (capitulo 04) funcione,
// mesmo com secoes server-rendered entre eles. O ID inicial vem do buffet
// recomendado pelo staff -- se o cliente escolher outro, o subtotal recalcula.
import { createContext, useContext, useState } from "react";

const Ctx = createContext(null);

export function EscolhaBuffetProvider({ recomendadoId, children }) {
  // Comeca null -- o cliente ainda nao escolheu nada. O calculo usa o
  // recomendado como fallback (o cliente vai ver o total do recomendado),
  // mas nenhum botao aparece como "ja escolhido" ate ele confirmar de fato.
  const [escolhidoId, setEscolhidoId] = useState(null);
  return <Ctx.Provider value={{ escolhidoId, setEscolhidoId, recomendadoId }}>{children}</Ctx.Provider>;
}

export function useEscolhaBuffet() {
  return useContext(Ctx);
}

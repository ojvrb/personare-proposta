"use client";

// Segura escolhas do cliente no client-side (buffet + extras que ele adiciona
// na hora) pra que a interatividade entre secoes server-rendered funcione.
// O buffet inicial vem do recomendado pelo staff; os extras do cliente comecam
// vazios -- so' entram no total quando ele clica "adicionar".
import { createContext, useCallback, useContext, useState } from "react";

const Ctx = createContext(null);

export function EscolhaBuffetProvider({ recomendadoId, children }) {
  const [escolhidoId, setEscolhidoId] = useState(null);
  // Extras que o proprio cliente adiciona na proposta publica.
  // Shape: [{extra_id, quantidade}] -- mesmo do banco. Vao pro total ja no
  // client, e sao gravados no aceite via POST /aceitar (server recalcula).
  const [extrasCliente, setExtrasCliente] = useState([]);

  const adicionarExtra = useCallback((extra_id) => {
    setExtrasCliente((atual) => atual.some((e) => e.extra_id === extra_id)
      ? atual
      : [...atual, { extra_id, quantidade: 1 }]);
  }, []);
  const removerExtra = useCallback((extra_id) => {
    setExtrasCliente((atual) => atual.filter((e) => e.extra_id !== extra_id));
  }, []);
  const setQuantidadeExtra = useCallback((extra_id, quantidade) => {
    setExtrasCliente((atual) => atual.map((e) => e.extra_id === extra_id ? { ...e, quantidade: Math.max(1, Number(quantidade) || 1) } : e));
  }, []);

  return (
    <Ctx.Provider value={{ escolhidoId, setEscolhidoId, recomendadoId, extrasCliente, adicionarExtra, removerExtra, setQuantidadeExtra }}>
      {children}
    </Ctx.Provider>
  );
}

export function useEscolhaBuffet() {
  return useContext(Ctx);
}

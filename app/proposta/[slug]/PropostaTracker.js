"use client";

import { useEffect } from "react";

// Tracking de leitura da proposta: dispara "abertura" 1x no mount, acumula
// tempo visivel por capitulo (secoes marcadas com data-capitulo="..." em
// page.js) via IntersectionObserver, e manda tudo junto no pagehide via
// sendBeacon -- funciona mesmo se o casal fechar a aba sem esperar resposta.
export default function PropostaTracker({ slug }) {
  useEffect(() => {
    const enviar = (body) => {
      const blob = new Blob([JSON.stringify(body)], { type: "application/json" });
      if (!navigator.sendBeacon("/api/proposta-analytics", blob)) {
        fetch("/api/proposta-analytics", { method: "POST", body: blob, keepalive: true });
      }
    };

    enviar({ slug, tipo: "abertura" });

    const entradaEm = new Map(); // capitulo -> timestamp em que ficou visivel
    const acumulado = new Map(); // capitulo -> ms acumulados

    const secoes = document.querySelectorAll("[data-capitulo]");
    const obs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const capitulo = entry.target.dataset.capitulo;
        if (entry.isIntersecting) {
          entradaEm.set(capitulo, Date.now());
        } else if (entradaEm.has(capitulo)) {
          const decorrido = Date.now() - entradaEm.get(capitulo);
          acumulado.set(capitulo, (acumulado.get(capitulo) || 0) + decorrido);
          entradaEm.delete(capitulo);
        }
      }
    }, { threshold: 0.4 });
    secoes.forEach((el) => obs.observe(el));

    const flush = () => {
      const agora = Date.now();
      for (const [capitulo, desde] of entradaEm) {
        acumulado.set(capitulo, (acumulado.get(capitulo) || 0) + (agora - desde));
      }
      entradaEm.clear();
      const capitulos = Array.from(acumulado, ([capitulo, duracao_ms]) => ({ capitulo, duracao_ms }));
      if (capitulos.length > 0) enviar({ slug, tipo: "capitulo", capitulos });
      acumulado.clear();
    };

    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
    window.addEventListener("pagehide", flush);

    return () => {
      obs.disconnect();
      window.removeEventListener("pagehide", flush);
    };
  }, [slug]);

  return null;
}

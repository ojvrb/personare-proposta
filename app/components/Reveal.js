"use client";

import { useEffect, useRef, useState } from "react";

// Fade+slide suave quando a secao entra na tela -- fluidez de scroll estilo
// Apple, sem biblioteca (IntersectionObserver nativo). Respeita
// prefers-reduced-motion via CSS (.reveal em globals.css). `delay` (ms)
// permite escalonar varios Reveal em sequencia (efeito "produzido").
export default function Reveal({ children, delay = 0, style, ...rest }) {
  const ref = useRef(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // No mobile a viewport e' menor: threshold 0.15 exige rolar quase toda a
     // secao pra dentro antes de disparar, o que fica "chiquento" durante o
     // scroll. rootMargin negativo em baixo dispara um pouco antes.
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisivel(true);
        obs.disconnect();
      }
    }, { threshold: 0.05, rootMargin: "0px 0px -10% 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal${visivel ? " in" : ""}`} style={{ transitionDelay: `${delay}ms`, ...style }} {...rest}>
      {children}
    </div>
  );
}

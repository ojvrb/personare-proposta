"use client";

import { useEffect, useRef, useState } from "react";

// Fade+slide suave quando a secao entra na tela -- fluidez de scroll estilo
// Apple, sem biblioteca (IntersectionObserver nativo). Respeita
// prefers-reduced-motion via CSS (.reveal em globals.css).
export default function Reveal({ children, ...rest }) {
  const ref = useRef(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisivel(true);
        obs.disconnect();
      }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal${visivel ? " in" : ""}`} {...rest}>
      {children}
    </div>
  );
}

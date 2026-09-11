"use client";

import { useRef, useState } from "react";

// Ditado por voz pra anotacoes -- Web Speech API nativa do navegador (mesma
// API usada no app Tugeder), sem backend, sem custo, sem dependencia nova.
// Anexa o texto reconhecido via onResult; nao existe em todo navegador
// (funciona em Chrome/Edge; Firefox/Safari nao suportam -- por isso o botao
// some sozinho quando a API nao existe, em vez de quebrar).
export default function MicButton({ onResult }) {
  const [gravando, setGravando] = useState(false);
  const recRef = useRef(null);
  const suportado = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  function alternar() {
    if (gravando) {
      recRef.current?.stop();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (event) => {
      let texto = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) texto += event.results[i][0].transcript;
      }
      if (texto.trim()) onResult(texto.trim());
    };
    rec.onend = () => setGravando(false);
    rec.onerror = () => setGravando(false);
    recRef.current = rec;
    rec.start();
    setGravando(true);
  }

  if (!suportado) return null;

  return (
    <button
      type="button"
      className="btn"
      onClick={alternar}
      title={gravando ? "Parar gravação" : "Ditar por voz"}
      aria-label={gravando ? "Parar gravação" : "Ditar por voz"}
      style={gravando ? { color: "var(--red)", borderColor: "var(--red)" } : undefined}
    >
      {gravando ? "● Gravando…" : "🎙"}
    </button>
  );
}

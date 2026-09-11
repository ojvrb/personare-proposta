"use client";

import { useRef, useState } from "react";

// Ditado por voz pra anotacoes -- Web Speech API nativa do navegador (mesma
// API usada no app Tugeder), sem backend, sem custo, sem dependencia nova.
// Mostra a transcricao ao vivo (inclusive parcial, enquanto a pessoa ainda
// fala) num campo editavel; so' entra na anotacao de verdade quando a pessoa
// confirma (Enter ou botao) -- nunca aplica direto sem revisao.
// Nao existe em todo navegador (Chrome/Edge sim, Firefox/Safari nao) -- por
// isso o botao some sozinho quando a API nao existe, em vez de quebrar.
export default function MicButton({ onResult }) {
  const [gravando, setGravando] = useState(false);
  const [transcricao, setTranscricao] = useState("");
  const recRef = useRef(null);
  const textoFinalRef = useRef("");
  const suportado = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  function iniciar() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;
    textoFinalRef.current = "";
    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) textoFinalRef.current += event.results[i][0].transcript + " ";
        else interim += event.results[i][0].transcript;
      }
      setTranscricao((textoFinalRef.current + interim).trim());
    };
    rec.onend = () => setGravando(false);
    rec.onerror = () => setGravando(false);
    recRef.current = rec;
    setTranscricao("");
    rec.start();
    setGravando(true);
  }

  function pararGravacao() {
    recRef.current?.stop();
  }

  function confirmar() {
    if (transcricao.trim()) onResult(transcricao.trim());
    setTranscricao("");
  }

  function onKeyDown(e) {
    if (!gravando && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      confirmar();
    }
  }

  if (!suportado) return null;

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="btn"
        onClick={gravando ? pararGravacao : iniciar}
        title={gravando ? "Parar gravação" : "Ditar por voz"}
        aria-label={gravando ? "Parar gravação" : "Ditar por voz"}
        style={gravando ? { color: "var(--red)", borderColor: "var(--red)" } : undefined}
      >
        {gravando ? "● Gravando…" : "🎙"}
      </button>

      {(gravando || transcricao) && (
        <div className="flat-card" style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 280, padding: 12, zIndex: 30, boxShadow: "var(--shadow-soft)" }}>
          <textarea
            value={transcricao}
            onChange={(e) => setTranscricao(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ouvindo…"
            rows={3}
            readOnly={gravando}
            autoFocus={!gravando}
            style={{ width: "100%", fontSize: 13, border: "1px solid var(--stroke)", borderRadius: 8, padding: 8, resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => setTranscricao("")}>Descartar</button>
            <button type="button" className="btn primary" style={{ fontSize: 12, padding: "6px 10px" }} onClick={confirmar} disabled={gravando || !transcricao.trim()}>
              Usar (Enter)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

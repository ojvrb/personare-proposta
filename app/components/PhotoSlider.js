"use client";

import { useRef, useState } from "react";

// Slider de foto de verdade -- a pessoa ARRASTA a foto pra trocar (pointer
// events cobrem touch + mouse num so' codigo), nao so clica numa seta. A foto
// acompanha o dedo em tempo real e desliza pro lugar com easing quando solta.
// `slides`: [{ foto, key }] -- o conteudo abaixo da foto e' passado como
// children e sincronizado externamente via `indice`/`onIndiceChange`.
export default function PhotoSlider({ fotos, indice, onIndiceChange, altura = 360, arredondado = true, legendas, children }) {
  const [arrastoX, setArrastoX] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const inicioX = useRef(0);

  // Se nenhum slide tem foto real, oculta o container inteiro em vez de
  // renderizar um bloco cinza "Foto em breve" (ficava feio na proposta).
  // O children continua aparecendo -- o menu/descricao ainda tem valor sem foto.
  const temAlgumaFoto = fotos.some(Boolean);
  if (!temAlgumaFoto) return <div>{children}</div>;

  function ir(delta) {
    onIndiceChange((indice + delta + fotos.length) % fotos.length);
  }

  function onPointerDown(e) {
    if (fotos.length <= 1) return;
    setArrastando(true);
    inicioX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (!arrastando) return;
    setArrastoX(e.clientX - inicioX.current);
  }
  function soltar() {
    if (!arrastando) return;
    setArrastando(false);
    if (arrastoX < -60) ir(1);
    else if (arrastoX > 60) ir(-1);
    setArrastoX(0);
  }

  const foto = fotos[indice];

  return (
    <div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        style={{
          position: "relative", height: altura, borderRadius: arredondado ? 20 : 0, overflow: "hidden",
          cursor: fotos.length > 1 ? (arrastando ? "grabbing" : "grab") : "default",
          touchAction: "pan-y", userSelect: "none", background: "var(--lift)",
        }}
      >
        {foto ? (
          <img
            src={foto}
            alt=""
            draggable={false}
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              transform: `translateX(${arrastoX * 0.5}px) scale(${arrastando ? 1.02 : 1})`,
              transition: arrastando ? "none" : "transform .4s cubic-bezier(.16,1,.3,1)",
            }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--granite)", fontSize: 13 }}>
            Foto em breve
          </div>
        )}

        {legendas?.[indice] && (
          <div style={{
            position: "absolute", left: 0, right: 0, bottom: 0, padding: "48px 20px 20px",
            background: "linear-gradient(180deg,transparent,rgba(0,0,0,.55))",
            color: "#fff", fontSize: 15, fontWeight: 600,
          }}>
            {legendas[indice]}
          </div>
        )}

        {fotos.length > 1 && (
          <>
            <button type="button" onClick={() => ir(-1)} aria-label="Anterior" className="photo-slider-nav" style={{ left: 12 }}>‹</button>
            <button type="button" onClick={() => ir(1)} aria-label="Próxima" className="photo-slider-nav" style={{ right: 12 }}>›</button>
            <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6, zIndex: 1 }}>
              {fotos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onIndiceChange(i)}
                  aria-label={`Ver foto ${i + 1}`}
                  style={{ width: 6, height: 6, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer", background: i === indice ? "#fff" : "rgba(255,255,255,.5)" }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {children}
    </div>
  );
}

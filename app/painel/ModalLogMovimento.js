"use client";

import { useState } from "react";
import { MOTIVO_PERDA, MOTIVO_FECHAMENTO } from "@/lib/motivos";
import MicButton from "@/app/components/MicButton";
import { STATUS } from "./kanbanStatus";

// Sem "Pular": todo movimento de etapa exige preencher motivo (perdido/fechado)
// ou uma nota (demais etapas) antes de confirmar -- so' entao o status muda de
// verdade (ver confirmarMovimento em page.js). "Cancelar" desiste do movimento inteiro.
export default function ModalLogMovimento({ movimento, onConfirmar, onCancelar }) {
  const [nota, setNota] = useState("");
  const [motivo, setMotivo] = useState("");
  const paraPerdido = movimento.paraStatus === "perdido";
  const paraFechado = movimento.paraStatus === "negocio_fechado";
  const motivos = paraPerdido ? MOTIVO_PERDA : paraFechado ? MOTIVO_FECHAMENTO : null;
  const rotuloEvento = paraPerdido ? "Perdido" : "Negócio fechado";
  const labelPara = STATUS.find((s) => s.id === movimento.paraStatus)?.label;
  const podeSalvar = motivos ? !!motivo : nota.trim().length > 0;

  function confirmar() {
    if (!podeSalvar) return;
    const textoFinal = motivos
      ? `${rotuloEvento} — motivo: ${motivos[motivo]}${nota.trim() ? ` — ${nota.trim()}` : ""}`
      : nota.trim();
    onConfirmar(textoFinal);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div className="card" style={{ maxWidth: 420, width: "90%" }}>
        <h3 style={{ marginTop: 0 }}>
          {movimento.cliente.nome} → {labelPara}
        </h3>
        {motivos && (
          <div className="field">
            <label>{paraPerdido ? "Motivo da perda" : "Por que o negócio fechou?"}</label>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)} autoFocus>
              <option value="">Selecione...</option>
              {Object.entries(motivos).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        )}
        <div className="field">
          <label>{motivos ? "Detalhes (opcional)" : "O que aconteceu? (obrigatório)"}</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ex: cliente pediu mais prazo pra decidir" autoFocus={!motivos} style={{ flex: 1 }} />
            <MicButton onResult={(texto) => setNota((n) => (n ? `${n} ${texto}` : texto))} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onCancelar}>Cancelar</button>
          <button className="btn primary" onClick={confirmar} disabled={!podeSalvar}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

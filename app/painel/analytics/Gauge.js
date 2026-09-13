"use client";

// Gauge semicircular de barras -- KPI grande no centro + insight embaixo.
// Inspirado no card "Manual tracking 61%" do Behance Lendora. SVG puro,
// barras espacadas em arco de 180°. Cor varia por faixa: sage (>=60%),
// gold (30-60), granite (<30) -- comunica "atingimento" sem texto extra.
export default function Gauge({ valor, label, insight, sufixo = "%", nBarras = 44 }) {
  const pct = Math.max(0, Math.min(100, Number(valor) || 0));
  const cor = pct >= 60 ? "var(--sage)" : pct >= 30 ? "var(--gold)" : "var(--granite)";
  const acesas = Math.round((pct / 100) * nBarras);
  return (
    <div className="gauge">
      {label && <span className="gauge-label">{label}</span>}
      <div className="gauge-inner">
        <svg viewBox="-110 -110 220 130" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          {Array.from({ length: nBarras }).map((_, i) => {
            const t = i / (nBarras - 1);
            const ang = Math.PI * (1 - t);
            const r1 = 78, r2 = 100;
            const x1 = Math.cos(ang) * r1, y1 = -Math.sin(ang) * r1;
            const x2 = Math.cos(ang) * r2, y2 = -Math.sin(ang) * r2;
            const acesa = i < acesas;
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={acesa ? cor : "var(--lift)"}
                strokeWidth="3" strokeLinecap="round"
                opacity={acesa ? 1 : 0.6}
              />
            );
          })}
        </svg>
        <div className="gauge-valor">{pct.toFixed(pct >= 10 ? 0 : 1)}{sufixo}</div>
      </div>
      {insight && (
        <p className="gauge-insight" style={{ color: cor }}>
          <span style={{ color: "var(--stone)" }}>{insight}</span>
        </p>
      )}
    </div>
  );
}

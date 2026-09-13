"use client";

// Slider horizontal com marcador triangular -- inspirado no card
// "Tool Fragmentation 65.91%" do Behance Lendora. KPI grande a esquerda,
// linha 0-100 com marcador na direita, labels 0%/50%/100% na base.
// Cor de fundo em gradient suave (creme -> gold-wash) pra dar o ar
// de painel, sem competir com o resto do Analytics.
export default function BarraRange({ valor, titulo, insight, tagEsq, tagDir, sufixo = "%" }) {
  const pct = Math.max(0, Math.min(100, Number(valor) || 0));
  return (
    <div className="barra-range">
      <div className="barra-range-esq">
        <span className="barra-range-sufixo">{sufixo}</span>
        <span className="barra-range-valor">{pct.toFixed(pct >= 10 ? 2 : 1)}</span>
      </div>
      <div className="barra-range-dir">
        <div style={{ position: "relative", padding: "24px 0 32px" }}>
          <div className="barra-range-trilho" />
          <div className="barra-range-marker" style={{ left: `${pct}%` }} aria-hidden="true" />
          <div className="barra-range-labels">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
        {(tagEsq || tagDir) && (
          <div className="barra-range-tags">
            {tagEsq && <span>{tagEsq}</span>}
            {tagDir && <span style={{ marginLeft: "auto" }}>{tagDir}</span>}
          </div>
        )}
      </div>
      {titulo && (
        <p className="barra-range-titulo">{titulo}</p>
      )}
      {insight && (
        <p className="barra-range-insight">{insight}</p>
      )}
    </div>
  );
}

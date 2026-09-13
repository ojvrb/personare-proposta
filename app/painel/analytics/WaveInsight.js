"use client";

// Card com curva suave amarela + insight -- inspirado no Behance Lendora
// (card "Did rate visualizations help..."). Recebe `serie: number[]` e
// desenha uma linha suavizada em SVG. O highlight (dot) fica no ponto
// mais alto da serie. Se todos os valores forem iguais, a linha e' reta.
export default function WaveInsight({ eyebrow, titulo, valor, serie = [], insight }) {
  const pts = serie.length >= 2 ? serie : [0, 0];
  const max = Math.max(...pts, 1);
  const min = Math.min(...pts, 0);
  const range = max - min || 1;
  const W = 320, H = 120, pad = 12;
  const passo = (W - pad * 2) / (pts.length - 1);
  const y = (v) => H - pad - ((v - min) / range) * (H - pad * 2);
  const xy = pts.map((v, i) => [pad + i * passo, y(v)]);
  // curva suave via smoothstep entre pontos
  let d = `M ${xy[0][0]} ${xy[0][1]}`;
  for (let i = 1; i < xy.length; i++) {
    const [x0, y0] = xy[i - 1], [x1, y1] = xy[i];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  // shadow-band abaixo da curva (efeito "aura" do print)
  const dBanda = `${d} L ${xy[xy.length - 1][0]} ${H - pad} L ${xy[0][0]} ${H - pad} Z`;

  const iMax = pts.indexOf(max);
  const [xMax, yMax] = xy[iMax];

  return (
    <div className="wave-card">
      {eyebrow && <span className="wave-eyebrow">{eyebrow}</span>}
      {titulo && <h3 className="wave-titulo">{titulo}</h3>}
      {valor && <p className="wave-valor">{valor}</p>}
      <div className="wave-grafico">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="wave-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity=".22" />
              <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={dBanda} fill="url(#wave-fill)" />
          <path d={d} fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={xMax} cy={yMax} r="5" fill="var(--gold)" />
          <line x1={xMax} y1={yMax + 6} x2={xMax} y2={H - pad + 4} stroke="var(--stroke)" strokeWidth="1" />
        </svg>
      </div>
      {insight && <p className="wave-insight">{insight}</p>}
    </div>
  );
}

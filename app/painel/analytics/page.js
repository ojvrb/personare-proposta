"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const FUNIL = [
  { status: "novo_contato", label: "Novo contato" },
  { status: "visita_agendada", label: "Visita agendada" },
  { status: "proposta_enviada", label: "Proposta enviada" },
  { status: "negociacao", label: "Negociação" },
  { status: "aguardando_decisao", label: "Aguardando decisão" },
  { status: "contrato", label: "Contrato" },
  { status: "negocio_fechado", label: "Negócio fechado" },
  { status: "perdido", label: "Perdido" },
];

// Rampa ordinal dourada (clara -> escura): o funil é uma sequência com ordem,
// não categorias soltas -- por isso um hue só, não 8 cores categóricas distintas.
// Validado (contraste >=2.4:1 sobre --pitch #1c1611) em node antes de usar.
const RAMPA_OURO = ["#f0d9b2", "#dfc59e", "#ceb08a", "#bd9c76", "#ad8762", "#9c734e", "#8b5e3a", "#7a4a26"];

export default function AnalyticsPage() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => (ok ? setDados(d) : setErro(d.error || "erro ao carregar")));
  }, []);

  if (erro) return <div className="wrap"><div className="alert err">{erro}</div><Link href="/painel" className="btn">← Voltar</Link></div>;
  if (!dados) return <div className="wrap">Carregando…</div>;

  const maxFunil = Math.max(1, ...FUNIL.map((f) => dados.porStatus[f.status] || 0));

  return (
    <div className="wrap">
      <div className="top">
        <h1>Analytics</h1>
        <Link href="/painel" className="btn">← Voltar</Link>
      </div>
      <div className="selo">Desempenho comercial</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14, marginBottom: 24 }}>
        <Stat label="Leads" valor={dados.totalLeads} />
        <Stat label="Propostas enviadas" valor={dados.totalPropostas} />
        <Stat label="Contratos assinados" valor={dados.contratosAssinados} />
        <Stat label="Taxa de conversão" valor={`${dados.conversao.toFixed(1)}%`} />
        <Stat label="Ticket médio" valor={`R$ ${dados.ticketMedio.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
        <Stat label="Desconto médio" valor={`R$ ${dados.descontoMedio.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
        <Stat
          label="Tempo médio de fechamento"
          valor={dados.tempoMedioFechamentoDias != null ? `${dados.tempoMedioFechamentoDias.toFixed(0)} dias` : "—"}
        />
        <Stat label="Buffet mais escolhido" valor={dados.buffetMaisEscolhido ? `${dados.buffetMaisEscolhido.nome} (${dados.buffetMaisEscolhido.count})` : "—"} />
        <Stat label="Extra mais vendido" valor={dados.extraMaisVendido ? `${dados.extraMaisVendido.nome} (${dados.extraMaisVendido.count})` : "—"} />
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Leads por etapa do funil</h3>
        <FunilChart dados={dados.porStatus} max={maxFunil} />
      </div>
    </div>
  );
}

function FunilChart({ dados, max }) {
  const linhaAltura = 30;
  return (
    <div role="img" aria-label="Leads por etapa do funil" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {FUNIL.map((f, i) => {
        const valor = dados[f.status] || 0;
        const larguraPct = valor > 0 ? Math.max(3, (valor / max) * 100) : 0;
        return (
          <div key={f.status} style={{ display: "grid", gridTemplateColumns: "150px 1fr 24px", alignItems: "center", gap: 10, height: linhaAltura }}>
            <span style={{ fontSize: 13, color: "var(--stone)" }}>{f.label}</span>
            <div style={{ height: 9, background: "var(--lift)", borderRadius: 5, overflow: "hidden" }}>
              <div style={{ width: `${larguraPct}%`, height: "100%", borderRadius: 5, background: RAMPA_OURO[i], transition: "width .3s" }} />
            </div>
            <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--bone)", textAlign: "right" }}>{valor}</span>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, valor }) {
  return (
    <div className="stat">
      <div className="k">{label}</div>
      <div className="v">{valor}</div>
    </div>
  );
}

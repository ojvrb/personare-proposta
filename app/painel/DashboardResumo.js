"use client";

import { useEffect, useState } from "react";

// Faixa dashboard estilo Lendora (Behance) adaptada pra paleta sage/gold:
// KPIs grandes em serifa com setas ↑↓ comparando mes atual vs mes anterior,
// ao lado de dois cards menores com contadores de "o que precisa de acao".
// Roda sem impacto na performance do board porque tem endpoint separado
// (/api/dashboard) que agrega no server e retorna so' numeros.
export default function DashboardResumo() {
  const [dados, setDados] = useState(null);
  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.ok ? r.json() : null).then(setDados).catch(() => {});
  }, []);
  if (!dados) return <div style={{ height: 180, marginBottom: 8 }} aria-hidden="true" />;
  const mes = agora();
  return (
    <section style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>{mes}</h1>
        <span style={{ fontSize: 12, color: "var(--granite)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".06em" }}>Resumo do mês</span>
      </div>
      <div className="dashboard-hero">
        <KpiHero label="Conversão" valor={`${dados.mes.conversao.toFixed(1)}%`} delta={dados.delta.conversao} pontos />
        <KpiHero label="Ticket médio" valor={formatarBRL(dados.mes.ticket)} delta={dados.delta.ticket} />
        <KpiHero label="Receita fechada" valor={formatarBRL(dados.mes.receita)} delta={dados.delta.receita} />
      </div>
      <div className="dashboard-secundario">
        <KpiMini label="Leads novos" valor={dados.mes.leads} delta={dados.delta.leads} />
        <KpiMini label="Propostas enviadas" valor={dados.mes.propostas} delta={dados.delta.propostas} />
        <KpiMini label="Contratos assinados" valor={dados.mes.contratos} delta={dados.delta.contratos} />
        <KpiMini label="Leads em andamento" valor={dados.ativos.leadsAtivos} sub={`${dados.ativos.propostasEnviadas} com proposta em aberto`} />
      </div>
    </section>
  );
}

function KpiHero({ label, valor, delta, pontos }) {
  const temDelta = delta !== undefined && delta !== null && !Number.isNaN(delta) && Math.abs(delta) >= 0.05;
  const subiu = delta > 0;
  return (
    <div className="kpi-hero">
      <div className="kpi-hero-label">{label}</div>
      <div className="kpi-hero-valor">{valor}</div>
      {temDelta && (
        <div className={`kpi-hero-delta ${subiu ? "up" : "down"}`}>
          <span aria-hidden="true">{subiu ? "↑" : "↓"}</span>
          {Math.abs(delta).toFixed(1)}{pontos ? " pts" : "%"}
          <span style={{ marginLeft: 6, color: "var(--granite)", fontWeight: 400 }}>vs mês anterior</span>
        </div>
      )}
    </div>
  );
}

function KpiMini({ label, valor, delta, sub }) {
  const temDelta = delta !== undefined && delta !== null && !Number.isNaN(delta) && Math.abs(delta) >= 0.5;
  const subiu = delta > 0;
  return (
    <div className="kpi-mini">
      <div className="kpi-mini-label">{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span className="kpi-mini-valor">{valor}</span>
        {temDelta && (
          <span className={`delta-badge ${subiu ? "up" : "down"}`}>
            {subiu ? "↑" : "↓"} {Math.abs(delta).toFixed(0)}%
          </span>
        )}
      </div>
      {sub && <div className="kpi-mini-sub">{sub}</div>}
    </div>
  );
}

function formatarBRL(n) {
  return `R$ ${Number(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}
function agora() {
  return new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^./, (c) => c.toUpperCase());
}

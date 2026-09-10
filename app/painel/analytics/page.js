"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STATUS_LABEL = {
  novo_contato: "Novo contato",
  visita_agendada: "Visita agendada",
  proposta_enviada: "Proposta enviada",
  negociacao: "Negociação",
  aguardando_decisao: "Aguardando decisão",
  contrato: "Contrato",
  evento_confirmado: "Evento confirmado",
  perdido: "Perdido",
};

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

  return (
    <div className="wrap">
      <div className="top">
        <h1>Analytics</h1>
        <Link href="/painel" className="btn">← Voltar</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
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
        {Object.entries(STATUS_LABEL).map(([status, label]) => (
          <div key={status} className="resumo-linha">
            <span>{label}</span>
            <span>{dados.porStatus[status] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, valor }) {
  return (
    <div className="card">
      <div style={{ fontSize: 11, color: "var(--granite)", fontFamily: "var(--mono)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 24, color: "var(--gold)", fontWeight: 600, marginTop: 6 }}>{valor}</div>
    </div>
  );
}

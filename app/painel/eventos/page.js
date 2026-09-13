"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Agenda dos negocios fechados -- depois que o cliente sai do funil de vendas
// (status negocio_fechado, ver /painel), ele passa a viver aqui pra
// acompanhamento da organizacao do evento em si, ordenado pela data mais proxima.
export default function AgendaEventosPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [modo, setModo] = useState("lista"); // lista | calendario

  useEffect(() => {
    fetch("/api/propostas")
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => (ok ? setClientes((d.clientes || []).filter((c) => c.status === "negocio_fechado")) : setErr(d.error || "erro ao carregar")))
      .finally(() => setLoading(false));
  }, []);

  const eventos = clientes
    .map((c) => ({ cliente: c, evento: c.eventos?.[0] }))
    .sort((a, b) => {
      const da = a.evento?.data_evento, db = b.evento?.data_evento;
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return new Date(da) - new Date(db);
    });

  return (
    <div>
      <div className="top">
        <h1>Agenda de eventos</h1>
        <div style={{ display: "flex", border: "1px solid var(--stroke)", borderRadius: 100, overflow: "hidden" }}>
          <button
            className="btn"
            style={{ border: "none", borderRadius: 0, background: modo === "lista" ? "var(--lift)" : "transparent" }}
            onClick={() => setModo("lista")}
          >
            Lista
          </button>
          <button
            className="btn"
            style={{ border: "none", borderRadius: 0, background: modo === "calendario" ? "var(--lift)" : "transparent" }}
            onClick={() => setModo("calendario")}
          >
            Calendário
          </button>
        </div>
      </div>
      <p style={{ color: "var(--granite)", marginTop: -10, marginBottom: 24 }}>
        Negócios fechados, organizados pela data do evento.
      </p>

      {err && <div className="alert err">{err}</div>}
      {loading ? (
        <p style={{ color: "var(--granite)" }}>Carregando…</p>
      ) : eventos.length === 0 ? (
        <p style={{ color: "var(--granite)" }}>Nenhum evento fechado ainda.</p>
      ) : modo === "calendario" ? (
        <CalendarioEventos eventos={eventos} />
      ) : (
        <ListaEventos eventos={eventos} />
      )}
    </div>
  );
}

function ListaEventos({ eventos }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {eventos.map(({ cliente, evento }) => {
        const proposta = evento?.propostas?.[evento?.propostas?.length - 1];
        return (
          <div key={cliente.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14 }}>
            <div>
              <Link href={`/painel/clientes/${cliente.id}`} style={{ fontWeight: 600, textDecoration: "underline" }}>
                {cliente.nome}{cliente.nome_conjuge ? ` & ${cliente.nome_conjuge}` : ""}
              </Link>
              <div style={{ fontSize: 12, color: "var(--stone)", marginTop: 4 }}>
                {evento?.tipo || "—"} · {evento?.num_convidados ?? "—"} convidados
                {cliente.cidade ? ` · ${cliente.cidade}` : ""}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "var(--gold-dark)", fontWeight: 600 }}>
                {evento?.data_evento ? new Date(`${evento.data_evento}T00:00:00`).toLocaleDateString("pt-BR") : "sem data definida"}
              </div>
              {proposta && (
                <div style={{ fontSize: 12, color: "var(--granite)", marginTop: 4 }}>
                  R$ {Number(proposta.total).toLocaleString("pt-BR")}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function CalendarioEventos({ eventos }) {
  const semData = eventos.filter(({ evento }) => !evento?.data_evento).length;
  const [mesRef, setMesRef] = useState(() => {
    const primeiro = eventos.find(({ evento }) => evento?.data_evento);
    const base = primeiro ? new Date(`${primeiro.evento.data_evento}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const porDia = {};
  eventos.forEach(({ cliente, evento }) => {
    if (!evento?.data_evento) return;
    (porDia[evento.data_evento] ||= []).push(cliente);
  });

  const ano = mesRef.getFullYear();
  const mes = mesRef.getMonth();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const celulas = [...Array(primeiroDiaSemana).fill(null), ...Array(diasNoMes).keys()].map((v) => (v === null ? null : v + 1));

  const hoje = new Date();
  const isHoje = (d) => hoje.getFullYear() === ano && hoje.getMonth() === mes && hoje.getDate() === d;

  function trocarMes(delta) {
    setMesRef((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button className="btn" onClick={() => trocarMes(-1)} aria-label="Mês anterior">‹</button>
        <h3 style={{ margin: 0, textTransform: "capitalize" }}>
          {mesRef.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </h3>
        <button className="btn" onClick={() => trocarMes(1)} aria-label="Próximo mês">›</button>
      </div>

      {semData > 0 && (
        <p style={{ fontSize: 12, color: "var(--granite)", marginTop: -6, marginBottom: 12 }}>
          {semData} evento{semData === 1 ? "" : "s"} sem data definida (veja na visualização em lista).
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
        {DIAS_SEMANA.map((d) => (
          <div key={d} style={{ fontSize: 11, color: "var(--granite)", textAlign: "center" }}>{d}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {celulas.map((dia, i) => {
          if (dia === null) return <div key={i} />;
          const chave = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          const doDia = porDia[chave] || [];
          return (
            <div
              key={i}
              style={{
                minHeight: 76,
                border: `1px solid ${isHoje(dia) ? "var(--gold)" : "var(--stroke)"}`,
                borderRadius: 6,
                padding: 6,
                background: doDia.length ? "rgba(198,147,84,.10)" : "transparent",
              }}
            >
              <div style={{ fontSize: 11, color: isHoje(dia) ? "var(--gold)" : "var(--granite)", fontWeight: isHoje(dia) ? 700 : 400 }}>
                {dia}
              </div>
              {doDia.map((cliente) => (
                <Link
                  key={cliente.id}
                  href={`/painel/clientes/${cliente.id}`}
                  style={{ display: "block", fontSize: 11, color: "var(--gold-dark)", marginTop: 4, textDecoration: "underline", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                  title={cliente.nome}
                >
                  {cliente.nome}
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

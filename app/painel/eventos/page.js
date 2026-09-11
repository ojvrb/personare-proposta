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
    <div className="wrap">
      <div className="top">
        <h1>Agenda de eventos</h1>
        <Link href="/painel" className="btn">← Voltar</Link>
      </div>
      <p style={{ color: "var(--granite)", marginTop: -10, marginBottom: 24 }}>
        Negócios fechados, organizados pela data do evento.
      </p>

      {err && <div className="alert err">{err}</div>}
      {loading ? (
        <p style={{ color: "var(--granite)" }}>Carregando…</p>
      ) : eventos.length === 0 ? (
        <p style={{ color: "var(--granite)" }}>Nenhum evento fechado ainda.</p>
      ) : (
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
                  <div style={{ color: "var(--gold)", fontWeight: 600 }}>
                    {evento?.data_evento ? new Date(evento.data_evento).toLocaleDateString("pt-BR") : "sem data definida"}
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
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// Menu proprio dos contratos: mesma info que aparece na aba do cliente, mas
// centralizada -- financeiro/admin abrem aqui pra ver o que esta em rascunho,
// o que ja foi assinado, e navegar direto pro cliente pra mexer nos pagamentos.
const FILTROS = [
  { chave: "todos", label: "Todos" },
  { chave: "rascunho", label: "Rascunho" },
  { chave: "assinado", label: "Assinados" },
  { chave: "cancelado", label: "Cancelados" },
];

const STATUS_LABEL = { rascunho: "Rascunho", assinado: "Assinado", cancelado: "Cancelado" };

export default function ContratosPage() {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    fetch("/api/contratos")
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => (ok ? setContratos(d.contratos || []) : setErr(d.error || "erro ao carregar")))
      .finally(() => setLoading(false));
  }, []);

  const filtrados = useMemo(
    () => (filtro === "todos" ? contratos : contratos.filter((c) => c.status === filtro)),
    [contratos, filtro]
  );

  const stats = useMemo(() => ({
    total: contratos.length,
    rascunho: contratos.filter((c) => c.status === "rascunho").length,
    assinado: contratos.filter((c) => c.status === "assinado").length,
    valorAssinado: contratos.filter((c) => c.status === "assinado").reduce((s, c) => s + Number(c.valor_contratado || 0), 0),
  }), [contratos]);

  return (
    <div>
      <h1>Contratos</h1>
      <p style={{ color: "var(--granite)", marginTop: -10, marginBottom: 20 }}>
        Contratos criados a partir de propostas aceitas. Clique num pra abrir o cliente e ajustar valor/pagamentos.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div className="stat"><div className="k">Total</div><div className="v" style={{ margin: "6px 0 0" }}>{stats.total}</div></div>
        <div className="stat"><div className="k">Em rascunho</div><div className="v" style={{ margin: "6px 0 0" }}>{stats.rascunho}</div></div>
        <div className="stat"><div className="k">Assinados</div><div className="v" style={{ margin: "6px 0 0" }}>{stats.assinado}</div></div>
        <div className="stat"><div className="k">Receita assinada</div><div className="v" style={{ margin: "6px 0 0" }}>R$ {stats.valorAssinado.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</div></div>
      </div>

      <div className="segmented" style={{ marginBottom: 16 }}>
        {FILTROS.map((f) => (
          <button key={f.chave} className={filtro === f.chave ? "active" : ""} onClick={() => setFiltro(f.chave)}>{f.label}</button>
        ))}
      </div>

      {err && <div className="alert err">{err}</div>}
      {loading ? (
        <p style={{ color: "var(--granite)" }}>Carregando…</p>
      ) : filtrados.length === 0 ? (
        <div className="card"><p style={{ color: "var(--granite)", margin: 0 }}>Nenhum contrato {filtro !== "todos" ? `com status "${filtro}"` : ""}.</p></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {filtrados.map((c) => {
            const cliente = c.eventos?.clientes;
            const nome = cliente ? `${cliente.nome}${cliente.nome_conjuge ? ` & ${cliente.nome_conjuge}` : ""}` : "—";
            return (
              <Link
                key={c.id}
                href={cliente ? `/painel/clientes/${cliente.id}` : "/painel/contratos"}
                style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 16, alignItems: "center", padding: "14px 20px", borderBottom: "1px solid var(--stroke)", textDecoration: "none", color: "var(--ink)" }}
              >
                <div>
                  <b>{nome}</b>
                  <div style={{ fontSize: 12, color: "var(--granite)", marginTop: 2 }}>
                    {c.eventos?.tipo || "—"} · {c.eventos?.num_convidados || "?"} conv.
                    {c.eventos?.data_evento ? ` · ${new Date(`${c.eventos.data_evento}T00:00:00`).toLocaleDateString("pt-BR")}` : ""}
                  </div>
                </div>
                <span style={{ fontFamily: "var(--display)", fontWeight: 500, color: "var(--gold-dark)" }}>
                  R$ {Number(c.valor_contratado || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </span>
                <span className="badge" style={{
                  background: c.status === "assinado" ? "var(--sage-wash)" : c.status === "cancelado" ? "rgba(178,59,50,.1)" : "var(--creme-2)",
                  color: c.status === "assinado" ? "var(--sage-dark)" : c.status === "cancelado" ? "var(--bad)" : "var(--stone)",
                }}>{STATUS_LABEL[c.status] || c.status}</span>
                <span style={{ fontSize: 11, color: "var(--granite)", fontFamily: "var(--mono)" }}>{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

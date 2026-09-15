"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MOTIVO_PERDA, MOTIVO_FECHAMENTO, ORIGEM_LABEL } from "@/lib/motivos";
import MicButton from "@/app/components/MicButton";

const STATUS = [
  { id: "novo_contato", label: "Novo contato" },
  { id: "visita_agendada", label: "Visita agendada" },
  { id: "proposta_enviada", label: "Proposta enviada" },
  { id: "negociacao", label: "Negociação" },
  { id: "aguardando_decisao", label: "Aguardando decisão" },
  { id: "contrato", label: "Contrato" },
  { id: "negocio_fechado", label: "Negócio fechado" },
  { id: "perdido", label: "Perdido" },
];

// KanbanBoard generico (app/components) nao tem slot pra drag-and-drop com log
// de motivo -- entao aqui e um board simples proprio, com HTML5 drag nativo
// (sem biblioteca) e um modal pra registrar por que o lead mudou de etapa.
export default function PainelPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [arrastando, setArrastando] = useState(null); // id do cliente sendo arrastado
  const [movimento, setMovimento] = useState(null); // { cliente, deStatus, paraStatus }

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/propostas?leve=1");
    const data = await res.json();
    if (!res.ok) setErr(data.error || "erro ao carregar");
    else setClientes(data.clientes || []);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  // Abre o modal, mas NAO muda nada ainda -- status so e' commitado depois que
  // o vendedor preencher a resposta e confirmar (ver confirmarMovimento). Isso
  // evita o card mudar de etapa sozinho enquanto o modal ainda ta' aberto.
  function moverStatus(cliente, paraStatus) {
    if (cliente.status === paraStatus) return;
    setMovimento({ cliente, deStatus: cliente.status, paraStatus });
  }

  async function confirmarMovimento(nota) {
    const { cliente, paraStatus } = movimento;
    await fetch(`/api/clientes/${cliente.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: paraStatus }),
    });
    await fetch(`/api/clientes/${cliente.id}/interacoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nota }),
    });
    // negocio fechado sai do funil de vendas -- passa a viver na agenda de
    // eventos (/painel/eventos), nao faz mais sentido continuar no board.
    setClientes((cs) =>
      paraStatus === "negocio_fechado"
        ? cs.filter((c) => c.id !== cliente.id)
        : cs.map((c) => (c.id === cliente.id ? { ...c, status: paraStatus } : c))
    );
    setMovimento(null);
  }

  function cancelarMovimento() {
    setMovimento(null);
  }

  return (
    <div>
      <DashboardResumo />
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 32, marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Board CRM</h1>
        <span style={{ fontSize: 12, color: "var(--granite)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".06em" }}>Arraste os cards entre etapas</span>
      </div>
      {err && <div className="alert err">{err}</div>}
      {loading ? (
        <p style={{ color: "var(--granite)" }}>Carregando…</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {STATUS.map((col) => {
            const itensCol = clientes.filter((c) => c.status === col.id);
            return (
              // <details> nativo -- vira accordion no mobile (onde o grid ja
              // colapsa pra 1 coluna e empilhar 8 etapas abertas obriga rolar
              // demais) sem precisar de JS/estado proprio. No desktop, com as
              // colunas lado a lado, fica sempre aberto e identico a antes.
              <details
                key={col.id}
                className="card kanban-col"
                style={{ padding: 0 }}
                open={itensCol.length > 0}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const cliente = clientes.find((c) => c.id === arrastando);
                  if (cliente) moverStatus(cliente, col.id);
                  setArrastando(null);
                }}
              >
                <summary className="kanban-col-summary" style={{ padding: "10px 14px", borderBottom: "1px solid var(--stroke)", display: "flex", justifyContent: "space-between", cursor: "pointer" }}>
                  <span style={{ fontSize: 13 }}>{col.label}</span>
                  <span className="badge">{itensCol.length}</span>
                </summary>
                <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8, minHeight: 60 }}>
                  {itensCol.length === 0 ? (
                    <span style={{ fontSize: 12, color: "var(--granite)", textAlign: "center", padding: 10 }}>Vazio</span>
                  ) : (
                    itensCol.map((c) => (
                      <ClienteCard
                        key={c.id}
                        cliente={c}
                        arrastando={arrastando === c.id}
                        onDragStart={() => setArrastando(c.id)}
                        onDragEnd={() => setArrastando(null)}
                        onMover={(paraStatus) => moverStatus(c, paraStatus)}
                      />
                    ))
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}

      {movimento && <ModalLogMovimento movimento={movimento} onConfirmar={confirmarMovimento} onCancelar={cancelarMovimento} />}
    </div>
  );
}

function ClienteCard({ cliente, arrastando, onDragStart, onDragEnd, onMover }) {
  const evento = cliente.eventos?.[0];
  const proposta = evento?.propostas?.[evento?.propostas?.length - 1];
  const iniciais = cliente.atendente_email ? cliente.atendente_email.slice(0, 2).toUpperCase() : null;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="flat-card"
      style={{ padding: 10, cursor: "grab", opacity: arrastando ? 0.4 : 1 }}
    >
      {cliente.origem && <span className="badge" style={{ marginBottom: 6, display: "inline-block" }}>{ORIGEM_LABEL[cliente.origem] || cliente.origem}</span>}
      <div>
        <Link href={`/painel/clientes/${cliente.id}`} style={{ fontSize: 13, fontWeight: 600, textDecoration: "underline" }}>
          {cliente.nome}{cliente.nome_conjuge ? ` & ${cliente.nome_conjuge}` : ""}
        </Link>
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--granite)", marginTop: 4 }}>
        {cliente.cidade || "—"} · {cliente.telefone || "sem telefone"}
      </div>
      {evento && (
        <div style={{ fontSize: 12, color: "var(--stone)", marginTop: 6 }}>
          {evento.tipo} · {evento.num_convidados} convidados
          {evento.data_evento ? ` · ${new Date(evento.data_evento).toLocaleDateString("pt-BR")}` : ""}
        </div>
      )}
      {proposta && (
        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {iniciais && (
              <span title={cliente.atendente_email} style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--sage-wash)", color: "var(--sage-dark)", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {iniciais}
              </span>
            )}
            <span style={{ color: "var(--gold-dark)", fontWeight: 600, fontSize: 13 }}>
              R$ {Number(proposta.total).toLocaleString("pt-BR")}
            </span>
          </div>
          <a href={`/proposta/${proposta.slug}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--stone)", textDecoration: "underline" }}>
            ver proposta
          </a>
        </div>
      )}
      {/* Fallback pra mobile: HTML5 drag nao funciona em touchscreen. Um select
          com as outras etapas resolve sem lib de drag pra touch. */}
      <select
        value=""
        onChange={(e) => { if (e.target.value) onMover(e.target.value); e.target.value = ""; }}
        onClick={(e) => e.stopPropagation()}
        style={{ marginTop: 8, width: "100%", fontSize: 11, padding: "4px 8px", color: "var(--stone)" }}
      >
        <option value="">Mover pra…</option>
        {STATUS.filter((s) => s.id !== cliente.status).map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}

// Sem "Pular": todo movimento de etapa exige preencher motivo (perdido/fechado)
// ou uma nota (demais etapas) antes de confirmar -- so' entao o status muda de
// verdade (ver confirmarMovimento acima). "Cancelar" desiste do movimento inteiro.
function ModalLogMovimento({ movimento, onConfirmar, onCancelar }) {
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

// Faixa dashboard estilo Lendora (Behance) adaptada pra paleta sage/gold:
// KPIs grandes em serifa com setas ↑↓ comparando mes atual vs mes anterior,
// ao lado de dois cards menores com contadores de "o que precisa de acao".
// Roda sem impacto na performance do board porque tem endpoint separado
// (/api/dashboard) que agrega no server e retorna so' numeros.
function DashboardResumo() {
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

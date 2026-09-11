"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MOTIVO_PERDA, MOTIVO_FECHAMENTO } from "@/lib/motivos";

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
  const router = useRouter();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [meuPapel, setMeuPapel] = useState(null);
  const [arrastando, setArrastando] = useState(null); // id do cliente sendo arrastado
  const [movimento, setMovimento] = useState(null); // { cliente, deStatus, paraStatus }

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/propostas");
    const data = await res.json();
    if (!res.ok) setErr(data.error || "erro ao carregar");
    else setClientes(data.clientes || []);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
    fetch("/api/perfis").then((r) => r.json()).then((d) => setMeuPapel(d.eu?.role));
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

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="wrap">
      <div className="top">
        <h1>Personare — CRM &amp; Propostas</h1>
        <div style={{ display: "flex", gap: 10 }}>
          {(meuPapel === "admin" || meuPapel === "financeiro") && (
            <Link href="/painel/analytics" className="btn">Analytics</Link>
          )}
          <Link href="/painel/eventos" className="btn">Agenda de eventos</Link>
          {meuPapel === "admin" && <Link href="/painel/catalogo" className="btn">Catálogo</Link>}
          {meuPapel === "admin" && <Link href="/painel/usuarios" className="btn">Usuários</Link>}
          <Link href="/painel/nova-proposta" className="btn primary">+ Nova proposta</Link>
          <button className="btn" onClick={sair}>Sair</button>
        </div>
      </div>

      {err && <div className="alert err">{err}</div>}
      {loading ? (
        <p style={{ color: "var(--granite)" }}>Carregando…</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {STATUS.map((col) => {
            const itensCol = clientes.filter((c) => c.status === col.id);
            return (
              <div
                key={col.id}
                className="card"
                style={{ padding: 0 }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const cliente = clientes.find((c) => c.id === arrastando);
                  if (cliente) moverStatus(cliente, col.id);
                  setArrastando(null);
                }}
              >
                <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--stroke)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13 }}>{col.label}</span>
                  <span className="badge">{itensCol.length}</span>
                </div>
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
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {movimento && <ModalLogMovimento movimento={movimento} onConfirmar={confirmarMovimento} onCancelar={cancelarMovimento} />}
    </div>
  );
}

function ClienteCard({ cliente, arrastando, onDragStart, onDragEnd }) {
  const evento = cliente.eventos?.[0];
  const proposta = evento?.propostas?.[evento?.propostas?.length - 1];
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{ border: "1px solid var(--stroke)", borderRadius: 8, background: "var(--pitch-2)", padding: 10, cursor: "grab", opacity: arrastando ? 0.4 : 1 }}
    >
      <Link href={`/painel/clientes/${cliente.id}`} style={{ fontSize: 13, fontWeight: 600, textDecoration: "underline" }}>
        {cliente.nome}{cliente.nome_conjuge ? ` & ${cliente.nome_conjuge}` : ""}
      </Link>
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
        <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--gold-dark)", fontWeight: 600, fontSize: 13 }}>
            R$ {Number(proposta.total).toLocaleString("pt-BR")}
          </span>
          <a href={`/proposta/${proposta.slug}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--stone)", textDecoration: "underline" }}>
            ver proposta
          </a>
        </div>
      )}
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
          <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ex: cliente pediu mais prazo pra decidir" autoFocus={!motivos} />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onCancelar}>Cancelar</button>
          <button className="btn primary" onClick={confirmar} disabled={!podeSalvar}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

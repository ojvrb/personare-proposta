"use client";

import { useEffect, useState } from "react";
import { STATUS } from "./kanbanStatus";
import ClienteCard from "./ClienteCard";
import ModalLogMovimento from "./ModalLogMovimento";
import DashboardResumo from "./DashboardResumo";

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
          {STATUS.map((col) => (
            <ColunaKanban
              key={col.id}
              col={col}
              itens={clientes.filter((c) => c.status === col.id)}
              arrastando={arrastando}
              onDrop={(clienteId) => {
                const cliente = clientes.find((c) => c.id === clienteId);
                if (cliente) moverStatus(cliente, col.id);
                setArrastando(null);
              }}
              onDragStartCard={setArrastando}
              onDragEndCard={() => setArrastando(null)}
              onMoverCard={moverStatus}
            />
          ))}
        </div>
      )}

      {movimento && <ModalLogMovimento movimento={movimento} onConfirmar={confirmarMovimento} onCancelar={cancelarMovimento} />}
    </div>
  );
}

// <details> nativo -- vira accordion no mobile (onde o grid ja colapsa pra 1
// coluna e empilhar 8 etapas abertas obriga rolar demais) sem precisar de
// JS/estado proprio. No desktop, com as colunas lado a lado, fica sempre aberto.
function ColunaKanban({ col, itens, arrastando, onDrop, onDragStartCard, onDragEndCard, onMoverCard }) {
  return (
    <details
      className="card kanban-col"
      style={{ padding: 0 }}
      open={itens.length > 0}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(arrastando);
      }}
    >
      <summary className="kanban-col-summary" style={{ padding: "10px 14px", borderBottom: "1px solid var(--stroke)", display: "flex", justifyContent: "space-between", cursor: "pointer" }}>
        <span style={{ fontSize: 13 }}>{col.label}</span>
        <span className="badge">{itens.length}</span>
      </summary>
      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8, minHeight: 60 }}>
        {itens.length === 0 ? (
          <span style={{ fontSize: 12, color: "var(--granite)", textAlign: "center", padding: 10 }}>Vazio</span>
        ) : (
          itens.map((c) => (
            <ClienteCard
              key={c.id}
              cliente={c}
              arrastando={arrastando === c.id}
              onDragStart={() => onDragStartCard(c.id)}
              onDragEnd={onDragEndCard}
              onMover={(paraStatus) => onMoverCard(c, paraStatus)}
            />
          ))
        )}
      </div>
    </details>
  );
}

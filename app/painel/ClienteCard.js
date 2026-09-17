import Link from "next/link";
import { ORIGEM_LABEL } from "@/lib/motivos";
import { STATUS } from "./kanbanStatus";

export default function ClienteCard({ cliente, arrastando, onDragStart, onDragEnd, onMover }) {
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

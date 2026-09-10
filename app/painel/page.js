"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const STATUS = [
  { id: "novo_contato", label: "Novo contato" },
  { id: "visita_agendada", label: "Visita agendada" },
  { id: "proposta_enviada", label: "Proposta enviada" },
  { id: "negociacao", label: "Negociação" },
  { id: "aguardando_decisao", label: "Aguardando decisão" },
  { id: "contrato", label: "Contrato" },
  { id: "evento_confirmado", label: "Evento confirmado" },
  { id: "perdido", label: "Perdido" },
];

// KanbanBoard generico (app/components) nao tem slot pra um select de status por card,
// entao aqui e um board simples proprio — mais barato que estender o componente pra um uso so.
export default function PainelPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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
  }, []);

  async function mudarStatus(id, status) {
    setClientes((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)));
    await fetch(`/api/clientes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
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
          <Link href="/painel/catalogo" className="btn">Catálogo</Link>
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
            const itens = clientes.filter((c) => c.status === col.id);
            return (
              <div key={col.id} className="card" style={{ padding: 0 }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--stroke)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13 }}>{col.label}</span>
                  <span className="badge">{itens.length}</span>
                </div>
                <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8, minHeight: 60 }}>
                  {itens.length === 0 ? (
                    <span style={{ fontSize: 12, color: "var(--granite)", textAlign: "center", padding: 10 }}>Vazio</span>
                  ) : (
                    itens.map((c) => <ClienteCard key={c.id} cliente={c} onStatus={mudarStatus} />)
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

function ClienteCard({ cliente, onStatus }) {
  const evento = cliente.eventos?.[0];
  const proposta = evento?.propostas?.[evento?.propostas?.length - 1];
  return (
    <div style={{ border: "1px solid var(--stroke)", borderRadius: 8, background: "var(--pitch-2)", padding: 10 }}>
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
          <span style={{ color: "var(--gold)", fontWeight: 600, fontSize: 13 }}>
            R$ {Number(proposta.total).toLocaleString("pt-BR")}
          </span>
          <a href={`/proposta/${proposta.slug}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--stone)", textDecoration: "underline" }}>
            ver proposta
          </a>
        </div>
      )}
      <select
        value={cliente.status}
        onChange={(e) => onStatus(cliente.id, e.target.value)}
        style={{ width: "100%", marginTop: 8, background: "var(--lift)", color: "var(--bone)", border: "1px solid var(--stroke)", borderRadius: 4, fontSize: 11, padding: "4px 6px" }}
      >
        {STATUS.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}

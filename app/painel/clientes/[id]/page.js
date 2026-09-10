"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

export default function ClienteDetalhePage({ params }) {
  const { id } = use(params);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [nota, setNota] = useState("");
  const [enviandoNota, setEnviandoNota] = useState(false);

  async function carregar() {
    const res = await fetch(`/api/clientes/${id}`);
    const data = await res.json();
    if (!res.ok) return setErro(data.error || "erro ao carregar");
    setDados(data);
  }

  useEffect(() => {
    carregar();
  }, [id]);

  async function enviarNota(e) {
    e.preventDefault();
    if (!nota.trim()) return;
    setEnviandoNota(true);
    await fetch(`/api/clientes/${id}/interacoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nota }),
    });
    setNota("");
    setEnviandoNota(false);
    carregar();
  }

  async function criarContrato(eventoId) {
    await fetch("/api/contratos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evento_id: eventoId }),
    });
    carregar();
  }

  async function atualizarContrato(contratoId, campos) {
    await fetch(`/api/contratos/${contratoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    carregar();
  }

  async function adicionarParcela(contratoId, form) {
    const fd = new FormData(form);
    await fetch(`/api/contratos/${contratoId}/pagamentos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descricao: fd.get("descricao") || "Parcela",
        valor: Number(fd.get("valor")),
        vencimento: fd.get("vencimento") || null,
      }),
    });
    form.reset();
    carregar();
  }

  async function marcarPago(pagamentoId) {
    await fetch(`/api/pagamentos/${pagamentoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pago", pago_em: new Date().toISOString() }),
    });
    carregar();
  }

  if (erro) return <div className="wrap"><div className="alert err">{erro}</div></div>;
  if (!dados) return <div className="wrap">Carregando…</div>;

  const { cliente, interacoes } = dados;

  return (
    <div className="wrap">
      <div className="top">
        <h1>{cliente.nome}{cliente.nome_conjuge ? ` & ${cliente.nome_conjuge}` : ""}</h1>
        <Link href="/painel" className="btn">← Voltar</Link>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, fontSize: 13 }}>
          <div><span style={{ color: "var(--granite)" }}>Cidade</span><br />{cliente.cidade || "—"}</div>
          <div><span style={{ color: "var(--granite)" }}>Telefone</span><br />{cliente.telefone || "—"}</div>
          <div><span style={{ color: "var(--granite)" }}>Status</span><br />{cliente.status}</div>
        </div>
      </div>

      {(cliente.eventos || []).map((evento) => (
        <div key={evento.id} className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>{evento.tipo} · {evento.num_convidados} convidados{evento.data_evento ? ` · ${new Date(evento.data_evento).toLocaleDateString("pt-BR")}` : ""}</h3>

          <h4>Propostas</h4>
          {(evento.propostas || []).length === 0 && <p style={{ color: "var(--granite)", fontSize: 13 }}>Nenhuma proposta ainda.</p>}
          {(evento.propostas || []).map((p) => (
            <div key={p.id} className="resumo-linha">
              <a href={`/proposta/${p.slug}`} target="_blank" rel="noopener noreferrer">v{p.versao} — {p.status}</a>
              <span>R$ {Number(p.total).toLocaleString("pt-BR")}</span>
            </div>
          ))}

          <h4>Contrato</h4>
          {(evento.contratos || []).length === 0 ? (
            <button className="btn primary" onClick={() => criarContrato(evento.id)}>Criar contrato</button>
          ) : (
            evento.contratos.map((c) => (
              <Contrato key={c.id} contrato={c} onAtualizar={atualizarContrato} onParcela={adicionarParcela} onPago={marcarPago} />
            ))
          )}
        </div>
      ))}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Histórico de interação</h3>
        <form onSubmit={enviarNota} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input placeholder="Anotar contato, ligação, decisão..." value={nota} onChange={(e) => setNota(e.target.value)} style={{ flex: 1 }} />
          <button className="btn primary" disabled={enviandoNota}>Adicionar</button>
        </form>
        {interacoes.length === 0 ? (
          <p style={{ color: "var(--granite)", fontSize: 13 }}>Nenhuma nota ainda.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {interacoes.map((i) => (
              <div key={i.id} style={{ borderLeft: "2px solid var(--gold)", paddingLeft: 10 }}>
                <div style={{ fontSize: 13 }}>{i.nota}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--granite)" }}>
                  {new Date(i.created_at).toLocaleString("pt-BR")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Contrato({ contrato, onAtualizar, onParcela, onPago }) {
  const pagamentos = contrato.pagamentos || [];
  const totalPago = pagamentos.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.valor), 0);

  return (
    <div style={{ border: "1px solid var(--stroke)", borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          Status:{" "}
          <select value={contrato.status} onChange={(e) => onAtualizar(contrato.id, { status: e.target.value })}>
            <option value="rascunho">Rascunho</option>
            <option value="assinado">Assinado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div style={{ fontSize: 13 }}>
          Valor: R$
          <input
            type="number"
            defaultValue={contrato.valor_contratado}
            onBlur={(e) => onAtualizar(contrato.id, { valor_contratado: Number(e.target.value) })}
            style={{ width: 100, marginLeft: 6 }}
          />
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--granite)", marginBottom: 6 }}>
        Pago: R$ {totalPago.toLocaleString("pt-BR")} de R$ {Number(contrato.valor_contratado).toLocaleString("pt-BR")}
      </div>

      {pagamentos.map((p) => (
        <div key={p.id} className="resumo-linha">
          <span>{p.descricao} {p.vencimento ? `(venc. ${new Date(p.vencimento).toLocaleDateString("pt-BR")})` : ""}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            R$ {Number(p.valor).toLocaleString("pt-BR")}
            {p.status === "pago" ? <span className="badge">pago</span> : (
              <button className="btn" onClick={() => onPago(p.id)}>Marcar pago</button>
            )}
          </span>
        </div>
      ))}

      <form
        onSubmit={(e) => { e.preventDefault(); onParcela(contrato.id, e.target); }}
        style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}
      >
        <input name="descricao" placeholder="Descrição (ex: Sinal)" style={{ flex: 1, minWidth: 120 }} />
        <input name="valor" type="number" placeholder="Valor" required style={{ width: 100 }} />
        <input name="vencimento" type="date" />
        <button className="btn">+ Parcela</button>
      </form>
    </div>
  );
}

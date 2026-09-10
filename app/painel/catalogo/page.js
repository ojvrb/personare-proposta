"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CatalogoPage() {
  return (
    <div className="wrap">
      <div className="top">
        <h1>Catálogo</h1>
        <Link href="/painel" className="btn">← Voltar</Link>
      </div>
      <p style={{ color: "var(--granite)", marginTop: -10, marginBottom: 24 }}>
        Pacotes, buffets e extras usados no configurador de proposta. Desativar em vez de excluir preserva propostas antigas que já usam esses itens.
      </p>

      <Secao
        titulo="Pacotes"
        endpoint="/api/pacotes"
        campoInicial={{ nome: "", preco: 0, itens_inclusos: "", itens_nao_inclusos: "", ativo: true }}
        renderCampos={PacoteCampos}
        resumo={(p) => `R$ ${Number(p.preco).toLocaleString("pt-BR")}`}
      />

      <Secao
        titulo="Buffets"
        endpoint="/api/buffets"
        campoInicial={{ nome: "", preco_pessoa: 0, descricao: "", ativo: true }}
        renderCampos={BuffetCampos}
        resumo={(b) => `R$ ${Number(b.preco_pessoa).toLocaleString("pt-BR")}/pessoa`}
      />

      <Secao
        titulo="Extras"
        endpoint="/api/extras"
        campoInicial={{ nome: "", tipo_preco: "fixo", valor: 0, ativo: true }}
        renderCampos={ExtraCampos}
        resumo={(e) => `R$ ${Number(e.valor).toLocaleString("pt-BR")} (${e.tipo_preco})`}
      />
    </div>
  );
}

// Editor genérico de lista: os 3 catálogos (pacote/buffet/extra) têm o mesmo
// fluxo (listar, editar inline, ativar/desativar, criar) — só os campos mudam.
function Secao({ titulo, endpoint, campoInicial, renderCampos, resumo }) {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null); // id em edição
  const [rascunho, setRascunho] = useState({});
  const [novo, setNovo] = useState(campoInicial);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");

  async function carregar() {
    setLoading(true);
    const res = await fetch(endpoint);
    const data = await res.json();
    if (res.ok) setItens(data.items);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  function iniciarEdicao(item) {
    setEditando(item.id);
    setRascunho({ ...item, itens_inclusos: arrayParaTexto(item.itens_inclusos), itens_nao_inclusos: arrayParaTexto(item.itens_nao_inclusos) });
  }

  async function salvar(id) {
    setErro("");
    const payload = normalizarPayload(rascunho);
    const res = await fetch(`${endpoint}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return setErro(data.error || "erro ao salvar");
    setItens((all) => all.map((i) => (i.id === id ? data.item : i)));
    setEditando(null);
  }

  async function alternarAtivo(item) {
    const res = await fetch(`${endpoint}/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !item.ativo }),
    });
    const data = await res.json();
    if (res.ok) setItens((all) => all.map((i) => (i.id === item.id ? data.item : i)));
  }

  async function criar(e) {
    e.preventDefault();
    setErro("");
    setCriando(true);
    const payload = normalizarPayload(novo);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setCriando(false);
    if (!res.ok) return setErro(data.error || "erro ao criar");
    setItens((all) => [...all, data.item]);
    setNovo(campoInicial);
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ marginTop: 0 }}>{titulo}</h3>
      {erro && <div className="alert err">{erro}</div>}
      {loading ? (
        <p style={{ color: "var(--granite)" }}>Carregando…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {itens.map((item) =>
            editando === item.id ? (
              <div key={item.id} style={{ border: "1px solid var(--gold)", borderRadius: 8, padding: 12 }}>
                {renderCampos(rascunho, setRascunho)}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="btn primary" onClick={() => salvar(item.id)}>Salvar</button>
                  <button className="btn" onClick={() => setEditando(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--stroke)", borderRadius: 8, padding: 10, opacity: item.ativo ? 1 : 0.5 }}>
                <div>
                  <b>{item.nome}</b> — {resumo(item)} {!item.ativo && <span className="badge">inativo</span>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={() => iniciarEdicao(item)}>Editar</button>
                  <button className="btn" onClick={() => alternarAtivo(item)}>{item.ativo ? "Desativar" : "Ativar"}</button>
                </div>
              </div>
            )
          )}

          <form onSubmit={criar} style={{ border: "1px dashed var(--stroke)", borderRadius: 8, padding: 12, marginTop: 6 }}>
            <div style={{ fontSize: 12, color: "var(--granite)", marginBottom: 8 }}>+ Novo</div>
            {renderCampos(novo, setNovo)}
            <button type="submit" className="btn primary" disabled={criando} style={{ marginTop: 8 }}>
              {criando ? "Criando…" : "Adicionar"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function normalizarPayload(campos) {
  const out = { ...campos };
  if ("itens_inclusos" in out) out.itens_inclusos = textoParaArray(out.itens_inclusos);
  if ("itens_nao_inclusos" in out) out.itens_nao_inclusos = textoParaArray(out.itens_nao_inclusos);
  delete out.id;
  delete out.created_at;
  return out;
}

function textoParaArray(txt) {
  if (Array.isArray(txt)) return txt;
  return (txt || "").split(",").map((s) => s.trim()).filter(Boolean);
}

function arrayParaTexto(arr) {
  return Array.isArray(arr) ? arr.join(", ") : arr || "";
}

function PacoteCampos(campos, set) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <input placeholder="Nome" value={campos.nome} onChange={(e) => set({ ...campos, nome: e.target.value })} />
      <input type="number" placeholder="Preço" value={campos.preco} onChange={(e) => set({ ...campos, preco: e.target.value })} />
      <input placeholder="Itens inclusos (separados por vírgula)" value={campos.itens_inclusos} onChange={(e) => set({ ...campos, itens_inclusos: e.target.value })} />
      <input placeholder="Itens não inclusos (separados por vírgula)" value={campos.itens_nao_inclusos} onChange={(e) => set({ ...campos, itens_nao_inclusos: e.target.value })} />
    </div>
  );
}

function BuffetCampos(campos, set) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <input placeholder="Nome" value={campos.nome} onChange={(e) => set({ ...campos, nome: e.target.value })} />
      <input type="number" placeholder="Preço por pessoa" value={campos.preco_pessoa} onChange={(e) => set({ ...campos, preco_pessoa: e.target.value })} />
      <input placeholder="Descrição" value={campos.descricao || ""} onChange={(e) => set({ ...campos, descricao: e.target.value })} />
    </div>
  );
}

function ExtraCampos(campos, set) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <input placeholder="Nome" value={campos.nome} onChange={(e) => set({ ...campos, nome: e.target.value })} />
      <select value={campos.tipo_preco} onChange={(e) => set({ ...campos, tipo_preco: e.target.value })}>
        <option value="fixo">Fixo</option>
        <option value="pessoa">Por pessoa</option>
        <option value="unidade">Por unidade</option>
      </select>
      <input type="number" placeholder="Valor" value={campos.valor} onChange={(e) => set({ ...campos, valor: e.target.value })} />
    </div>
  );
}

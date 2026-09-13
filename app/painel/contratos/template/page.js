"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Editor do template global do contrato -- intro + lista de clausulas.
// Placeholders documentados no topo pra o admin saber o que pode usar.
const PLACEHOLDERS = [
  { chave: "nome_cliente", desc: "nome completo do cliente" },
  { chave: "cpf_cliente", desc: "CPF mascarado (do aceite eletrônico)" },
  { chave: "valor", desc: "valor total do contrato (R$)" },
  { chave: "tipo_evento", desc: "tipo do evento (casamento, 15 anos…)" },
  { chave: "data_evento", desc: "data do evento" },
  { chave: "num_convidados", desc: "número de convidados" },
  { chave: "cidade", desc: "cidade do cliente" },
  { chave: "aceita_em", desc: "data/hora do aceite eletrônico" },
  { chave: "hoje", desc: "data de hoje" },
];

export default function TemplateContratoPage() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetch("/api/contrato-template").then((r) => r.json()).then((d) => setDados(d.item || { intro: "", clausulas: [] }));
  }, []);

  async function salvar(patch) {
    setSalvando(true);
    const res = await fetch("/api/contrato-template", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSalvando(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); return setErro(d.error || "erro ao salvar"); }
    const d = await res.json();
    setDados(d.item);
  }

  if (!dados) return <p style={{ color: "var(--granite)" }}>Carregando…</p>;

  const clausulas = dados.clausulas || [];

  function adicionar() {
    salvar({ clausulas: [...clausulas, { titulo: "Nova cláusula", texto: "" }] });
  }
  function editar(i, campo, valor) {
    setDados({ ...dados, clausulas: clausulas.map((c, idx) => idx === i ? { ...c, [campo]: valor } : c) });
  }
  function persistir() {
    salvar({ clausulas });
  }
  function remover(i) {
    salvar({ clausulas: clausulas.filter((_, idx) => idx !== i) });
  }
  function mover(i, delta) {
    const alvo = i + delta;
    if (alvo < 0 || alvo >= clausulas.length) return;
    const copia = [...clausulas];
    [copia[i], copia[alvo]] = [copia[alvo], copia[i]];
    salvar({ clausulas: copia });
  }

  return (
    <div>
      <Link href="/painel/contratos" style={{ fontSize: 12, color: "var(--granite)", textDecoration: "none" }}>← Contratos</Link>
      <h1 style={{ marginTop: 8, marginBottom: 8 }}>Template do contrato</h1>
      <p style={{ color: "var(--granite)", marginTop: 0, marginBottom: 16, lineHeight: 1.6 }}>
        Edite a introdução e as cláusulas padrão. Cada contrato usa esse template como base e pode adicionar cláusulas específicas na tela do próprio contrato.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Placeholders disponíveis</h3>
        <p style={{ color: "var(--granite)", fontSize: 13, marginTop: -4, marginBottom: 10 }}>
          Escreva no texto usando <code style={{ background: "var(--sage-wash)", padding: "1px 6px", borderRadius: 4 }}>{"{{nome_cliente}}"}</code> — o sistema substitui pelos dados reais do contrato ao gerar.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {PLACEHOLDERS.map((p) => (
            <span key={p.chave} title={p.desc} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 100, background: "var(--sage-wash)", color: "var(--sage-dark)", fontFamily: "var(--mono)" }}>
              {`{{${p.chave}}}`}
            </span>
          ))}
        </div>
      </div>

      {erro && <div className="alert err">{erro}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Introdução</h3>
        <p style={{ fontSize: 12, color: "var(--granite)", marginTop: -6, marginBottom: 10 }}>
          Parágrafo que abre o contrato (partes, objeto resumido, ancoragem legal).
        </p>
        <textarea
          rows={5} value={dados.intro || ""}
          onChange={(e) => setDados({ ...dados, intro: e.target.value })}
          onBlur={() => salvar({ intro: dados.intro })}
          placeholder="Pelo presente instrumento particular, de um lado a CONTRATANTE {{nome_cliente}}…"
        />
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: "0 0 4px" }}>Cláusulas</h3>
            <p style={{ fontSize: 12, color: "var(--granite)", margin: 0 }}>Ordem controla como aparecem no contrato final. Setas movem.</p>
          </div>
          <span style={{ fontSize: 12, color: salvando ? "var(--sage-dark)" : "var(--granite)" }}>{salvando ? "salvando…" : ""}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {clausulas.length === 0 && <p style={{ color: "var(--granite)", fontSize: 13 }}>Nenhuma cláusula ainda. Clique em "+ Nova cláusula" abaixo.</p>}
          {clausulas.map((c, i) => (
            <div key={i} style={{ border: "1px solid var(--stroke)", borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                <input value={c.titulo} onChange={(e) => editar(i, "titulo", e.target.value)} onBlur={persistir}
                  placeholder="Título da cláusula (ex: Objeto, Preço, Cancelamento)"
                  style={{ flex: 1 }} />
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="btn" style={{ padding: "6px 10px" }} onClick={() => mover(i, -1)} disabled={i === 0}>↑</button>
                  <button className="btn" style={{ padding: "6px 10px" }} onClick={() => mover(i, 1)} disabled={i === clausulas.length - 1}>↓</button>
                  <button className="btn" style={{ padding: "6px 10px" }} onClick={() => remover(i)}>Excluir</button>
                </div>
              </div>
              <textarea rows={4} value={c.texto} onChange={(e) => editar(i, "texto", e.target.value)} onBlur={persistir}
                placeholder="Texto da cláusula" />
            </div>
          ))}
          <button className="btn primary" onClick={adicionar} disabled={salvando} style={{ alignSelf: "flex-start" }}>
            + Nova cláusula
          </button>
        </div>
      </div>
    </div>
  );
}

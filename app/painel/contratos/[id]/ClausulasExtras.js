"use client";

import { useState } from "react";

// Editor de clausulas extras deste contrato: admin adiciona/remove/edita
// clausulas especificas (desconto negociado, prazo diferente, exigencia do
// cliente). Salva no proprio contrato (clausulas_extras jsonb). Fica em card
// abaixo do preview, com "no-print" pra sumir na impressao.
export default function ClausulasExtras({ contratoId, inicial }) {
  const [lista, setLista] = useState(inicial || []);
  const [salvando, setSalvando] = useState(false);
  const [novo, setNovo] = useState({ titulo: "", texto: "" });
  const [erro, setErro] = useState("");

  async function salvarLista(nova) {
    setSalvando(true); setErro("");
    const res = await fetch(`/api/contratos/${contratoId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clausulas_extras: nova }),
    });
    setSalvando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErro(d.error || "erro ao salvar");
      return false;
    }
    setLista(nova);
    return true;
  }

  async function adicionar() {
    if (!novo.titulo.trim() || !novo.texto.trim()) return;
    const nova = [...lista, { titulo: novo.titulo.trim(), texto: novo.texto.trim() }];
    if (await salvarLista(nova)) setNovo({ titulo: "", texto: "" });
  }
  async function editar(i, campo, valor) {
    const nova = lista.map((c, idx) => idx === i ? { ...c, [campo]: valor } : c);
    setLista(nova); // otimista pra input responder rapido
  }
  async function persistir() {
    await salvarLista(lista);
  }
  async function remover(i) {
    await salvarLista(lista.filter((_, idx) => idx !== i));
  }

  return (
    <div className="card no-print" style={{ marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: "0 0 4px" }}>Cláusulas específicas deste contrato</h3>
          <p style={{ color: "var(--granite)", fontSize: 13, margin: 0 }}>
            Ajustes negociados que valem só pra este casal (multa diferente, prazo especial, exigência do cliente). Aparecem no preview acima e no PDF.
          </p>
        </div>
        <button className="btn" onClick={() => window.print()} type="button">🖨 Imprimir / PDF</button>
      </div>
      {erro && <div className="alert err">{erro}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {lista.map((c, i) => (
          <div key={i} style={{ border: "1px solid var(--stroke)", borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              value={c.titulo}
              placeholder="Título da cláusula"
              onChange={(e) => editar(i, "titulo", e.target.value)}
              onBlur={persistir}
            />
            <textarea
              rows={3}
              value={c.texto}
              placeholder="Texto da cláusula (use {{nome_cliente}}, {{valor}}, {{data_evento}} etc. como placeholders)"
              onChange={(e) => editar(i, "texto", e.target.value)}
              onBlur={persistir}
            />
            <button className="btn" style={{ alignSelf: "flex-start", padding: "6px 12px", fontSize: 12 }} onClick={() => remover(i)}>Remover</button>
          </div>
        ))}
        <div style={{ border: "1px dashed var(--stroke)", borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            value={novo.titulo}
            placeholder="Título da nova cláusula (ex: Desconto negociado)"
            onChange={(e) => setNovo({ ...novo, titulo: e.target.value })}
          />
          <textarea
            rows={3}
            value={novo.texto}
            placeholder="Texto da nova cláusula"
            onChange={(e) => setNovo({ ...novo, texto: e.target.value })}
          />
          <button className="btn primary" style={{ alignSelf: "flex-start" }} onClick={adicionar} disabled={salvando}>
            {salvando ? "Salvando…" : "+ Adicionar cláusula"}
          </button>
        </div>
      </div>
    </div>
  );
}

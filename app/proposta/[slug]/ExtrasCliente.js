"use client";

import { useEscolhaBuffet } from "./EscolhaBuffetContext";

// Vitrine de extras que o cliente pode adicionar na propria proposta. So mostra
// extras ativos que NAO foram selecionados pelo vendedor (evita duplicidade).
// O total recalcula na hora via InvestimentoBloco; o registro definitivo acontece
// no aceite (POST /aceitar merge+recalc server-side).
export default function ExtrasCliente({ extrasTodos, extrasSelecionadosVendedor, numConvidados, bloqueado }) {
  const { extrasCliente, adicionarExtra, removerExtra, setQuantidadeExtra } = useEscolhaBuffet();
  if (bloqueado) return null;
  const idsVendedor = new Set((extrasSelecionadosVendedor || []).map((e) => e.extra_id));
  const disponiveis = (extrasTodos || []).filter((e) => e.ativo && !idsVendedor.has(e.id));
  if (disponiveis.length === 0) return null;

  return (
    <div style={{ marginTop: 40, paddingTop: 32, borderTop: "1px solid var(--stroke)" }}>
      <div className="eyebrow" style={{ animation: "none", opacity: 1, marginBottom: 8 }}>Quer acrescentar?</div>
      <h3 style={{ fontFamily: "var(--display)", fontSize: "clamp(24px,3vw,32px)", fontWeight: 500, margin: "0 0 8px", letterSpacing: "-0.01em" }}>Personalize com mais itens</h3>
      <p style={{ fontSize: 14, color: "var(--stone)", margin: "0 0 20px", maxWidth: 560 }}>
        Escolha o que quiser incluir. O investimento total abaixo atualiza automaticamente.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {disponiveis.map((ex) => {
          const sel = extrasCliente.find((s) => s.extra_id === ex.id);
          const ativo = !!sel;
          const valor = Number(ex.valor);
          const preview = ex.tipo_preco === "pessoa"
            ? `R$ ${valor.toLocaleString("pt-BR")}/pessoa`
            : ex.tipo_preco === "unidade"
              ? `R$ ${valor.toLocaleString("pt-BR")}/unidade`
              : `R$ ${valor.toLocaleString("pt-BR")}`;
          return (
            <div key={ex.id} className="flat-card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, borderColor: ativo ? "var(--sage-dark)" : undefined }}>
              {ex.fotos?.[0] && (
                <img src={ex.fotos[0]} alt="" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8 }} />
              )}
              <div>
                <b style={{ fontSize: 14 }}>{ex.nome}</b>
                <div style={{ fontSize: 12, color: "var(--granite)", marginTop: 2 }}>{preview}</div>
              </div>
              {ativo && ex.tipo_preco === "unidade" && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  Quantidade
                  <input
                    type="number" min="1" value={sel.quantidade}
                    onChange={(e) => setQuantidadeExtra(ex.id, e.target.value)}
                    disabled={bloqueado}
                    style={{ width: 70, padding: "4px 8px", border: "1px solid var(--stroke)", borderRadius: 6 }}
                  />
                </label>
              )}
              <button
                type="button"
                className={`btn ${ativo ? "" : "primary"}`}
                onClick={() => ativo ? removerExtra(ex.id) : adicionarExtra(ex.id)}
                disabled={bloqueado}
                style={{ fontSize: 13, padding: "8px 14px" }}
              >
                {ativo ? "Remover" : "Adicionar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

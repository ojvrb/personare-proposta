"use client";

import { useMemo } from "react";
import { calcularProposta } from "@/lib/pricing";
import AceitarProposta from "./AceitarProposta";
import { useEscolhaBuffet } from "./EscolhaBuffetContext";

// Bloco de investimento interativo: recalcula o total quando o cliente troca
// de buffet no capitulo 02. Mostra o breakdown detalhado (pacote / buffet /
// extras / desconto) pra tirar a pergunta "por que R$ 30.550?".
export default function InvestimentoBloco({
  proposta, pacote, buffets, extras, extrasEscolhidos, numConvidados,
  jaAssinado, valorContratado, evento,
}) {
  const { escolhidoId, recomendadoId } = useEscolhaBuffet();
  const buffetAtual = buffets.find((b) => b.id === (escolhidoId || recomendadoId)) || null;
  const trocouBuffet = escolhidoId && escolhidoId !== recomendadoId;

  const { precoPacote, precoBuffet, subtotal, total } = useMemo(() => calcularProposta({
    pacote, buffet: buffetAtual, numConvidados,
    extras, extrasSelecionados: proposta.extras_selecionados || [], desconto: proposta.desconto || 0,
  }), [pacote, buffetAtual, numConvidados, extras, proposta]);

  // Detalha cada extra com nome + calculo pra o cliente entender de onde vem
  // cada real. Reusa o mesmo shape do `calcularProposta` (nao inventa preco aqui).
  const linhasExtras = (proposta.extras_selecionados || []).map((sel) => {
    const ex = extras.find((e) => e.id === sel.extra_id);
    if (!ex) return null;
    const qtd = Number(sel.quantidade || 1);
    let valor, sufixo;
    if (ex.tipo_preco === "pessoa") { valor = Number(ex.valor) * numConvidados; sufixo = `R$ ${Number(ex.valor).toLocaleString("pt-BR")}/pessoa × ${numConvidados}`; }
    else if (ex.tipo_preco === "unidade") { valor = Number(ex.valor) * qtd; sufixo = `${qtd} × R$ ${Number(ex.valor).toLocaleString("pt-BR")}`; }
    else { valor = Number(ex.valor); sufixo = "valor fixo"; }
    return { id: ex.id, nome: ex.nome, valor, sufixo };
  }).filter(Boolean);

  return (
    <div className="investimento-hero" style={{ marginTop: 40 }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div className="breakdown-linha">
          <div>
            <b>{pacote?.nome || "Pacote"}</b>
            {pacote?.itens_inclusos?.length > 0 && (
              <span className="breakdown-sub">inclui {pacote.itens_inclusos.join(" · ")}</span>
            )}
          </div>
          <span className="breakdown-val">R$ {precoPacote.toLocaleString("pt-BR")}</span>
        </div>
        {buffetAtual && (
          <div className="breakdown-linha">
            <div>
              <b>Buffet {buffetAtual.nome}</b>
              <span className="breakdown-sub">R$ {Number(buffetAtual.preco_pessoa).toLocaleString("pt-BR")}/pessoa × {numConvidados} convidados{trocouBuffet ? " · você escolheu" : ""}</span>
            </div>
            <span className="breakdown-val">R$ {precoBuffet.toLocaleString("pt-BR")}</span>
          </div>
        )}
        {linhasExtras.map((l) => (
          <div key={l.id} className="breakdown-linha">
            <div>
              <b>{l.nome}</b>
              <span className="breakdown-sub">{l.sufixo}</span>
            </div>
            <span className="breakdown-val">R$ {l.valor.toLocaleString("pt-BR")}</span>
          </div>
        ))}
        <div className="breakdown-linha subtotal">
          <span>Subtotal</span>
          <span>R$ {subtotal.toLocaleString("pt-BR")}</span>
        </div>
        {Number(proposta.desconto) > 0 && (
          <div className="breakdown-linha desconto">
            <span>Desconto</span>
            <span>- R$ {Number(proposta.desconto).toLocaleString("pt-BR")}</span>
          </div>
        )}
      </div>
      <div style={{ marginTop: 24 }}>
        <div className="eyebrow" style={{ animation: "none", opacity: 1, marginBottom: 16 }}>{jaAssinado ? "Valor contratado" : "Investimento total"}</div>
        <div className="valor-total">R$ {(jaAssinado ? Number(valorContratado) : total).toLocaleString("pt-BR")}</div>
      </div>
      {!jaAssinado && (
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--stroke)", width: "100%" }}>
          <AceitarProposta
            propostaId={proposta.id}
            statusInicial={proposta.status}
            aceitaEmInicial={proposta.aceita_em}
            motivoInicial={proposta.motivo_categoria}
            contexto={{
              valorTotal: total,
              dataEvento: evento?.data_evento,
              numConvidados,
            }}
          />
        </div>
      )}
    </div>
  );
}

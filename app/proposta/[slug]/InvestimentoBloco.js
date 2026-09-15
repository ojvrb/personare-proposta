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
  const { escolhidoId, recomendadoId, extrasCliente } = useEscolhaBuffet();
  const buffetAtual = buffets.find((b) => b.id === (escolhidoId || recomendadoId)) || null;
  const trocouBuffet = escolhidoId && escolhidoId !== recomendadoId;

  // Junta extras do vendedor + extras que o cliente adicionou. Marca os do
  // cliente pra mostrar rotulo "voce adicionou" e pro server distinguir no aceite.
  const extrasMerged = [
    ...(proposta.extras_selecionados || []),
    ...extrasCliente.map((e) => ({ ...e, pelo_cliente: true })),
  ];

  // Se algum extra tem substitui_buffet=true (ex: taxa de cozinha pra buffet
  // externo), o buffet interno sai do calculo -- o cliente vai trazer o proprio.
  const substituiBuffet = extrasMerged.some((sel) => extras.find((e) => e.id === sel.extra_id)?.substitui_buffet);
  const buffetEfetivo = substituiBuffet ? null : buffetAtual;

  const { precoPacote, precoBuffet, subtotal, total } = useMemo(() => calcularProposta({
    pacote, buffet: buffetEfetivo, numConvidados,
    extras, extrasSelecionados: extrasMerged, desconto: proposta.desconto || 0,
  }), [pacote, buffetEfetivo, numConvidados, extras, proposta, extrasCliente]);

  // Detalha cada extra com nome + calculo pra o cliente entender de onde vem
  // cada real. Reusa o mesmo shape do `calcularProposta` (nao inventa preco aqui).
  const linhasExtras = extrasMerged.map((sel) => {
    const ex = extras.find((e) => e.id === sel.extra_id);
    if (!ex) return null;
    const qtd = Number(sel.quantidade || 1);
    let valor, sufixo;
    if (ex.tipo_preco === "pessoa") { valor = Number(ex.valor) * numConvidados; sufixo = `R$ ${Number(ex.valor).toLocaleString("pt-BR")}/pessoa × ${numConvidados}`; }
    else if (ex.tipo_preco === "unidade") { valor = Number(ex.valor) * qtd; sufixo = `${qtd} × R$ ${Number(ex.valor).toLocaleString("pt-BR")}`; }
    else { valor = Number(ex.valor); sufixo = "valor fixo"; }
    return { id: ex.id, nome: ex.nome, valor, sufixo, peloCliente: !!sel.pelo_cliente };
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
        {buffetEfetivo && (
          <div className="breakdown-linha">
            <div>
              <b>Buffet {buffetEfetivo.nome}</b>
              <span className="breakdown-sub">R$ {Number(buffetEfetivo.preco_pessoa).toLocaleString("pt-BR")}/pessoa × {numConvidados} convidados{trocouBuffet ? " · você escolheu" : ""}</span>
            </div>
            <span className="breakdown-val">R$ {precoBuffet.toLocaleString("pt-BR")}</span>
          </div>
        )}
        {linhasExtras.map((l) => (
          <div key={l.id} className="breakdown-linha">
            <div>
              <b>{l.nome}</b>
              <span className="breakdown-sub">{l.sufixo}{l.peloCliente ? " · você adicionou" : ""}</span>
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
      {(!jaAssinado || !proposta.motivo_categoria) && (
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--stroke)", width: "100%" }}>
          <AceitarProposta
            propostaId={proposta.id}
            statusInicial={proposta.status}
            aceitaEmInicial={proposta.aceita_em}
            motivoInicial={proposta.motivo_categoria}
            jaAssinado={jaAssinado}
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

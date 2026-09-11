// Motivos de perda/fechamento -- compartilhados entre o board (drag-and-drop)
// e a pagina de detalhe do cliente (contrato assinado, pipeline de proposta),
// pra manter as mesmas categorias nos dois lugares.
export const MOTIVO_PERDA = {
  capacidade: "Capacidade", preco_alto: "Preço alto", data_indisponivel: "Data indisponível",
  concorrente: "Concorrente", buffet_nao_agradou: "Buffet não agradou",
  decoracao_nao_agradou: "Decoração não agradou", sem_retorno: "Sem retorno", outro: "Outro",
};

export const MOTIVO_FECHAMENTO = {
  indicacao: "Indicação", preco_adequado: "Preço adequado", buffet_agradou: "Buffet agradou",
  atendimento: "Atendimento/vendedor", localizacao: "Localização", disponibilidade: "Data disponível",
  portfolio: "Portfólio/fotos", outro: "Outro",
};

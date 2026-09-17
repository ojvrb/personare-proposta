// Ordem narrativa fixa dos capitulos da proposta publica. Cada nome so entra
// na lista final se tem conteudo (ver montarCapitulos) -- a numeracao 01/02/...
// que o casal ve reflete os capitulos reais, nao slots vazios.
const ORDEM = ["espaco", "decoracao", "buffet", "pacote", "depoimentos", "investimento"];

export function montarCapitulos({ temEspaco, temDecoracao, temBuffet, temPacote, temDepoimentos }) {
  const presentes = {
    espaco: !!temEspaco,
    decoracao: !!temDecoracao,
    buffet: !!temBuffet,
    pacote: !!temPacote,
    depoimentos: !!temDepoimentos,
    investimento: true,
  };
  return ORDEM.filter((nome) => presentes[nome]);
}

export function numCapitulo(capitulos, nome) {
  return String(capitulos.indexOf(nome) + 1).padStart(2, "0");
}

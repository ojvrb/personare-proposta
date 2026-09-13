// Termos do aceite eletronico da PROPOSTA -- e' um "pre-contrato" curto que
// reserva a data e os valores. O CONTRATO DEFINITIVO (com todas as clausulas,
// multas escalonadas, cronograma de pagamento etc) vem depois em outro link
// enviado pelo staff, ai sim com assinatura formal. Isso segue a pratica
// comum em servicos de eventos: primeiro "carta de intencao", depois contrato.
// Cobrimos Lei 14.063/2020 + CDC + LGPD pra dar validade a esse ato.
export const TERMOS_VERSAO = "1.1.0";

export function textoTermos({ nomeCliente, valorTotal, dataEvento, numConvidados, atendente }) {
  const valor = valorTotal ? `R$ ${Number(valorTotal).toLocaleString("pt-BR")}` : "o valor apresentado nesta proposta";
  const evento = dataEvento ? `programado para ${new Date(`${dataEvento}T00:00:00`).toLocaleDateString("pt-BR")}` : "com data a definir";
  return [
    { titulo: "O que você está aceitando agora", corpo: `Ao confirmar, você aceita a PROPOSTA apresentada nesta página: o pacote, o buffet, os extras e o valor total de ${valor}, para o evento ${evento} com ${numConvidados || "número a confirmar"} convidados. Isso reserva sua data e trava esses valores nas condições descritas.` },
    { titulo: "Contrato definitivo vem depois", corpo: "Este NÃO é o contrato final. Nos próximos dias o Personare envia um novo link com o CONTRATO DEFINITIVO, contendo cronograma de pagamento, política de cancelamento e as cláusulas específicas do seu evento. É lá que você assina a versão completa. Até essa assinatura, este aceite funciona como reserva de proposta." },
    { titulo: "Se mudar de ideia (CDC art. 49)", corpo: "Você tem 7 (sete) dias corridos a partir de hoje pra desistir da reserva sem nenhum ônus, conforme o Código de Defesa do Consumidor. Basta avisar por escrito ao Personare (WhatsApp da(o) atendente ou e-mail). Se desistir dentro desse prazo, nada é cobrado." },
    { titulo: "Seus dados (LGPD — Lei 13.709/18)", corpo: "Ao confirmar, você autoriza o Personare a tratar seus dados pessoais (nome, CPF, telefone, e-mail e dados do evento) com a base legal da execução de contrato (art. 7º, V, LGPD), exclusivamente para viabilizar seu evento, emitir contrato/nota e cumprir obrigações fiscais. Você pode pedir acesso, correção ou exclusão a qualquer momento." },
    { titulo: "Assinatura eletrônica (Lei 14.063/2020)", corpo: `Este aceite se dá por assinatura eletrônica simples, com base no art. 219 do Código Civil e nos arts. 4º e 5º da Lei 14.063/2020. Registramos, junto com sua confirmação: nome completo, CPF, IP de origem, User-Agent do navegador, data e hora, e a versão dos termos vigente (v${TERMOS_VERSAO}). Esses dados são conservados pelo prazo mínimo de 5 (cinco) anos, conforme o Marco Civil da Internet (Lei 12.965/14).` },
  ];
}

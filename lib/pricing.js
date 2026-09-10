// Calculo do orcamento a partir dos dados reais (pacote/buffet/extras vem do banco,
// nunca do client) — evita que alguem manipule o total pelo devtools.
export function calcularProposta({ pacote, buffet, numConvidados, extras, extrasSelecionados, desconto }) {
  const precoPacote = Number(pacote?.preco || 0);
  const precoBuffet = Number(buffet?.preco_pessoa || 0) * numConvidados;

  const precoExtras = (extrasSelecionados || []).reduce((soma, sel) => {
    const extra = extras.find((e) => e.id === sel.extra_id);
    if (!extra) return soma;
    const qtd = Number(sel.quantidade || 1);
    if (extra.tipo_preco === "pessoa") return soma + Number(extra.valor) * numConvidados;
    if (extra.tipo_preco === "unidade") return soma + Number(extra.valor) * qtd;
    return soma + Number(extra.valor); // fixo
  }, 0);

  const subtotal = precoPacote + precoBuffet + precoExtras;
  const total = Math.max(0, subtotal - Number(desconto || 0));

  return { precoPacote, precoBuffet, precoExtras, subtotal, total };
}

export function gerarSlug(nome) {
  const base = (nome || "proposta")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const sufixo = Math.random().toString(36).slice(2, 7);
  return `${base}-${sufixo}`;
}

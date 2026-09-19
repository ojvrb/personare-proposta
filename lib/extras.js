// Regras de extras compartilhadas entre configurador, proposta publica e rotas
// de API -- uma fonte so' pra nao divergir o total salvo do total exibido.

// Algum extra selecionado (vendedor OU cliente) tem substitui_buffet? Entao o
// buffet interno sai do calculo e buffet_id grava null.
export function substituiBuffet(extrasSelecionados, extrasCatalogo) {
  return (extrasSelecionados || []).some((sel) => (extrasCatalogo || []).find((e) => e.id === sel.extra_id)?.substitui_buffet);
}

// Extras que o cliente pediu na proposta publica e o servidor aceita: so' os
// ativos, liberados pro cliente (disponivel_cliente !== false trata coluna
// ainda inexistente como liberado) e que o vendedor nao tinha selecionado.
export function extrasAceitosDoCliente({ extrasCatalogo, pedidos, idsVendedor }) {
  const ids = (pedidos || []).map((p) => p.extra_id).filter(Boolean);
  return (extrasCatalogo || [])
    .filter((ex) => ex.ativo && ex.disponivel_cliente !== false && ids.includes(ex.id) && !idsVendedor.has(ex.id))
    .map((ex) => {
      const pedido = pedidos.find((p) => p.extra_id === ex.id);
      return { extra_id: ex.id, quantidade: Math.max(1, Number(pedido?.quantidade) || 1), pelo_cliente: true };
    });
}

// Wrapper fino pra fetch de mutacao (POST/PATCH/DELETE): alerta em erro em vez
// de falhar silenciosamente -- importa sobretudo pros 403 de permissao (atendente
// tentando mexer em financeiro/catalogo), que sem isso passavam despercebidos.
export async function apiFetch(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    alert(data.error || "Não foi possível concluir a ação.");
    return null;
  }
  return res.json();
}

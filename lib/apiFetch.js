// Wrapper fino pra fetch de mutacao (POST/PATCH/DELETE): mostra o erro em
// toast em vez de alert() nativo (bloqueante, feio, as vezes bloqueado no
// browser). Importa sobretudo pros 403 de permissao (atendente tentando
// mexer em financeiro/catalogo), que sem isso passavam despercebidos.
import { showToast } from "@/app/components/Toast";

export async function apiFetch(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    showToast(data.error || "Não foi possível concluir a ação.");
    return null;
  }
  return res.json();
}

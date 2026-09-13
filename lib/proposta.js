// Campos "sigilosos" do aceite eletronico -- CPF, IP e User-Agent so' devem
// ser lidos por admin, via rota dedicada (`/api/propostas/[id]/aceite`).
// Nunca voltam em respostas amplas (board CRM, PATCH de status, etc) e nem
// sao passados como prop pro client de proposta publica.
export const CAMPOS_SIGILOSOS_ACEITE = ["aceite_cpf", "aceite_ip", "aceite_user_agent"];

// Colunas de propostas expostas com seguranca -- lista explicita em vez de
// `select('*')` pra impedir que qualquer campo novo virou visivel sem
// revisao. Ordem nao importa; a lista e' a superficie publica.
export const COLUNAS_PROPOSTA_PUBLICA = [
  "id", "evento_id", "pacote_id", "buffet_id", "buffets_sugeridos",
  "extras_selecionados", "desconto", "subtotal", "total", "slug",
  "status", "versao", "valida_ate", "aceita_em", "decidido_em",
  "motivo_categoria", "motivo_detalhe", "atendente_id", "created_at",
  // aceite -- so os "quem/quando" ficam publicos pro CRM; documento fiscal
  // (CPF) e evidencia forense (IP/UA) so' via rota admin.
  "aceite_nome_completo", "aceite_termos_versao",
].join(", ");

// Remove os campos sigilosos de um objeto de proposta (ou array de propostas).
// Uso: `return NextResponse.json({ propostas: expurgar(dados) })`.
export function expurgar(propostaOuArray) {
  if (Array.isArray(propostaOuArray)) return propostaOuArray.map(expurgar);
  if (!propostaOuArray || typeof propostaOuArray !== "object") return propostaOuArray;
  const copia = { ...propostaOuArray };
  for (const campo of CAMPOS_SIGILOSOS_ACEITE) delete copia[campo];
  return copia;
}

export function mascararCPF(cpf) {
  const s = String(cpf || "").replace(/\D/g, "");
  return s.length === 11 ? `${s.slice(0, 3)}.***.***-${s.slice(9)}` : "***";
}

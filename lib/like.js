// Escapa os curingas do LIKE/ILIKE (% _ \) pra casar um texto digitado por
// visitante literalmente -- sem isso "%" casa qualquer convidado.
export function escaparLike(texto) {
  return String(texto).replace(/[\\%_]/g, "\\$&");
}

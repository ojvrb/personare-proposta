// Agenda do espaco: `confirmada` (unique index no banco, uma por dia) trava a
// data de vez; `hold` e' a proposta em aberto que "segura" o dia ate a validade
// dela. Hold expirado nao e' apagado por cron -- simplesmente deixa de contar
// na leitura (reservaAtiva) e e' limpo quando a proposta e' aceita/perdida.

export function reservaAtiva(r, agora = new Date()) {
  return r.tipo === "confirmada" || !r.expira_em || new Date(r.expira_em) > agora;
}

export function resumoDisponibilidade(reservas, { ignorarPropostaId, agora } = {}) {
  const ativas = (reservas || []).filter((r) => reservaAtiva(r, agora) && r.proposta_id !== ignorarPropostaId);
  return {
    confirmada: ativas.some((r) => r.tipo === "confirmada"),
    holds: ativas.filter((r) => r.tipo === "hold").length,
  };
}

// valida_ate e' `date` (YYYY-MM-DD); o hold vale ate o fim desse dia no fuso
// do espaco (Ponta Grossa/PR, UTC-3).
export function expiraEmDaValidade(validaAte) {
  return validaAte ? `${validaAte}T23:59:59-03:00` : null;
}

export async function espacoAtivoId(supabase) {
  const { data } = await supabase.from("espacos").select("id").eq("ativo", true).limit(1).maybeSingle();
  return data?.id || null;
}

// Tenta confirmar a data pra proposta. { ok:true } tambem quando nao ha data ou
// espaco (nada a travar) ou quando a reserva confirmada do dia ja e' desta
// proposta (retry/corrida). { conflito:true } so' quando OUTRA proposta tem o
// dia. Solta o hold desta proposta ao confirmar.
export async function confirmarReserva(supabase, { propostaId, dataEvento }) {
  if (!dataEvento) return { ok: true };
  const espacoId = await espacoAtivoId(supabase);
  if (!espacoId) return { ok: true };

  const { error } = await supabase
    .from("reservas")
    .insert({ espaco_id: espacoId, data: dataEvento, tipo: "confirmada", proposta_id: propostaId });
  if (error) {
    if (error.code !== "23505") return { erro: error };
    const { data: existente } = await supabase
      .from("reservas").select("proposta_id")
      .eq("espaco_id", espacoId).eq("data", dataEvento).eq("tipo", "confirmada").maybeSingle();
    if (existente?.proposta_id !== propostaId) return { conflito: true };
  }
  await supabase.from("reservas").delete().eq("proposta_id", propostaId).eq("tipo", "hold");
  return { ok: true };
}

export async function criarHold(supabase, { propostaId, dataEvento, validaAte }) {
  if (!dataEvento) return;
  const espacoId = await espacoAtivoId(supabase);
  if (!espacoId) return;
  const { error } = await supabase
    .from("reservas")
    .insert({ espaco_id: espacoId, data: dataEvento, tipo: "hold", expira_em: expiraEmDaValidade(validaAte), proposta_id: propostaId });
  if (error) console.error(error);
}

export async function soltarHold(supabase, propostaId) {
  await supabase.from("reservas").delete().eq("proposta_id", propostaId).eq("tipo", "hold");
}

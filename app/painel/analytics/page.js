"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const FUNIL = [
  { status: "novo_contato", label: "Novo contato" },
  { status: "visita_agendada", label: "Visita agendada" },
  { status: "proposta_enviada", label: "Proposta enviada" },
  { status: "negociacao", label: "Negociação" },
  { status: "aguardando_decisao", label: "Aguardando decisão" },
  { status: "contrato", label: "Contrato" },
  { status: "negocio_fechado", label: "Negócio fechado" },
  { status: "perdido", label: "Perdido" },
];

// Rampa ordinal dourada (clara -> escura): o funil é uma sequência com ordem,
// não categorias soltas -- por isso um hue só, não 8 cores categóricas distintas.
const RAMPA_OURO = ["#f0d9b2", "#dfc59e", "#ceb08a", "#bd9c76", "#ad8762", "#9c734e", "#8b5e3a", "#7a4a26"];

const RANGES = [
  { dias: 7, label: "7d" },
  { dias: 30, label: "30d" },
  { dias: 90, label: "90d" },
  { dias: null, label: "Tudo" },
];

function diasAtras(dataStr, agora) {
  return (agora - new Date(dataStr)) / 86400000;
}

// Agrega os KPIs pra um recorte (array ja filtrado) de clientes/propostas/contratos --
// mesma formula de antes, so' que roda no cliente, reaproveitavel pra qualquer range.
function agregar(clientesF, propostasF, contratosF, eventos, buffets, extras) {
  const contratosAssinados = contratosF.filter((c) => c.status === "assinado");
  const conversao = propostasF.length > 0 ? (contratosAssinados.length / propostasF.length) * 100 : 0;
  const ticketMedio = contratosAssinados.length > 0
    ? contratosAssinados.reduce((s, c) => s + Number(c.valor_contratado), 0) / contratosAssinados.length
    : 0;
  const descontoMedio = propostasF.length > 0
    ? propostasF.reduce((s, p) => s + Number(p.desconto || 0), 0) / propostasF.length
    : 0;

  const temposFechamento = contratosAssinados
    .map((c) => {
      const evento = eventos.find((e) => e.id === c.evento_id);
      const cliente = evento && clientesF.find((cl) => cl.id === evento.cliente_id);
      if (!cliente) return null;
      return diasAtras(cliente.created_at, new Date(c.created_at));
    })
    .filter((d) => d !== null);
  const tempoMedioFechamentoDias = temposFechamento.length > 0
    ? temposFechamento.reduce((s, d) => s + d, 0) / temposFechamento.length
    : null;

  const contagemBuffet = {};
  propostasF.forEach((p) => { if (p.buffet_id) contagemBuffet[p.buffet_id] = (contagemBuffet[p.buffet_id] || 0) + 1; });
  const buffetTop = Object.entries(contagemBuffet).sort((a, b) => b[1] - a[1])[0];
  const buffetMaisEscolhido = buffetTop ? { nome: buffets.find((b) => b.id === buffetTop[0])?.nome, count: buffetTop[1] } : null;

  const contagemExtra = {};
  propostasF.forEach((p) => (p.extras_selecionados || []).forEach((sel) => { contagemExtra[sel.extra_id] = (contagemExtra[sel.extra_id] || 0) + 1; }));
  const extraTop = Object.entries(contagemExtra).sort((a, b) => b[1] - a[1])[0];
  const extraMaisVendido = extraTop ? { nome: extras.find((e) => e.id === extraTop[0])?.nome, count: extraTop[1] } : null;

  const porStatus = {};
  clientesF.forEach((c) => { porStatus[c.status] = (porStatus[c.status] || 0) + 1; });

  return {
    totalLeads: clientesF.length, totalPropostas: propostasF.length, contratosAssinados: contratosAssinados.length,
    conversao, ticketMedio, descontoMedio, tempoMedioFechamentoDias, buffetMaisEscolhido, extraMaisVendido, porStatus,
  };
}

// Alertas (sprint5) -- sempre sobre o estado ATUAL, independente do filtro de
// range (nao faz sentido "alerta dos ultimos 7 dias", ou esta parado agora
// ou nao esta). Calculado em cima do que ja vem de /api/analytics, sem view.
function calcularAlertas(bruto, agora) {
  const ultimaInteracaoPorCliente = {};
  bruto.interacoes.forEach((i) => {
    const atual = ultimaInteracaoPorCliente[i.cliente_id];
    if (!atual || new Date(i.created_at) > new Date(atual)) ultimaInteracaoPorCliente[i.cliente_id] = i.created_at;
  });

  const clientePorEvento = {};
  bruto.eventos.forEach((e) => { clientePorEvento[e.id] = e.cliente_id; });
  const clientePorId = {};
  bruto.clientes.forEach((c) => { clientePorId[c.id] = c; });

  const semInteracao = bruto.propostas
    .filter((p) => ["enviada", "em_negociacao"].includes(p.status))
    .map((p) => {
      const clienteId = clientePorEvento[p.evento_id];
      const cliente = clientePorId[clienteId];
      if (!cliente) return null;
      const ultima = ultimaInteracaoPorCliente[clienteId] || p.created_at;
      if (diasAtras(ultima, agora) <= 7) return null;
      return { proposta: p, cliente, diasParado: Math.floor(diasAtras(ultima, agora)) };
    })
    .filter(Boolean);

  const validadeVencida = bruto.propostas
    .filter((p) => p.valida_ate && new Date(p.valida_ate) < agora && !["aceita", "perdida"].includes(p.status))
    .map((p) => {
      const cliente = clientePorId[clientePorEvento[p.evento_id]];
      return cliente ? { proposta: p, cliente } : null;
    })
    .filter(Boolean);

  const contratosAssinadosPorEvento = new Set(bruto.contratos.filter((c) => c.status === "assinado").map((c) => c.evento_id));
  const eventoSemContrato = bruto.eventos
    .filter((e) => e.data_evento && diasAtras(agora, new Date(e.data_evento)) <= 60 && diasAtras(agora, new Date(e.data_evento)) >= 0 && !contratosAssinadosPorEvento.has(e.id))
    .map((e) => {
      const cliente = clientePorId[e.cliente_id];
      return cliente ? { evento: e, cliente } : null;
    })
    .filter(Boolean);

  return { semInteracao, validadeVencida, eventoSemContrato };
}

// Desempenho por atendente (sprint5) -- so' admin ve, e' pra comparar vendedores.
function calcularDesempenho(bruto) {
  const porAtendente = {};
  bruto.propostas.forEach((p) => {
    const id = p.atendente_id || "sem_dono";
    if (!porAtendente[id]) porAtendente[id] = { total: 0, fechadas: 0, perdidas: 0 };
    porAtendente[id].total += 1;
    if (p.status === "aceita") porAtendente[id].fechadas += 1;
    if (p.status === "perdida") porAtendente[id].perdidas += 1;
  });
  return Object.entries(porAtendente).map(([id, v]) => ({
    id,
    email: id === "sem_dono" ? "Sem dono" : bruto.emailPorId[id] || id,
    ...v,
    conversao: v.total > 0 ? (v.fechadas / v.total) * 100 : 0,
  })).sort((a, b) => b.total - a.total);
}

export default function AnalyticsPage() {
  const [bruto, setBruto] = useState(null);
  const [erro, setErro] = useState("");
  const [rangeDias, setRangeDias] = useState(30);
  const [etapaSelecionada, setEtapaSelecionada] = useState(null);
  const [alertaAberto, setAlertaAberto] = useState(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => (ok ? setBruto(d) : setErro(d.error || "erro ao carregar")));
  }, []);

  const agora = useMemo(() => new Date(), [bruto, rangeDias]);

  const { clientesRange, dados, deltas } = useMemo(() => {
    if (!bruto) return { clientesRange: [], dados: null, deltas: null };
    const dentro = (d, offset = 0) => !rangeDias || (diasAtras(d, agora) >= offset && diasAtras(d, agora) <= rangeDias + offset);

    const clientesRange = bruto.clientes.filter((c) => dentro(c.created_at));
    const propostasRange = bruto.propostas.filter((p) => dentro(p.created_at));
    const contratosRange = bruto.contratos.filter((c) => dentro(c.created_at));
    const dados = agregar(clientesRange, propostasRange, contratosRange, bruto.eventos, bruto.buffets, bruto.extras);

    let deltas = null;
    if (rangeDias) {
      const clientesAnterior = bruto.clientes.filter((c) => dentro(c.created_at, rangeDias));
      const propostasAnterior = bruto.propostas.filter((p) => dentro(p.created_at, rangeDias));
      const contratosAnterior = bruto.contratos.filter((c) => dentro(c.created_at, rangeDias));
      const anterior = agregar(clientesAnterior, propostasAnterior, contratosAnterior, bruto.eventos, bruto.buffets, bruto.extras);
      const pct = (atual, ant) => (ant > 0 ? ((atual - ant) / ant) * 100 : atual > 0 ? 100 : 0);
      deltas = {
        totalLeads: pct(dados.totalLeads, anterior.totalLeads),
        contratosAssinados: pct(dados.contratosAssinados, anterior.contratosAssinados),
        conversao: dados.conversao - anterior.conversao,
      };
    }

    return { clientesRange, dados, deltas };
  }, [bruto, rangeDias, agora]);

  const alertas = useMemo(() => (bruto ? calcularAlertas(bruto, agora) : null), [bruto, agora]);
  const desempenho = useMemo(() => (bruto ? calcularDesempenho(bruto) : []), [bruto]);
  const souAdmin = Object.keys(bruto?.emailPorId || {}).length > 0;

  if (erro) return <div className="alert err">{erro}</div>;
  if (!dados) return <p style={{ color: "var(--granite)" }}>Carregando…</p>;

  const maxFunil = Math.max(1, ...FUNIL.map((f) => dados.porStatus[f.status] || 0));
  const leadsDaEtapa = etapaSelecionada ? clientesRange.filter((c) => c.status === etapaSelecionada) : [];

  return (
    <div>
      <div className="top">
        <div>
          <h1 style={{ marginBottom: 4 }}>Analytics</h1>
          <div className="selo" style={{ margin: 0 }}>Desempenho comercial</div>
        </div>
        <div className="segmented">
          {RANGES.map((r) => (
            <button key={r.label} className={rangeDias === r.dias ? "active" : ""} onClick={() => { setRangeDias(r.dias); setEtapaSelecionada(null); }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {alertas && (alertas.semInteracao.length + alertas.validadeVencida.length + alertas.eventoSemContrato.length > 0) && (
        <div className="card" style={{ marginBottom: 24, borderColor: "var(--warn)" }}>
          <h3 style={{ marginTop: 0 }}>⚠ Precisa de atenção</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            <AlertaCard
              titulo="Sem contato há mais de 7 dias"
              itens={alertas.semInteracao}
              aberto={alertaAberto === "semInteracao"}
              onToggle={() => setAlertaAberto((a) => (a === "semInteracao" ? null : "semInteracao"))}
              render={(i) => <>{i.cliente.nome} <span style={{ color: "var(--granite)" }}>· {i.diasParado}d parado</span></>}
            />
            <AlertaCard
              titulo="Validade da proposta vencida"
              itens={alertas.validadeVencida}
              aberto={alertaAberto === "validadeVencida"}
              onToggle={() => setAlertaAberto((a) => (a === "validadeVencida" ? null : "validadeVencida"))}
              render={(i) => i.cliente.nome}
            />
            <AlertaCard
              titulo="Evento em até 60 dias sem contrato"
              itens={alertas.eventoSemContrato}
              aberto={alertaAberto === "eventoSemContrato"}
              onToggle={() => setAlertaAberto((a) => (a === "eventoSemContrato" ? null : "eventoSemContrato"))}
              render={(i) => <>{i.cliente.nome} <span style={{ color: "var(--granite)" }}>· {new Date(`${i.evento.data_evento}T00:00:00`).toLocaleDateString("pt-BR")}</span></>}
            />
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14, marginBottom: 24 }}>
        <Stat label="Leads" valor={dados.totalLeads} delta={deltas?.totalLeads} />
        <Stat label="Propostas enviadas" valor={dados.totalPropostas} />
        <Stat label="Contratos assinados" valor={dados.contratosAssinados} delta={deltas?.contratosAssinados} />
        <Stat label="Taxa de conversão" valor={`${dados.conversao.toFixed(1)}%`} delta={deltas?.conversao} pontos />
        <Stat label="Ticket médio" valor={`R$ ${dados.ticketMedio.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
        <Stat label="Desconto médio" valor={`R$ ${dados.descontoMedio.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
        <Stat label="Tempo médio de fechamento" valor={dados.tempoMedioFechamentoDias != null ? `${dados.tempoMedioFechamentoDias.toFixed(0)} dias` : "—"} />
        <Stat label="Buffet mais escolhido" valor={dados.buffetMaisEscolhido ? `${dados.buffetMaisEscolhido.nome} (${dados.buffetMaisEscolhido.count})` : "—"} />
        <Stat label="Extra mais vendido" valor={dados.extraMaisVendido ? `${dados.extraMaisVendido.nome} (${dados.extraMaisVendido.count})` : "—"} />
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Leads por etapa do funil</h3>
        <p style={{ fontSize: 12, color: "var(--granite)", marginTop: -8, marginBottom: 14 }}>Clique numa etapa pra ver quem está nela.</p>
        <FunilChart dados={dados.porStatus} max={maxFunil} selecionada={etapaSelecionada} onSelecionar={setEtapaSelecionada} />

        {etapaSelecionada && (
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--stroke)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              {FUNIL.find((f) => f.status === etapaSelecionada)?.label} ({leadsDaEtapa.length})
            </div>
            {leadsDaEtapa.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--granite)" }}>Nenhum lead nessa etapa no período.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {leadsDaEtapa.map((c) => (
                  <Link key={c.id} href={`/painel/clientes/${c.id}`} className="resumo-linha" style={{ textDecoration: "none", color: "var(--ink)" }}>
                    <span>{c.nome}{c.nome_conjuge ? ` & ${c.nome_conjuge}` : ""}</span>
                    <span style={{ fontSize: 12, color: "var(--granite)" }}>{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {souAdmin && desempenho.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3 style={{ marginTop: 0 }}>Desempenho por atendente</h3>
          <p style={{ fontSize: 12, color: "var(--granite)", marginTop: -8, marginBottom: 14 }}>Todo o período — pra comparar quem está fechando mais.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {desempenho.map((d) => (
              <div key={d.id} className="resumo-linha">
                <span>{d.email}</span>
                <span style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--stone)" }}>
                  <span>{d.total} propostas</span>
                  <span style={{ color: "var(--sage-dark)", fontWeight: 600 }}>{d.fechadas} fechadas</span>
                  <span style={{ color: "var(--bad)" }}>{d.perdidas} perdidas</span>
                  <span style={{ fontWeight: 600 }}>{d.conversao.toFixed(0)}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AlertaCard({ titulo, itens, aberto, onToggle, render }) {
  if (itens.length === 0) return null;
  return (
    <div>
      <button
        onClick={onToggle}
        style={{
          width: "100%", textAlign: "left", cursor: "pointer", background: "var(--pitch-2)",
          border: "1px solid var(--stroke)", borderRadius: 10, padding: 12, fontFamily: "var(--font)",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--warn)" }}>{itens.length}</div>
        <div style={{ fontSize: 12, color: "var(--stone)" }}>{titulo}</div>
      </button>
      {aberto && (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
          {itens.map((i, idx) => (
            <Link key={idx} href={`/painel/clientes/${i.cliente.id}`} style={{ fontSize: 12, padding: "6px 8px", textDecoration: "none", color: "var(--ink)", borderRadius: 6 }}>
              {render(i)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FunilChart({ dados, max, selecionada, onSelecionar }) {
  const linhaAltura = 30;
  return (
    <div role="img" aria-label="Leads por etapa do funil" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {FUNIL.map((f, i) => {
        const valor = dados[f.status] || 0;
        const larguraPct = valor > 0 ? Math.max(3, (valor / max) * 100) : 0;
        return (
          <div
            key={f.status}
            className={`funil-barra${selecionada === f.status ? " selecionada" : ""}`}
            style={{ display: "grid", gridTemplateColumns: "150px 1fr 24px", alignItems: "center", gap: 10, height: linhaAltura, padding: "0 6px" }}
            onClick={() => onSelecionar((atual) => (atual === f.status ? null : f.status))}
          >
            <span style={{ fontSize: 13, color: "var(--stone)" }}>{f.label}</span>
            <div style={{ height: 9, background: "var(--lift)", borderRadius: 5, overflow: "hidden" }}>
              <div style={{ width: `${larguraPct}%`, height: "100%", borderRadius: 5, background: RAMPA_OURO[i], transition: "width .3s" }} />
            </div>
            <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--bone)", textAlign: "right" }}>{valor}</span>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, valor, delta, pontos }) {
  const temDelta = delta !== undefined && delta !== null && !Number.isNaN(delta) && Math.abs(delta) > 0.05;
  return (
    <div className="stat">
      <div className="k">{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
        <div className="v" style={{ margin: 0 }}>{valor}</div>
        {temDelta && (
          <span className={`delta-badge ${delta > 0 ? "up" : "down"}`}>
            {delta > 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}{pontos ? " pts" : "%"}
          </span>
        )}
      </div>
    </div>
  );
}

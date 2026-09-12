"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// Dashboard cross-filter estilo Qlik: um estado central `filtros` que combina
// todos os cortes ativos (periodo, origem, atendente, buffet, etapa). Cada
// grafico e' clicavel e toggla um filtro; TODOS os outros graficos recalculam
// em cima do slice filtrado. Um chart nao se filtra pra si mesmo -- as barras
// selecionadas ficam com highlight, as nao selecionadas ficam com opacity
// menor pra mostrar o contexto.

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
const RAMPA_OURO = ["#f0d9b2", "#dfc59e", "#ceb08a", "#bd9c76", "#ad8762", "#9c734e", "#8b5e3a", "#7a4a26"];
const RANGES = [{ dias: 7, label: "7d" }, { dias: 30, label: "30d" }, { dias: 90, label: "90d" }, { dias: null, label: "Tudo" }];

const FILTROS_INICIAIS = { rangeDias: 30, origem: null, atendenteId: null, buffetId: null, etapaFunil: null };

function diasAtras(dataStr, agora) { return (agora - new Date(dataStr)) / 86400000; }
function labelOrigem(o) { return o ? o.replace(/_/g, " ") : "sem origem"; }

// Aplica os filtros ativos EXCETO `exceto` (o proprio chart nao se filtra
// pra si -- caso contrario a barra clicada zeraria as outras). Retorna
// clientes/propostas/contratos filtrados que casam com todos os cortes ativos.
function aplicarFiltros(bruto, filtros, agora, exceto = null) {
  const activo = (nome) => filtros[nome] !== null && filtros[nome] !== undefined && nome !== exceto;
  const rangeAtivo = activo("rangeDias");
  const eventosDoCliente = {};
  bruto.eventos.forEach((e) => { (eventosDoCliente[e.cliente_id] = eventosDoCliente[e.cliente_id] || []).push(e); });
  const clientePorEvento = {};
  bruto.eventos.forEach((e) => { clientePorEvento[e.id] = e.cliente_id; });

  // pra filtro de buffet, o cliente entra se qualquer proposta dele usa esse
  // buffet (recomendado ou selecionado). Fica computado uma vez pra usar embaixo.
  const clientesComBuffet = new Set();
  if (activo("buffetId")) {
    bruto.propostas.forEach((p) => {
      if (p.buffet_id === filtros.buffetId || (p.buffets_sugeridos || []).includes(filtros.buffetId)) {
        const cid = clientePorEvento[p.evento_id];
        if (cid) clientesComBuffet.add(cid);
      }
    });
  }

  const clientes = bruto.clientes.filter((c) => {
    if (rangeAtivo && diasAtras(c.created_at, agora) > filtros.rangeDias) return false;
    if (activo("origem") && (c.origem || "sem_origem") !== filtros.origem) return false;
    if (activo("atendenteId") && c.atendente_id !== filtros.atendenteId) return false;
    if (activo("etapaFunil") && c.status !== filtros.etapaFunil) return false;
    if (activo("buffetId") && !clientesComBuffet.has(c.id)) return false;
    return true;
  });
  const clienteIds = new Set(clientes.map((c) => c.id));
  const eventoIds = new Set(bruto.eventos.filter((e) => clienteIds.has(e.cliente_id)).map((e) => e.id));

  const propostas = bruto.propostas.filter((p) => {
    if (!eventoIds.has(p.evento_id)) return false;
    if (rangeAtivo && diasAtras(p.created_at, agora) > filtros.rangeDias) return false;
    if (activo("buffetId") && p.buffet_id !== filtros.buffetId && !(p.buffets_sugeridos || []).includes(filtros.buffetId)) return false;
    if (activo("atendenteId") && p.atendente_id !== filtros.atendenteId) return false;
    return true;
  });
  const contratos = bruto.contratos.filter((c) => {
    if (!eventoIds.has(c.evento_id)) return false;
    if (rangeAtivo && diasAtras(c.created_at, agora) > filtros.rangeDias) return false;
    return true;
  });
  return { clientes, propostas, contratos };
}

function agregar(clientesF, propostasF, contratosF, eventos, buffets, extras) {
  const contratosAssinados = contratosF.filter((c) => c.status === "assinado");
  const conversao = propostasF.length > 0 ? (contratosAssinados.length / propostasF.length) * 100 : 0;
  const ticketMedio = contratosAssinados.length > 0
    ? contratosAssinados.reduce((s, c) => s + Number(c.valor_contratado), 0) / contratosAssinados.length : 0;
  const descontoMedio = propostasF.length > 0
    ? propostasF.reduce((s, p) => s + Number(p.desconto || 0), 0) / propostasF.length : 0;
  const receitaFechada = contratosAssinados.reduce((s, c) => s + Number(c.valor_contratado || 0), 0);

  const temposFechamento = contratosAssinados.map((c) => {
    const evento = eventos.find((e) => e.id === c.evento_id);
    const cliente = evento && clientesF.find((cl) => cl.id === evento.cliente_id);
    return cliente ? diasAtras(cliente.created_at, new Date(c.created_at)) : null;
  }).filter((d) => d !== null);
  const tempoMedioFechamentoDias = temposFechamento.length > 0
    ? temposFechamento.reduce((s, d) => s + d, 0) / temposFechamento.length : null;

  const contagemBuffet = {};
  propostasF.forEach((p) => { if (p.buffet_id) contagemBuffet[p.buffet_id] = (contagemBuffet[p.buffet_id] || 0) + 1; });
  const buffetTop = Object.entries(contagemBuffet).sort((a, b) => b[1] - a[1])[0];
  const buffetMaisEscolhido = buffetTop ? { id: buffetTop[0], nome: buffets.find((b) => b.id === buffetTop[0])?.nome, count: buffetTop[1] } : null;

  const contagemExtra = {};
  propostasF.forEach((p) => (p.extras_selecionados || []).forEach((sel) => { contagemExtra[sel.extra_id] = (contagemExtra[sel.extra_id] || 0) + 1; }));
  const extraTop = Object.entries(contagemExtra).sort((a, b) => b[1] - a[1])[0];
  const extraMaisVendido = extraTop ? { nome: extras.find((e) => e.id === extraTop[0])?.nome, count: extraTop[1] } : null;

  const porStatus = {};
  clientesF.forEach((c) => { porStatus[c.status] = (porStatus[c.status] || 0) + 1; });

  return {
    totalLeads: clientesF.length, totalPropostas: propostasF.length, contratosAssinados: contratosAssinados.length,
    conversao, ticketMedio, descontoMedio, receitaFechada, tempoMedioFechamentoDias,
    buffetMaisEscolhido, extraMaisVendido, porStatus,
  };
}

function calcularAlertas(bruto, agora) {
  const ultimaInteracaoPorCliente = {};
  bruto.interacoes.forEach((i) => {
    const atual = ultimaInteracaoPorCliente[i.cliente_id];
    if (!atual || new Date(i.created_at) > new Date(atual)) ultimaInteracaoPorCliente[i.cliente_id] = i.created_at;
  });
  const clientePorEvento = {}; bruto.eventos.forEach((e) => { clientePorEvento[e.id] = e.cliente_id; });
  const clientePorId = {}; bruto.clientes.forEach((c) => { clientePorId[c.id] = c; });

  const semInteracao = bruto.propostas
    .filter((p) => ["enviada", "em_negociacao"].includes(p.status))
    .map((p) => {
      const cliente = clientePorId[clientePorEvento[p.evento_id]]; if (!cliente) return null;
      const ultima = ultimaInteracaoPorCliente[cliente.id] || p.created_at;
      if (diasAtras(ultima, agora) <= 7) return null;
      return { proposta: p, cliente, diasParado: Math.floor(diasAtras(ultima, agora)) };
    }).filter(Boolean);
  const validadeVencida = bruto.propostas
    .filter((p) => p.valida_ate && new Date(p.valida_ate) < agora && !["aceita", "perdida"].includes(p.status))
    .map((p) => { const cliente = clientePorId[clientePorEvento[p.evento_id]]; return cliente ? { proposta: p, cliente } : null; }).filter(Boolean);
  const contratosAssinadosPorEvento = new Set(bruto.contratos.filter((c) => c.status === "assinado").map((c) => c.evento_id));
  const eventoSemContrato = bruto.eventos
    .filter((e) => e.data_evento && diasAtras(agora, new Date(e.data_evento)) <= 60 && diasAtras(agora, new Date(e.data_evento)) >= 0 && !contratosAssinadosPorEvento.has(e.id))
    .map((e) => { const cliente = clientePorId[e.cliente_id]; return cliente ? { evento: e, cliente } : null; }).filter(Boolean);
  return { semInteracao, validadeVencida, eventoSemContrato };
}

export default function AnalyticsPage() {
  const [bruto, setBruto] = useState(null);
  const [erro, setErro] = useState("");
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [alertaAberto, setAlertaAberto] = useState(null);

  useEffect(() => {
    fetch("/api/analytics").then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => (ok ? setBruto(d) : setErro(d.error || "erro ao carregar")));
  }, []);

  const agora = useMemo(() => new Date(), [bruto]);
  const souAdmin = Object.keys(bruto?.emailPorId || {}).length > 0;

  // clique num item toggla: se ja e' o filtro ativo, tira; senao, aplica.
  function toggle(nome, valor) {
    setFiltros((f) => ({ ...f, [nome]: f[nome] === valor ? null : valor }));
  }

  const dadosGlobal = useMemo(() => {
    if (!bruto) return null;
    const slice = aplicarFiltros(bruto, filtros, agora);
    return { slice, ...agregar(slice.clientes, slice.propostas, slice.contratos, bruto.eventos, bruto.buffets, bruto.extras) };
  }, [bruto, filtros, agora]);

  // slice ignorando UM filtro pra cada chart poder mostrar seu contexto proprio
  // (uma barra selecionada + as outras opacas, em vez de zerar tudo). Ver aplicarFiltros.
  const sliceSemOrigem = useMemo(() => bruto ? aplicarFiltros(bruto, filtros, agora, "origem") : null, [bruto, filtros, agora]);
  const sliceSemAtendente = useMemo(() => bruto ? aplicarFiltros(bruto, filtros, agora, "atendenteId") : null, [bruto, filtros, agora]);
  const sliceSemBuffet = useMemo(() => bruto ? aplicarFiltros(bruto, filtros, agora, "buffetId") : null, [bruto, filtros, agora]);
  const sliceSemEtapa = useMemo(() => bruto ? aplicarFiltros(bruto, filtros, agora, "etapaFunil") : null, [bruto, filtros, agora]);

  const alertas = useMemo(() => bruto ? calcularAlertas(bruto, agora) : null, [bruto, agora]);

  if (erro) return <div className="alert err">{erro}</div>;
  if (!dadosGlobal) return <p style={{ color: "var(--granite)" }}>Carregando…</p>;

  const { slice, ...dados } = dadosGlobal;
  const nAtivos = ["origem", "atendenteId", "buffetId", "etapaFunil"].filter((k) => filtros[k]).length;

  return (
    <div>
      <div className="top">
        <div>
          <h1 style={{ marginBottom: 4 }}>Analytics</h1>
          <div className="selo" style={{ margin: 0 }}>Clique nos gráficos pra cruzar filtros.</div>
        </div>
        <div className="segmented">
          {RANGES.map((r) => (
            <button key={r.label} className={filtros.rangeDias === r.dias ? "active" : ""} onClick={() => setFiltros((f) => ({ ...f, rangeDias: r.dias }))}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <ChipsFiltros filtros={filtros} bruto={bruto} onLimpar={(k) => setFiltros((f) => ({ ...f, [k]: null }))} onLimparTudo={() => setFiltros(FILTROS_INICIAIS)} n={nAtivos} />

      {alertas && (
        <div className="card" style={{ marginBottom: 20, borderColor: alertas.semInteracao.length + alertas.validadeVencida.length + alertas.eventoSemContrato.length > 0 ? "var(--warn)" : undefined }}>
          <h3 style={{ marginTop: 0 }}>⚠ Precisa de atenção</h3>
          {alertas.semInteracao.length + alertas.validadeVencida.length + alertas.eventoSemContrato.length === 0 ? (
            <p style={{ color: "var(--granite)", fontSize: 13, margin: 0 }}>Tudo em dia — nenhum lead parado, proposta vencida ou evento sem contrato.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              <AlertaCard titulo="Sem contato há mais de 7 dias" itens={alertas.semInteracao} aberto={alertaAberto === "semInteracao"} onToggle={() => setAlertaAberto((a) => (a === "semInteracao" ? null : "semInteracao"))} render={(i) => <>{i.cliente.nome} <span style={{ color: "var(--granite)" }}>· {i.diasParado}d parado</span></>} />
              <AlertaCard titulo="Validade da proposta vencida" itens={alertas.validadeVencida} aberto={alertaAberto === "validadeVencida"} onToggle={() => setAlertaAberto((a) => (a === "validadeVencida" ? null : "validadeVencida"))} render={(i) => i.cliente.nome} />
              <AlertaCard titulo="Evento em até 60 dias sem contrato" itens={alertas.eventoSemContrato} aberto={alertaAberto === "eventoSemContrato"} onToggle={() => setAlertaAberto((a) => (a === "eventoSemContrato" ? null : "eventoSemContrato"))} render={(i) => <>{i.cliente.nome} <span style={{ color: "var(--granite)" }}>· {new Date(`${i.evento.data_evento}T00:00:00`).toLocaleDateString("pt-BR")}</span></>} />
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <Stat label="Leads" valor={dados.totalLeads} />
        <Stat label="Propostas" valor={dados.totalPropostas} />
        <Stat label="Contratos" valor={dados.contratosAssinados} />
        <Stat label="Conversão" valor={`${dados.conversao.toFixed(1)}%`} />
        <Stat label="Receita fechada" valor={`R$ ${dados.receitaFechada.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
        <Stat label="Ticket médio" valor={`R$ ${dados.ticketMedio.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
        <Stat label="Desconto médio" valor={`R$ ${dados.descontoMedio.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
        <Stat label="Tempo médio" valor={dados.tempoMedioFechamentoDias != null ? `${dados.tempoMedioFechamentoDias.toFixed(0)}d` : "—"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 16 }}>
        {filtros.rangeDias && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Movimento</h3>
            <p style={{ fontSize: 12, color: "var(--granite)", marginTop: -8, marginBottom: 14 }}>Leads que chegaram e contratos assinados no período.</p>
            <SerieTemporal clientes={slice.clientes} contratosAssinados={slice.contratos.filter((c) => c.status === "assinado")} rangeDias={filtros.rangeDias} agora={agora} />
          </div>
        )}

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Por origem</h3>
          <p style={{ fontSize: 12, color: "var(--granite)", marginTop: -8, marginBottom: 14 }}>Clique numa origem pra filtrar tudo.</p>
          <OrigemBreakdown slice={sliceSemOrigem} filtroAtual={filtros.origem} onToggle={(v) => toggle("origem", v)} />
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Etapa do funil</h3>
          <p style={{ fontSize: 12, color: "var(--granite)", marginTop: -8, marginBottom: 14 }}>Clique numa etapa pra ver só quem está nela.</p>
          <FunilChart slice={sliceSemEtapa} filtroAtual={filtros.etapaFunil} onToggle={(v) => toggle("etapaFunil", v)} />
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Buffets escolhidos</h3>
          <p style={{ fontSize: 12, color: "var(--granite)", marginTop: -8, marginBottom: 14 }}>Clique num buffet pra segmentar o resto.</p>
          <BuffetsBreakdown slice={sliceSemBuffet} buffets={bruto.buffets} filtroAtual={filtros.buffetId} onToggle={(v) => toggle("buffetId", v)} />
        </div>

        {souAdmin && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Atendentes</h3>
            <p style={{ fontSize: 12, color: "var(--granite)", marginTop: -8, marginBottom: 14 }}>Clique num atendente pra ver só o dele.</p>
            <AtendentesBreakdown slice={sliceSemAtendente} emailPorId={bruto.emailPorId} filtroAtual={filtros.atendenteId} onToggle={(v) => toggle("atendenteId", v)} />
          </div>
        )}
      </div>

      {(filtros.etapaFunil || nAtivos > 0) && slice.clientes.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{slice.clientes.length} lead{slice.clientes.length !== 1 ? "s" : ""} no slice atual</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 300, overflowY: "auto" }}>
            {slice.clientes.slice(0, 40).map((c) => (
              <Link key={c.id} href={`/painel/clientes/${c.id}`} className="resumo-linha" style={{ textDecoration: "none", color: "var(--ink)" }}>
                <span>{c.nome}{c.nome_conjuge ? ` & ${c.nome_conjuge}` : ""}</span>
                <span style={{ fontSize: 12, color: "var(--granite)" }}>{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
              </Link>
            ))}
            {slice.clientes.length > 40 && <p style={{ fontSize: 12, color: "var(--granite)", margin: "6px 0 0" }}>+ {slice.clientes.length - 40} outros…</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// Chips: filtros ativos como pilulas removiveis + botao "limpar tudo".
function ChipsFiltros({ filtros, bruto, onLimpar, onLimparTudo, n }) {
  if (n === 0) return null;
  const labels = {
    origem: filtros.origem && `Origem: ${labelOrigem(filtros.origem)}`,
    atendenteId: filtros.atendenteId && `Atendente: ${bruto.emailPorId[filtros.atendenteId] || filtros.atendenteId.slice(0, 6)}`,
    buffetId: filtros.buffetId && `Buffet: ${bruto.buffets.find((b) => b.id === filtros.buffetId)?.nome || "?"}`,
    etapaFunil: filtros.etapaFunil && `Etapa: ${FUNIL.find((f) => f.status === filtros.etapaFunil)?.label || filtros.etapaFunil}`,
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 16, padding: "10px 14px", background: "var(--sage-wash)", border: "1px solid var(--stroke)", borderRadius: 10 }}>
      <span style={{ fontSize: 11, color: "var(--granite)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".06em" }}>Filtrando por</span>
      {Object.entries(labels).map(([k, v]) => v && (
        <button key={k} onClick={() => onLimpar(k)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "4px 10px", borderRadius: 100, border: "1px solid var(--sage)", background: "var(--white)", color: "var(--sage-dark)", cursor: "pointer", fontWeight: 600 }}>
          {v} <span style={{ opacity: .6 }}>×</span>
        </button>
      ))}
      <button onClick={onLimparTudo} style={{ marginLeft: "auto", fontSize: 12, background: "none", border: "none", color: "var(--granite)", cursor: "pointer", textDecoration: "underline" }}>Limpar tudo</button>
    </div>
  );
}

// Gráfico temporal SVG: barras por dia (<=30d) ou semana; hover destaca.
function SerieTemporal({ clientes, contratosAssinados, rangeDias, agora }) {
  const [foco, setFoco] = useState(null);
  const bucketDias = rangeDias <= 30 ? 1 : 7;
  const nBuckets = Math.ceil(rangeDias / bucketDias);
  const buckets = Array.from({ length: nBuckets }, (_, i) => {
    const fim = new Date(agora.getTime() - i * bucketDias * 86400000);
    const inicio = new Date(fim.getTime() - bucketDias * 86400000);
    return { inicio, fim, leads: 0, contratos: 0 };
  }).reverse();
  const dentro = (data, b) => { const t = new Date(data).getTime(); return t >= b.inicio.getTime() && t < b.fim.getTime(); };
  clientes.forEach((c) => { const b = buckets.find((x) => dentro(c.created_at, x)); if (b) b.leads += 1; });
  contratosAssinados.forEach((c) => { const b = buckets.find((x) => dentro(c.created_at, x)); if (b) b.contratos += 1; });

  const max = Math.max(1, ...buckets.map((b) => b.leads + b.contratos));
  const W = 100, H = 40, gap = 1.2, larg = (W - gap * (nBuckets - 1)) / nBuckets;
  const fmt = (d) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 140, display: "block" }} onPointerLeave={() => setFoco(null)}>
        {buckets.map((b, i) => {
          const alturaTotal = ((b.leads + b.contratos) / max) * H;
          const alturaLeads = (b.leads / max) * H;
          const alturaContratos = (b.contratos / max) * H;
          const x = i * (larg + gap);
          return (
            <g key={i} onPointerEnter={() => setFoco(i)} style={{ cursor: "pointer" }}>
              <rect x={x} y={0} width={larg} height={H} fill="transparent" />
              <rect x={x} y={H - alturaLeads} width={larg} height={alturaLeads} fill="var(--sage)" opacity={foco === i ? 1 : 0.75} />
              <rect x={x} y={H - alturaTotal} width={larg} height={alturaContratos} fill="var(--gold)" opacity={foco === i ? 1 : 0.9} />
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--granite)", marginTop: 6, fontFamily: "var(--mono)" }}>
        <span>{fmt(buckets[0].inicio)}</span>
        <span>{fmt(buckets[buckets.length - 1].fim)}</span>
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--stone)", marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: "var(--sage)", borderRadius: 2 }} />Leads</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: "var(--gold)", borderRadius: 2 }} />Contratos</span>
        {foco !== null && (
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink)" }}>
            <b>{fmt(buckets[foco].inicio)}–{fmt(buckets[foco].fim)}:</b> {buckets[foco].leads} lead{buckets[foco].leads !== 1 ? "s" : ""} · {buckets[foco].contratos} contrato{buckets[foco].contratos !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

// Cada breakdown -- todos seguem o mesmo padrao: barras clicaveis, o filtro
// atual fica destacado, os demais viram opacos. Usa slice "sem esse filtro"
// pra nao zerar as barras nao selecionadas.
function BarraClicavel({ label, valor, total, badge, ativo, algumAtivo, onClick, cor = "var(--sage)" }) {
  const pct = total > 0 ? (valor / total) * 100 : 0;
  const opacity = !algumAtivo || ativo ? 1 : 0.35;
  return (
    <button onClick={onClick}
      style={{ display: "grid", gridTemplateColumns: "160px 1fr auto auto", gap: 10, alignItems: "center", fontSize: 13, background: ativo ? "var(--sage-wash)" : "none", border: ativo ? "1px solid var(--sage)" : "1px solid transparent", borderRadius: 8, padding: "6px 8px", cursor: "pointer", width: "100%", fontFamily: "var(--font)", textAlign: "left", transition: "opacity .15s, background .15s, border-color .15s", opacity }}>
      <span style={{ color: "var(--stone)", textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ height: 8, background: "var(--lift)", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: cor, transition: "width .3s" }} />
      </div>
      <span style={{ fontSize: 12, color: "var(--stone)", fontFamily: "var(--mono)", minWidth: 44, textAlign: "right" }}>{valor}</span>
      {badge && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--gold-dark)", minWidth: 40, textAlign: "right" }}>{badge}</span>}
    </button>
  );
}

function OrigemBreakdown({ slice, filtroAtual, onToggle }) {
  // "Fechados" por origem usa o status do cliente (contrato/negocio_fechado)
  // como aproximacao -- evita ter que carregar o mapa evento->cliente aqui so'
  // pra cruzar com contratos.assinado. Esse status e' escrito pela rota de
  // aceite, entao acompanha o funil real.
  const porOrigem = {};
  slice.clientes.forEach((c) => {
    const o = c.origem || "sem_origem";
    if (!porOrigem[o]) porOrigem[o] = { total: 0, fechados: 0 };
    porOrigem[o].total += 1;
    if (["contrato", "negocio_fechado"].includes(c.status)) porOrigem[o].fechados += 1;
  });

  const lista = Object.entries(porOrigem).map(([origem, v]) => ({
    origem, ...v, conversao: v.total > 0 ? (v.fechados / v.total) * 100 : 0,
  })).sort((a, b) => b.total - a.total);
  if (lista.length === 0) return <p style={{ fontSize: 13, color: "var(--granite)", margin: 0 }}>Sem dados no slice.</p>;
  const max = Math.max(...lista.map((l) => l.total));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {lista.map((l) => (
        <BarraClicavel key={l.origem} label={labelOrigem(l.origem)} valor={l.total} total={max}
          badge={`${l.conversao.toFixed(0)}%`}
          ativo={filtroAtual === l.origem} algumAtivo={!!filtroAtual}
          onClick={() => onToggle(l.origem)} />
      ))}
    </div>
  );
}

function FunilChart({ slice, filtroAtual, onToggle }) {
  const porStatus = {};
  slice.clientes.forEach((c) => { porStatus[c.status] = (porStatus[c.status] || 0) + 1; });
  const max = Math.max(1, ...FUNIL.map((f) => porStatus[f.status] || 0));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {FUNIL.map((f, i) => {
        const valor = porStatus[f.status] || 0;
        return (
          <BarraClicavel key={f.status} label={f.label} valor={valor} total={max}
            ativo={filtroAtual === f.status} algumAtivo={!!filtroAtual}
            onClick={() => onToggle(f.status)} cor={RAMPA_OURO[i]} />
        );
      })}
    </div>
  );
}

function BuffetsBreakdown({ slice, buffets, filtroAtual, onToggle }) {
  const cont = {};
  slice.propostas.forEach((p) => { if (p.buffet_id) cont[p.buffet_id] = (cont[p.buffet_id] || 0) + 1; });
  const lista = Object.entries(cont).map(([id, count]) => ({
    id, count, nome: buffets.find((b) => b.id === id)?.nome || "?",
  })).sort((a, b) => b.count - a.count);
  if (lista.length === 0) return <p style={{ fontSize: 13, color: "var(--granite)", margin: 0 }}>Nenhum buffet foi indicado ainda.</p>;
  const max = Math.max(...lista.map((l) => l.count));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {lista.map((l) => (
        <BarraClicavel key={l.id} label={l.nome} valor={l.count} total={max}
          ativo={filtroAtual === l.id} algumAtivo={!!filtroAtual}
          onClick={() => onToggle(l.id)} cor="var(--gold)" />
      ))}
    </div>
  );
}

function AtendentesBreakdown({ slice, emailPorId, filtroAtual, onToggle }) {
  const cont = {};
  slice.propostas.forEach((p) => {
    const id = p.atendente_id || "sem_dono";
    if (!cont[id]) cont[id] = { total: 0, fechadas: 0 };
    cont[id].total += 1;
    if (p.status === "aceita") cont[id].fechadas += 1;
  });
  const lista = Object.entries(cont).map(([id, v]) => ({
    id, ...v, conversao: v.total > 0 ? (v.fechadas / v.total) * 100 : 0,
    email: id === "sem_dono" ? "Sem dono" : emailPorId[id] || id.slice(0, 6),
  })).sort((a, b) => b.total - a.total);
  if (lista.length === 0) return <p style={{ fontSize: 13, color: "var(--granite)", margin: 0 }}>Sem propostas no slice.</p>;
  const max = Math.max(...lista.map((l) => l.total));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {lista.map((l) => (
        <BarraClicavel key={l.id} label={l.email} valor={l.total} total={max}
          badge={`${l.conversao.toFixed(0)}%`}
          ativo={filtroAtual === (l.id === "sem_dono" ? null : l.id)} algumAtivo={!!filtroAtual}
          onClick={() => onToggle(l.id === "sem_dono" ? "sem_dono" : l.id)} />
      ))}
    </div>
  );
}

function AlertaCard({ titulo, itens, aberto, onToggle, render }) {
  if (itens.length === 0) return null;
  return (
    <div>
      <button onClick={onToggle} style={{ width: "100%", textAlign: "left", cursor: "pointer", background: "var(--pitch-2)", border: "1px solid var(--stroke)", borderRadius: 10, padding: 12, fontFamily: "var(--font)" }}>
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

function Stat({ label, valor }) {
  return (
    <div className="stat">
      <div className="k">{label}</div>
      <div className="v" style={{ margin: "6px 0 0" }}>{valor}</div>
    </div>
  );
}

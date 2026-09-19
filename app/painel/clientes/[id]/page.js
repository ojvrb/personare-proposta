"use client";

import { useEffect, useState, use } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { MOTIVO_PERDA, MOTIVO_FECHAMENTO, ORIGEM_LABEL } from "@/lib/motivos";
import MicButton from "@/app/components/MicButton";

const STATUS_PROPOSTA = {
  rascunho: "Rascunho", enviada: "Enviada", em_negociacao: "Em negociação",
  pre_aprovada: "Pré-aprovada", aceita: "Aceita", perdida: "Perdida",
};

const CAPITULO_LABEL = {
  espaco: "O lugar", decoracao: "Decoração", buffet: "A mesa",
  pacote: "O que está incluso", depoimentos: "Depoimentos", investimento: "Investimento",
};

// Lead score simples a partir do tracking de leitura (proposta_analytics):
// mede se abriu, quantas vezes e se foi recente -- o suficiente pra saber se
// vale ligar agora ou esperar. Nao e' ciencia, e' um sinal pro vendedor.
function calcularLeadScore(analytics) {
  const aberturas = analytics.filter((a) => a.tipo === "abertura");
  if (aberturas.length === 0) return { nivel: "sem_leitura", aberturas: 0, ultimaAbertura: null, capituloTop: null };

  const ultimaAbertura = aberturas.reduce((max, a) => (a.criado_em > max ? a.criado_em : max), aberturas[0].criado_em);
  const horasDesde = (Date.now() - new Date(ultimaAbertura).getTime()) / 3600000;

  let score = 40;
  if (aberturas.length >= 3) score += 30;
  if (horasDesde <= 48) score += 30;
  const nivel = score >= 70 ? "quente" : score >= 40 ? "morno" : "frio";

  const tempoPorCapitulo = {};
  for (const a of analytics) {
    if (a.tipo === "capitulo" && a.capitulo) tempoPorCapitulo[a.capitulo] = (tempoPorCapitulo[a.capitulo] || 0) + Number(a.duracao_ms || 0);
  }
  const entradas = Object.entries(tempoPorCapitulo);
  const capituloTop = entradas.length > 0 ? entradas.reduce((a, b) => (b[1] > a[1] ? b : a))[0] : null;

  return { nivel, aberturas: aberturas.length, ultimaAbertura, capituloTop };
}

export default function ClienteDetalhePage({ params }) {
  const { id } = use(params);
  const [dados, setDados] = useState(null);
  const [colegas, setColegas] = useState([]);
  const [buffets, setBuffets] = useState([]);
  const [extras, setExtras] = useState([]);
  const [meuRole, setMeuRole] = useState(null);
  const [erro, setErro] = useState("");
  const [nota, setNota] = useState("");
  const [enviandoNota, setEnviandoNota] = useState(false);
  const [paraTransferir, setParaTransferir] = useState("");
  const [mostrarFechamento, setMostrarFechamento] = useState(false);

  async function carregar() {
    const res = await fetch(`/api/clientes/${id}`);
    const data = await res.json();
    if (!res.ok) return setErro(data.error || "erro ao carregar");
    setDados(data);
    setMeuRole(data.meuRole);
  }

  useEffect(() => {
    carregar();
    fetch("/api/perfis").then((r) => r.json()).then((d) => setColegas(d.colegas || []));
    fetch("/api/buffets").then((r) => r.json()).then((d) => setBuffets(d.items || []));
    fetch("/api/extras").then((r) => r.json()).then((d) => setExtras(d.items || []));
  }, [id]);

  async function enviarNota(e) {
    e.preventDefault();
    if (!nota.trim()) return;
    setEnviandoNota(true);
    await fetch(`/api/clientes/${id}/interacoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nota }),
    });
    setNota("");
    setEnviandoNota(false);
    carregar();
  }

  async function atualizarCliente(campos) {
    const ok = await apiFetch(`/api/clientes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    if (ok) carregar();
  }

  async function solicitarTransferencia() {
    if (!paraTransferir) return;
    const ok = await apiFetch(`/api/clientes/${id}/transferencias`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ para_atendente_id: paraTransferir }),
    });
    if (ok) { setParaTransferir(""); carregar(); }
  }

  // notaTexto e' obrigatoria pra qualquer mudanca de status da proposta -- nunca
  // deixa passar uma mudanca de etapa sem registrar o porque (ver Proposta abaixo).
  async function atualizarPropostaStatus(propostaId, campos, notaTexto) {
    const ok = await apiFetch(`/api/propostas/${propostaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    if (ok) {
      if (notaTexto) {
        await fetch(`/api/clientes/${id}/interacoes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nota: notaTexto }),
        });
      }
      carregar();
    }
  }

  async function ajustarProposta(propostaId, novoDesconto, motivo) {
    const ok = await apiFetch(`/api/propostas/${propostaId}/ajustes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ novo_desconto: novoDesconto, motivo }),
    });
    if (ok) carregar();
  }

  async function novaVersaoProposta(propostaId, campos) {
    const ok = await apiFetch(`/api/propostas/${propostaId}/nova-versao`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    if (ok) carregar();
  }

  async function criarContrato(eventoId, propostaId) {
    const ok = await apiFetch("/api/contratos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evento_id: eventoId, proposta_id: propostaId }),
    });
    if (ok) carregar();
  }

  async function atualizarContrato(contratoId, campos) {
    const ok = await apiFetch(`/api/contratos/${contratoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    if (ok) {
      // contrato assinado = negocio fechado, mas so' de verdade depois que o
      // vendedor confirmar o motivo -- ver ModalFechamento e confirmarFechamento.
      if (campos.status === "assinado" && dados?.cliente?.status !== "negocio_fechado") {
        setMostrarFechamento(true);
      }
      carregar();
    }
  }

  async function confirmarFechamento(motivo, detalhe) {
    const texto = `Negócio fechado — motivo: ${MOTIVO_FECHAMENTO[motivo]}${detalhe ? ` — ${detalhe}` : ""}`;
    const ok = await apiFetch(`/api/clientes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "negocio_fechado" }),
    });
    if (ok) {
      await fetch(`/api/clientes/${id}/interacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nota: texto }),
      });
      setMostrarFechamento(false);
      carregar();
    }
  }

  async function adicionarParcela(contratoId, form) {
    const fd = new FormData(form);
    const ok = await apiFetch(`/api/contratos/${contratoId}/pagamentos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descricao: fd.get("descricao") || "Parcela",
        valor: Number(fd.get("valor")),
        vencimento: fd.get("vencimento") || null,
      }),
    });
    if (ok) { form.reset(); carregar(); }
  }

  async function marcarPago(pagamentoId) {
    const ok = await apiFetch(`/api/pagamentos/${pagamentoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pago", pago_em: new Date().toISOString() }),
    });
    if (ok) carregar();
  }

  if (erro) return <div className="alert err">{erro}</div>;
  if (!dados) return <p style={{ color: "var(--granite)" }}>Carregando…</p>;

  const { cliente, interacoes, transferenciaPendente } = dados;

  return (
    <div>
      <h1>{cliente.nome}{cliente.nome_conjuge ? ` & ${cliente.nome_conjuge}` : ""}</h1>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, fontSize: 13 }}>
          <div><span style={{ color: "var(--granite)" }}>Cidade</span><br />{cliente.cidade || "—"}</div>
          <div><span style={{ color: "var(--granite)" }}>Telefone</span><br />{cliente.telefone || "—"}</div>
          <div>
            <span style={{ color: "var(--granite)" }}>E-mail</span><br />
            <input
              type="email"
              defaultValue={cliente.email || ""}
              placeholder="—"
              onBlur={(e) => { if (e.target.value !== (cliente.email || "")) atualizarCliente({ email: e.target.value }); }}
              style={{ fontSize: 13, padding: "2px 4px" }}
            />
          </div>
          <div><span style={{ color: "var(--granite)" }}>Status</span><br />{cliente.status}</div>
          <div>
            <span style={{ color: "var(--granite)" }}>Origem</span><br />
            <select value={cliente.origem || ""} onChange={(e) => atualizarCliente({ origem: e.target.value || null })} style={{ fontSize: 13 }}>
              <option value="">—</option>
              {Object.entries(ORIGEM_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--stroke)" }}>
          <span style={{ color: "var(--granite)", fontSize: 13 }}>Atendente responsável</span><br />
          {meuRole === "admin" ? (
            <select value={cliente.atendente_id || ""} onChange={(e) => atualizarCliente({ atendente_id: e.target.value || null })} style={{ fontSize: 13, marginTop: 4 }}>
              <option value="">Sem dono</option>
              {colegas.map((c) => <option key={c.user_id} value={c.user_id}>{c.email}</option>)}
              {cliente.atendente_email && !colegas.some((c) => c.user_id === cliente.atendente_id) && (
                <option value={cliente.atendente_id}>{cliente.atendente_email}</option>
              )}
            </select>
          ) : (
            <div style={{ fontSize: 13 }}>{cliente.atendente_email || "sem dono"}</div>
          )}

          {transferenciaPendente ? (
            <div className="alert" style={{ marginTop: 10, background: "rgba(217,154,43,.14)", border: "1px solid var(--amber)" }}>
              Transferência pendente pra <b>{transferenciaPendente.para_email}</b> — aguardando aprovação do admin.
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <select value={paraTransferir} onChange={(e) => setParaTransferir(e.target.value)} style={{ fontSize: 13 }}>
                <option value="">Transferir pra...</option>
                {colegas.map((c) => <option key={c.user_id} value={c.user_id}>{c.email}</option>)}
              </select>
              <button className="btn" onClick={solicitarTransferencia} disabled={!paraTransferir}>Solicitar transferência</button>
            </div>
          )}
        </div>
      </div>

      {(cliente.eventos || []).map((evento) => (
        <div key={evento.id} className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>{evento.tipo} · {evento.num_convidados} convidados{evento.data_evento ? ` · ${new Date(evento.data_evento).toLocaleDateString("pt-BR")}` : ""}</h3>

          <h4>Propostas</h4>
          {(evento.propostas || []).length === 0 && <p style={{ color: "var(--granite)", fontSize: 13 }}>Nenhuma proposta ainda.</p>}
          {(evento.propostas || []).map((p) => (
            <Proposta key={p.id} proposta={p} numConvidadosAtual={evento.num_convidados} buffets={buffets} extras={extras} onStatus={atualizarPropostaStatus} onAjustar={ajustarProposta} onNovaVersao={novaVersaoProposta} />
          ))}

          <h4>Contrato</h4>
          {(evento.contratos || []).length === 0 ? (
            <button className="btn primary" onClick={() => criarContrato(evento.id, evento.propostas?.find((p) => p.status === "aceita")?.id)}>Criar contrato</button>
          ) : (
            evento.contratos.map((c) => (
              <Contrato key={c.id} contrato={c} onAtualizar={atualizarContrato} onParcela={adicionarParcela} onPago={marcarPago} />
            ))
          )}
        </div>
      ))}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Histórico de interação</h3>
        <form onSubmit={enviarNota} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input placeholder="Anotar contato, ligação, decisão..." value={nota} onChange={(e) => setNota(e.target.value)} style={{ flex: 1 }} />
          <MicButton onResult={(texto) => setNota((n) => (n ? `${n} ${texto}` : texto))} />
          <button className="btn primary" disabled={enviandoNota}>Adicionar</button>
        </form>
        {interacoes.length === 0 ? (
          <p style={{ color: "var(--granite)", fontSize: 13 }}>Nenhuma nota ainda.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {interacoes.map((i) => (
              <div key={i.id} style={{ borderLeft: "2px solid var(--gold)", paddingLeft: 10 }}>
                <div style={{ fontSize: 13 }}>{i.nota}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--granite)" }}>
                  {new Date(i.created_at).toLocaleString("pt-BR")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {mostrarFechamento && (
        <ModalFechamento cliente={cliente} onConfirmar={confirmarFechamento} onCancelar={() => setMostrarFechamento(false)} />
      )}
    </div>
  );
}

// Contrato assinado dispara isso automaticamente -- lembra o vendedor de
// registrar por que o negocio fechou antes do lead virar "negocio fechado" e
// aparecer na agenda de eventos. Sem motivo, nao muda de status (mesma regra
// do board: nunca avanca etapa sem preencher a resposta).
function ModalFechamento({ cliente, onConfirmar, onCancelar }) {
  const [motivo, setMotivo] = useState("");
  const [detalhe, setDetalhe] = useState("");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div className="card" style={{ maxWidth: 420, width: "90%" }}>
        <h3 style={{ marginTop: 0 }}>Contrato assinado — negócio fechado?</h3>
        <p style={{ fontSize: 13, color: "var(--granite)" }}>
          {cliente.nome}{cliente.nome_conjuge ? ` & ${cliente.nome_conjuge}` : ""} vai mover pra "Negócio fechado" e entrar na agenda de eventos.
        </p>
        <div className="field">
          <label>Por que o negócio fechou?</label>
          <select value={motivo} onChange={(e) => setMotivo(e.target.value)} autoFocus>
            <option value="">Selecione...</option>
            {Object.entries(MOTIVO_FECHAMENTO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Detalhes (opcional)</label>
          <input value={detalhe} onChange={(e) => setDetalhe(e.target.value)} placeholder="Ex: fechou com desconto de fidelidade" />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onCancelar}>Cancelar</button>
          <button className="btn primary" onClick={() => onConfirmar(motivo, detalhe.trim())} disabled={!motivo}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

function Proposta({ proposta: p, numConvidadosAtual, buffets, extras, onStatus, onAjustar, onNovaVersao }) {
  const [ajustando, setAjustando] = useState(false);
  const [revisando, setRevisando] = useState(false);
  const [novoBuffetId, setNovoBuffetId] = useState(p.buffet_id || "");
  const [novosConvidados, setNovosConvidados] = useState(numConvidadosAtual || "");
  const [motivoRevisao, setMotivoRevisao] = useState("");
  // Desconto agora em % pra ser mais legivel pra staff que negocia. O
  // subtotal e' fixo (o total muda quando desconto muda), entao pct inicial
  // deriva do desconto absoluto salvo: (desconto / subtotal) * 100.
  const subtotal = Number(p.subtotal || 0);
  const pctInicial = subtotal > 0 ? (Number(p.desconto || 0) / subtotal) * 100 : 0;
  const [novoDescontoPct, setNovoDescontoPct] = useState(pctInicial.toFixed(2).replace(/\.?0+$/, ""));
  const [motivoAjuste, setMotivoAjuste] = useState("");
  const pctNum = Math.max(0, Math.min(100, Number(novoDescontoPct) || 0));
  const descontoAbs = subtotal * pctNum / 100;
  const totalPreview = Math.max(0, subtotal - descontoAbs);
  // status pendente aguardando confirmacao -- o select so' muda de verdade
  // depois que o vendedor preencher motivo (perdida) ou uma nota (demais
  // status) e clicar Salvar. Nunca commita direto no onChange.
  const [statusPendente, setStatusPendente] = useState(null);
  const [motivoPerda, setMotivoPerda] = useState("");
  const [detalhePerda, setDetalhePerda] = useState("");
  const [notaStatus, setNotaStatus] = useState("");

  function pedirMudanca(novoStatus) {
    if (novoStatus === p.status) return;
    setStatusPendente(novoStatus);
    setMotivoPerda("");
    setDetalhePerda("");
    setNotaStatus("");
  }

  function confirmarMudanca() {
    if (statusPendente === "perdida") {
      if (!motivoPerda) return;
      onStatus(
        p.id,
        { status: "perdida", motivo_categoria: motivoPerda, motivo_detalhe: detalhePerda || null },
        `Proposta perdida — motivo: ${MOTIVO_PERDA[motivoPerda]}${detalhePerda ? ` — ${detalhePerda}` : ""}`
      );
    } else {
      if (!notaStatus.trim()) return;
      onStatus(p.id, { status: statusPendente, motivo_categoria: null, motivo_detalhe: null }, notaStatus.trim());
    }
    setStatusPendente(null);
  }

  function cancelarMudanca() {
    setStatusPendente(null);
  }

  const ajustes = p.propostas_ajustes || [];
  const leadScore = calcularLeadScore(p.proposta_analytics || []);
  const COR_NIVEL = { quente: "var(--red)", morno: "var(--amber)", frio: "var(--stone)", sem_leitura: "var(--granite)" };
  const LABEL_NIVEL = { quente: "🔥 Quente", morno: "Morno", frio: "Frio", sem_leitura: "Ainda não abriu" };

  return (
    <div style={{ border: "1px solid var(--stroke)", borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <div className="resumo-linha" style={{ border: "none", padding: 0, marginBottom: 8 }}>
        <a href={`/proposta/${p.slug}`} target="_blank" rel="noopener noreferrer">v{p.versao}</a>
        <span>R$ {Number(p.total).toLocaleString("pt-BR")}</span>
      </div>

      <div style={{ fontSize: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span className="badge" style={{ color: COR_NIVEL[leadScore.nivel], borderColor: COR_NIVEL[leadScore.nivel] }}>{LABEL_NIVEL[leadScore.nivel]}</span>
        {leadScore.aberturas > 0 && (
          <span style={{ color: "var(--granite)" }}>
            aberta {leadScore.aberturas}x · última {new Date(leadScore.ultimaAbertura).toLocaleString("pt-BR")}
            {leadScore.capituloTop ? ` · mais tempo em "${CAPITULO_LABEL[leadScore.capituloTop] || leadScore.capituloTop}"` : ""}
          </span>
        )}
      </div>

      {!["aceita", "perdida"].includes(p.status) && (p.extras_cliente_pendente || []).length > 0 && (
        <div style={{ fontSize: 12, color: "var(--gold-dark)", marginBottom: 8 }}>
          O casal está considerando (ainda não aceitou): {p.extras_cliente_pendente.map((e) => `${extras.find((x) => x.id === e.extra_id)?.nome || "extra"}${e.quantidade > 1 ? ` x${e.quantidade}` : ""}`).join(", ")}
        </div>
      )}

      {p.status === "perdida" && p.motivo_categoria && (
        <div style={{ fontSize: 12, color: "var(--granite)", marginBottom: 8 }}>
          Motivo: {MOTIVO_PERDA[p.motivo_categoria] || p.motivo_categoria}{p.motivo_detalhe ? ` — ${p.motivo_detalhe}` : ""}
        </div>
      )}

      {p.status === "aceita" && p.aceite_nome_completo && (
        <ComprovanteAceite proposta={p} />
      )}

      {p.status === "aceita" && p.motivo_categoria && (
        <div style={{ fontSize: 12, color: "var(--sage-dark)", marginBottom: 8 }}>
          O cliente disse que o que mais pesou foi: {MOTIVO_FECHAMENTO[p.motivo_categoria] || p.motivo_categoria}
        </div>
      )}

      {p.valida_ate && (
        <div style={{ fontSize: 12, color: "var(--granite)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          Válida até {new Date(`${p.valida_ate}T00:00:00`).toLocaleDateString("pt-BR")}
          <button
            className="btn"
            style={{ fontSize: 11, padding: "2px 6px" }}
            onClick={() => onStatus(p.id, { status: p.status, valida_ate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10) })}
          >
            +15 dias
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={statusPendente ?? p.status} onChange={(e) => pedirMudanca(e.target.value)} style={{ fontSize: 12 }}>
          {Object.entries(STATUS_PROPOSTA).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <button className="btn" onClick={() => setAjustando((a) => !a)} style={{ fontSize: 12, padding: "4px 8px" }}>Ajustar desconto</button>
        {(p.status === "rascunho" || p.status === "enviada" || p.status === "em_negociacao" || p.status === "pre_aprovada") && (
          <button className="btn" onClick={() => setRevisando((r) => !r)} style={{ fontSize: 12, padding: "4px 8px" }}>Nova versão (buffet/convidados)</button>
        )}
      </div>

      {statusPendente && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
          {statusPendente === "perdida" ? (
            <>
              <select value={motivoPerda} onChange={(e) => setMotivoPerda(e.target.value)} style={{ fontSize: 12 }} autoFocus>
                <option value="">Motivo da perda...</option>
                {Object.entries(MOTIVO_PERDA).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input value={detalhePerda} onChange={(e) => setDetalhePerda(e.target.value)} placeholder="Detalhes (opcional)" style={{ flex: 1, minWidth: 140 }} />
            </>
          ) : (
            <input
              value={notaStatus}
              onChange={(e) => setNotaStatus(e.target.value)}
              placeholder={`Por que mudou pra "${STATUS_PROPOSTA[statusPendente]}"? (obrigatório)`}
              style={{ flex: 1, minWidth: 200 }}
              autoFocus
            />
          )}
          <button className="btn" onClick={cancelarMudanca}>Cancelar</button>
          <button
            className="btn primary"
            onClick={confirmarMudanca}
            disabled={statusPendente === "perdida" ? !motivoPerda : !notaStatus.trim()}
          >
            Salvar
          </button>
        </div>
      )}

      {ajustando && (
        <div style={{ marginTop: 8, padding: 10, background: "var(--sage-wash)", border: "1px solid var(--stroke)", borderRadius: 8 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <input type="number" min="0" max="100" step="0.5" value={novoDescontoPct} onChange={(e) => setNovoDescontoPct(e.target.value)} style={{ width: 80, textAlign: "right" }} />
              <span style={{ fontWeight: 600 }}>%</span>
            </div>
            <span style={{ fontSize: 12, color: "var(--granite)" }}>= R$ {descontoAbs.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} de desconto</span>
            <span style={{ marginLeft: "auto", fontSize: 13 }}>
              Novo total: <b style={{ color: "var(--gold-dark)", fontFamily: "var(--display)", fontSize: 16 }}>R$ {totalPreview.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</b>
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <input value={motivoAjuste} onChange={(e) => setMotivoAjuste(e.target.value)} placeholder="Motivo (ex: cliente pediu desconto)" style={{ flex: 1, minWidth: 160 }} />
            <button className="btn primary" onClick={() => { onAjustar(p.id, Math.round(descontoAbs * 100) / 100, motivoAjuste); setAjustando(false); }}>Salvar</button>
          </div>
        </div>
      )}

      {revisando && (
        <div style={{ marginTop: 8, padding: 10, background: "var(--sage-wash)", border: "1px solid var(--stroke)", borderRadius: 8 }}>
          <p style={{ fontSize: 12, color: "var(--granite)", margin: "0 0 8px" }}>
            Cria uma nova versão (v{p.versao + 1}) com link próprio. A versão atual fica congelada como histórico.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <select value={novoBuffetId} onChange={(e) => setNovoBuffetId(e.target.value)} style={{ fontSize: 12 }}>
              <option value="">Sem buffet</option>
              {buffets.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
            <input type="number" min="1" value={novosConvidados} onChange={(e) => setNovosConvidados(e.target.value)} placeholder="Nº convidados" style={{ width: 110 }} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <input value={motivoRevisao} onChange={(e) => setMotivoRevisao(e.target.value)} placeholder="Motivo (ex: cliente aumentou a lista)" style={{ flex: 1, minWidth: 160 }} />
            <button
              className="btn primary"
              onClick={() => {
                onNovaVersao(p.id, { buffet_id: novoBuffetId || null, num_convidados: Number(novosConvidados), motivo: motivoRevisao });
                setRevisando(false);
              }}
              disabled={!novosConvidados}
            >
              Criar versão
            </button>
          </div>
        </div>
      )}

      {ajustes.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--granite)" }}>
          {ajustes.map((a) => (
            <div key={a.id}>
              {a.campo && a.campo !== "desconto" ? `Nova versão (${a.campo.replace("_", " e ")}): ` : ""}
              R$ {Number(a.valor_anterior).toLocaleString("pt-BR")} → R$ {Number(a.valor_novo).toLocaleString("pt-BR")}
              {a.motivo ? ` — ${a.motivo}` : ""} ({new Date(a.criado_em).toLocaleDateString("pt-BR")})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Contrato({ contrato, onAtualizar, onParcela, onPago }) {
  const pagamentos = contrato.pagamentos || [];
  const totalPago = pagamentos.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.valor), 0);

  return (
    <div style={{ border: "1px solid var(--stroke)", borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div>
          Status:{" "}
          <select value={contrato.status} onChange={(e) => onAtualizar(contrato.id, { status: e.target.value })}>
            <option value="rascunho">Rascunho</option>
            <option value="assinado">Assinado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a href={`/painel/contratos/${contrato.id}`} className="btn" style={{ fontSize: 12, padding: "6px 12px" }}>Ver contrato completo</a>
          <div style={{ fontSize: 13 }}>
            Valor: R$
            <input
              type="number"
              defaultValue={contrato.valor_contratado}
              onBlur={(e) => onAtualizar(contrato.id, { valor_contratado: Number(e.target.value) })}
              style={{ width: 100, marginLeft: 6 }}
            />
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--granite)", marginBottom: 6 }}>
        Pago: R$ {totalPago.toLocaleString("pt-BR")} de R$ {Number(contrato.valor_contratado).toLocaleString("pt-BR")}
      </div>

      {pagamentos.map((p) => (
        <div key={p.id} className="resumo-linha">
          <span>{p.descricao} {p.vencimento ? `(venc. ${new Date(p.vencimento).toLocaleDateString("pt-BR")})` : ""}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            R$ {Number(p.valor).toLocaleString("pt-BR")}
            {p.status === "pago" ? <span className="badge">pago</span> : (
              <button className="btn" onClick={() => onPago(p.id)}>Marcar pago</button>
            )}
          </span>
        </div>
      ))}

      <form
        onSubmit={(e) => { e.preventDefault(); onParcela(contrato.id, e.target); }}
        style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}
      >
        <input name="descricao" placeholder="Descrição (ex: Sinal)" style={{ flex: 1, minWidth: 120 }} />
        <input name="valor" type="number" placeholder="Valor" required style={{ width: 100 }} />
        <input name="vencimento" type="date" />
        <button className="btn">+ Parcela</button>
      </form>
    </div>
  );
}

// Comprovante do aceite eletronico -- mostra nome mascarado + data por padrao.
// "Ver dados completos" faz um GET na rota admin-only que traz CPF/IP/UA e
// LOGA o acesso na timeline do cliente. E' o botao que so' aparece pra admins.
function ComprovanteAceite({ proposta }) {
  const [aberto, setAberto] = useState(false);
  const [detalhes, setDetalhes] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function verComprovante() {
    if (detalhes) { setAberto(true); return; }
    setCarregando(true); setErro("");
    const res = await fetch(`/api/propostas/${proposta.id}/aceite`);
    const data = await res.json();
    setCarregando(false);
    if (!res.ok) return setErro(data.error === "acesso restrito ao papel: admin" ? "Só admins podem ver o CPF." : (data.error || "erro"));
    setDetalhes(data); setAberto(true);
  }

  return (
    <div style={{ background: "var(--sage-wash)", border: "1px solid var(--stroke)", borderRadius: 8, padding: 10, fontSize: 12, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span>
          <b style={{ color: "var(--sage-dark)" }}>✓ Aceito por {mascararNome(proposta.aceite_nome_completo)}</b>
          {proposta.aceita_em ? ` · ${new Date(proposta.aceita_em).toLocaleString("pt-BR")}` : ""}
        </span>
        <button className="btn" style={{ fontSize: 11, padding: "4px 10px" }} onClick={verComprovante} disabled={carregando}>
          {carregando ? "…" : aberto ? "Esconder" : "Ver comprovante"}
        </button>
      </div>
      {erro && <div style={{ color: "var(--bad)", marginTop: 6 }}>{erro}</div>}
      {aberto && detalhes && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--stroke)", display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--stone)" }}>
          <span style={{ color: "var(--granite)" }}>Nome:</span><span>{detalhes.nome_completo}</span>
          <span style={{ color: "var(--granite)" }}>CPF:</span><span>{formatarCPF(detalhes.cpf)}</span>
          <span style={{ color: "var(--granite)" }}>IP:</span><span>{detalhes.ip || "—"}</span>
          <span style={{ color: "var(--granite)" }}>Data/hora:</span><span>{new Date(detalhes.aceita_em).toLocaleString("pt-BR")}</span>
          <span style={{ color: "var(--granite)" }}>Termos:</span><span>v{detalhes.termos_versao}</span>
          {detalhes.termos_hash && (
            <>
              <span style={{ color: "var(--granite)" }}>Hash do texto:</span>
              <span style={{ wordBreak: "break-all" }} title="SHA-256 do texto exato exibido no aceite -- prova o conteudo lido, nao so a versao">{detalhes.termos_hash}</span>
            </>
          )}
          <span style={{ color: "var(--granite)" }}>Navegador:</span><span style={{ wordBreak: "break-all" }}>{detalhes.user_agent || "—"}</span>
        </div>
      )}
    </div>
  );
}

function mascararNome(nome) {
  const s = String(nome || "").trim();
  const p = s.split(/\s+/);
  if (p.length < 2) return s;
  return `${p[0]} ${p[p.length - 1][0]}.`;
}
function formatarCPF(cpf) {
  const s = String(cpf || "").replace(/\D/g, "");
  return s.length === 11 ? `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}` : "—";
}

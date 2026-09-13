"use client";

import { useEffect, useRef, useState } from "react";
import { TERMOS_VERSAO, textoTermos } from "./termos";

const CHIPS_FEEDBACK = {
  atendimento: "Atendimento",
  localizacao: "Espaço",
  buffet_agradou: "Buffet",
  preco_adequado: "Preço",
  indicacao: "Indicação",
};

// Aceite eletronico com validade legal (Lei 14.063/2020 + MP 2.200-2/2001 +
// CC art. 219). Fluxo: (1) botao abre modal com termos, (2) usuario rola ate
// o fim -- checkbox desabilitado ate o scroll chegar embaixo, (3) preenche
// nome completo e CPF (validado), (4) confirma. O backend registra IP +
// User-Agent + timestamp + versao dos termos automaticamente.
export default function AceitarProposta({ propostaId, statusInicial, aceitaEmInicial, motivoInicial, contexto }) {
  const [status, setStatus] = useState(statusInicial);
  const [aceitaEm, setAceitaEm] = useState(aceitaEmInicial);
  const [motivo, setMotivo] = useState(motivoInicial);
  const [feedbackVisivel, setFeedbackVisivel] = useState(!motivoInicial);
  const [modalAberto, setModalAberto] = useState(false);

  async function enviarFeedback(chave) {
    setMotivo(chave);
    setFeedbackVisivel(false);
    await fetch(`/api/propostas/${propostaId}/aceitar`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo_categoria: chave }),
    });
  }

  if (status === "aceita") {
    return (
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div className="badge" style={{ background: "var(--sage-wash)", color: "var(--sage-dark)", fontSize: 12, padding: "8px 16px" }}>
          ✓ Proposta aceita {aceitaEm ? `em ${new Date(aceitaEm).toLocaleDateString("pt-BR")}` : ""}
        </div>
        <p style={{ fontSize: 13, color: "var(--stone)", marginTop: 10, lineHeight: 1.5 }}>
          A gente já foi avisado. Em breve enviamos um novo link com o <b>contrato definitivo</b> pra assinar, já com todos os detalhes de pagamento e cronograma.
        </p>
        {feedbackVisivel && (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--stroke)" }}>
            <p style={{ fontSize: 14, color: "var(--ink)", marginBottom: 12, fontWeight: 500 }}>Antes de sair: o que mais pesou na sua decisão?</p>
            <p style={{ fontSize: 12, color: "var(--granite)", marginTop: -8, marginBottom: 12 }}>Ajuda a gente a entender o que funciona.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {Object.entries(CHIPS_FEEDBACK).map(([v, l]) => (
                <button key={v} className="btn primary" style={{ fontSize: 13 }} onClick={() => enviarFeedback(v)}>{l}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (status === "perdida") return null;

  return (
    <div style={{ textAlign: "center", padding: "8px 0" }}>
      <button className="btn primary" onClick={() => setModalAberto(true)} style={{ fontSize: 16, padding: "14px 36px" }}>
        Aceitar proposta
      </button>
      <p style={{ fontSize: 11, color: "var(--granite)", marginTop: 10 }}>
        Ao clicar, você lê e aceita os termos. Registramos IP, data/hora e sua identificação: assinatura eletrônica válida sob a Lei 14.063/2020.
      </p>
      {modalAberto && (
        <ModalAceite
          propostaId={propostaId}
          contexto={contexto}
          onFechar={() => setModalAberto(false)}
          onAceito={(p) => { setStatus(p.status); setAceitaEm(p.aceita_em); setModalAberto(false); }}
        />
      )}
    </div>
  );
}

function ModalAceite({ propostaId, contexto, onFechar, onAceito }) {
  const [rolouAteFim, setRolouAteFim] = useState(false);
  const [concordou, setConcordou] = useState(false);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const conteudoRef = useRef(null);

  const termos = textoTermos(contexto || {});
  const nomeSobrenome = nome.trim().split(/\s+/).length >= 2;
  const cpfDigitos = cpf.replace(/\D/g, "");
  const cpfValido = validarCPFClient(cpfDigitos);
  const podeConfirmar = concordou && nomeSobrenome && cpfValido && !enviando;

  useEffect(() => {
    const el = conteudoRef.current;
    if (!el) return;
    function ver() {
      // margem de 8px pra tolerar diferencas de rounding no scroll
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setRolouAteFim(true);
    }
    ver();
    el.addEventListener("scroll", ver);
    return () => el.removeEventListener("scroll", ver);
  }, []);

  async function confirmar() {
    setEnviando(true); setErro("");
    const res = await fetch(`/api/propostas/${propostaId}/aceitar`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome_completo: nome.trim(), cpf: cpfDigitos, termos_versao: TERMOS_VERSAO,
      }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) return setErro(data.error || "não foi possível confirmar agora, tenta de novo em instantes.");
    onAceito(data.proposta);
  }

  function mascararCPFInput(v) {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-caixa" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-cabecalho">
          <div>
            <div className="eyebrow" style={{ animation: "none", opacity: 1 }}>Reserva de proposta</div>
            <h3 style={{ margin: "8px 0 0", fontFamily: "var(--display)", fontWeight: 500 }}>Antes de confirmar, leia até o fim</h3>
          </div>
          <button className="btn" onClick={onFechar} aria-label="Fechar" style={{ padding: "6px 10px" }}>✕</button>
        </div>

        <div ref={conteudoRef} className="modal-conteudo">
          {termos.map((s, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <h4 style={{ fontFamily: "var(--display)", fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>{s.titulo}</h4>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--stone)", margin: 0 }}>{s.corpo}</p>
            </div>
          ))}
          <p style={{ fontSize: 11, color: "var(--granite)", textAlign: "center", marginTop: 24 }}>Termos versão {TERMOS_VERSAO}. Fim do documento.</p>
        </div>

        <div className="modal-rodape">
          {!rolouAteFim ? (
            <p style={{ fontSize: 12, color: "var(--granite)", textAlign: "center", margin: "0 0 12px" }}>Role o texto até o fim pra liberar o aceite.</p>
          ) : (
            <>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer", fontSize: 13, marginBottom: 14 }}>
                <input type="checkbox" checked={concordou} onChange={(e) => setConcordou(e.target.checked)} style={{ marginTop: 3, flexShrink: 0 }} />
                <span>Li e concordo com os termos acima e com a política de tratamento de dados (LGPD).</span>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 10 }}>
                <div className="field" style={{ margin: 0 }}>
                  <label>Seu nome completo</label>
                  <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Juliana Alves" />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>CPF</label>
                  <input value={cpf} onChange={(e) => setCpf(mascararCPFInput(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" />
                </div>
              </div>
              {nome && !nomeSobrenome && <p style={{ fontSize: 11, color: "var(--bad)", margin: "6px 0 0" }}>Informe nome e sobrenome.</p>}
              {cpf && !cpfValido && <p style={{ fontSize: 11, color: "var(--bad)", margin: "6px 0 0" }}>CPF inválido.</p>}
              <button className="btn primary" onClick={confirmar} disabled={!podeConfirmar} style={{ width: "100%", padding: "14px 24px", fontSize: 15, marginTop: 16, fontWeight: 600 }}>
                {enviando ? "Confirmando…" : "Confirmar aceite"}
              </button>
              {erro && <p style={{ fontSize: 12, color: "var(--bad)", marginTop: 8, textAlign: "center" }}>{erro}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Mesma validacao do servidor (modulo 11) -- feedback imediato pro usuario.
// Nao substitui a checagem do backend, so evita submit de CPF obviamente errado.
function validarCPFClient(cpf) {
  if (!/^\d{11}$/.test(cpf)) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const nums = cpf.split("").map(Number);
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += nums[i] * (t + 1 - i);
    const dv = ((soma * 10) % 11) % 10;
    if (dv !== nums[t]) return false;
  }
  return true;
}

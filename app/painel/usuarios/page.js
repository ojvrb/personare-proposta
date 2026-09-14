"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/app/components/Toast";

const PAPEIS = { admin: "Admin", atendente: "Atendente", financeiro: "Financeiro" };

// exibe 5544 99999 8888 como (44) 99999-8888 -- so' pra input, backend guarda so digitos.
function formatarWhats(digitos) {
  const s = String(digitos || "").replace(/\D/g, "").replace(/^55/, "");
  if (s.length === 11) return `(${s.slice(0, 2)}) ${s.slice(2, 7)}-${s.slice(7)}`;
  if (s.length === 10) return `(${s.slice(0, 2)}) ${s.slice(2, 6)}-${s.slice(6)}`;
  return s;
}

export default function UsuariosPage() {
  const [dados, setDados] = useState(null);
  const [pendentes, setPendentes] = useState([]);
  const [erro, setErro] = useState("");
  const [emailConvite, setEmailConvite] = useState("");
  const [senhaConvite, setSenhaConvite] = useState("");
  const [papelConvite, setPapelConvite] = useState("atendente");
  const [convidando, setConvidando] = useState(false);
  const [resetando, setResetando] = useState(null); // { user_id, email }

  async function carregar() {
    const res = await fetch("/api/perfis");
    const data = await res.json();
    if (!res.ok) return setErro(data.error || "erro ao carregar");
    setDados(data);
    if (data.eu.role === "admin") {
      const t = await fetch("/api/transferencias").then((r) => r.json());
      setPendentes(t.pendentes || []);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function atualizar(userId, patch) {
    await fetch(`/api/perfis/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    carregar();
  }

  async function convidar(e) {
    e.preventDefault();
    if (!emailConvite.trim()) return;
    if (senhaConvite.length < 8) return setErro("senha precisa ter pelo menos 8 caracteres");
    setConvidando(true);
    setErro("");
    const res = await fetch("/api/perfis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailConvite.trim(), role: papelConvite, senha: senhaConvite }),
    });
    const data = await res.json();
    setConvidando(false);
    if (!res.ok) return setErro(data.error || "erro ao criar usuário");
    setEmailConvite("");
    setSenhaConvite("");
    carregar();
  }

  async function definirSenha(userId, senha) {
    const res = await fetch(`/api/perfis/${userId}/senha`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); return d.error || "erro ao definir senha"; }
    return null;
  }

  async function remover(userId, email) {
    if (!confirm(`Remover ${email}? Os leads dele ficam sem dono, mas nada é apagado.`)) return;
    await fetch(`/api/perfis/${userId}`, { method: "DELETE" });
    carregar();
  }

  async function resolverTransferencia(id, aprovar) {
    await fetch(`/api/transferencias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aprovar }),
    });
    carregar();
  }

  if (erro) return <div className="alert err">{erro}</div>;
  if (!dados) return <p style={{ color: "var(--granite)" }}>Carregando…</p>;

  if (dados.eu.role !== "admin") {
    return <div className="alert err">Acesso restrito a administradores.</div>;
  }

  return (
    <div>
      <h1>Usuários</h1>

      {pendentes.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Transferências pendentes</h3>
          {pendentes.map((t) => (
            <div key={t.id} className="resumo-linha">
              <span>
                <b>{t.clientes?.nome}{t.clientes?.nome_conjuge ? ` & ${t.clientes.nome_conjuge}` : ""}</b>: {t.de_email} → {t.para_email}
              </span>
              <span style={{ display: "flex", gap: 6 }}>
                <button className="btn primary" onClick={() => resolverTransferencia(t.id, true)}>Aprovar</button>
                <button className="btn" onClick={() => resolverTransferencia(t.id, false)}>Rejeitar</button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Equipe</h3>
        {erro && <div className="alert err">{erro}</div>}
        <p style={{ fontSize: 13, color: "var(--granite)", marginTop: -6, marginBottom: 14 }}>
          Nome e WhatsApp aparecem no rodapé de cada proposta pública feita por essa pessoa. O casal clica no telefone e cai direto no WhatsApp dela.
        </p>
        {dados.usuarios.map((u) => (
          <div key={u.user_id} style={{ padding: "12px 0", borderBottom: "1px solid var(--stroke)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <b style={{ fontSize: 14 }}>{u.email}</b>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select value={u.role} onChange={(e) => atualizar(u.user_id, { role: e.target.value })}>
                  {Object.entries(PAPEIS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button className="btn" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => setResetando({ user_id: u.user_id, email: u.email })}>Definir senha</button>
                {u.user_id !== dados.eu.user_id && (
                  <button className="btn" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => remover(u.user_id, u.email)}>Remover</button>
                )}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input
                placeholder="Nome (ex: Fernanda Alves)"
                defaultValue={u.nome || ""}
                onBlur={(e) => e.target.value !== (u.nome || "") && atualizar(u.user_id, { nome: e.target.value })}
              />
              <input
                placeholder="WhatsApp (ex: 42 99999-8888)"
                defaultValue={u.telefone_whatsapp ? formatarWhats(u.telefone_whatsapp) : ""}
                onBlur={(e) => e.target.value !== (u.telefone_whatsapp ? formatarWhats(u.telefone_whatsapp) : "") && atualizar(u.user_id, { telefone_whatsapp: e.target.value })}
              />
            </div>
          </div>
        ))}

        <form onSubmit={convidar} style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--stroke)" }}>
          <div style={{ fontSize: 13, color: "var(--stone)", marginBottom: 8, fontWeight: 500 }}>Adicionar pessoa nova à equipe</div>
          <p style={{ fontSize: 12, color: "var(--granite)", marginTop: 0, marginBottom: 10 }}>
            Você define a senha inicial e entrega pra pessoa junto com o email. Ela pode trocar depois em "Minha conta".
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="email"
              required
              placeholder="email@exemplo.com"
              value={emailConvite}
              onChange={(e) => setEmailConvite(e.target.value)}
              style={{ flex: 2, minWidth: 200 }}
            />
            <input
              type="text"
              required
              placeholder="senha inicial (min 8)"
              value={senhaConvite}
              onChange={(e) => setSenhaConvite(e.target.value)}
              style={{ flex: 1, minWidth: 160 }}
            />
            <select value={papelConvite} onChange={(e) => setPapelConvite(e.target.value)}>
              {Object.entries(PAPEIS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button className="btn primary" disabled={convidando}>{convidando ? "Criando…" : "+ Criar conta"}</button>
          </div>
        </form>
      </div>

      {resetando && <ModalResetSenha alvo={resetando} onFechar={() => setResetando(null)} onSalvar={definirSenha} />}
    </div>
  );
}

function ModalResetSenha({ alvo, onFechar, onSalvar }) {
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  async function salvar(e) {
    e.preventDefault();
    if (senha.length < 8) return setErro("mínimo 8 caracteres");
    setSalvando(true); setErro("");
    const err = await onSalvar(alvo.user_id, senha);
    setSalvando(false);
    if (err) return setErro(err);
    showToast(`Nova senha definida pra ${alvo.email}.`, "ok");
    onFechar();
  }
  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-caixa" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ maxWidth: 420 }}>
        <div className="modal-cabecalho">
          <div>
            <div className="eyebrow" style={{ animation: "none", opacity: 1 }}>Reset de senha</div>
            <h3 style={{ margin: "8px 0 0", fontFamily: "var(--display)", fontWeight: 500 }}>Nova senha pra {alvo.email}</h3>
          </div>
          <button className="btn" onClick={onFechar} aria-label="Fechar" style={{ padding: "6px 10px" }} type="button">✕</button>
        </div>
        <form onSubmit={salvar} className="modal-rodape" style={{ borderTop: "none" }}>
          {erro && <div className="alert err">{erro}</div>}
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="reset-senha">Senha (mínimo 8 caracteres)</label>
            <input id="reset-senha" type="text" autoFocus value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={8} />
          </div>
          <button className="btn primary" disabled={salvando} type="submit" style={{ width: "100%", marginTop: 14 }}>{salvando ? "Salvando…" : "Definir senha"}</button>
        </form>
      </div>
    </div>
  );
}

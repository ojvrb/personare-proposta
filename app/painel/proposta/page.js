"use client";

import { useEffect, useState } from "react";

// Editor da narrativa da proposta publica: os textos de cada capitulo
// (eyebrow/titulo/lead) sao editaveis em tempo real, com preview do default
// como placeholder. Momentos extras (foto full-bleed com legenda) podem ser
// adicionados em qualquer "gancho" da narrativa.
// Placeholders usam sintaxe amigavel: `{palavras}` viram italico dourado
// na proposta. O admin nao precisa saber HTML. Suporte a <em>...</em> antigo
// e' mantido no render (backward-compat), mas nunca sugerido na UI.
const CAPITULOS = [
  { chave: "espaco", label: "01. O lugar", padrao: { eyebrow: "O lugar", titulo: "O lugar do seu casamento {é aqui.}", lead: "A gente montou essa história pra você se ver caminhando por cada canto: a chegada, o salão, o jardim à noite. Deslize as fotos." } },
  { chave: "buffet", label: "02. A mesa", padrao: { eyebrow: "A mesa", titulo: "E o que {eles vão comer.}", lead: "Selecionamos essas opções de buffet pensando no perfil do seu evento." } },
  { chave: "pacote", label: "03. Antes do preço", padrao: { eyebrow: "Antes do preço", titulo: "O que {já está incluso.}", lead: "Antes de você olhar o investimento, vale ver tudo que já vem no pacote. Isso é o que a gente entrega pronto." } },
  { chave: "investimento", label: "04. Seu investimento", padrao: { eyebrow: "Seu investimento", titulo: "Combinado, então {é isso.}", lead: "Tudo que você viu até aqui, junto. Sem taxa escondida, sem asterisco." } },
  { chave: "depoimentos", label: "05. Depoimentos", padrao: { eyebrow: "Quem passou por aqui", titulo: "O que {eles guardam} do dia.", lead: null } },
];

const GANCHOS = [
  { chave: "hero", label: "logo depois da capa" },
  { chave: "espaco", label: "depois do lugar" },
  { chave: "buffet", label: "depois da mesa" },
  { chave: "pacote", label: "depois do que está incluso" },
  { chave: "investimento", label: "depois do investimento" },
];

export default function EditorProposta() {
  return (
    <div>
      <h1 style={{ marginBottom: 12 }}>Proposta pública</h1>
      <p style={{ color: "var(--granite)", marginTop: 0, marginBottom: 8, lineHeight: 1.6 }}>
        Edite o que cada casal lê em cada capítulo da proposta. Deixe em branco pra usar o texto padrão.
      </p>
      <p style={{ color: "var(--granite)", marginTop: 0, marginBottom: 28, lineHeight: 1.6 }}>
        No <b>título</b>, o que você colocar entre <code style={{ background: "var(--sage-wash)", padding: "2px 8px", borderRadius: 4 }}>{"{chaves}"}</code> vira <em style={{ background: "linear-gradient(100deg,var(--sage-dark),var(--gold-dark))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", fontStyle: "italic" }}>dourado em itálico</em>. Exemplo: <code style={{ background: "var(--creme-2)", padding: "2px 8px", borderRadius: 4 }}>Combinado, então {"{é isso.}"}</code>
      </p>
      <EditorTextos />
      <EditorMomentos />
    </div>
  );
}

const TIPOS = [
  { chave: null, label: "Padrão", desc: "Usado quando o tipo do evento não tem storytelling próprio." },
  { chave: "casamento", label: "Casamento", desc: "Só aparece em propostas de casamento." },
  { chave: "15_anos", label: "15 anos", desc: "Só aparece em propostas de 15 anos." },
  { chave: "corporativo", label: "Corporativo", desc: "Só aparece em propostas corporativas." },
  { chave: "aniversario", label: "Aniversário", desc: "Só aparece em propostas de aniversário." },
  { chave: "outro", label: "Outro", desc: "Só aparece em propostas do tipo Outro." },
];

function EditorTextos() {
  const [tipoAtivo, setTipoAtivo] = useState(null); // null = padrão (singleton)
  const [textos, setTextos] = useState(null);
  const [porTipo, setPorTipo] = useState({}); // { casamento: {...}, "15_anos": {...} }
  const [salvando, setSalvando] = useState({});
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/proposta-textos").then((r) => r.json()).then((d) => setTextos(d.item || {}));
    fetch("/api/proposta-textos-tipo").then((r) => r.json()).then((d) => {
      const idx = {};
      (d.items || []).forEach((t) => { idx[t.evento_tipo] = t; });
      setPorTipo(idx);
    });
  }, []);

  const ativo = tipoAtivo === null ? textos : (porTipo[tipoAtivo] || {});

  async function salvar(chave, campo, valor) {
    const marca = `${tipoAtivo || "padrao"}_${chave}_${campo}`;
    setSalvando((s) => ({ ...s, [marca]: true }));
    setErro("");
    const patch = { [`${chave}_${campo}`]: valor || null };
    const url = tipoAtivo === null ? "/api/proposta-textos" : "/api/proposta-textos-tipo";
    const body = tipoAtivo === null ? patch : { evento_tipo: tipoAtivo, ...patch };
    const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    setSalvando((s) => ({ ...s, [marca]: false }));
    if (!res.ok) return setErro(data.error || "erro ao salvar");
    if (tipoAtivo === null) setTextos(data.item);
    else setPorTipo((p) => ({ ...p, [tipoAtivo]: data.item }));
  }

  if (!textos) return <p style={{ color: "var(--granite)" }}>Carregando…</p>;

  const tipoInfo = TIPOS.find((t) => t.chave === tipoAtivo);

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ marginTop: 0, marginBottom: 8 }}>Textos por tipo de evento</h3>
      <p style={{ color: "var(--granite)", fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>
        Cada tipo pode ter seu próprio storytelling. Se um campo fica em branco num tipo específico, cai no <b>Padrão</b>. Se o Padrão também está em branco, cai no texto sugerido pelo sistema.
      </p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {TIPOS.map((t) => {
          const temCustom = t.chave !== null && porTipo[t.chave];
          return (
            <button key={t.chave || "padrao"} onClick={() => setTipoAtivo(t.chave)}
              style={{
                padding: "8px 14px", fontSize: 13, borderRadius: 100,
                border: `1px solid ${tipoAtivo === t.chave ? "var(--sage)" : "var(--stroke)"}`,
                background: tipoAtivo === t.chave ? "var(--sage-wash)" : "transparent",
                color: tipoAtivo === t.chave ? "var(--sage-dark)" : "var(--stone)",
                cursor: "pointer", fontWeight: 500, fontFamily: "var(--font)",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
              {t.label}
              {temCustom && <span style={{ width: 6, height: 6, borderRadius: 100, background: "var(--gold)" }} aria-label="tem personalização" />}
            </button>
          );
        })}
      </div>
      <p style={{ color: "var(--granite)", fontSize: 12, margin: "0 0 20px" }}>{tipoInfo.desc}</p>

      {erro && <div className="alert err">{erro}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {CAPITULOS.map((c) => (
          <div key={c.chave} style={{ paddingTop: 16, borderTop: "1px solid var(--stroke)" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
              <b style={{ fontFamily: "var(--display)", fontSize: 18 }}>{c.label}</b>
              <span style={{ fontSize: 11, color: "var(--granite)", fontFamily: "var(--mono)" }}>{c.chave}</span>
            </div>
            <CampoInput chave={`${tipoAtivo || "padrao"}_${c.chave}`} campo="eyebrow" label="Rótulo do capítulo" valor={ativo[`${c.chave}_eyebrow`] || ""} placeholder={placeholderCascata(tipoAtivo, textos, porTipo, c, "eyebrow")} salvando={salvando[`${tipoAtivo || "padrao"}_${c.chave}_eyebrow`]} onSalvar={(v) => salvar(c.chave, "eyebrow", v)} />
            <CampoInput chave={`${tipoAtivo || "padrao"}_${c.chave}_titulo`} campo="titulo" label={<>Título grande <span style={{ color: "var(--granite)", fontFamily: "var(--font)", textTransform: "none", fontSize: 11, letterSpacing: 0 }}>(use {"{chaves}"} pra pintar em dourado)</span></>} valor={ativo[`${c.chave}_titulo`] || ""} placeholder={placeholderCascata(tipoAtivo, textos, porTipo, c, "titulo")} salvando={salvando[`${tipoAtivo || "padrao"}_${c.chave}_titulo`]} onSalvar={(v) => salvar(c.chave, "titulo", v)} />
            {c.padrao.lead !== null && (
              <CampoTextarea chave={`${tipoAtivo || "padrao"}_${c.chave}_lead`} campo="lead" label="Frase de apoio (2-3 linhas embaixo do título)" valor={ativo[`${c.chave}_lead`] || ""} placeholder={placeholderCascata(tipoAtivo, textos, porTipo, c, "lead")} salvando={salvando[`${tipoAtivo || "padrao"}_${c.chave}_lead`]} onSalvar={(v) => salvar(c.chave, "lead", v)} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Placeholder mostra o "proximo nivel" da cascata: num tipo especifico, o
// placeholder e' o texto do padrao (pra ver o que vai valer se deixar em branco);
// no padrao, e' o texto sugerido pelo sistema. Ajuda o admin a ver de onde vem
// o texto que aparece na proposta.
function placeholderCascata(tipoAtivo, padrao, porTipo, c, campo) {
  if (tipoAtivo !== null) return padrao[`${c.chave}_${campo}`] || c.padrao[campo] || "";
  return c.padrao[campo] || "";
}

function CampoInput({ label, valor, placeholder, salvando, onSalvar }) {
  const [v, setV] = useState(valor);
  useEffect(() => { setV(valor); }, [valor]);
  return (
    <div className="field">
      <label>{label}{salvando && <span style={{ marginLeft: 8, color: "var(--granite)", fontFamily: "var(--font)", textTransform: "none", fontSize: 11 }}>salvando…</span>}</label>
      <input value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={() => v !== valor && onSalvar(v)} />
    </div>
  );
}

function CampoTextarea({ label, valor, placeholder, salvando, onSalvar }) {
  const [v, setV] = useState(valor);
  useEffect(() => { setV(valor); }, [valor]);
  return (
    <div className="field">
      <label>{label}{salvando && <span style={{ marginLeft: 8, color: "var(--granite)", fontFamily: "var(--font)", textTransform: "none", fontSize: 11 }}>salvando…</span>}</label>
      <textarea rows={3} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={() => v !== valor && onSalvar(v)} />
    </div>
  );
}

function EditorMomentos() {
  const [momentos, setMomentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [gancho, setGancho] = useState("hero");
  const [erro, setErro] = useState("");

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/proposta-momentos");
    const data = await res.json();
    if (res.ok) setMomentos((data.items || []).sort((a, b) => a.ordem - b.ordem));
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function enviarFoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setEnviando(true); setErro("");
    const fd = new FormData(); fd.append("file", file);
    const upRes = await fetch("/api/midia", { method: "POST", body: fd });
    const upData = await upRes.json();
    if (!upRes.ok) { setEnviando(false); return setErro(upData.error || "erro ao enviar foto"); }
    const novaOrdem = momentos.length ? Math.max(...momentos.map((m) => m.ordem)) + 1 : 0;
    await fetch("/api/proposta-momentos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ foto_url: upData.url, depois_de: gancho, ordem: novaOrdem }) });
    setEnviando(false);
    carregar();
  }

  async function atualizar(id, patch) {
    await fetch(`/api/proposta-momentos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    carregar();
  }
  async function remover(id) {
    await fetch(`/api/proposta-momentos/${id}`, { method: "DELETE" });
    carregar();
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Momentos extras <span style={{ fontSize: 12, fontWeight: 400, color: "var(--granite)" }}>(fotos-cheia entre capítulos, tipo Apple)</span></h3>
      <p style={{ color: "var(--granite)", fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        Cada momento é uma foto grande (sem card) que aparece na narrativa após o capítulo que você escolher. Uma frase curta opcional vira legenda no rodapé.
      </p>
      {erro && <div className="alert err">{erro}</div>}
      {loading ? (
        <p style={{ color: "var(--granite)" }}>Carregando…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {momentos.map((m) => (
            <div key={m.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", border: "1px solid var(--stroke)", borderRadius: 10, padding: 10, opacity: m.ativo ? 1 : 0.5 }}>
              <img src={m.foto_url} alt="" style={{ width: 96, height: 96, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <input placeholder="Frase de legenda (opcional)" defaultValue={m.frase || ""} onBlur={(e) => e.target.value !== (m.frase || "") && atualizar(m.id, { frase: e.target.value || null })} />
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select value={m.depois_de} onChange={(e) => atualizar(m.id, { depois_de: e.target.value })} style={{ padding: "6px 10px", fontSize: 13 }}>
                    {GANCHOS.map((g) => <option key={g.chave} value={g.chave}>Entra {g.label}</option>)}
                  </select>
                  <button className="btn" style={{ padding: "6px 10px" }} onClick={() => atualizar(m.id, { ativo: !m.ativo })}>{m.ativo ? "Desativar" : "Ativar"}</button>
                  <button className="btn" style={{ padding: "6px 10px" }} onClick={() => remover(m.id)}>Excluir</button>
                </div>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, padding: 12, border: "1px dashed var(--stroke)", borderRadius: 10 }}>
            <label className="btn primary" style={{ cursor: "pointer" }}>
              {enviando ? "Enviando…" : "+ Nova foto-momento"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={enviarFoto} disabled={enviando} style={{ display: "none" }} />
            </label>
            <select value={gancho} onChange={(e) => setGancho(e.target.value)} style={{ padding: "8px 12px" }}>
              {GANCHOS.map((g) => <option key={g.chave} value={g.chave}>Entra {g.label}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

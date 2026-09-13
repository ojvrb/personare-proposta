"use client";

import { useEffect, useState } from "react";

export default function CatalogoPage() {
  return (
    <div>
      <h1>Catálogo</h1>
      <p style={{ color: "var(--granite)", marginTop: -10, marginBottom: 24 }}>
        Pacotes, buffets e extras usados no configurador de proposta. Desativar em vez de excluir preserva propostas antigas que já usam esses itens.
      </p>

      <Secao
        titulo="Pacotes"
        endpoint="/api/pacotes"
        campoInicial={{ nome: "", preco: 0, itens_inclusos: "", itens_nao_inclusos: "", ativo: true }}
        renderCampos={PacoteCampos}
        resumo={(p) => `R$ ${Number(p.preco).toLocaleString("pt-BR")}`}
      />

      <Secao
        titulo="Buffets"
        endpoint="/api/buffets"
        campoInicial={{ nome: "", preco_pessoa: 0, descricao: "", itens: "", ativo: true }}
        renderCampos={BuffetCampos}
        resumo={(b) => `R$ ${Number(b.preco_pessoa).toLocaleString("pt-BR")}/pessoa`}
      />

      <Secao
        titulo="Extras"
        endpoint="/api/extras"
        campoInicial={{ nome: "", tipo_preco: "fixo", valor: 0, ativo: true }}
        renderCampos={ExtraCampos}
        resumo={(e) => `R$ ${Number(e.valor).toLocaleString("pt-BR")} (${e.tipo_preco})`}
      />

      <Secao
        titulo="Depoimentos"
        endpoint="/api/depoimentos"
        campoInicial={{ autor_nome: "", texto: "", foto: "", evento_tipo: "casamento", ativo: true }}
        renderCampos={DepoimentoCampos}
        resumo={(d) => `${d.evento_tipo || "—"}`}
        campoNome="autor_nome"
      />

      <GaleriaEspaco />
    </div>
  );
}

// "Nosso espaco" -- galeria de fotos de ambiente pra proposta publica (secao
// antes do preco, tipo historia). Ordem controla a sequencia; setas trocam
// posicao com o vizinho, mais simples que drag-and-drop pra reordenar poucas fotos.
function GaleriaEspaco() {
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/fotos-espaco");
    const data = await res.json();
    if (res.ok) setFotos((data.items || []).sort((a, b) => a.ordem - b.ordem));
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function enviarFoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setEnviando(true);
    setErro("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/midia", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) { setEnviando(false); return setErro(data.error || "erro ao enviar foto"); }

    const novaOrdem = fotos.length ? Math.max(...fotos.map((f) => f.ordem)) + 1 : 0;
    await fetch("/api/fotos-espaco", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: data.url, ordem: novaOrdem }),
    });
    setEnviando(false);
    carregar();
  }

  async function mudarLegenda(id, legenda) {
    setFotos((fs) => fs.map((f) => (f.id === id ? { ...f, legenda } : f)));
  }

  async function salvarLegenda(id, legenda) {
    await fetch(`/api/fotos-espaco/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legenda }),
    });
  }

  async function alternarAtivo(foto) {
    await fetch(`/api/fotos-espaco/${foto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !foto.ativo }),
    });
    carregar();
  }

  async function remover(id) {
    await fetch(`/api/fotos-espaco/${id}`, { method: "DELETE" });
    carregar();
  }

  async function mover(index, delta) {
    const alvo = index + delta;
    if (alvo < 0 || alvo >= fotos.length) return;
    const a = fotos[index], b = fotos[alvo];
    await Promise.all([
      fetch(`/api/fotos-espaco/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ordem: b.ordem }) }),
      fetch(`/api/fotos-espaco/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ordem: a.ordem }) }),
    ]);
    carregar();
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ marginTop: 0 }}>Nosso espaço</h3>
      <p style={{ color: "var(--granite)", fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        Galeria de fotos do ambiente que aparece na proposta pública, antes do preço. Monte a ordem como uma história (ex: fachada → salão → decoração à noite).
      </p>
      {erro && <div className="alert err">{erro}</div>}
      {loading ? (
        <p style={{ color: "var(--granite)" }}>Carregando…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {fotos.map((foto, i) => (
            <div key={foto.id} style={{ display: "flex", gap: 12, alignItems: "center", border: "1px solid var(--stroke)", borderRadius: 10, padding: 10, opacity: foto.ativo ? 1 : 0.5 }}>
              <img src={foto.url} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
              <input
                placeholder="Legenda (opcional)"
                value={foto.legenda || ""}
                onChange={(e) => mudarLegenda(foto.id, e.target.value)}
                onBlur={(e) => salvarLegenda(foto.id, e.target.value)}
                style={{ flex: 1, minWidth: 120 }}
              />
              <div style={{ display: "flex", gap: 4 }}>
                <button className="btn" style={{ padding: "6px 10px" }} onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Mover pra cima">↑</button>
                <button className="btn" style={{ padding: "6px 10px" }} onClick={() => mover(i, 1)} disabled={i === fotos.length - 1} aria-label="Mover pra baixo">↓</button>
                <button className="btn" style={{ padding: "6px 10px" }} onClick={() => alternarAtivo(foto)}>{foto.ativo ? "Desativar" : "Ativar"}</button>
                <button className="btn" style={{ padding: "6px 10px" }} onClick={() => remover(foto.id)}>Excluir</button>
              </div>
            </div>
          ))}

          <label className="btn primary" style={{ cursor: "pointer", textAlign: "center", marginTop: 6 }}>
            {enviando ? "Enviando…" : "+ Adicionar foto"}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={enviarFoto} disabled={enviando} style={{ display: "none" }} />
          </label>
        </div>
      )}
    </div>
  );
}

// Editor genérico de lista: os 4 catálogos (pacote/buffet/extra/depoimento) têm o
// mesmo fluxo (listar, editar inline, ativar/desativar, criar) — só os campos mudam.
// `campoNome` existe pra depoimentos, que usa autor_nome em vez de nome.
function Secao({ titulo, endpoint, campoInicial, renderCampos, resumo, campoNome = "nome" }) {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null); // id em edição
  const [rascunho, setRascunho] = useState({});
  const [novo, setNovo] = useState(campoInicial);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");

  async function carregar() {
    setLoading(true);
    const res = await fetch(endpoint);
    const data = await res.json();
    if (res.ok) setItens(temOrdem(data.items) ? [...data.items].sort((a, b) => a.ordem - b.ordem) : data.items);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  function iniciarEdicao(item) {
    setEditando(item.id);
    setRascunho({
      ...item,
      itens_inclusos: arrayParaTexto(item.itens_inclusos),
      itens_nao_inclusos: arrayParaTexto(item.itens_nao_inclusos),
      fotos: arrayParaTexto(item.fotos),
      itens: arrayParaTexto(item.itens),
    });
  }

  async function salvar(id) {
    setErro("");
    const payload = normalizarPayload(rascunho);
    const res = await fetch(`${endpoint}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return setErro(data.error || "erro ao salvar");
    setItens((all) => all.map((i) => (i.id === id ? data.item : i)));
    setEditando(null);
  }

  async function alternarAtivo(item) {
    const res = await fetch(`${endpoint}/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !item.ativo }),
    });
    const data = await res.json();
    if (res.ok) setItens((all) => all.map((i) => (i.id === item.id ? data.item : i)));
  }

  async function criar(e) {
    e.preventDefault();
    setErro("");
    setCriando(true);
    const payload = normalizarPayload(novo);
    payload.ordem = itens.length ? Math.max(...itens.map((i) => i.ordem || 0)) + 1 : 0;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setCriando(false);
    if (!res.ok) return setErro(data.error || "erro ao criar");
    setItens((all) => [...all, data.item]);
    setNovo(campoInicial);
  }

  async function mover(index, delta) {
    const alvo = index + delta;
    if (alvo < 0 || alvo >= itens.length) return;
    const a = itens[index], b = itens[alvo];
    await Promise.all([
      fetch(`${endpoint}/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ordem: b.ordem ?? alvo }) }),
      fetch(`${endpoint}/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ordem: a.ordem ?? index }) }),
    ]);
    carregar();
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ marginTop: 0 }}>{titulo}</h3>
      {erro && <div className="alert err">{erro}</div>}
      {loading ? (
        <p style={{ color: "var(--granite)" }}>Carregando…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {itens.map((item) =>
            editando === item.id ? (
              <div key={item.id} style={{ border: "1px solid var(--gold)", borderRadius: 8, padding: 12 }}>
                {renderCampos(rascunho, setRascunho)}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="btn primary" onClick={() => salvar(item.id)}>Salvar</button>
                  <button className="btn" onClick={() => setEditando(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div key={item.id} style={{ border: "1px solid var(--stroke)", borderRadius: 8, padding: 12, opacity: item.ativo ? 1 : 0.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <b>{item[campoNome]}</b> — {resumo(item)} {!item.ativo && <span className="badge">inativo</span>}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {temOrdem(itens) && (
                      <>
                        <button className="btn" style={{ padding: "6px 10px" }} onClick={() => mover(itens.indexOf(item), -1)} disabled={itens.indexOf(item) === 0} aria-label="Mover pra cima">↑</button>
                        <button className="btn" style={{ padding: "6px 10px" }} onClick={() => mover(itens.indexOf(item), 1)} disabled={itens.indexOf(item) === itens.length - 1} aria-label="Mover pra baixo">↓</button>
                      </>
                    )}
                    <button className="btn" onClick={() => iniciarEdicao(item)}>Editar</button>
                    <button className="btn" onClick={() => alternarAtivo(item)}>{item.ativo ? "Desativar" : "Ativar"}</button>
                  </div>
                </div>
                {Array.isArray(item.fotos) && (
                  <GaleriaItem
                    endpoint={endpoint}
                    item={item}
                    onChange={(fotos) => setItens((all) => all.map((i) => (i.id === item.id ? { ...i, fotos } : i)))}
                  />
                )}
              </div>
            )
          )}

          <form onSubmit={criar} style={{ border: "1px dashed var(--stroke)", borderRadius: 8, padding: 12, marginTop: 6 }}>
            <div style={{ fontSize: 12, color: "var(--granite)", marginBottom: 8 }}>+ Novo</div>
            {renderCampos(novo, setNovo)}
            <button type="submit" className="btn primary" disabled={criando} style={{ marginTop: 8 }}>
              {criando ? "Criando…" : "Adicionar"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function normalizarPayload(campos) {
  const out = { ...campos };
  if ("itens_inclusos" in out) out.itens_inclusos = textoParaArray(out.itens_inclusos);
  if ("itens_nao_inclusos" in out) out.itens_nao_inclusos = textoParaArray(out.itens_nao_inclusos);
  if ("fotos" in out) out.fotos = textoParaArray(out.fotos);
  if ("itens" in out) out.itens = textoParaArray(out.itens);
  delete out.id;
  delete out.created_at;
  return out;
}

function textoParaArray(txt) {
  if (Array.isArray(txt)) return txt;
  return (txt || "").split(",").map((s) => s.trim()).filter(Boolean);
}

function arrayParaTexto(arr) {
  return Array.isArray(arr) ? arr.join(", ") : arr || "";
}

// pacotes/buffets/extras ganharam "ordem" no sprint4; depoimentos ja tinha
// desde o sprint2 -- checa dinamicamente em vez de fixar quais tabelas tem.
function temOrdem(itens) {
  return itens.length > 0 && "ordem" in itens[0];
}

// Upload de uma foto so' -- ainda usado em Depoimentos (campo `foto` singular).
// Preenche o campo do rascunho; o "Salvar" do formulario e' que persiste.
function UploadFoto({ onUpload }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  async function enviar(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setEnviando(true); setErro("");
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/midia", { method: "POST", body: fd });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) return setErro(data.error || "erro ao enviar foto");
    onUpload(data.url);
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label className="btn" style={{ cursor: "pointer", fontSize: 12, padding: "6px 12px" }}>
        {enviando ? "Enviando…" : "+ Enviar foto"}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={enviar} disabled={enviando} style={{ display: "none" }} />
      </label>
      {erro && <span style={{ fontSize: 11, color: "var(--bad)" }}>{erro}</span>}
    </div>
  );
}

// Galeria de fotos por item (varias) -- upload/remocao/reordenacao persistem
// na hora (PATCH direto), sem depender de entrar em modo edicao. Substituiu
// a antiga combinacao "campo de URLs + botao upload" que confundia.
function GaleriaItem({ endpoint, item, onChange }) {
  const fotos = item.fotos || [];
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function persistir(novas) {
    onChange(novas);
    const res = await fetch(`${endpoint}/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fotos: novas }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error || "erro ao salvar");
      onChange(fotos);
    }
  }

  async function adicionar(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setEnviando(true);
    setErro("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/midia", { method: "POST", body: fd });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) return setErro(data.error || "erro ao enviar foto");
    await persistir([...fotos, data.url]);
  }

  async function remover(url) {
    await persistir(fotos.filter((u) => u !== url));
  }

  async function mover(index, delta) {
    const alvo = index + delta;
    if (alvo < 0 || alvo >= fotos.length) return;
    const copia = [...fotos];
    [copia[index], copia[alvo]] = [copia[alvo], copia[index]];
    await persistir(copia);
  }

  return (
    <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      {fotos.map((url, i) => (
        <div key={url} style={{ position: "relative", width: 72, height: 72 }}>
          <img src={url} alt="" style={{ width: 72, height: 72, borderRadius: 8, objectFit: "cover", display: "block" }} />
          <button
            type="button" onClick={() => remover(url)} aria-label="Remover foto"
            style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 100, border: "1px solid var(--line)", background: "var(--white)", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}
          >×</button>
          <div style={{ position: "absolute", bottom: 2, left: 2, display: "flex", gap: 2 }}>
            <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Mover foto pra esquerda"
              style={{ width: 20, height: 20, borderRadius: 4, border: "none", background: "rgba(0,0,0,.5)", color: "#fff", cursor: i === 0 ? "default" : "pointer", fontSize: 12, lineHeight: 1, padding: 0, opacity: i === 0 ? 0.4 : 1 }}>‹</button>
            <button type="button" onClick={() => mover(i, 1)} disabled={i === fotos.length - 1} aria-label="Mover foto pra direita"
              style={{ width: 20, height: 20, borderRadius: 4, border: "none", background: "rgba(0,0,0,.5)", color: "#fff", cursor: i === fotos.length - 1 ? "default" : "pointer", fontSize: 12, lineHeight: 1, padding: 0, opacity: i === fotos.length - 1 ? 0.4 : 1 }}>›</button>
          </div>
        </div>
      ))}
      <label style={{ width: 72, height: 72, borderRadius: 8, border: "1px dashed var(--stroke)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--granite)", fontSize: 12, textAlign: "center", padding: 4, background: "var(--creme-2)" }}>
        {enviando ? "…" : "+ foto"}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={adicionar} disabled={enviando} style={{ display: "none" }} />
      </label>
      {erro && <span style={{ fontSize: 11, color: "var(--bad)", flexBasis: "100%" }}>{erro}</span>}
    </div>
  );
}

function PacoteCampos(campos, set) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <input placeholder="Nome" value={campos.nome} onChange={(e) => set({ ...campos, nome: e.target.value })} />
      <input type="number" placeholder="Preço" value={campos.preco} onChange={(e) => set({ ...campos, preco: e.target.value })} />
      <input placeholder="Itens inclusos (separados por vírgula)" value={campos.itens_inclusos} onChange={(e) => set({ ...campos, itens_inclusos: e.target.value })} />
      <input placeholder="Itens não inclusos (separados por vírgula)" value={campos.itens_nao_inclusos} onChange={(e) => set({ ...campos, itens_nao_inclusos: e.target.value })} />
    </div>
  );
}

function BuffetCampos(campos, set) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <input placeholder="Nome" value={campos.nome} onChange={(e) => set({ ...campos, nome: e.target.value })} />
      <input type="number" placeholder="Preço por pessoa" value={campos.preco_pessoa} onChange={(e) => set({ ...campos, preco_pessoa: e.target.value })} />
      <input placeholder="Descrição" value={campos.descricao || ""} onChange={(e) => set({ ...campos, descricao: e.target.value })} />
      <textarea placeholder="Itens do cardápio (separados por vírgula)" rows={2} value={campos.itens || ""} onChange={(e) => set({ ...campos, itens: e.target.value })} />
    </div>
  );
}

function ExtraCampos(campos, set) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <input placeholder="Nome" value={campos.nome} onChange={(e) => set({ ...campos, nome: e.target.value })} />
      <select value={campos.tipo_preco} onChange={(e) => set({ ...campos, tipo_preco: e.target.value })}>
        <option value="fixo">Fixo</option>
        <option value="pessoa">Por pessoa</option>
        <option value="unidade">Por unidade</option>
      </select>
      <input type="number" placeholder="Valor" value={campos.valor} onChange={(e) => set({ ...campos, valor: e.target.value })} />
    </div>
  );
}

function DepoimentoCampos(campos, set) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <input placeholder="Nome do autor" value={campos.autor_nome} onChange={(e) => set({ ...campos, autor_nome: e.target.value })} />
      <textarea placeholder="Depoimento" rows={3} value={campos.texto || ""} onChange={(e) => set({ ...campos, texto: e.target.value })} />
      <input placeholder="URL da foto (opcional)" value={campos.foto || ""} onChange={(e) => set({ ...campos, foto: e.target.value })} />
      <UploadFoto onUpload={(url) => set({ ...campos, foto: url })} />
      <select value={campos.evento_tipo || "casamento"} onChange={(e) => set({ ...campos, evento_tipo: e.target.value })}>
        <option value="casamento">Casamento</option>
        <option value="15_anos">15 anos</option>
        <option value="corporativo">Corporativo</option>
        <option value="outro">Outro</option>
      </select>
    </div>
  );
}

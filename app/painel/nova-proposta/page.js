"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { calcularProposta } from "@/lib/pricing";

export default function NovaPropostaPage() {
  const [dados, setDados] = useState(null); // pacotes/buffets/extras
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const [nome, setNome] = useState("");
  const [nomeConjuge, setNomeConjuge] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [origem, setOrigem] = useState("");
  const [tipo, setTipo] = useState("casamento");
  const [dataEvento, setDataEvento] = useState("");
  const [numConvidados, setNumConvidados] = useState(100);
  const [pacoteId, setPacoteId] = useState("");
  const [buffetId, setBuffetId] = useState(""); // recomendado -- e' o que define o preco
  const [buffetsCurados, setBuffetsCurados] = useState([]); // ate 3 opcoes mostradas na vitrine publica
  const [extrasSel, setExtrasSel] = useState({}); // { extra_id: quantidade }
  const [desconto, setDesconto] = useState(0);

  useEffect(() => {
    fetch("/api/propostas")
      .then((r) => r.json())
      .then((d) => {
        setDados(d);
        if (d.pacotes?.[0]) setPacoteId(d.pacotes[0].id);
        if (d.buffets?.[0]) { setBuffetId(d.buffets[0].id); setBuffetsCurados([d.buffets[0].id]); }
      })
      .catch(() => setErro("erro ao carregar pacotes/buffets/extras"));
  }, []);

  const extrasSelecionados = useMemo(
    () => Object.entries(extrasSel).filter(([, qtd]) => qtd > 0).map(([extra_id, quantidade]) => ({ extra_id, quantidade })),
    [extrasSel]
  );

  const preview = useMemo(() => {
    if (!dados) return null;
    const pacote = dados.pacotes.find((p) => p.id === pacoteId);
    const buffet = dados.buffets.find((b) => b.id === buffetId);
    return calcularProposta({
      pacote,
      buffet,
      numConvidados: Number(numConvidados) || 0,
      extras: dados.extras,
      extrasSelecionados,
      desconto: Number(desconto) || 0,
    });
  }, [dados, pacoteId, buffetId, numConvidados, extrasSelecionados, desconto]);

  function toggleBuffetCurado(id) {
    setBuffetsCurados((atual) => {
      if (atual.includes(id)) {
        const restante = atual.filter((b) => b !== id);
        if (buffetId === id) setBuffetId(restante[0] || "");
        return restante;
      }
      if (atual.length >= 3) return atual; // vitrine e' curada, no maximo 3 opcoes
      if (atual.length === 0) setBuffetId(id);
      return [...atual, id];
    });
  }

  function toggleExtra(id, checked, tipoPreco) {
    setExtrasSel((s) => ({ ...s, [id]: checked ? (tipoPreco === "unidade" ? 1 : 1) : 0 }));
  }

  function setExtraQtd(id, qtd) {
    setExtrasSel((s) => ({ ...s, [id]: Number(qtd) || 0 }));
  }

  async function enviar(e) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const res = await fetch("/api/propostas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente: { nome, nome_conjuge: nomeConjuge, telefone, cidade, origem: origem || null },
        evento: { tipo, data_evento: dataEvento || null, num_convidados: Number(numConvidados) },
        pacote_id: pacoteId,
        buffet_id: buffetId,
        buffets_sugeridos: buffetsCurados,
        extras_selecionados: extrasSelecionados,
        desconto: Number(desconto) || 0,
      }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) return setErro(data.error || "erro ao criar proposta");
    setResultado(data);
  }

  if (resultado) {
    const link = typeof window !== "undefined" ? `${window.location.origin}${resultado.link}` : resultado.link;
    return (
      <div className="wrap">
        <div className="card" style={{ maxWidth: 500, margin: "60px auto", textAlign: "center" }}>
          <h2>Proposta criada!</h2>
          <p style={{ color: "var(--granite)" }}>Envie esse link pro cliente:</p>
          <div className="field">
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
            <a className="btn primary" href={resultado.link} target="_blank" rel="noopener noreferrer">Abrir proposta</a>
            <Link className="btn" href="/painel">Voltar pro CRM</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!dados) return <div className="wrap">Carregando…</div>;

  return (
    <div className="wrap">
      <div className="top">
        <h1>Nova proposta</h1>
        <Link href="/painel" className="btn">← Voltar</Link>
      </div>

      {erro && <div className="alert err">{erro}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
        <form onSubmit={enviar} className="card">
          <h3 style={{ marginTop: 0 }}>Cliente e evento</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Nome</label>
              <input required value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="field">
              <label>Nome do cônjuge (opcional)</label>
              <input value={nomeConjuge} onChange={(e) => setNomeConjuge(e.target.value)} />
            </div>
            <div className="field">
              <label>Telefone</label>
              <input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
            <div className="field">
              <label>Cidade</label>
              <input value={cidade} onChange={(e) => setCidade(e.target.value)} />
            </div>
            <div className="field">
              <label>Origem do lead</label>
              <select value={origem} onChange={(e) => setOrigem(e.target.value)}>
                <option value="">—</option>
                <option value="indicacao">Indicação</option>
                <option value="instagram">Instagram</option>
                <option value="evento_personare">Evento Personare</option>
                <option value="pesquisa_internet">Pesquisa na internet</option>
                <option value="site">Site</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="field">
              <label>Tipo de evento</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="casamento">Casamento</option>
                <option value="15_anos">15 anos</option>
                <option value="corporativo">Corporativo</option>
                <option value="aniversario">Aniversário</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="field">
              <label>Data do evento</label>
              <input type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} />
            </div>
            <div className="field">
              <label>Nº de convidados</label>
              <input type="number" min={0} required value={numConvidados} onChange={(e) => setNumConvidados(e.target.value)} />
            </div>
          </div>

          <h3>Pacote</h3>
          {dados.pacotes.map((p) => (
            <label key={p.id} className={`radio-row ${pacoteId === p.id ? "selected" : ""}`}>
              <input type="radio" name="pacote" checked={pacoteId === p.id} onChange={() => setPacoteId(p.id)} />
              {p.fotos?.[0] && <img src={p.fotos[0]} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />}
              <div>
                <div>{p.nome} — R$ {Number(p.preco).toLocaleString("pt-BR")}</div>
                <div style={{ fontSize: 11, color: "var(--granite)" }}>{(p.itens_inclusos || []).join(", ")}</div>
              </div>
            </label>
          ))}

          <h3>Buffet — monte a vitrine desse cliente</h3>
          <p style={{ fontSize: 12, color: "var(--granite)", marginTop: -8 }}>
            Escolha até 3 opções que você acha que esse cliente vai gostar (não precisa mostrar todas). O cliente vê essas opções como um cardápio na proposta.
          </p>
          {dados.buffets.map((b) => {
            const curado = buffetsCurados.includes(b.id);
            return (
              <label key={b.id} className={`check-row ${curado ? "selected" : ""}`}>
                <input type="checkbox" checked={curado} onChange={() => toggleBuffetCurado(b.id)} disabled={!curado && buffetsCurados.length >= 3} />
                {b.fotos?.[0] && <img src={b.fotos[0]} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>{b.nome} — R$ {Number(b.preco_pessoa).toLocaleString("pt-BR")}/pessoa</div>
                {curado && (
                  <button
                    type="button"
                    onClick={() => setBuffetId(b.id)}
                    className="btn"
                    style={{ fontSize: 10, padding: "3px 8px", background: buffetId === b.id ? "var(--gold)" : "var(--lift)", color: buffetId === b.id ? "#211408" : "var(--bone)" }}
                  >
                    {buffetId === b.id ? "★ Recomendado" : "Marcar recomendado"}
                  </button>
                )}
              </label>
            );
          })}

          <h3>Extras</h3>
          {dados.extras.map((ex) => {
            const qtd = extrasSel[ex.id] || 0;
            return (
              <label key={ex.id} className={`check-row ${qtd > 0 ? "selected" : ""}`}>
                <input type="checkbox" checked={qtd > 0} onChange={(e) => toggleExtra(ex.id, e.target.checked, ex.tipo_preco)} />
                <div style={{ flex: 1 }}>
                  {ex.nome} — R$ {Number(ex.valor).toLocaleString("pt-BR")}
                  {ex.tipo_preco === "pessoa" ? "/pessoa" : ex.tipo_preco === "unidade" ? "/unidade" : ""}
                </div>
                {ex.tipo_preco === "unidade" && qtd > 0 && (
                  <input type="number" min={1} value={qtd} onChange={(e) => setExtraQtd(ex.id, e.target.value)} style={{ width: 60 }} />
                )}
              </label>
            );
          })}

          <div className="field">
            <label>Desconto (R$)</label>
            <input type="number" min={0} value={desconto} onChange={(e) => setDesconto(e.target.value)} />
          </div>

          <button type="submit" className="btn primary" disabled={enviando} style={{ width: "100%" }}>
            {enviando ? "Gerando…" : "Gerar proposta e link público"}
          </button>
        </form>

        <div className="card" style={{ position: "sticky", top: 20 }}>
          <h3 style={{ marginTop: 0 }}>Resumo</h3>
          {preview && (
            <>
              <div className="resumo-linha"><span>Pacote</span><span>R$ {preview.precoPacote.toLocaleString("pt-BR")}</span></div>
              <div className="resumo-linha"><span>Buffet ({numConvidados}p)</span><span>R$ {preview.precoBuffet.toLocaleString("pt-BR")}</span></div>
              <div className="resumo-linha"><span>Extras</span><span>R$ {preview.precoExtras.toLocaleString("pt-BR")}</span></div>
              <div className="resumo-linha"><span>Desconto</span><span>- R$ {Number(desconto || 0).toLocaleString("pt-BR")}</span></div>
              <div className="resumo-total"><span>Total</span><span>R$ {preview.total.toLocaleString("pt-BR")}</span></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

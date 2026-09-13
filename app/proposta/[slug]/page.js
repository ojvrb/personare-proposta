import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { publicClient } from "@/lib/supabase/public";
import { expurgar } from "@/lib/proposta";
import BuffetSlider from "./BuffetSlider";
import PacoteGallery from "./PacoteGallery";
import EspacoStory from "./EspacoStory";
import Reveal from "@/app/components/Reveal";
import AceitarProposta from "./AceitarProposta";
import Momento from "./Momento";
import { EscolhaBuffetProvider } from "./EscolhaBuffetContext";
import InvestimentoBloco from "./InvestimentoBloco";

// Renderiza um titulo customizado. Aceita duas sintaxes de destaque:
//   1) `{palavras}` -- forma amigavel do editor admin
//   2) `<em>palavras</em>` -- compat com strings antigas
// As duas viram <em> italico gradient. Nada mais e' interpretado como HTML.
function tituloCustom(entrada) {
  const s = String(entrada).replace(/\{([^}]+)\}/g, "<em>$1</em>");
  const partes = s.split(/(<em>[^<]*<\/em>)/g);
  return partes.map((p, i) => {
    const m = p.match(/^<em>(.*)<\/em>$/);
    return m ? <em key={i}>{m[1]}</em> : <span key={i}>{p}</span>;
  });
}

export const dynamic = "force-dynamic";

async function getProposta(slug) {
  const supabase = adminClient();
  const { data: propostaBruta } = await supabase.from("propostas").select("*").eq("slug", slug).single();
  if (!propostaBruta) return null;
  // Expurga CPF/IP/UA antes de qualquer prop chegar em componente client --
  // esses campos so' devem ser vistos pelo admin, via rota dedicada.
  const proposta = expurgar(propostaBruta);

  const [{ data: evento }, { data: pacote }, { data: buffet }, { data: extras }, { data: contrato }, { data: depoimentos }, { data: fotosEspaco }, { data: textosCustom }, { data: momentos }] = await Promise.all([
    supabase.from("eventos").select("*, clientes(*)").eq("id", proposta.evento_id).single(),
    proposta.pacote_id ? supabase.from("pacotes").select("*").eq("id", proposta.pacote_id).single() : Promise.resolve({ data: null }),
    proposta.buffet_id ? supabase.from("buffets").select("*").eq("id", proposta.buffet_id).single() : Promise.resolve({ data: null }),
    supabase.from("extras").select("*"),
    supabase.from("contratos").select("*, pagamentos(*)").eq("evento_id", proposta.evento_id).limit(1),
    publicClient().from("depoimentos").select("*").eq("ativo", true).order("ordem"),
    publicClient().from("fotos_espaco").select("*").eq("ativo", true).order("ordem"),
    publicClient().from("proposta_textos").select("*").eq("id", 1).maybeSingle(),
    publicClient().from("proposta_momentos").select("*").eq("ativo", true).order("ordem"),
  ]);
  const contratoAtual = contrato?.[0] || null;

  // Perfil do atendente pra assinar o rodape ("proposta feita por Fernanda").
  // adminClient pra ler mesmo com RLS restrito -- proposta e' publica, entao
  // o dado do responsavel tb precisa vir independente de sessao do lado do casal.
  const { data: atendente } = proposta.atendente_id
    ? await supabase.from("perfis").select("nome, telefone_whatsapp").eq("user_id", proposta.atendente_id).maybeSingle()
    : { data: null };

  const idsVitrine = proposta.buffets_sugeridos?.length ? proposta.buffets_sugeridos : (proposta.buffet_id ? [proposta.buffet_id] : []);
  const { data: buffetsVitrine } = idsVitrine.length
    ? await supabase.from("buffets").select("*").in("id", idsVitrine)
    : { data: [] };
  const vitrineBuffets = idsVitrine.map((id) => buffetsVitrine.find((b) => b.id === id)).filter(Boolean);

  const extrasEscolhidos = (proposta.extras_selecionados || [])
    .map((sel) => {
      const extra = extras?.find((e) => e.id === sel.extra_id);
      return extra ? { ...extra, quantidade: sel.quantidade } : null;
    })
    .filter(Boolean);

  return { proposta, evento, cliente: evento?.clientes, pacote, buffet, vitrineBuffets, extrasEscolhidos, extrasTodos: extras || [], contrato: contratoAtual, depoimentos: depoimentos || [], fotosEspaco: fotosEspaco || [], textosCustom: textosCustom || {}, momentos: momentos || [], atendente };
}

// Defaults dos textos -- se o admin nao editou o campo em /painel/proposta,
// cai pra esses. Sempre "algo" vem, nunca vazio.
const TEXTOS_DEFAULT = {
  espaco: { eyebrow: "O lugar", titulo: "O lugar do seu <TIPO> <em>é aqui.</em>", lead: "A gente montou essa história pra você se ver caminhando por cada canto: a chegada, o salão, o jardim à noite. Deslize as fotos." },
  buffet: { eyebrow: "A mesa", titulo: "E o que <em>eles vão comer.</em>", lead: "Selecionamos <OPCOES> de buffet pensando no perfil do seu evento.<ARRASTE> O cardápio completo aparece embaixo da foto." },
  pacote: { eyebrow: "Antes do preço", titulo: "O que <em>já está incluso.</em>", lead: "Antes de você olhar o investimento, vale ver tudo que já vem no pacote. Isso é o que a gente entrega pronto, sem você precisar contratar à parte." },
  investimento: { eyebrow: "Seu investimento", titulo: "Combinado, então <em>é isso.</em>", lead: "Tudo que você viu até aqui, junto. Sem taxa escondida, sem asterisco." },
  depoimentos: { eyebrow: "Quem passou por aqui", titulo: "O que <em>eles guardam</em> do dia.", lead: null },
};
function texto(custom, chave, campo, tipoEvento, nBuffets = 0) {
  const v = custom[`${chave}_${campo}`];
  const padrao = TEXTOS_DEFAULT[chave][campo];
  return (v || padrao || "")
    .replace("<TIPO>", tipoEvento === "casamento" ? "casamento" : "evento")
    .replace("<OPCOES>", nBuffets === 1 ? "essa opção" : `essas ${nBuffets} opções`)
    .replace("<ARRASTE>", nBuffets > 1 ? " Arraste pra conhecer cada uma." : "");
}

export default async function PropostaPublicaPage({ params }) {
  const { slug } = await params;
  const dados = await getProposta(slug);
  if (!dados) notFound();

  const { proposta, evento, cliente, pacote, vitrineBuffets, extrasEscolhidos, extrasTodos, contrato, depoimentos, fotosEspaco, textosCustom, momentos, atendente } = dados;
  const t = (chave, campo) => texto(textosCustom, chave, campo, evento?.tipo, vitrineBuffets.length);
  const jaAceita = proposta.status === "aceita";
  const momentosDe = (gancho) => momentos.filter((m) => m.depois_de === gancho);
  const jaAssinado = contrato?.status === "assinado";
  const pagamentos = contrato?.pagamentos || [];
  const totalPago = pagamentos.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.valor), 0);

  const diasRestantes = proposta.valida_ate
    ? Math.ceil((new Date(`${proposta.valida_ate}T00:00:00`) - new Date(new Date().toDateString())) / 86400000)
    : null;
  const expirada = diasRestantes !== null && diasRestantes < 0;
  const corValidade = expirada ? "var(--red)" : diasRestantes <= 3 ? "var(--amber)" : "var(--green)";
  const fotoCapa = fotosEspaco[0]?.url || pacote?.fotos?.[0] || null;

  // capitulos numerados que EXISTEM neste caso -- pula secao se nao tem
  // conteudo (ex: sem fotos_espaco, sem buffets curados). A numeracao 01/02/...
  // refleite a narrativa real que o casal ve, nao slots vazios.
  const capitulos = [
    fotosEspaco.length > 0 && "espaco",
    vitrineBuffets.length > 0 && "buffet",
    pacote && "pacote",
    "investimento",
    depoimentos.length > 0 && "depoimentos",
  ].filter(Boolean);
  const num = (nome) => String(capitulos.indexOf(nome) + 1).padStart(2, "0");

  return (
    <div>
      {/* ============================================================
          HERO -- o nome do casal, uma foto de fundo cheia. Se nao tem
          foto de espaco, cai pro fundo com glow ambiente pra ainda ter
          escala tipografica sem parecer vazio.
          ============================================================ */}
      <section className={`hero${fotoCapa ? " com-foto" : ""}`} style={{ padding: "clamp(100px,14vh,180px) 0 clamp(64px,10vh,120px)", textAlign: "center", minHeight: "80vh", display: "flex", alignItems: "center" }}>
        {fotoCapa ? (
          <>
            <div className="hero-cover" style={{ backgroundImage: `url(${fotoCapa})` }} />
            <div className="hero-cover-overlay" />
          </>
        ) : (
          <div className="hero-glow" />
        )}
        <div className="wrap" style={{ maxWidth: 920 }}>
          <span className="eyebrow">Espaço Personare · Ponta Grossa</span>
          <h1 className="hero-name">
            {cliente?.nome_conjuge ? (
              <>{cliente.nome} <em>&amp;</em> {cliente.nome_conjuge}</>
            ) : (
              cliente?.nome
            )}
          </h1>
          <div className="hero-name-underline" />
          <p className="hero-meta" style={{ color: "var(--stone)", fontSize: 16, margin: 0 }}>
            {evento?.tipo} · {evento?.num_convidados} convidados
            {evento?.data_evento ? ` · ${new Date(`${evento.data_evento}T00:00:00`).toLocaleDateString("pt-BR")}` : ""}
          </p>
        </div>
      </section>

      {momentosDe("hero").map((m) => <Momento key={m.id} momento={m} />)}

      {/* CAPITULO 01 -- O LUGAR */}
      {fotosEspaco.length > 0 && (
        <section className="story">
          <div className="story-wrap">
            <Reveal>
              <div className="story-kicker"><b>{num("espaco")}</b><span>{t("espaco", "eyebrow")}</span></div>
              <h2 className="story-title">{tituloCustom(t("espaco", "titulo"))}</h2>
              <p className="story-lead">{t("espaco", "lead")}</p>
            </Reveal>
            <Reveal>
              <div className="story-media">
                <EspacoStory fotos={fotosEspaco} />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {momentosDe("espaco").map((m) => <Momento key={m.id} momento={m} />)}

      {/* Do capitulo 02 ate o 04, tudo dentro do Provider da escolha de buffet
          -- assim o slider (client) e o bloco de investimento (client) leem
          o mesmo estado. As secoes SERVER entre eles (checklist do pacote)
          continuam server-rendered normalmente, sao apenas children do provider. */}
      <EscolhaBuffetProvider recomendadoId={proposta.buffet_id}>

      {/* CAPITULO 02 -- A COMIDA */}
      {vitrineBuffets.length > 0 && (
        <section className="story story--wash">
          <div className="story-wrap">
            <Reveal>
              <div className="story-kicker"><b>{num("buffet")}</b><span>{t("buffet", "eyebrow")}</span></div>
              <h2 className="story-title">{tituloCustom(t("buffet", "titulo"))}</h2>
              <p className="story-lead">{t("buffet", "lead")}</p>
            </Reveal>
            <Reveal>
              <div className="story-media" style={{ background: "var(--white)", padding: "clamp(20px,3vw,32px)" }}>
                <BuffetSlider buffets={vitrineBuffets} recomendadoId={proposta.buffet_id} numConvidados={evento?.num_convidados} />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {momentosDe("buffet").map((m) => <Momento key={m.id} momento={m} />)}

      {/* CAPITULO 03 -- O QUE ESTA INCLUSO (pacote + extras) */}
      {pacote && (
        <section className="story">
          <div className="story-wrap">
            <Reveal>
              <div className="story-kicker"><b>{num("pacote")}</b><span>{t("pacote", "eyebrow")}</span></div>
              <h2 className="story-title">{tituloCustom(t("pacote", "titulo"))}</h2>
              <p className="story-lead">{t("pacote", "lead")}</p>
            </Reveal>

            {pacote.fotos?.length > 0 && (
              <Reveal>
                <div className="story-media" style={{ marginBottom: 40 }}>
                  <PacoteGallery pacote={pacote} />
                </div>
              </Reveal>
            )}

            <div style={{ display: "grid", gridTemplateColumns: extrasEscolhidos.length > 0 ? "1fr 1fr" : "1fr", gap: "clamp(24px,3vw,48px)", maxWidth: 1000, margin: "40px auto 0" }}>
              <Reveal>
                <div>
                  <div className="eyebrow" style={{ animation: "none", opacity: 1, marginBottom: 14 }}>Está incluso</div>
                  <h3 style={{ fontFamily: "var(--display)", fontSize: "clamp(32px,3.6vw,44px)", fontWeight: 500, margin: "0 0 20px", letterSpacing: "-0.01em" }}>{pacote.nome}</h3>
                  <ul className="checklist">
                    {(pacote.itens_inclusos || []).map((item, i) => <li key={i} className="stagger-item">{item}</li>)}
                  </ul>
                  {pacote.itens_nao_inclusos?.length > 0 && (
                    <>
                      <h4 style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 500, marginTop: 28, marginBottom: 8, color: "var(--stone)" }}>Não inclui</h4>
                      <ul className="checklist checklist--excl">
                        {pacote.itens_nao_inclusos.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </>
                  )}
                </div>
              </Reveal>

              {extrasEscolhidos.length > 0 && (
                <Reveal>
                  <div>
                    <div className="eyebrow" style={{ animation: "none", opacity: 1, marginBottom: 14 }}>Você escolheu</div>
                    <h3 style={{ fontFamily: "var(--display)", fontSize: "clamp(28px,3.2vw,36px)", fontWeight: 500, margin: "0 0 20px", letterSpacing: "-0.01em" }}>Extras selecionados</h3>
                    <ul className="checklist">
                      {extrasEscolhidos.map((ex) => (
                        <li key={ex.id} className="stagger-item" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          {ex.fotos?.[0] && (
                            <img src={ex.fotos[0]} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", flexShrink: 0, marginLeft: -8 }} />
                          )}
                          <span style={{ flex: 1 }}>{ex.nome}{ex.tipo_preco === "unidade" ? ` × ${ex.quantidade}` : ""}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              )}
            </div>
          </div>
        </section>
      )}

      {momentosDe("pacote").map((m) => <Momento key={m.id} momento={m} />)}

      {/* CAPITULO 04 -- INVESTIMENTO. Se ja tem contrato assinado, esse capitulo
          vira "Ja e' oficial" e mostra o cronograma de pagamentos no lugar do
          botao de aceitar -- antes os dois apareciam juntos (bug: aceitar +
          confirmado ao mesmo tempo). */}
      <section className="story story--wash">
        <div className="story-narrow">
          <Reveal>
            <div className="story-kicker"><b>{num("investimento")}</b><span>{jaAssinado ? "Já é oficial" : t("investimento", "eyebrow")}</span></div>
            <h2 className="story-title" style={{ textAlign: "center" }}>
              {jaAssinado
                ? <>Seu evento <em>está confirmado.</em></>
                : tituloCustom(t("investimento", "titulo"))}
            </h2>
            <p className="story-lead" style={{ textAlign: "center", margin: "0 auto" }}>
              {jaAssinado
                ? "O contrato já foi assinado. A gente segue com você até o dia."
                : t("investimento", "lead")}
            </p>
          </Reveal>

          <Reveal>
            <InvestimentoBloco
              proposta={proposta}
              pacote={pacote}
              buffets={vitrineBuffets}
              extras={extrasTodos}
              extrasEscolhidos={extrasEscolhidos}
              numConvidados={evento?.num_convidados || 0}
              jaAssinado={jaAssinado}
              valorContratado={contrato?.valor_contratado}
              evento={evento}
            />
          </Reveal>

          {proposta.valida_ate && !jaAssinado && !jaAceita && (
            <Reveal style={{ marginTop: 20 }}>
              <div className="flat-card" style={{ padding: "16px 20px", textAlign: "center", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: corValidade }} />
                <div style={{ color: corValidade, fontWeight: 700, fontSize: 15 }}>
                  {expirada
                    ? `Proposta expirada em ${new Date(`${proposta.valida_ate}T00:00:00`).toLocaleDateString("pt-BR")}`
                    : `Valores garantidos até ${new Date(`${proposta.valida_ate}T00:00:00`).toLocaleDateString("pt-BR")} · faltam ${diasRestantes} dia${diasRestantes === 1 ? "" : "s"}`}
                </div>
                <p style={{ fontSize: 12, color: "var(--granite)", margin: "4px 0 0" }}>
                  {expirada
                    ? "Preços de buffet mudam rápido. Fale com a gente pra atualizar sua proposta."
                    : "Preço de buffet muda rápido: depois dessa data os valores podem ser reajustados."}
                </p>
              </div>
            </Reveal>
          )}

          {jaAssinado && (
            <Reveal style={{ marginTop: 20 }}>
              <div className="flat-card" style={{ padding: 24 }}>
                <h3 style={{ marginTop: 0, fontFamily: "var(--display)", fontWeight: 500 }}>Cronograma de pagamento</h3>
                <p style={{ fontSize: 13, color: "var(--stone)" }}>
                  Pago: R$ {totalPago.toLocaleString("pt-BR")} de R$ {Number(contrato.valor_contratado).toLocaleString("pt-BR")}
                </p>
                {pagamentos.map((p) => (
                  <div key={p.id} className="resumo-linha">
                    <span>{p.descricao}{p.vencimento ? ` (venc. ${new Date(p.vencimento).toLocaleDateString("pt-BR")})` : ""}</span>
                    <span>
                      R$ {Number(p.valor).toLocaleString("pt-BR")}{" "}
                      <span className="badge">{p.status === "pago" ? "pago" : "pendente"}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Reveal>
          )}
        </div>
      </section>

      </EscolhaBuffetProvider>

      {momentosDe("investimento").map((m) => <Momento key={m.id} momento={m} />)}

      {/* CAPITULO 05 -- DEPOIMENTOS (fecha a narrativa: quem ja fez, o que achou) */}
      {depoimentos.length > 0 && (
        <section className="story">
          <div className="story-wrap">
            <Reveal>
              <div className="story-kicker"><b>{num("depoimentos")}</b><span>{t("depoimentos", "eyebrow")}</span></div>
              <h2 className="story-title">{tituloCustom(t("depoimentos", "titulo"))}</h2>
            </Reveal>
            <Reveal>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginTop: 32 }}>
                {depoimentos.map((d) => (
                  <div key={d.id} className="flat-card" style={{ padding: 24 }}>
                    {d.foto && <img src={d.foto} alt={d.autor_nome} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", marginBottom: 12 }} />}
                    <p style={{ fontSize: 15, color: "var(--stone)", fontStyle: "italic", lineHeight: 1.5, margin: "0 0 12px" }}>&ldquo;{d.texto}&rdquo;</p>
                    <p style={{ fontSize: 13, color: "var(--gold-dark)", fontWeight: 600, margin: 0 }}>{d.autor_nome}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      <RodapeAssinatura atendente={atendente} />
    </div>
  );
}

// Rodape: assina a proposta com o nome do atendente que a preparou e um link
// direto pro WhatsApp dele. Se o admin nao preencheu nome+telefone em
// /painel/usuarios, cai pra mensagem generica sem link.
function RodapeAssinatura({ atendente }) {
  const temContato = atendente?.nome && atendente?.telefone_whatsapp;
  return (
    <div className="wrap" style={{ maxWidth: 720, textAlign: "center", padding: "24px 0 56px" }}>
      {temContato ? (
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "24px 32px", background: "var(--white)", border: "1px solid var(--stroke)", borderRadius: 16 }}>
          <span className="eyebrow" style={{ animation: "none", opacity: 1 }}>Sua proposta foi feita por</span>
          <b style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 500, color: "var(--ink)" }}>{atendente.nome}</b>
          <a
            href={`https://wa.me/${atendente.telefone_whatsapp}?text=${encodeURIComponent(`Oi ${atendente.nome.split(" ")[0]}, tudo bem? Estou olhando a proposta e queria tirar uma dúvida.`)}`}
            target="_blank" rel="noopener"
            className="btn primary"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, marginTop: 4 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.76.46 3.42 1.27 4.86L2 22l5.28-1.39A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm5.15 14.14c-.22.62-1.28 1.19-1.79 1.22-.46.03-1.03.04-1.65-.11-.38-.09-.87-.25-1.5-.51-2.63-1.11-4.35-3.7-4.48-3.87-.13-.17-1.07-1.42-1.07-2.71 0-1.29.68-1.92.92-2.19.24-.27.53-.34.7-.34l.51.01c.16.01.38-.06.6.46.22.53.75 1.83.82 1.96.07.13.11.28.02.45-.09.17-.14.28-.27.43-.13.15-.28.34-.4.46-.13.13-.27.28-.12.55.15.27.68 1.11 1.45 1.8.99.88 1.82 1.15 2.09 1.28.27.13.42.11.58-.07.16-.18.66-.77.84-1.03.18-.27.37-.22.62-.13.25.09 1.59.75 1.86.89.27.13.45.2.52.31.06.11.06.65-.16 1.27z"/></svg>
            Falar no WhatsApp
          </a>
          <span style={{ fontSize: 12, color: "var(--granite)", fontFamily: "var(--mono)" }}>{formatarWhatsPub(atendente.telefone_whatsapp)}</span>
        </div>
      ) : (
        <p style={{ color: "var(--granite)", fontSize: 13 }}>
          Fale com o Personare pra tirar dúvidas ou fechar sua data.
        </p>
      )}
    </div>
  );
}

function formatarWhatsPub(digitos) {
  const s = String(digitos || "").replace(/\D/g, "").replace(/^55/, "");
  if (s.length === 11) return `(${s.slice(0, 2)}) ${s.slice(2, 7)}-${s.slice(7)}`;
  if (s.length === 10) return `(${s.slice(0, 2)}) ${s.slice(2, 6)}-${s.slice(6)}`;
  return s;
}

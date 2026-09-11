import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { publicClient } from "@/lib/supabase/public";
import BuffetSlider from "./BuffetSlider";
import Reveal from "@/app/components/Reveal";
import AceitarProposta from "./AceitarProposta";

export const dynamic = "force-dynamic";

async function getProposta(slug) {
  const supabase = adminClient();
  const { data: proposta } = await supabase.from("propostas").select("*").eq("slug", slug).single();
  if (!proposta) return null;

  const [{ data: evento }, { data: pacote }, { data: buffet }, { data: extras }, { data: contrato }, { data: depoimentos }] = await Promise.all([
    supabase.from("eventos").select("*, clientes(*)").eq("id", proposta.evento_id).single(),
    proposta.pacote_id ? supabase.from("pacotes").select("*").eq("id", proposta.pacote_id).single() : Promise.resolve({ data: null }),
    proposta.buffet_id ? supabase.from("buffets").select("*").eq("id", proposta.buffet_id).single() : Promise.resolve({ data: null }),
    supabase.from("extras").select("*"),
    supabase.from("contratos").select("*, pagamentos(*)").eq("evento_id", proposta.evento_id).limit(1),
    // depoimentos usa o cliente publico (anon), respeitando a politica de RLS
    // "leitura publica de depoimentos ativos" -- nao precisa de service role aqui.
    publicClient().from("depoimentos").select("*").eq("ativo", true).order("ordem"),
  ]);
  const contratoAtual = contrato?.[0] || null;

  // vitrine de buffet curada pelo atendente -- propostas antigas nao tem
  // buffets_sugeridos preenchido, cai pro buffet unico de sempre.
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

  return { proposta, evento, cliente: evento?.clientes, pacote, buffet, vitrineBuffets, extrasEscolhidos, contrato: contratoAtual, depoimentos: depoimentos || [] };
}

export default async function PropostaPublicaPage({ params }) {
  const { slug } = await params;
  const dados = await getProposta(slug);
  if (!dados) notFound();

  const { proposta, evento, cliente, pacote, vitrineBuffets, extrasEscolhidos, contrato, depoimentos } = dados;
  const pagamentos = contrato?.pagamentos || [];
  const totalPago = pagamentos.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.valor), 0);

  const diasRestantes = proposta.valida_ate
    ? Math.ceil((new Date(`${proposta.valida_ate}T00:00:00`) - new Date(new Date().toDateString())) / 86400000)
    : null;
  const expirada = diasRestantes !== null && diasRestantes < 0;
  const corValidade = expirada ? "var(--red)" : diasRestantes <= 3 ? "var(--amber)" : "var(--green)";

  return (
    <div>
      {/* HERO -- a tese da pagina: o nome do casal, nao o preco, e' a primeira
          coisa que a pessoa ve. Sem foto ainda, o impacto vem da escala
          tipografica (Fraunces gigante), do "&" em gradiente verde->dourado,
          do glow ambiente atras do texto e da entrada escalonada no load. */}
      <section className="hero" style={{ padding: "88px 0 48px", textAlign: "center" }}>
        <div className="hero-glow" />
        <div className="wrap" style={{ maxWidth: 920 }}>
          <span className="eyebrow">Espaço Personare</span>
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

      {pacote && (
        <section className="section-band">
          <div className="wrap" style={{ maxWidth: 720 }}>
            <div className="ornament"><span className="ornament-dot" /></div>
            <Reveal>
              <div className="flat-card">
                {pacote.fotos?.[0] && (
                  <img src={pacote.fotos[0]} alt={pacote.nome} style={{ width: "100%", display: "block", maxHeight: 320, objectFit: "cover" }} />
                )}
                <div style={{ padding: 24 }}>
                  <h3 style={{ marginTop: 0 }}>{pacote.nome}</h3>
                  <p style={{ color: "var(--gold-dark)", fontSize: 22, fontWeight: 600 }}>R$ {Number(pacote.preco).toLocaleString("pt-BR")}</p>
                  {(pacote.itens_inclusos || []).length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      {pacote.itens_inclusos.map((item, i) => (
                        <div key={i} className="stagger-item" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, padding: "4px 0", color: "var(--bone)" }}>
                          <span style={{ color: "var(--sage)", fontWeight: 700 }}>✓</span> {item}
                        </div>
                      ))}
                    </div>
                  )}
                  {pacote.itens_nao_inclusos?.length > 0 && (
                    <p style={{ fontSize: 12, color: "var(--granite)", marginTop: 10 }}><b>Não inclui:</b> {pacote.itens_nao_inclusos.join(", ")}</p>
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {vitrineBuffets.length > 0 && (
        <section className="section-band alt">
          <div className="wrap" style={{ maxWidth: 720 }}>
            <Reveal>
              <div className="flat-card" style={{ padding: 24 }}>
                <h3 style={{ marginTop: 0 }}>Escolha seu buffet</h3>
                <p style={{ fontSize: 12, color: "var(--granite)", marginTop: -8, marginBottom: 12 }}>Selecionamos essas opções pensando no seu evento.</p>
                <BuffetSlider buffets={vitrineBuffets} recomendadoId={proposta.buffet_id} numConvidados={evento?.num_convidados} />
                <p style={{ fontSize: 12, color: "var(--granite)", marginTop: 14 }}>
                  Valor calculado com o buffet recomendado. Quer trocar? É só falar com a gente.
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {extrasEscolhidos.length > 0 && (
        <section className="section-band">
          <div className="wrap" style={{ maxWidth: 720 }}>
            <Reveal>
              <div className="flat-card" style={{ padding: 24 }}>
                <h3 style={{ marginTop: 0 }}>Extras selecionados</h3>
                {extrasEscolhidos.map((ex) => (
                  <div key={ex.id} className="resumo-linha">
                    <span>{ex.nome}{ex.tipo_preco === "unidade" ? ` × ${ex.quantidade}` : ""}</span>
                    <span>R$ {Number(ex.valor).toLocaleString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* Depoimentos logo antes do preco, de proposito -- o casal se ve no
          espaco antes de olhar pro valor. */}
      {depoimentos.length > 0 && (
        <section className="section-band alt">
          <div className="wrap" style={{ maxWidth: 720 }}>
            <Reveal>
              <div>
                <h3 style={{ textAlign: "center" }}>O que dizem sobre a gente</h3>
                <div style={{ display: "flex", gap: 14, overflowX: "auto", padding: "4px 4px 12px", scrollSnapType: "x mandatory" }}>
                  {depoimentos.map((d) => (
                    <div key={d.id} className="flat-card" style={{ minWidth: 240, maxWidth: 260, padding: 16, scrollSnapAlign: "start", flexShrink: 0 }}>
                      {d.foto && <img src={d.foto} alt={d.autor_nome} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", marginBottom: 8 }} />}
                      <p style={{ fontSize: 13, color: "var(--stone)", fontStyle: "italic" }}>&ldquo;{d.texto}&rdquo;</p>
                      <p style={{ fontSize: 12, color: "var(--gold-dark)", fontWeight: 600, margin: 0 }}>{d.autor_nome}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* Investimento total -- o segundo momento de maior peso visual da
          pagina (depois do hero): numero grande em gradiente dourado, nao
          so' uma linha em negrito a mais. */}
      <section className="section-band">
        <div className="wrap" style={{ maxWidth: 720 }}>
          <div className="ornament"><span className="ornament-dot" /></div>
          <Reveal>
            <div className="flat-card elevated" style={{ padding: "36px 32px" }}>
              <div className="resumo-linha"><span>Subtotal</span><span>R$ {Number(proposta.subtotal).toLocaleString("pt-BR")}</span></div>
              {Number(proposta.desconto) > 0 && (
                <div className="resumo-linha"><span>Desconto</span><span>- R$ {Number(proposta.desconto).toLocaleString("pt-BR")}</span></div>
              )}
              <div style={{ textAlign: "center", paddingTop: 24 }}>
                <div className="eyebrow" style={{ animation: "none", opacity: 1, marginBottom: 12 }}>Investimento total</div>
                <div className="valor-total">R$ {Number(proposta.total).toLocaleString("pt-BR")}</div>
              </div>

              <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--stroke)" }}>
                <AceitarProposta propostaId={proposta.id} statusInicial={proposta.status} aceitaEmInicial={proposta.aceita_em} motivoInicial={proposta.motivo_categoria} />
              </div>
            </div>
          </Reveal>

          {proposta.valida_ate && (
            <Reveal style={{ marginTop: 16 }}>
              <div className="flat-card" style={{ padding: "16px 20px", textAlign: "center", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: corValidade }} />
                <div style={{ color: corValidade, fontWeight: 700, fontSize: 15 }}>
                  {expirada
                    ? `Proposta expirada em ${new Date(`${proposta.valida_ate}T00:00:00`).toLocaleDateString("pt-BR")}`
                    : `Valores garantidos até ${new Date(`${proposta.valida_ate}T00:00:00`).toLocaleDateString("pt-BR")} · faltam ${diasRestantes} dia${diasRestantes === 1 ? "" : "s"}`}
                </div>
                <p style={{ fontSize: 12, color: "var(--granite)", margin: "4px 0 0" }}>
                  {expirada
                    ? "Preços de buffet mudam rápido — fale com a gente pra atualizar sua proposta."
                    : "Preço de buffet muda rápido: depois dessa data os valores podem ser reajustados."}
                </p>
              </div>
            </Reveal>
          )}

          {contrato && contrato.status === "assinado" && (
            <Reveal style={{ marginTop: 16 }}>
              <div className="flat-card" style={{ padding: 24 }}>
                <h3 style={{ marginTop: 0 }}>📋 Seu evento está confirmado</h3>
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

      <div className="wrap" style={{ maxWidth: 720 }}>
        <p style={{ textAlign: "center", color: "var(--granite)", fontSize: 12, padding: "8px 0 56px" }}>
          Fale com o Personare pra tirar dúvidas ou fechar sua data.
        </p>
      </div>
    </div>
  );
}

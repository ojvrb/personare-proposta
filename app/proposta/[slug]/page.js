import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { publicClient } from "@/lib/supabase/public";

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
  const nomeCasal = cliente?.nome_conjuge ? `${cliente.nome} & ${cliente.nome_conjuge}` : cliente?.nome;
  const pagamentos = contrato?.pagamentos || [];
  const totalPago = pagamentos.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.valor), 0);

  return (
    <div className="wrap" style={{ maxWidth: 720 }}>
      <div style={{ textAlign: "center", margin: "32px 0" }}>
        <div className="badge">ESPAÇO PERSONARE</div>
        <h1 style={{ fontSize: 28, margin: "10px 0 4px" }}>Proposta para {nomeCasal}</h1>
        <p style={{ color: "var(--granite)" }}>
          {evento?.tipo} · {evento?.num_convidados} convidados
          {evento?.data_evento ? ` · ${new Date(evento.data_evento).toLocaleDateString("pt-BR")}` : ""}
        </p>
      </div>

      {depoimentos.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>O que dizem sobre a gente</h3>
          <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 4 }}>
            {depoimentos.map((d) => (
              <div key={d.id} style={{ minWidth: 220, maxWidth: 260, border: "1px solid var(--stroke)", borderRadius: 8, padding: 12, background: "var(--pitch-2)" }}>
                {d.foto && <img src={d.foto} alt={d.autor_nome} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", marginBottom: 8 }} />}
                <p style={{ fontSize: 13, color: "var(--stone)", fontStyle: "italic" }}>&ldquo;{d.texto}&rdquo;</p>
                <p style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600, margin: 0 }}>{d.autor_nome}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {pacote && (
        <div className="card" style={{ marginBottom: 16 }}>
          {pacote.fotos?.[0] && <img src={pacote.fotos[0]} alt={pacote.nome} style={{ width: "100%", borderRadius: 8, marginBottom: 12, maxHeight: 260, objectFit: "cover" }} />}
          <h3 style={{ marginTop: 0 }}>{pacote.nome}</h3>
          <p style={{ color: "var(--gold)", fontSize: 20, fontWeight: 600 }}>R$ {Number(pacote.preco).toLocaleString("pt-BR")}</p>
          {(pacote.itens_inclusos || []).length > 0 && (
            <div style={{ marginTop: 10 }}>
              {pacote.itens_inclusos.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, padding: "4px 0", color: "var(--bone)" }}>
                  <span style={{ color: "var(--green)", fontWeight: 700 }}>✓</span> {item}
                </div>
              ))}
            </div>
          )}
          {pacote.itens_nao_inclusos?.length > 0 && (
            <p style={{ fontSize: 12, color: "var(--granite)", marginTop: 10 }}><b>Não inclui:</b> {pacote.itens_nao_inclusos.join(", ")}</p>
          )}
        </div>
      )}

      {vitrineBuffets.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Escolha seu buffet</h3>
          <p style={{ fontSize: 12, color: "var(--granite)", marginTop: -8, marginBottom: 12 }}>Selecionamos essas opções pensando no seu evento.</p>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
            {vitrineBuffets.map((b) => {
              const recomendado = b.id === proposta.buffet_id;
              return (
                <div key={b.id} style={{ minWidth: 200, maxWidth: 220, border: `1px solid ${recomendado ? "var(--gold)" : "var(--stroke)"}`, borderRadius: 8, overflow: "hidden", background: "var(--pitch-2)", flexShrink: 0 }}>
                  {b.fotos?.[0] ? (
                    <img src={b.fotos[0]} alt={b.nome} style={{ width: "100%", height: 120, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: 120, background: "var(--lift)" }} />
                  )}
                  <div style={{ padding: 12 }}>
                    {recomendado && <div className="badge" style={{ borderColor: "var(--gold)", color: "var(--gold)", marginBottom: 6 }}>★ Recomendado</div>}
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{b.nome}</div>
                    <div style={{ fontSize: 12, color: "var(--stone)", marginTop: 4 }}>{b.descricao}</div>
                    <div style={{ fontSize: 13, color: "var(--gold)", fontWeight: 600, marginTop: 6 }}>R$ {Number(b.preco_pessoa).toLocaleString("pt-BR")}/pessoa</div>
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 12, color: "var(--granite)", marginTop: 10 }}>
            Valor calculado com o buffet recomendado × {evento?.num_convidados} convidados. Quer trocar? É só falar com a gente.
          </p>
        </div>
      )}

      {extrasEscolhidos.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Extras selecionados</h3>
          {extrasEscolhidos.map((ex) => (
            <div key={ex.id} className="resumo-linha">
              <span>{ex.nome}{ex.tipo_preco === "unidade" ? ` × ${ex.quantidade}` : ""}</span>
              <span>R$ {Number(ex.valor).toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="resumo-linha"><span>Subtotal</span><span>R$ {Number(proposta.subtotal).toLocaleString("pt-BR")}</span></div>
        {Number(proposta.desconto) > 0 && (
          <div className="resumo-linha"><span>Desconto</span><span>- R$ {Number(proposta.desconto).toLocaleString("pt-BR")}</span></div>
        )}
        <div className="resumo-total"><span>Investimento total</span><span>R$ {Number(proposta.total).toLocaleString("pt-BR")}</span></div>
      </div>

      {contrato && contrato.status === "assinado" && (
        <div className="card" style={{ marginTop: 16 }}>
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
      )}

      <div style={{ textAlign: "center", marginTop: 24 }}>
        <a href={`/proposta/${proposta.slug}/convidados`} className="btn primary">Confirmar presença (RSVP)</a>
      </div>

      <p style={{ textAlign: "center", color: "var(--granite)", fontSize: 12, marginTop: 24 }}>
        Proposta válida por 30 dias · Fale com o Personare pra tirar dúvidas ou fechar sua data.
      </p>
    </div>
  );
}

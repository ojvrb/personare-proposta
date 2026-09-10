import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function getProposta(slug) {
  const supabase = adminClient();
  const { data: proposta } = await supabase.from("propostas").select("*").eq("slug", slug).single();
  if (!proposta) return null;

  const [{ data: evento }, { data: pacote }, { data: buffet }, { data: extras }, { data: contrato }] = await Promise.all([
    supabase.from("eventos").select("*, clientes(*)").eq("id", proposta.evento_id).single(),
    proposta.pacote_id ? supabase.from("pacotes").select("*").eq("id", proposta.pacote_id).single() : Promise.resolve({ data: null }),
    proposta.buffet_id ? supabase.from("buffets").select("*").eq("id", proposta.buffet_id).single() : Promise.resolve({ data: null }),
    supabase.from("extras").select("*"),
    supabase.from("contratos").select("*, pagamentos(*)").eq("evento_id", proposta.evento_id).limit(1),
  ]);
  const contratoAtual = contrato?.[0] || null;

  const extrasEscolhidos = (proposta.extras_selecionados || [])
    .map((sel) => {
      const extra = extras?.find((e) => e.id === sel.extra_id);
      return extra ? { ...extra, quantidade: sel.quantidade } : null;
    })
    .filter(Boolean);

  return { proposta, evento, cliente: evento?.clientes, pacote, buffet, extrasEscolhidos, contrato: contratoAtual };
}

export default async function PropostaPublicaPage({ params }) {
  const { slug } = await params;
  const dados = await getProposta(slug);
  if (!dados) notFound();

  const { proposta, evento, cliente, pacote, buffet, extrasEscolhidos, contrato } = dados;
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

      {pacote && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>{pacote.nome}</h3>
          <p style={{ color: "var(--gold)", fontSize: 20, fontWeight: 600 }}>R$ {Number(pacote.preco).toLocaleString("pt-BR")}</p>
          <p style={{ fontSize: 13, color: "var(--stone)" }}><b>Inclui:</b> {(pacote.itens_inclusos || []).join(", ")}</p>
          {pacote.itens_nao_inclusos?.length > 0 && (
            <p style={{ fontSize: 13, color: "var(--granite)" }}><b>Não inclui:</b> {pacote.itens_nao_inclusos.join(", ")}</p>
          )}
        </div>
      )}

      {buffet && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Buffet: {buffet.nome}</h3>
          <p style={{ color: "var(--stone)", fontSize: 13 }}>{buffet.descricao}</p>
          <p>R$ {Number(buffet.preco_pessoa).toLocaleString("pt-BR")}/pessoa × {evento?.num_convidados} convidados</p>
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

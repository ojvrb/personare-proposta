import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getPerfil } from "@/lib/perfil";
import ClausulasExtras from "./ClausulasExtras";

// Preview do contrato: renderiza intro + clausulas do template + clausulas
// extras deste contrato especifico + dados dinamicos (nome, cpf, valores).
// So' staff logado (rota do painel; nao publica). Botao Imprimir permite
// gerar PDF pelo dialog do navegador (Ctrl+P), sem precisar de lib externa.
export default async function ContratoDetalhePage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const perfil = await getPerfil(supabase);
  if (!perfil) notFound();

  const admin = adminClient();
  const [{ data: contrato }, { data: template }] = await Promise.all([
    admin.from("contratos").select(`
      id, status, valor_contratado, clausulas_extras, created_at,
      eventos(id, data_evento, tipo, num_convidados,
        clientes(id, nome, nome_conjuge, telefone, cidade),
        propostas(id, slug, aceite_nome_completo, aceite_cpf, aceite_termos_versao, aceita_em)
      )
    `).eq("id", id).single(),
    admin.from("contrato_template").select("*").eq("id", 1).maybeSingle(),
  ]);
  if (!contrato) notFound();

  const evento = contrato.eventos;
  const cliente = evento?.clientes;
  const proposta = evento?.propostas?.[0];
  const podeEditar = perfil.role === "admin";

  // Placeholders substituidos em cada texto renderizado. Mantem tudo
  // como string; ausencias viram "___" pra o pdf ficar visivel que falta.
  const contexto = {
    nome_cliente: proposta?.aceite_nome_completo || cliente?.nome || "___",
    cpf_cliente: proposta?.aceite_cpf ? mascararCPF(proposta.aceite_cpf) : "___",
    valor: `R$ ${Number(contrato.valor_contratado || 0).toLocaleString("pt-BR")}`,
    valor_extenso: valorPorExtenso(Number(contrato.valor_contratado || 0)),
    tipo_evento: rotuloTipo(evento?.tipo),
    data_evento: evento?.data_evento ? new Date(`${evento.data_evento}T00:00:00`).toLocaleDateString("pt-BR") : "___",
    num_convidados: evento?.num_convidados || "___",
    cidade: cliente?.cidade || "___",
    aceita_em: proposta?.aceita_em ? new Date(proposta.aceita_em).toLocaleString("pt-BR") : "___",
    hoje: new Date().toLocaleDateString("pt-BR"),
  };
  const intro = subst(template?.intro || INTRO_PADRAO, contexto);
  const clausulasTemplate = (template?.clausulas?.length ? template.clausulas : CLAUSULAS_PADRAO)
    .map((c) => ({ titulo: c.titulo, texto: subst(c.texto, contexto) }));
  const extras = (contrato.clausulas_extras || []).map((c) => ({ titulo: c.titulo, texto: subst(c.texto, contexto) }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 12, flexWrap: "wrap" }} className="no-print">
        <div>
          <Link href="/painel/contratos" style={{ fontSize: 12, color: "var(--granite)", textDecoration: "none" }}>← Contratos</Link>
          <h1 style={{ margin: "8px 0 0" }}>{cliente?.nome}{cliente?.nome_conjuge ? ` & ${cliente.nome_conjuge}` : ""}</h1>
          <p style={{ color: "var(--granite)", fontSize: 13, margin: "6px 0 0" }}>
            Contrato {STATUS_LABEL[contrato.status] || contrato.status} · {new Date(contrato.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {cliente?.id && <Link href={`/painel/clientes/${cliente.id}`} className="btn">Abrir cliente</Link>}
        </div>
      </div>

      <div className="contrato-folha">
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div className="eyebrow" style={{ animation: "none", opacity: 1 }}>Espaço Personare Eventos · Ponta Grossa/PR</div>
          <h2 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 28, margin: "16px 0 4px" }}>Contrato de prestação de serviços</h2>
          <p style={{ fontSize: 13, color: "var(--granite)", margin: 0 }}>{contexto.tipo_evento} — {contexto.num_convidados} convidados — {contexto.data_evento}</p>
        </div>

        {intro && <p className="contrato-intro">{intro}</p>}

        <ol className="contrato-clausulas">
          {clausulasTemplate.map((c, i) => (
            <li key={`t-${i}`}>
              <b>{c.titulo}</b>
              <p>{c.texto}</p>
            </li>
          ))}
          {extras.length > 0 && (
            <li>
              <b>Cláusulas específicas deste contrato</b>
              <ol type="a" style={{ paddingLeft: 20, marginTop: 8 }}>
                {extras.map((c, i) => (
                  <li key={`e-${i}`} style={{ marginBottom: 12 }}>
                    <b>{c.titulo}</b>
                    <p style={{ margin: "4px 0 0" }}>{c.texto}</p>
                  </li>
                ))}
              </ol>
            </li>
          )}
        </ol>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid var(--stroke)", fontSize: 13, color: "var(--stone)" }}>
          <p><b>Valor total contratado:</b> {contexto.valor}{contexto.valor_extenso ? ` (${contexto.valor_extenso})` : ""}.</p>
          {proposta?.aceite_nome_completo ? (
            <p style={{ marginTop: 12 }}>
              Aceite eletrônico da proposta registrado em <b>{contexto.aceita_em}</b> por <b>{contexto.nome_cliente}</b> (CPF {contexto.cpf_cliente}), termos versão {proposta.aceite_termos_versao || "—"}.
            </p>
          ) : (
            <p style={{ marginTop: 12, color: "var(--granite)" }}>
              Aceite eletrônico ainda não registrado — o cliente precisa aceitar a proposta pública antes da assinatura formal.
            </p>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginTop: 60 }}>
          <AssinaturaLinha label="CONTRATANTE" nome={contexto.nome_cliente} sub={`CPF ${contexto.cpf_cliente}`} />
          <AssinaturaLinha label="CONTRATADA" nome="Espaço Personare Eventos" sub={`Ponta Grossa/PR, ${contexto.hoje}`} />
        </div>
      </div>

      {podeEditar && <ClausulasExtras contratoId={contrato.id} inicial={contrato.clausulas_extras || []} />}
    </div>
  );
}

function AssinaturaLinha({ label, nome, sub }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ borderTop: "1px solid var(--ink)", paddingTop: 6 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".08em", color: "var(--granite)", textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontFamily: "var(--display)", fontSize: 14, fontWeight: 500, marginTop: 4 }}>{nome}</div>
        <div style={{ fontSize: 11, color: "var(--granite)", marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

const STATUS_LABEL = { rascunho: "em rascunho", assinado: "assinado", cancelado: "cancelado" };
const ROTULO_TIPO = { casamento: "Casamento", "15_anos": "15 anos", corporativo: "Evento corporativo", aniversario: "Aniversário", outro: "Evento" };
function rotuloTipo(t) { return ROTULO_TIPO[t] || "Evento"; }
function mascararCPF(cpf) { const s = String(cpf || "").replace(/\D/g, ""); return s.length === 11 ? `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}` : "___"; }

// Substituicao simples de {{chave}} pelos valores do contexto. Reserva os
// valores como strings (o admin pode passar html no template? nao -- corpo
// renderiza como texto puro, entao qualquer tag vai aparecer literal).
function subst(texto, ctx) {
  if (!texto) return "";
  return String(texto).replace(/\{\{(\w+)\}\}/g, (_, k) => ctx[k] != null ? String(ctx[k]) : `{{${k}}}`);
}

// Placeholders iniciais: sao aplicados quando o template ainda esta vazio.
// O admin pode editar em /painel/contratos/template pra alterar/expandir.
const INTRO_PADRAO = "Pelo presente instrumento particular, de um lado o(a) CONTRATANTE {{nome_cliente}} (CPF {{cpf_cliente}}), com residência em {{cidade}}, e de outro lado a CONTRATADA Espaço Personare Eventos, celebram entre si o presente contrato de prestação de serviços, para realização de {{tipo_evento}} em {{data_evento}}, mediante as cláusulas e condições a seguir:";
const CLAUSULAS_PADRAO = [
  { titulo: "Objeto", texto: "O objeto deste contrato é a locação do Espaço Personare Eventos e a prestação dos serviços descritos na proposta aceita pela CONTRATANTE, para realização de {{tipo_evento}} com estimativa de {{num_convidados}} convidados, em {{data_evento}}." },
  { titulo: "Preço e forma de pagamento", texto: "O valor total do contrato é de {{valor}}, a ser pago conforme cronograma acordado entre as partes: sinal na assinatura, parcelas intermediárias e saldo final antes da data do evento. Atraso superior a 15 (quinze) dias sujeita a CONTRATANTE a multa de 2% e juros de 1% ao mês." },
  { titulo: "Alterações do evento", texto: "Ajustes no número de convidados, no buffet ou nos extras poderão ser feitos até 30 (trinta) dias antes da data, sujeitos à disponibilidade e recomputados no valor final. Alterações posteriores ficam a critério da CONTRATADA e podem gerar custos adicionais." },
  { titulo: "Cancelamento", texto: "Em caso de cancelamento pela CONTRATANTE, aplicam-se as seguintes retenções sobre o valor pago: até 90 dias antes do evento, retenção de 30%; entre 90 e 30 dias, retenção de 60%; a menos de 30 dias, retenção de 100%. Em caso de caso fortuito ou força maior, as partes acordarão nova data ou restituição integral." },
  { titulo: "Direito de arrependimento (CDC art. 49)", texto: "A CONTRATANTE tem direito a arrependimento em 7 (sete) dias corridos após a assinatura, com restituição integral dos valores pagos, desde que o pedido seja formalizado por escrito." },
  { titulo: "Tratamento de dados (LGPD)", texto: "A CONTRATADA tratará os dados pessoais da CONTRATANTE com base na execução deste contrato (art. 7º, V, LGPD), exclusivamente para viabilizar o evento contratado, emitir notas fiscais e cumprir obrigações legais. Os dados são conservados pelo prazo mínimo exigido pela legislação fiscal." },
  { titulo: "Foro", texto: "Fica eleito o foro da Comarca de Ponta Grossa/PR para dirimir eventuais controvérsias, ressalvado o foro do domicílio da consumidora conforme o CDC." },
];

function valorPorExtenso(n) {
  if (!n || n <= 0 || n >= 100000000) return "";
  // Nao substitui um "por extenso" preciso -- deixa vazio se quisermos evitar
  // erro. O admin coloca manualmente no template se quiser.
  return "";
}

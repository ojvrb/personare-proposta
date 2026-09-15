export default function ComoFunciona() {
  return (
    <div>
      <h1>Como funciona</h1>
      <p style={{ color: "var(--granite)", marginTop: -10, marginBottom: 24 }}>
        Um resumo de cada área do sistema e as dúvidas mais comuns. Se não
        achar a resposta aqui, chama o suporte.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Áreas do sistema</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Area titulo="Board CRM" texto='Cartão por cliente, organizado em colunas por status (novo, proposta enviada, negociação, fechado, etc). Pra mudar o status, use o seletor "Mover pra…" no cartão — no mobile cada coluna vira um acordeão que abre e fecha.' />
          <Area titulo="Novo cliente" texto="Formulário único que cria o cliente, o evento e monta a primeira proposta (pacote + buffet + extras). O preço final é sempre calculado pelo sistema — o que você escolhe aqui é só o ponto de partida; o cliente ainda pode ajustar na proposta pública." />
          <Area titulo="Detalhe do cliente" texto="Histórico de interações, status do contrato e dos pagamentos, e o selo de temperatura do lead (🔥 Quente / Morno / Frio) baseado em quantas vezes e quanto tempo o cliente ficou lendo a proposta." />
          <Area titulo='"Personalize a Proposta"' texto="Editor dos textos que aparecem na proposta pública — dá pra ter um texto padrão e variações por tipo de evento (casamento, 15 anos, corporativo...). Também é aqui que ficam os depoimentos e os 'momentos extras' (fotos que aparecem em tela cheia entre os capítulos da proposta)." />
          <Area titulo="Catálogo" texto="Pacotes, buffets e extras que alimentam o configurador. O cardápio de cada buffet é separado em Entradas / Prato principal / Sobremesa. Um extra pode ter a flag 'substitui o buffet' — quando marcado e escolhido pelo cliente ou vendedor, o buffet interno some do cálculo. Também tem as galerias de fotos do espaço e de decoração que aparecem na proposta pública." />
          <Area titulo="Contratos" texto="Template editável, preview de impressão e assinatura. O status do contrato reflete direto no card do cliente no board." />
          <Area titulo="Agenda de eventos" texto="Calendário dos negócios já fechados (com data de evento definida)." />
          <Area titulo="Analytics" texto="KPIs recortados por período, origem do lead, atendente, buffet escolhido e etapa do funil. Visível pra admin e financeiro." />
          <Area titulo="Usuários (admin)" texto="Convida gente nova pra equipe já com senha inicial, e reseta senha de quem esqueceu. Cada um também troca a própria senha em 'Minha conta'." />
          <Area titulo="Proposta pública (o que o cliente vê)" texto="Link sem login, em formato de capítulos: o espaço, a decoração (se tiver foto cadastrada), o buffet (cliente pode trocar e adicionar extras), o que está incluso, depoimentos e por último o investimento com o botão de aceite. O aceite é eletrônico: registra CPF, IP, navegador e data/hora — vale como assinatura pela Lei 14.063/2020." />
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Perguntas frequentes</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Pergunta titulo="Por que o total da proposta mudou depois que eu já mandei pro cliente?">
            Se o cliente trocou o buffet ou o número de convidados mudou antes
            do aceite, o sistema cria uma nova versão (v2, v3...) com o total
            recalculado, e a versão anterior fica congelada no histórico —
            nada se perde, só passa a valer a versão mais nova.
          </Pergunta>
          <Pergunta titulo="Cadastrei uma foto de decoração mas o capítulo não aparece na proposta">
            O capítulo "Decoração" só aparece se tiver pelo menos uma foto
            ativa dessa categoria. Confira em Catálogo → card "Decoração" se a
            foto está lá e marcada como ativa.
          </Pergunta>
          <Pergunta titulo='O que significa um extra "substituir o buffet"?'>
            É pra casos como buffet externo, onde o Espaço só cobra uma taxa
            (ex: uso da cozinha) em vez do cardápio interno por pessoa. Quando
            esse extra entra na proposta, o buffet interno sai do cálculo do
            total automaticamente.
          </Pergunta>
          <Pergunta titulo="O que é o selo Quente / Morno / Frio no cliente?">
            É o "lead score": mede se e quanto o cliente já leu a proposta
            (quantas aberturas, tempo por capítulo). Quente = leu bastante e
            recentemente; Frio = mandou e nunca abriu ou abriu há muito tempo.
          </Pergunta>
          <Pergunta titulo="O cliente pode mudar o que eu configurei na proposta?">
            Ele pode trocar o buffet entre as opções que você curou e
            adicionar extras opcionais que você não pré-selecionou. Tudo isso
            só é gravado de fato se ele confirmar o aceite — até lá é só uma
            prévia no navegador dele.
          </Pergunta>
          <Pergunta titulo="Esqueci minha senha, e agora?">
            Peça pro admin resetar em Usuários, ou troque você mesmo em
            "Minha conta" se ainda estiver logado.
          </Pergunta>
          <Pergunta titulo="Fui deslogado sozinho, é bug?">
            Não — o sistema desloga automaticamente depois de 10 minutos sem
            nenhuma ação, por segurança.
          </Pergunta>
        </div>
      </div>
    </div>
  );
}

function Area({ titulo, texto }) {
  return (
    <div>
      <b>{titulo}</b>
      <p style={{ margin: "2px 0 0", color: "var(--stone)", fontSize: 14, lineHeight: 1.5 }}>{texto}</p>
    </div>
  );
}

function Pergunta({ titulo, children }) {
  return (
    <details style={{ borderBottom: "1px solid var(--stroke)", paddingBottom: 8 }}>
      <summary style={{ cursor: "pointer", fontWeight: 500, padding: "6px 0" }}>{titulo}</summary>
      <p style={{ margin: "4px 0 6px", color: "var(--stone)", fontSize: 14, lineHeight: 1.5 }}>{children}</p>
    </details>
  );
}

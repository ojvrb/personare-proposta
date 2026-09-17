# PROGRESS

Diário curto do que já está pronto e o que vem em seguida. Atualizar antes
de fechar sessão ou trocar de feature.

## 2026-09-17 — Migrações rodadas, commit + push + deploy

As 7 migrações de 2026-09-16 (`clientes_email`, `contratos_proposta_id`,
`status_check_constraints`, `updated_at_generico`, `espacos_reservas`,
`aceite_termos_hash`, `rls_hardening`) rodaram no SQL editor do Supabase
dentro de um `begin;`/`commit;` único (tudo ou nada). Commitado
(`c2fcf08`), pushed pro `origin/main` e deployado (versão
`8890f1b3-f9f8-4872-b143-33f7ff63bb17`, `https://personare-proposta.ojoaovitorfoto.workers.dev`
respondendo 200 em `/login` pós-deploy). `.gitignore` ganhou
`/supabase/.temp` (cache do `npx supabase`, não deve ir pro repo).

## 2026-09-16 — Segurança (RLS) + schema/produto maiores

`npm test` (24/24) e `npm run build` passaram limpo antes do commit acima.
Foco: os itens **urgentes de segurança** e os **dois maiores de
schema/produto** do backlog.

- **[URGENTE, RESOLVIDO] Policy de `perfis` restrita a admin**: migração
  [2026_09_16_rls_hardening.sql](supabase/migrations/2026_09_16_rls_hardening.sql)
  troca a policy `for all` (qualquer staff) por leitura aberta + escrita
  (insert/update/delete) restrita a `role='admin'`. Antes um atendente podia
  em tese `PATCH /rest/v1/perfis?user_id=eq.<próprio>` com `role=admin`
  direto no PostgREST, contornando a UI. Usa uma função
  `auth_tem_papel(papeis[])` `security definer` (padrão recomendado pela
  Supabase pra evitar recursão de RLS ao checar o próprio cargo).
- **[RESOLVIDO] Mesmo padrão em `pacotes`/`buffets`/`extras`** (escrita só
  admin) **e `contratos`/`pagamentos`** (escrita admin+financeiro) — RLS
  agora espelha exatamente os `mutateRoles` que a API já aplicava
  (`lib/crudApi.js`), fechando o desvio de "sem botão na UI mas dá via REST".
- **[RESOLVIDO, com ressalva] RLS escopada por `atendente_id`** em
  `clientes`/`eventos`/`propostas`: **leitura** agora só mostra pro
  atendente linhas próprias + sem dono; admin/financeiro veem tudo.
  **Escrita ficou deliberadamente aberta** a qualquer staff autenticado
  (igual era antes) — mexer nisso exigiria auditar todo fluxo de
  transferência/reatribuição, que não são o vazamento descrito na revisão
  (o achado original era "atendente lê a base inteira via anon key", não
  "atendente edita lead alheio"). Documentado como tradeoff consciente, não
  esquecimento.
  - **Efeito colateral pego e corrigido**: `GET /api/dashboard` (resumo do
    mês no topo do board) lia `clientes`/`propostas`/`contratos` sem filtro
    de papel nenhum, pra mostrar KPI da EMPRESA inteira pra todo mundo. Com
    a RLS nova isso ia silenciosamente virar "KPI só dos meus leads" pra
    atendente. Troquei pra usar `adminClient()` (service role) nesse
    endpoint só pra manter o comportamento de sempre — a checagem de login
    continua normal. Sem esse ajuste seria uma regressão visível no board.
  - Auditei as outras ~14 rotas que leem essas 3 tabelas
    (`app/api/notificacoes`, `ajustes`, `nova-versao`, `transferencias`,
    etc.) — todas ou já são admin/financeiro-only, ou usam `adminClient()`
    (rotas públicas), ou operam sobre uma linha específica que só faz
    sentido o dono/admin tocar (nesse caso a RLS nova bloqueando um
    atendente de mexer na proposta de outro é reforço, não regressão).
- **[Estoque de agenda, RESOLVIDO] `espacos` + `reservas`**: migração
  [2026_09_16_espacos_reservas.sql](supabase/migrations/2026_09_16_espacos_reservas.sql)
  — `unique index` parcial em `(espaco_id, data) where tipo='confirmada'`
  trava no banco a possibilidade de duas propostas aceitas pro mesmo dia.
  Semeia a linha única do espaço (projeto é single-space hoje).
  `POST /api/propostas/[id]/aceitar` agora tenta a reserva **antes** de
  marcar a proposta como aceita: se a data já tem reserva confirmada,
  devolve 409 "data já reservada" e **nunca** marca a segunda proposta como
  aceita — a garantia vem do índice único (atômico sob concorrência), não
  de um `if` no código. `hold` (proposta enviada mas ainda não aceita) ficou
  no schema pra uso futuro, não wired nessa rodada.
- **[Tabela de versões de termos, RESOLVIDO — via hash, não tabela nova]**
  `aceite_termos_versao` já existia mas era só um rótulo ("1.1.0"); migração
  [2026_09_16_aceite_termos_hash.sql](supabase/migrations/2026_09_16_aceite_termos_hash.sql)
  adiciona `aceite_termos_hash`. Em vez de duplicar o conteúdo dos termos
  numa tabela nova (`termos.js` já versiona o texto no git, e o texto é
  parametrizado por valor/data/convidados — não é estático), o aceite agora
  grava o SHA-256 do texto exato renderizado (`textoTermos(...)`) no momento
  do aceite. Prova o que foi exibido pra aquele cliente específico, não só
  qual versão de código estava ativa. Exposto no comprovante admin
  (`/painel/clientes/[id]`, componente `ComprovanteAceite`) e na rota
  `GET /api/propostas/[id]/aceite`.

**[RODADO 2026-09-17]** as 7 migrações (essas 3 + as 4 da rodada anterior)
já rodaram em prod — ver entrada de 2026-09-17 no topo.

Não tocado nessa rodada (fica pro próximo): `httpOnly` no cookie de sessão
(marcado como "refatoração grande, avaliar se compensa" — não entra numa
tacada rápida, precisa decisão explícita antes) e o "hold" de reserva
(proposta enviada mas não aceita ainda não trava nada, só a confirmação).

## 2026-09-16 — Execução de 6 itens do backlog (schema + telas)

`npm test` (24/24) e `npm run build` passaram limpo antes do commit (ver
entrada de 2026-09-17 no topo). 6 dos ~14 itens da lista de Próximos passos
anterior:

- **Extração `CardLead`/`ColunaStatus` do board**: `app/painel/page.js` caiu
  de 15KB pra ~7KB. `ClienteCard` → [ClienteCard.js](app/painel/ClienteCard.js),
  `ModalLogMovimento` → arquivo próprio, `DashboardResumo`+KPIs → arquivo
  próprio, `STATUS` compartilhado em [kanbanStatus.js](app/painel/kanbanStatus.js).
  Zero mudança de comportamento, só split de arquivo.
- **Teste pra numeração de capítulos**: lógica pura extraída de
  `app/proposta/[slug]/page.js` pra [lib/capitulosProposta.js](lib/capitulosProposta.js)
  (`montarCapitulos`/`numCapitulo`), com 5 testes novos cobrindo ordem fixa,
  capítulo pulado sem conteúdo e renumeração quando decoração entra no meio.
- **`contratos.proposta_id`**: migração
  [2026_09_16_contratos_proposta_id.sql](supabase/migrations/2026_09_16_contratos_proposta_id.sql)
  adiciona a FK + backfill best-effort (casa pela última proposta aceita do
  mesmo evento). Código já manda o id: botão "Criar contrato" em
  `clientes/[id]/page.js` agora busca `evento.propostas.find(status==='aceita')`
  e `POST /api/contratos` grava.
- **`check` de status em 6 tabelas** (não 5 — achei `transferencias_lead`
  também livre): migração
  [2026_09_16_status_check_constraints.sql](supabase/migrations/2026_09_16_status_check_constraints.sql).
  Valores confirmados por grep no código, não só pelo comentário do
  `schema.sql` (que estava desatualizado — `propostas.status` ganhou
  `em_negociacao`/`pre_aprovada` depois do comentário original ter sido
  escrito, e `evento_confirmado` nunca foi usado de verdade).
- **`updated_at` genérico**: migração
  [2026_09_16_updated_at_generico.sql](supabase/migrations/2026_09_16_updated_at_generico.sql)
  — trigger `set_updated_at()` aplicado via loop em `clientes`, `eventos`,
  `propostas`, `contratos`, `pagamentos`, `convidados`.
- **`clientes.email`**: migração
  [2026_09_16_clientes_email.sql](supabase/migrations/2026_09_16_clientes_email.sql)
  + campo no formulário de `nova-proposta` + campo editável inline (onBlur)
  na tela de detalhe do cliente + `POST /api/propostas` e
  `PATCH /api/clientes/[id]` aceitando o campo.

**[RODADO 2026-09-17]** essas 4 migrações rodaram em prod junto com as
outras 3 da rodada seguinte — ver entrada de 2026-09-17 no topo.

Também: `.claude/launch.json` mudou a porta do dev server pra **3100**
(`personare-proposta` tinha outro projeto rodando na 3000 na máquina —
`proposta-eventos-saas`). Não deu pra verificar visualmente o board no
browser (login exige credencial que essa sessão não tem); validação ficou em
`npm test` + `npm run build`.

Itens ainda não tocados dessa rodada (ver Próximos passos): policy de
`perfis` restrita a admin, tabela `espacos`/`reservas`, descritor declarativo
do `Secao`, lead score materializado, tabela de versões de termos com hash.

## 2026-09-16 — Auditoria checklistseguro + correções

Commitado (`962659b`, `4dc9bce`), pushed pro `origin/main` e deployado
(versão `b35a706e`).

Feito:
- **Aba "Como funciona"** no painel (`/painel/como-funciona`, visível a
  todos os papéis): resumo de cada área do sistema + FAQ em acordeão
  (`<details>/<summary>` nativo) pras dúvidas mais comuns, pra reduzir
  dependência de suporte.
- **Auditoria de segurança (17 itens, skill `checklistseguro`)**: 4 de 17
  reprovados, 0 críticos. 3 já corrigidos, 1 pendente de configuração manual:
  - **Corrigido — dado demais na proposta pública**: `InvestimentoBloco`
    recebia o objeto `evento` inteiro (com `telefone`/`cidade`/`status` do
    cliente aninhado) como prop de Client Component, vazando no payload RSC
    pra qualquer um com o link público. Agora só recebe `data_evento`.
  - **Corrigido — erro cru do Postgres pro cliente**: 42 lugares devolviam
    `error.message` do PostgREST direto na resposta (podia vazar nome de
    tabela/coluna/constraint). Agora loga no servidor e devolve mensagem
    genérica — `lib/crudApi.js` (usado por 15+ rotas) ganhou o helper
    `erroServidor()`, as outras 22 rotas foram ajustadas uma a uma.
  - **Corrigido — sem rate limit nas rotas públicas**: `proposta-analytics`,
    `rsvp` e `propostas/[id]/aceitar` (sem login) podiam ser floodadas.
    Rate limit nativo da Cloudflare via `lib/rateLimit.js` + binding
    `RATE_LIMITER` no `wrangler.jsonc` (20 req/60s por IP, sem dependência
    nova).
  - **Pendente (config manual, não é código)**: alerta de log — Workers
    Logs já está ligado (`observability` no `wrangler.jsonc`), mas sem
    notificação configurada. Precisa criar em Workers & Pages →
    personare-proposta → Notifications → alerta por taxa de erro.
  - 13 itens passaram limpo (RLS em todas as 20 tabelas, chaves só no
    servidor, `.env` nunca versionado, auth checada no servidor em toda
    rota, sem source maps em prod, logout invalida sessão no Supabase Auth,
    sem enumeração de usuário, etc.) — detalhe completo no relatório da
    sessão, não replicado aqui.

## 2026-09-16 — Revisão arquitetural: schema, telas, auth (backlog, nada implementado ainda)

Revisão externa do projeto (sem código escrito nessa sessão) levantou gaps
estruturais que o checklistseguro não cobre (esse olha vulnerabilidade, não
modelagem/arquitetura). Resumo por área — detalhe e prioridade de cada item
foram incorporados em **Próximos passos** abaixo.

**Schema**
- Não existe estoque de data/agenda: nada no banco impede duas propostas
  aceitas pro mesmo sábado no mesmo espaço. `eventos.data_evento` é só um
  `date` solto; `propostas.valida_ate` é validade de preço, não trava de
  agenda. É o furo mais caro — onde a casa perde dinheiro de verdade.
- `status` é texto livre em 5 tabelas (`clientes`, `eventos`, `propostas`,
  `contratos`, `pagamentos`), valores válidos só documentados em comentário
  SQL. Um typo cria coluna fantasma no kanban.
- `contratos.valor_contratado` duplica `propostas.total` sem FK pra proposta
  aceita — pode divergir do que o cliente realmente aceitou.
- `pagamentos` não registra forma de pagamento, id de gateway nem tentativa —
  só `pendente|pago`. Não sustenta régua de cobrança.
- Perfil do cliente é raso: sem `email` (sem como lembrar validade de
  proposta fora do WhatsApp) e sem espaço pra dado ampliado (demografia,
  preferências). Dado sensível (restrição alimentar, religião — LGPD art. 5º
  II) precisaria de tabela própria com policy restrita, nunca no payload RSC
  público — mesmo princípio já aplicado a CPF/IP em `lib/proposta.js`.
- Falta `updated_at` na maioria das tabelas (só singletons têm
  `atualizado_em`) — sem auditoria de quando um registro mudou.
- Lacuna funcional: nada de pós-evento (avaliação/NPS), fornecedores ou
  comissão. `convidados` só tem nome+status, sem acompanhante/mesa/restrição
  — RSVP não alimenta mapa de mesas.
- Dívida com prazo: `depoimentos.evento_tipo` (já deprecated, ver
  [CLAUDE.md](./CLAUDE.md)) e `buffets.itens` legado (já renomeado pra
  `itens_prato`, ver entrada de 2026-09-15) — falta só derrubar as colunas
  velhas depois que ninguém mais lê.

**Telas**
- `app/painel/page.js` (board CRM) concentra board+card+"mover pra"+lead
  score+filtros numa page só — candidato a extrair `CardLead`/`ColunaStatus`
  (não é abstração especulativa, é o mesmo componente repetido por coluna).
- `app/globals.css` sem custom properties no topo (cor/espaçamento/raio/
  sombra) — cada tela nova reinventa a decisão visual.
- `Secao` genérico do catálogo infere schema do dado (a armadilha já
  documentada no [CLAUDE.md](./CLAUDE.md): só converte campo-array se o item
  tiver a coluna). Causa raiz é inferência; um descritor declarativo por
  tabela (`{campo, tipo}`) elimina a classe de bug.
- Numeração dos capítulos da proposta pública (`capitulos.indexOf`) não tem
  teste — é lógica pura, cabe em `npm test`.
- Lead score recalculado a cada abertura do board (varre analytics inteiro
  na carga do kanban) — mover pra coluna materializada no
  `POST /proposta-analytics` tira custo do caminho quente.

**Auth / multi-tenant**
- **[Risco maior identificado]** "atendente só vê os próprios leads" existe
  só na API (`.or(atendente_id.eq...)`), não em RLS — já estava anotado em
  Próximos passos, mas a revisão reforça: com `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  no browser, um atendente logado pode bater direto no PostgREST e ler a
  base inteira, contornando o filtro da API.
- **[Novo, mais grave]** Escalonamento de privilégio em `perfis`: a policy é
  `for all` pra qualquer autenticado, checagem de quem pode trocar cargo é
  só na API. Um atendente pode em tese `PATCH /rest/v1/perfis?user_id=eq.<próprio>`
  com `role=admin` direto no REST, sem passar pela UI. Mesmo padrão de risco
  em `pacotes`/`buffets`/`extras`/`pagamentos` (preço e "pago" alteráveis
  direto na REST API mesmo sem botão na UI).
- Se o projeto virar SaaS multi-espaço: `org_id` em todas as tabelas +
  policy lendo do JWT precisa entrar **antes** do segundo cliente — retrofit
  depois é ordem de magnitude mais caro.
- Logoff por inatividade (`useLogoffInativo`) é client-side, não invalida
  sessão no servidor — se a intenção é segurança (não só UX), precisa reduzir
  TTL do refresh token no Supabase.
- Aceite eletrônico: `aceite_termos_versao` é texto solto. Uma tabela de
  versões de termos com hash do conteúdo prova o que foi exibido — diferença
  entre evidência e alegação num litígio.

## 2026-09-15 — Cardápio do buffet separado por categoria

Commitado (`c945505`, `59a84a6`), pushed pro `origin/main` e deployado
(versões `dd2c332e` → `3ea83992`).

Feito:
- **Migrações** `2026_09_15_buffet_entrada_prato.sql` e
  `2026_09_15_buffet_sobremesa.sql` já rodadas em prod (confirmado via
  PostgREST): renomeiam a antiga coluna flat `itens` pra `itens_prato` (sem
  perda de dado) e adicionam `itens_entrada` + `itens_sobremesa`.
- **Editor do catálogo** (`BuffetCampos`) ganhou um textarea por categoria.
- **Proposta pública** (`BuffetSlider.js`) renderiza um bloco por categoria
  (`CategoriaCardapio`, pula se vazia) em vez de uma lista única.
- **Padrão documentado** pra próxima categoria (ex: bebida): coluna
  `itens_<categoria>` + allowlist das duas rotas de buffet + textarea no
  editor + `<CategoriaCardapio>` no slider. Ver [CLAUDE.md](./CLAUDE.md).

## 2026-09-14 — Tracking, versionamento, hardening de segurança

Commitado (`c945505`) e deployado.

Feito:
- **Migração** `2026_09_14_tracking_e_versionamento.sql` rodada em prod: cria
  `proposta_analytics` (com RLS) e generaliza `propostas_ajustes` com
  `campo` + `contexto`. Na mesma rodada foi aplicada a migração de
  decoração/substitui_buffet, que estava escrita no repo mas **nunca tinha
  rodado no banco** — era a causa do erro `decoracao_eyebrow não existe`.
- **Depoimentos antes do investimento** na proposta pública (prova social
  embala a decisão). Ordem agora: espaço → decoração → mesa → pacote →
  depoimentos → investimento.
- **Tracking de leitura / lead score**: `PropostaTracker.js` dispara
  "abertura" no mount e mede tempo por capítulo (IntersectionObserver +
  `sendBeacon` no pagehide) → `POST /api/proposta-analytics` (público, grava
  via service role, sem policy de insert pra anon). Na tela do cliente:
  badge Quente/Morno/Frio + "aberta Nx · última em D · mais tempo em X".
- **Versionamento de propostas**: `POST /api/propostas/[id]/nova-versao` cria
  v2/v3 com buffet/convidados novos, recalcula total no servidor e congela a
  versão anterior. A coluna `propostas.versao` já existia no schema desde o
  início e nunca tinha sido usada pra isso.
- **Board CRM mobile**: cada coluna virou `<details>`/`<summary>` nativo —
  accordion sem JS nem estado próprio.
- **Observabilidade**: `observability.enabled` no `wrangler.jsonc` liga o
  Workers Logs nativo (grátis, sem destino externo).
- **Suite de testes**: `npm test` com `node --test` nativo (zero dependência
  nova), 19 testes em `tests/`. Exigiu dois ajustes de testabilidade:
  `perfil.js` importa `NextResponse` dinamicamente (só no caminho de erro) e
  o allowlist saiu pra `lib/allowlist.js`. `lib/package.json` com
  `{"type":"module"}` faz o Node ler `lib/*.js` como ESM sem mexer no
  `next.config.js` (que é CommonJS).

Hardening de segurança (auditoria do checklist completo):
- **Mass assignment**: `crudApi.js` fazia `insert(body)`/`update(body)` cru.
  Agora aceita `campos` (allowlist) e as 15 rotas que usam o helper declaram
  suas colunas.
- **Logoff por inatividade (10min)**: `useLogoffInativo.js` no layout do
  painel. A mensagem `?reason=idle` já existia no login, mas nada disparava.
- **Cookie de sessão** ganhou `secure: true` em produção (`cookieOptions.js`).
- **HTTPS forçado** em toda rota via middleware (só em produção).
- **HSTS movido pra produção-only** no `next.config.js`: em dev o header
  fazia o browser grudar HTTPS-only em `localhost` por 2 anos (preload) e
  quebrava teste local mesmo depois de corrigir o código.
- **Dependências**: `npm audit fix` subiu wrangler 4.130.0 → 4.131.2 e zerou
  3 vulnerabilidades high (`sharp` via `miniflare`, só build-time). 0 vulns.

Verificado na auditoria (sem ação necessária): 39 rotas de API todas com auth
no backend; senhas 100% no Supabase Auth (bcrypt, nenhuma coluna de senha no
schema); rate limit de login ativo (30 req/5min por IP); RLS em 18/18 tabelas;
zero SQL raw/`.rpc()` (tudo query builder, parametrizado); nenhum secret
hardcoded e histórico do git limpo; nenhum token de terceiro/dado bancário
armazenado.

## 2026-09-14 — Decoração + substitui_buffet + fix catálogo + alinhamento

Deploys da rodada: `1ddc2bf8` (feature) → `8d07492b` (ajuste CSS).

Feito:
- **Migração** `2026_09_14_extras_substitui_buffet_e_decoracao.sql` já rodada
  em prod: adiciona `extras.substitui_buffet`, `fotos_espaco.categoria` e
  `decoracao_{eyebrow,titulo,lead}` em `proposta_textos` + `proposta_textos_tipo`.
- **Novo capítulo "Decoração"** (storytelling) entre O lugar e A mesa. Reusa
  `EspacoStory` + tabela `fotos_espaco` filtrada por `categoria='decoracao'`.
  Editor de textos em `/painel/proposta` ganhou a linha do capítulo. Catálogo
  tem galeria separada pra fotos de decoração.
- **`substitui_buffet` (extras)**: checkbox no catálogo. Quando um extra com
  essa flag entra na proposta (vendedor OU cliente adicionando na pública),
  o buffet interno sai do cálculo e `buffet_id` vai pra null na persistência.
  Wired em `InvestimentoBloco`, `nova-proposta`, `POST /propostas` e
  `POST /aceitar`. UI do configurador desabilita a vitrine de buffet e mostra
  aviso âmbar quando a flag está ativa.
- **Fix pré-existente no catálogo**: `Secao.iniciarEdicao` estava sempre
  incluindo `itens_inclusos`, `itens_nao_inclusos`, `itens` no rascunho, mesmo
  para extras (que não tem essas colunas). PATCH era rejeitado pelo
  PostgREST. Agora só converte pra texto os campos que a tabela realmente tem.
- **Margem consistente** nos capítulos da proposta pública: removido
  `max-width: 60ch` do `.story-lead` — agora a frase de apoio alinha com a
  largura do título em vez de ficar mais estreita que ele.

## 2026-09-14 — Cliente adiciona extras na proposta pública

Deploy: versão `adbdf84d`.

Feito:
- Novo componente `ExtrasCliente.js` na proposta pública: dentro do capítulo
  do pacote, mostra grid de extras ativos que o vendedor NÃO pré-selecionou,
  com botão Adicionar/Remover e input de quantidade pra `tipo_preco = unidade`.
- `EscolhaBuffetContext` guarda `extrasCliente` (state efêmero no browser) +
  handlers `adicionarExtra`/`removerExtra`/`setQuantidadeExtra`.
- `InvestimentoBloco` mescla extras do vendedor + do cliente antes de chamar
  `calcularProposta`; linha do breakdown do cliente ganha o sufixo
  "você adicionou".
- `AceitarProposta` inclui `extras_cliente` no POST do aceite.
- `POST /api/propostas/[id]/aceitar` valida os extras pedidos contra o
  catálogo (só `ativo=true`, dedup contra os do vendedor), marca cada entrada
  merged com `pelo_cliente: true`, recalcula `subtotal`/`total` via
  `calcularProposta` (fonte da verdade continua no servidor) e grava tudo
  no aceite. Nota do CRM lista os itens que o cliente adicionou + novo total.
- Extras adicionados pelo cliente só são persistidos no aceite — se ele não
  confirmar, some. Se aceito, some da vitrine (bloqueado quando
  `jaAceita || jaAssinado`).

## 2026-09-14 — Mobile UX pass + gestão de senha

Deploy anterior: versão `cb1e8a5a`.

Feito:
- Depoimentos ganharam `evento_tipos text[]` (multi-tipo), UI virou checkbox.
  Migração `supabase/migrations/2026_09_14_depoimentos_multi_tipos.sql` já
  rodada em prod.
- "Proposta pública" foi renomeada pra **"Personalize a Proposta"**; card
  "05 Depoimentos" removido do editor (já configuramos abaixo).
- Analytics → Atendentes exibe **nome** (com fallback pro email).
- Agenda abre em **calendário** como default.
- Contratos: espaço entre "Editar template" e a descrição.
- Board CRM: `<select>` "Mover pra…" em cada card (HTML5 drag não serve pra
  touch).
- Nova proposta: grid colapsa pra 1 coluna no mobile.
- Proposta pública mobile: buffet e checklist compactos; `scroll-snap`
  desligado em touch; `.reveal` mais rápido.
- Aceite: pergunta do motivo reaparece após contrato assinado se ficou vazia.
- Global anti-overflow (`overflow-x:hidden`, input/img box-sizing).
- Gestão de senha completa: criar usuário com senha inicial, admin reseta
  outros usuários (`/painel/usuarios`), self-service em `/painel/conta`.

## Próximos passos (candidatos)

- **Avaliar perfil ampliado do cliente**: `clientes.email` já existe (ver
  2026-09-16), mas o perfil ainda é raso. Se fizer sentido, `clientes_perfil`
  1:1 (demografia, preferências) e `clientes_restricoes` separada pra dado
  sensível (alimentar/religião, LGPD art. 5º II, nunca no payload RSC
  público).
- **Custom properties no `globals.css`**: cor **já está tokenizada**
  (`:root` em `app/globals.css` tem `--sage`/`--gold`/`--creme`/etc + aliases
  — achado da revisão estava desatualizado nesse ponto). O que falta de
  verdade é espaçamento/raio/sombra, que hoje são valores inline por
  componente (ex: `style={{ padding: 10 }}` espalhado). Escopo maior que os
  outros itens dessa rodada (retrofit em várias telas) — não entrou.
- **Descritor declarativo pro `Secao` do catálogo**: hoje infere quais
  campos são array olhando o item (`item.itens_inclusos` existe?). Um
  `{campo, tipo}` por tabela elimina a classe de bug já documentada no
  [CLAUDE.md](./CLAUDE.md).
- **Lead score materializado**: hoje recalcula varrendo analytics a cada
  abertura do board — mover pra coluna atualizada no
  `POST /proposta-analytics`.
- **"Hold" de reserva**: `reservas.tipo='hold'` existe no schema
  (`espacos_reservas`, 2026-09-16) mas nada cria essas linhas ainda — hoje só
  a reserva CONFIRMADA (no aceite) trava a agenda. Um hold ao ENVIAR a
  proposta (com `expira_em`) mostraria "data em disputa" pro vendedor antes
  do aceite, mas precisa de rotina de expiração (cron/edge) — não é so' o
  insert.
- **[AÇÃO MANUAL] Alerta de log na Cloudflare**: Workers Logs já está ligado,
  falta configurar notificação (Workers & Pages → personare-proposta →
  Notifications → alerta por taxa de erro 4xx/5xx). Item 10 do checklistseguro.
- **Extras cliente — controle granular no catálogo**: hoje qualquer extra
  ativo aparece pro cliente adicionar. Se o Espaço quiser expor só um
  subset, adicionar coluna `extras.disponivel_cliente boolean default true`
  e filtrar em `ExtrasCliente.js`.
- **Extras cliente antes do aceite**: hoje só grava se ele aceita. Se o
  vendedor quiser ver em tempo real o que o cliente escolheu (mesmo sem
  aceite), criar endpoint `PATCH /api/propostas/[id]/extras-cliente` público
  e persistir a cada toggle.
- **Deixar cair a coluna `evento_tipo` antiga** de `depoimentos` quando
  ninguém mais usar (comando: `alter table depoimentos drop column evento_tipo;`).
- **RSVP dos convidados** (`/proposta/[slug]/convidados`) — funciona mas não
  foi revisado nessa passada mobile.
- **CI**: não existe pipeline. Agora que `npm test` e `npm run build` rodam,
  um GitHub Actions mínimo (test + build no PR) impede regressão silenciosa —
  testes que ninguém roda automaticamente apodrecem. Decidir se o workflow
  também faz deploy ou só valida.
- **Next 16**: estamos em 15.5.25, major 16.3.5 disponível. Upgrade de major
  precisa de janela própria, não de carona em outra feature.
- **`httpOnly` no cookie de sessão**: o `@supabase/ssr` usa `httpOnly: false`
  por padrão (o SDK do browser precisa ler o token). É a arquitetura oficial
  do Supabase pra Next, mas significa que um XSS conseguiria ler a sessão.
  Fechar isso = mover login/logout pra Server Actions e largar o
  `createBrowserClient`. Refatoração grande; avaliar se compensa.
- **Cobertura de teste**: 19 testes cobrem `pricing`, `proposta`, `perfil`,
  `allowlist`. As 42 rotas de API não têm teste — o caminho mais valioso
  seria `POST /propostas` e `POST /aceitar` (onde o preço é a fonte da
  verdade).

## Coisas que valem lembrar

- Deploy leva ~40s (build Next + wrangler). Se `npm run deploy` falhar sem
  stderr útil, rode `npm run build` sozinho pra ver o erro real.
- SQL migration precisa rodar no Supabase **antes** do deploy que depende
  dela.
- Senha em plaintext nunca em arquivo. Auto-mode do Claude Code bloqueia
  `curl -d '{"password":"..."}'` inline; use `--data @arquivo` e apague depois.

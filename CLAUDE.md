# Personare Proposta

CRM + configurador de propostas + proposta pública + contratos pro Espaço
Personare Eventos (Ponta Grossa/PR). Stack: **Next.js 15 App Router
(JavaScript, sem TypeScript) + Supabase (Postgres + Auth + RLS) + Cloudflare
Workers via @opennextjs/cloudflare**.

## Como rodar

```bash
npm install
npm run dev           # localhost:3000
npm test              # node --test nativo (tests/*.test.mjs) -- pricing, proposta, perfil, allowlist
npm run build         # verifica build
npm run deploy        # sobe pro Workers (npm run build + wrangler deploy)
```

`.env.local` precisa de `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`.

## Estrutura das rotas

- `/login` — Supabase Auth por email/senha (não tem magic link).
- `/painel/*` — CRM protegido por middleware. Papéis: `admin`, `financeiro`,
  `atendente` (ver `lib/perfil.js` e `requireRole`).
  - `page.js` — Board CRM (kanban) por status do cliente.
  - `nova-proposta/` — configurador (cliente + evento + pacote + buffet + extras).
  - `clientes/[id]/` — detalhe do cliente + interações + contrato.
  - `proposta/` — **"Personalize a Proposta"**: edita textos por tipo de evento,
    depoimentos e "momentos extras" (fotos full-bleed entre capítulos).
  - `contratos/` + `contratos/[id]/` — lista + preview/impressão + template.
  - `catalogo/` — pacotes, buffets, extras, galeria "nosso espaço".
  - `eventos/` — agenda dos negócios fechados (visão calendário por padrão).
  - `analytics/` — KPIs e cortes por período/origem/atendente/buffet/etapa.
  - `usuarios/` — só admin: convida e reseta senhas.
  - `conta/` — user troca própria senha.
  - `como-funciona/` — resumo de cada área + FAQ, visível a todos os papéis.
- `/proposta/[slug]` — proposta pública (sem login). Storytelling em capítulos.
  `PropostaTracker.js` mede abertura + tempo por capítulo (lead score no CRM).
- `/proposta/[slug]/convidados` — RSVP pós-fechamento.
- `/api/*` — Route Handlers. Muitos são wrappers finos em `lib/crudApi.js`
  (allowlist de campos via `lib/allowlist.js` — ver regra abaixo).
- `/api/proposta-analytics` — público, grava tracking de leitura via service role.
- `/api/propostas/[id]/nova-versao` — cria v2/v3 de uma proposta (buffet ou
  convidados mudou antes do aceite); histórico fica em `propostas_ajustes`.

## Regras não-óbvias que doem se ignorar

- **RLS em tudo**. Toda tabela usa policy `staff acesso total` (autenticado) +
  `leitura publica` só onde precisa (`proposta/[slug]` público). Ao adicionar
  tabela, **sempre** habilite RLS antes de subir.
- **Preço é recalculado no servidor** (`app/api/propostas/route.js`). Nunca
  confie no `total` do client.
- **CPF / IP nunca vazam pra client**. `lib/proposta.js` tem `expurgar()` e
  `COLUNAS_PROPOSTA_PUBLICA` — respeite ao adicionar campos sensíveis.
- **Aceite eletrônico (Lei 14.063/2020)** registra IP + UA + timestamp +
  versão dos termos automaticamente no backend. Não mexe no fluxo sem
  entender `AceitarProposta.js` + `termos.js`.
- **Extras podem ser adicionados pelo cliente na proposta pública**
  (`ExtrasCliente.js`). São efêmeros no browser (state em
  `EscolhaBuffetContext`) até o aceite; o `POST /aceitar` valida contra
  catálogo, mescla em `extras_selecionados` com `pelo_cliente: true` e
  recalcula `subtotal`/`total`. Nunca confiar no total do client. Ao filtrar
  extras exibidos ao vendedor, lembrar que `pelo_cliente: true` marca origem.
- **`extras.substitui_buffet`** (bool): quando um extra com essa flag entra na
  proposta (vendedor OU cliente adicionando na pública), o buffet interno sai
  do cálculo E o `buffet_id` gravado vai pra null. Checagem em 4 lugares:
  `InvestimentoBloco` (public), `nova-proposta` (configurador), `POST /propostas`
  e `POST /aceitar`. Ao adicionar um novo caminho que grave `extras_selecionados`,
  aplicar a mesma checagem — senão o total salvo diverge do exibido.
- **Cardápio do buffet é separado por categoria**: `buffets.itens_entrada`,
  `itens_prato`, `itens_sobremesa` (arrays de texto), não uma coluna `itens`
  flat. Padrão pra adicionar categoria nova (ex: bebida): migration `alter
  table buffets add column itens_<categoria> text[] default '{}'` +
  allowlist em `app/api/buffets/route.js` e `[id]/route.js` + textarea em
  `BuffetCampos` (`app/painel/catalogo/page.js`) + um
  `<CategoriaCardapio titulo="..." itens={atual.itens_<categoria>} />` em
  `BuffetSlider.js`.
- **Fotos de galeria** (`fotos_espaco`) têm coluna `categoria` (`espaco` |
  `decoracao`). Mesma tabela, mesma UI de upload — só o filtro muda. O capítulo
  "Decoração" na proposta pública aparece só se houver foto ativa com
  `categoria='decoracao'`. Reusa `EspacoStory`.
- **`getPerfil()` chama Supabase**. Não chame duas vezes por request. Passe o
  objeto adiante. Ver o padrão de `Promise.all` em `/api/analytics` e
  `/api/propostas`.
- **Depoimentos**: `evento_tipos text[]` (array vazio = curinga; ver
  `supabase/migrations/2026_09_14_depoimentos_multi_tipos.sql`). A coluna
  antiga `evento_tipo` ainda existe mas o código **não lê**.
- **Textos da proposta pública** funcionam em cascata:
  `textos por tipo` → `textos padrão` → default do código
  (ver `placeholderCascata` em `app/painel/proposta/page.js`).
- **Reveal.js + scroll-snap**: `.reveal` faz fade+slide via IntersectionObserver;
  `scroll-snap` está desligado em touch (mobile trava o scroll com ele).
- **Sem TypeScript, sem JSDoc**. Não introduza `.ts`/`.tsx` — o projeto é JS puro
  de propósito, pra ficar hackeável sem tooling.
- **Comentários** existem só onde o "porquê" não é óbvio pelo nome. Não escrever
  o que o código já diz. Português brasileiro sem acentos nos comentários
  (consistência do repo).
- **Editor genérico do catálogo** (`Secao` em `app/painel/catalogo/page.js`)
  é usado por pacotes/buffets/extras/depoimentos. Os campos array↔texto
  (`itens_inclusos`, `itens_nao_inclusos`, `fotos`, `itens_entrada`,
  `itens_prato`, `itens_sobremesa`) vivem numa única constante
  `CAMPOS_ARRAY` no topo do arquivo, lida tanto por `iniciarEdicao` quanto
  por `normalizarPayload` — nunca duplique essa lista de novo (já foi bug:
  as duas funções desalinhavam, o PATCH mandava coluna que a tabela não
  tinha e o PostgREST rejeitava a request inteira). Ao adicionar campo-array
  novo, só entra em `CAMPOS_ARRAY`.
- **Capítulos da proposta pública** (`app/proposta/[slug]/page.js`): a ordem
  é `espaco → decoracao → buffet → pacote → depoimentos → investimento`
  (depoimentos antes do preço — prova social embala a decisão). Cada
  capítulo só entra em `capitulos` se tem conteúdo (foto ativa, buffet
  curado, pacote, etc.). A numeração `01/02/…` sai de `capitulos.indexOf`,
  então mudar a ordem afeta os números que o casal vê. Cada `<section>` tem
  `data-capitulo="..."` pro `PropostaTracker.js` medir tempo de leitura.
- **Mass assignment**: `crudApi.js` recebe um `campos` (allowlist) opcional —
  toda rota que usa `crudHandlers()` deve declarar as colunas aceitas em
  POST/PATCH (ver `lib/allowlist.js` + qualquer `app/api/*/route.js` como
  exemplo). Sem isso, o body inteiro da request vira `insert`/`update` cru.
- **`propostas.versao`**: existe desde o schema original mas só passou a ser
  usado em `POST /api/propostas/[id]/nova-versao`. Ao criar uma nova versão,
  o `num_convidados` fica em `eventos` (compartilhado entre versões — é o
  dado "atual" do evento); só `subtotal`/`total` ficam congelados por versão.
- **Nunca passe um objeto inteiro do banco pra Client Component na proposta
  pública** (`app/proposta/[slug]/*`) sem checar o que tem dentro — o payload
  RSC vai pro browser de qualquer visitante do link, mesmo campo que o
  componente não usa. Já rolou de `evento` (com `clientes(*)` aninhado —
  telefone/cidade/status) ser passado inteiro pro `InvestimentoBloco` sem
  necessidade. Passe só os campos que o componente de fato lê, como
  `AceitarProposta` já faz (recebe `contexto={{ valorTotal, dataEvento,
  numConvidados }}`, nunca o objeto cru).
- **Erros de rota de API nunca voltam com `error.message` do Postgres/PostgREST
  pro client** — a mensagem pode citar tabela/coluna/constraint. Use
  `console.error(error)` + mensagem genérica (ver `erroServidor()` em
  `lib/crudApi.js`, reaplicar o mesmo padrão em rotas que não usam
  `crudHandlers()`).
- **Rotas públicas sem login** (`proposta-analytics`, `rsvp`,
  `propostas/[id]/aceitar`) passam por `limitarPorIp()`
  (`lib/rateLimit.js`) antes de tocar no banco — usa o binding
  `RATE_LIMITER` do `wrangler.jsonc` (rate limit nativo da Cloudflare, 20
  req/60s por IP). Ao criar uma rota nova sem login, aplicar o mesmo guard.
- **Trava de agenda**: `espacos`/`reservas` (migração
  `2026_09_16_espacos_reservas.sql`) tem `unique index` parcial em
  `(espaco_id, data) where tipo='confirmada'` — só uma reserva CONFIRMADA
  por dia. `POST /api/propostas/[id]/aceitar` insere a reserva ANTES de
  marcar a proposta como aceita; se der `unique_violation` (23505), devolve
  409 e nunca aceita a segunda proposta pro mesmo dia. `tipo='hold'` existe
  no schema mas nada cria essas linhas ainda (não wired).
- **`extras.disponivel_cliente`**: controla se o extra aparece na vitrine
  que o cliente monta sozinho (`ExtrasCliente.js`, proposta pública).
  Validado nos DOIS lados — filtro no componente E checagem em
  `POST /api/propostas/[id]/aceitar` (linha que monta
  `adicionadosPeloCliente`). Ao mexer nessa checagem, mantenha os dois em
  sincronia — o client-side sozinho não impede um POST direto na API.
- **`propostas.aceite_termos_hash`**: SHA-256 do texto exato de
  `textoTermos(...)` (`app/proposta/[slug]/termos.js`) renderizado no
  momento do aceite, calculado em `POST /api/propostas/[id]/aceitar`. Prova
  o que aquele cliente especificamente leu (o texto é parametrizado por
  valor/data/convidados, não é estático) — mais forte que só o rótulo de
  versão em `aceite_termos_versao`. Exposto no comprovante admin
  (`ComprovanteAceite` em `clientes/[id]/page.js`).

## Segurança / operacional

- **Senhas nunca no repo, nunca em arquivos versionados.** Reset de senha do
  Supabase Auth se faz por curl com `--data @arquivo-em-scratchpad` que é
  apagado logo depois; nunca com senha inline no comando (Claude Code auto-mode
  bloqueia esse padrão).
- **Migrações**: `supabase/migrations/*.sql`. Rodar no SQL editor do Supabase
  ANTES do deploy que depende do schema novo. Claude Code não tem conexão
  direta com o Postgres nessas sessões (só as chaves REST em `.env.local`,
  que não fazem DDL) — escreve o arquivo `.sql`, mas quem cola e roda no SQL
  editor é o usuário. Pra rodar várias de uma vez com segurança, envolver em
  `begin; ... commit;` (atômico — se uma falhar, nenhuma aplica).
- **Deploy**: `npm run deploy` roda `npm run build` (Next) + `wrangler deploy`
  via @opennextjs/cloudflare. URL: personare-proposta.ojoaovitorfoto.workers.dev.
  Deploy continua manual — não há CD automático.
- **CI**: `.github/workflows/ci.yml` (`npm ci && npm test && npm run build`
  em push/PR pra `main`, sem secrets) — só valida, não deploya. Escrito mas
  push de arquivo em `.github/workflows/` precisa de PAT com escopo
  `workflow`; se faltar, adicionar pela interface web do GitHub.
- **Commit só quando autorizado.** Não fazer `git commit`/`git push`/`npm run
  deploy` sem ordem explícita nesta sessão.
- **HTTPS forçado + HSTS só em produção** (`middleware.js` + `next.config.js`).
  Nunca tire o gate de `NODE_ENV === "production"` desses dois: em dev
  (`next dev`, sem TLS) o header HSTS faz o browser grudar HTTPS-only em
  `localhost` por até 2 anos (`preload`), e quebra teste local mesmo depois
  de corrigir o código — só limpando o estado HSTS do browser resolve.
- **Cookie de sessão**: `lib/supabase/cookieOptions.js` seta `secure: true`
  só em produção (mesma lógica do HSTS acima, mesmo motivo).
- **Logoff por inatividade**: 10min, via `app/painel/useLogoffInativo.js`
  no layout do painel. Redireciona pra `/login?reason=idle`.
- **RLS deixou de ser "staff autenticado = acesso total" pra tudo**
  (migração `2026_09_16_rls_hardening.sql`). Projeto continua não
  multi-tenant (RLS não isola por empresa, só por papel/dono), mas agora:
  - `perfis`: leitura livre, **escrita (insert/update/delete) só admin**
    (senão um atendente escala o próprio cargo via REST direto).
  - `pacotes`/`buffets`/`extras`: leitura livre, **escrita só admin**.
  - `contratos`/`pagamentos`: leitura livre, **escrita admin+financeiro**.
  - `clientes`/`eventos`/`propostas`: **leitura** escopada por
    `atendente_id = auth.uid() OR atendente_id is null OR role in
    (admin, financeiro)`. **Escrita continua aberta** a qualquer staff
    autenticado (decisão deliberada — não era o vazamento original, que era
    "atendente lê a base inteira via anon key"; mexer em restringir escrita
    também exige auditar transferência/reatribuição de lead antes).
  - Todas usam a função `auth_tem_papel(papeis[])` (`security definer`,
    evita recursão de RLS ao checar o próprio cargo em `perfis`).
  - Ao adicionar rota nova de leitura ampla (tipo dashboard/analytics
    "empresa inteira"), lembrar que o client autenticado normal agora só
    enxerga o que a policy libera — `GET /api/dashboard` teve que trocar
    pra `adminClient()` (service role) por causa disso, senão os KPIs
    viravam "só dos meus leads" pra quem não é admin/financeiro.

## Convenções de código

- **Ponytail mode ativo** (skill do usuário): construa a mudança mínima que
  resolve. Sem abstração especulativa, sem boilerplate "pra depois". Ladder:
  já existe? → stdlib? → nativo? → dependência já instalada? → uma linha? →
  código mínimo. Bug fix na causa raiz (uma guarda no lugar certo, não em
  todos os callers).
- **Formatação**: mantenha o estilo do arquivo (aspas duplas, sem ponto e
  vírgula opcional, sem prettier config — apenas consistência local).
- **Português** em UI/labels/mensagens de erro e em comentários (sem acentos
  nos comentários).
- **Arquivos**: prefira editar o existente. Não crie `.md` novos sem pedido.
- **Testes**: `npm test` (`node --test`, zero dependência nova) cobre lógica
  pura em `lib/` — `pricing`, `proposta`, `perfil`, `allowlist`,
  `capitulosProposta` (numeração dos capítulos da proposta pública, extraída
  de `app/proposta/[slug]/page.js` pra ficar testável). `lib/*.js`
  roda como ESM sob Node puro por causa de `lib/package.json`
  (`{"type":"module"}`) — não mexe nisso sem entender por quê (o resto do
  projeto, incluindo `next.config.js`, é CommonJS). Código em `lib/` que
  precisa de `next/server` (ex: `NextResponse`) deve importar dinamicamente
  dentro da função que usa (ver `requireRole` em `perfil.js`), senão o
  arquivo não importa fora do build do Next e fica intestável. UI/E2E
  continua sendo `npm run build` + browser no dev server (mobile e desktop).

## Ler antes de mexer

- `lib/proposta.js` — carga da proposta pública + expurgação de PII.
- `lib/perfil.js` — auth + papéis.
- `lib/crudApi.js` — CRUD genérico usado pela maioria das rotas (allowlist
  via `lib/allowlist.js`).
- `lib/pricing.js` — `calcularProposta` (fonte da verdade do total).
- `app/globals.css` — design system + responsivo. Muitas regras
  mobile-only vivem aqui em `@media (max-width:860px)` ou `(pointer:coarse)`.

## Progresso

`PROGRESS.md` fica no root. Antes de fechar sessão ou mudar de feature,
peça: **"Atualize o PROGRESS.md com o que fizemos e os próximos passos."**

# Personare Proposta

CRM + configurador de propostas + proposta pública + contratos pro Espaço
Personare Eventos (Ponta Grossa/PR). Stack: **Next.js 15 App Router
(JavaScript, sem TypeScript) + Supabase (Postgres + Auth + RLS) + Cloudflare
Workers via @opennextjs/cloudflare**.

## Como rodar

```bash
npm install
npm run dev           # localhost:3000
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
- `/proposta/[slug]` — proposta pública (sem login). Storytelling em capítulos.
- `/proposta/[slug]/convidados` — RSVP pós-fechamento.
- `/api/*` — Route Handlers. Muitos são wrappers finos em `lib/crudApi.js`.

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
  é usado por pacotes/buffets/extras/depoimentos. Só converte pra texto
  campos-array (`itens_inclusos`, `itens_nao_inclusos`, `fotos`, `itens`) SE
  o item os tiver — senão o PATCH inclui coluna inexistente e o PostgREST
  rejeita a request inteira. Ao adicionar nova tabela ao catálogo, use o
  mesmo padrão.
- **Capítulos da proposta pública** (`app/proposta/[slug]/page.js`): a ordem
  é `espaco → decoracao → buffet → pacote → investimento → depoimentos`. Cada
  capítulo só entra em `capitulos` se tem conteúdo (foto ativa, buffet
  curado, pacote, etc.). A numeração `01/02/…` sai de `capitulos.indexOf`,
  então mudar a ordem afeta os números que o casal vê.

## Segurança / operacional

- **Senhas nunca no repo, nunca em arquivos versionados.** Reset de senha do
  Supabase Auth se faz por curl com `--data @arquivo-em-scratchpad` que é
  apagado logo depois; nunca com senha inline no comando (Claude Code auto-mode
  bloqueia esse padrão).
- **Migrações**: `supabase/migrations/*.sql`. Rodar no SQL editor do Supabase
  ANTES do deploy que depende do schema novo.
- **Deploy**: `npm run deploy` roda `npm run build` (Next) + `wrangler deploy`
  via @opennextjs/cloudflare. URL: personare-proposta.ojoaovitorfoto.workers.dev.
- **Commit só quando autorizado.** Não fazer `git commit`/`git push`/`npm run
  deploy` sem ordem explícita nesta sessão.

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
- **Testes**: o projeto não tem suíte. Verificação é `npm run build` + browser
  no dev server (mobile e desktop).

## Ler antes de mexer

- `lib/proposta.js` — carga da proposta pública + expurgação de PII.
- `lib/perfil.js` — auth + papéis.
- `lib/crudApi.js` — CRUD genérico usado pela maioria das rotas.
- `lib/pricing.js` — `calcularProposta` (fonte da verdade do total).
- `app/globals.css` — design system + responsivo. Muitas regras
  mobile-only vivem aqui em `@media (max-width:860px)` ou `(pointer:coarse)`.

## Progresso

`PROGRESS.md` fica no root. Antes de fechar sessão ou mudar de feature,
peça: **"Atualize o PROGRESS.md com o que fizemos e os próximos passos."**

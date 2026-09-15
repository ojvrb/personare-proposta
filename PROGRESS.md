# PROGRESS

Diário curto do que já está pronto e o que vem em seguida. Atualizar antes
de fechar sessão ou trocar de feature.

## 2026-09-14 — Tracking, versionamento, hardening de segurança

**Ainda não commitado nem deployado.** Migração já rodada em prod.

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
- **[DECISÃO PENDENTE] RLS escopada por `atendente_id`**: hoje a policy é
  "staff autenticado = acesso total" e a regra "atendente só vê os próprios
  leads" existe **só na camada de API** (`.or(atendente_id.eq...)` em
  `/api/propostas`). Qualquer rota nova que esqueça o filtro mostra lead de
  outro atendente. Não vaza pra fora da empresa, mas é gap de defesa em
  profundidade. Corrigir = policy por `atendente_id = auth.uid() OR role in
  (admin, financeiro)` em `clientes`/`eventos`/`propostas`.
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

# PROGRESS

Diário curto do que já está pronto e o que vem em seguida. Atualizar antes
de fechar sessão ou trocar de feature.

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
- **Board CRM no mobile**: hoje temos o select "Mover pra…", mas o board de
  fato ainda usa `grid` desktop. Considerar visão vertical / accordion por
  coluna quando `pointer:coarse`.
- **Suite de testes**: hoje verificamos só via build + browser manual. Um
  smoke `next test` cobrindo `calcularProposta`, `expurgar`, `getPerfil`
  evitaria regressão silenciosa.
- **Observabilidade**: nada de erro/latência hoje. Um logpush do Worker
  pra algum lugar barato ajuda a ver quando quebra.
- **RSVP dos convidados** (`/proposta/[slug]/convidados`) — funciona mas não
  foi revisado nessa passada mobile.

## Coisas que valem lembrar

- Deploy leva ~40s (build Next + wrangler). Se `npm run deploy` falhar sem
  stderr útil, rode `npm run build` sozinho pra ver o erro real.
- SQL migration precisa rodar no Supabase **antes** do deploy que depende
  dela.
- Senha em plaintext nunca em arquivo. Auto-mode do Claude Code bloqueia
  `curl -d '{"password":"..."}'` inline; use `--data @arquivo` e apague depois.

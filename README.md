# Personare Proposta

CRM + configurador de propostas + proposta pública em storytelling + contratos
pro Espaço Personare Eventos (Ponta Grossa/PR). Substitui o orçamento em PDF
de 11 páginas por uma proposta interativa (link público, cliente escolhe
buffet, adiciona extras, aceita eletronicamente).

**Stack:** Next.js 15 App Router (JavaScript puro, sem TypeScript) + Supabase
(Postgres + Auth + RLS) + Cloudflare Workers via `@opennextjs/cloudflare`.
Deploy: [personare-proposta.ojoaovitorfoto.workers.dev](https://personare-proposta.ojoaovitorfoto.workers.dev).

## Setup

1. Criar projeto no Supabase, rodar `supabase/schema.sql` no SQL Editor + as
   migrações em `supabase/migrations/*.sql` na ordem cronológica.
2. Criar usuário(s) da equipe em Authentication > Users (sem signup público).
3. `cp .env.example .env.local` e preencher `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. `npm install && npm run dev` (localhost:3000).

## Comandos

```bash
npm run dev       # localhost:3000
npm run build     # verifica build
npm run deploy    # npm run build + wrangler deploy pro Cloudflare Workers
```

## O que tem hoje

**CRM (`/painel`)**
- Board kanban por status do lead, com "Mover pra…" no card (touch-friendly)
- Detalhe do cliente + timeline de interações + contrato + pagamentos
- Configurador de nova proposta (cliente + evento + pacote + buffet + extras)
- Catálogo editável: pacotes, buffets, extras (com flag `substitui_buffet`),
  galeria de fotos do espaço, galeria de fotos de decoração
- Editor "Personalize a Proposta": textos padrão + variações por tipo de
  evento (casamento, 15 anos, corporativo, aniversário, outro), depoimentos
  multi-tipo, "momentos" (fotos full-bleed entre capítulos)
- Contratos: template editável + preview/impressão + assinatura
- Agenda dos eventos fechados (calendário por padrão)
- Analytics: KPIs por período/origem/atendente/buffet/etapa
- Papéis: `admin`, `financeiro`, `atendente`. Admin gere usuários e reseta senhas
- Self-service de senha em `/painel/conta`

**Proposta pública (`/proposta/[slug]`)** — sem login, storytelling em capítulos:
1. Capa (nome do casal, foto de fundo)
2. **O lugar** — galeria do espaço
3. **A decoração** — galeria de decorações
4. **A mesa** — vitrine de buffets (cliente pode trocar; total recalcula)
5. **Antes do preço** — checklist do pacote + extras já selecionados +
   vitrine de extras opcionais que o cliente pode adicionar
6. **Investimento** — breakdown detalhado + botão de aceite
7. **Depoimentos** — filtrados pelo tipo de evento

**Aceite eletrônico** (Lei 14.063/2020): CPF + nome + rolagem obrigatória +
checkbox + registro server-side de IP, User-Agent, timestamp e versão dos
termos.

**RSVP** (`/proposta/[slug]/convidados`): pós-fechamento, sem login.

## Regras não-óbvias (leia antes de mexer)

- **RLS em tudo.** Ao adicionar tabela, sempre habilite RLS antes de subir.
- **Preço é recalculado no servidor** (`lib/pricing.js` é a fonte da verdade).
  Nunca confie no `total` do client.
- **CPF/IP/UA nunca vazam pro client** — `lib/proposta.js` tem `expurgar()`.
- **`substitui_buffet`** (coluna em `extras`): quando o extra marcado com essa
  flag entra na proposta (vendedor ou cliente), o buffet interno sai do
  cálculo e o `buffet_id` é zerado.
- **Extras do cliente na proposta pública**: state efêmero em
  `EscolhaBuffetContext`; só persiste no aceite (server valida, mescla,
  recalcula e marca com `pelo_cliente: true`).
- Mais detalhes em [CLAUDE.md](./CLAUDE.md).

## Progresso

Ver [PROGRESS.md](./PROGRESS.md).

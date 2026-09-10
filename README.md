# Personare Proposta

Configurador de propostas + CRM básico pro Espaço Personare. Mesma stack do
ACGF Insights (Next.js App Router + Supabase + Vercel), reaproveitando o
padrão de auth já validado lá.

Substitui o orçamento em PDF de 11 páginas por: montar a proposta
(pacote + buffet + extras), calcular o total automaticamente e gerar um link
público (`/proposta/[slug]`) pro cliente ver.

## Setup

1. Criar projeto no Supabase, rodar `supabase/schema.sql` no SQL Editor
   (já inclui seed com pacote/buffet/extras reais do Personare).
2. Criar usuário(s) da equipe em Authentication > Users (sem signup público).
3. `cp .env.example .env.local` e preencher as 3 variáveis (URL, anon key,
   service role key).
4. `npm install && npm run dev`.

## O que tem (Sprint 1 + CRM básico)

- Login (Supabase Auth), sem signup público
- CRM: board por status do lead (`/painel`)
- Configurador de proposta: cliente/evento, pacote, buffet, extras, desconto,
  total calculado ao vivo (`/painel/nova-proposta`)
- Link público da proposta, sem exigir login (`/proposta/[slug]`)

## Skipped por enquanto (YAGNI até ter demanda real)

- Admin CRUD de pacotes/buffets/extras — editar direto no Supabase table
  editor por enquanto
- Portal do cliente pós-venda, contrato, pagamentos, RSVP, analytics, IA
- Versionamento de proposta (hoje é 1 registro por proposta, sem histórico)
- Tracking de abertura/interação do cliente na proposta pública

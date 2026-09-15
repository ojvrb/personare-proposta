-- Tracking de leitura da proposta publica: abertura (1 linha por pageview) e
-- tempo por capitulo (1 linha por capitulo visitado, enviada via sendBeacon
-- no pagehide). Sem RLS de insercao publica -- o insert sempre passa pela
-- rota /api/proposta-analytics com a service role key (adminClient), entao
-- so precisa de policy de leitura pro staff.
create table proposta_analytics (
  id bigserial primary key,
  proposta_id uuid not null references propostas(id) on delete cascade,
  tipo text not null check (tipo in ('abertura', 'capitulo')),
  capitulo text,
  duracao_ms integer,
  criado_em timestamptz not null default now()
);
alter table proposta_analytics enable row level security;
create policy "staff acesso total" on proposta_analytics for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create index proposta_analytics_proposta_id_idx on proposta_analytics (proposta_id);

-- Versionamento: propostas_ajustes ja registrava desconto (valor_anterior/novo
-- + motivo). Generaliza pra tambem cobrir troca de buffet/convidados antes do
-- aceite -- mesma tabela, so adiciona o que mudou (`campo`) e o snapshot do
-- que mudou especificamente (`contexto`). versao (em `propostas`) + esse
-- historico juntos dao o "v1/v2/v3" que o vendedor ve no cliente.
alter table propostas_ajustes add column if not exists campo text not null default 'desconto';
alter table propostas_ajustes add column if not exists contexto jsonb;

-- Personare Proposta — schema inicial (Sprint 1: configurador + CRM basico)
-- App single-tenant/colaborativo: qualquer usuario autenticado (atendente) enxerga tudo,
-- igual ao ACGF Insights. Nao ha isolamento multi-tenant aqui.

create extension if not exists pgcrypto;

create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nome_conjuge text,
  telefone text,
  cidade text,
  status text not null default 'novo_contato',
  -- pipeline: novo_contato, visita_agendada, proposta_enviada, negociacao,
  -- aguardando_decisao, contrato, evento_confirmado, perdido
  created_at timestamptz not null default now()
);

create table eventos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  tipo text not null default 'casamento', -- casamento | 15_anos | corporativo | aniversario | outro
  data_evento date,
  num_convidados int not null default 0,
  created_at timestamptz not null default now()
);

create table pacotes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco numeric not null default 0,
  itens_inclusos jsonb not null default '[]',
  itens_nao_inclusos jsonb not null default '[]',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table buffets (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco_pessoa numeric not null default 0,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table extras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo_preco text not null default 'fixo', -- fixo | pessoa | unidade
  valor numeric not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table propostas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  pacote_id uuid references pacotes(id),
  buffet_id uuid references buffets(id),
  extras_selecionados jsonb not null default '[]', -- [{extra_id, quantidade}]
  desconto numeric not null default 0,
  subtotal numeric not null default 0,
  total numeric not null default 0,
  slug text unique not null,
  status text not null default 'rascunho', -- rascunho | enviada | aberta | aceita
  versao int not null default 1,
  created_at timestamptz not null default now()
);

-- RLS: so usuario autenticado (staff) mexe nos dados. O link publico da proposta
-- e lido pelo servidor com a service role key (lib/supabase/admin.js), nunca direto do browser.
alter table clientes enable row level security;
alter table eventos enable row level security;
alter table pacotes enable row level security;
alter table buffets enable row level security;
alter table extras enable row level security;
alter table propostas enable row level security;

create policy "staff acesso total" on clientes for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff acesso total" on eventos for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff acesso total" on pacotes for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff acesso total" on buffets for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff acesso total" on extras for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff acesso total" on propostas for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Historico de interacao do CRM (timeline de notas por cliente/lead)
create table interacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  nota text not null,
  created_at timestamptz not null default now()
);
alter table interacoes enable row level security;
create policy "staff acesso total" on interacoes for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Contrato + pagamentos (rastreamento manual, sem gateway de pagamento integrado)
create table contratos (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  valor_contratado numeric not null default 0,
  status text not null default 'rascunho', -- rascunho | assinado | cancelado
  created_at timestamptz not null default now()
);
alter table contratos enable row level security;
create policy "staff acesso total" on contratos for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos(id) on delete cascade,
  descricao text not null default 'Parcela',
  valor numeric not null default 0,
  vencimento date,
  status text not null default 'pendente', -- pendente | pago
  pago_em timestamptz,
  created_at timestamptz not null default now()
);
alter table pagamentos enable row level security;
create policy "staff acesso total" on pagamentos for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- RSVP: lista de convidados por evento. Confirmacao publica (sem login) passa
-- pela service role (lib/supabase/admin.js) via /api/rsvp, igual a leitura da proposta.
create table convidados (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  nome text not null,
  status text not null default 'pendente', -- pendente | confirmado | nao_vai
  created_at timestamptz not null default now()
);
alter table convidados enable row level security;
create policy "staff acesso total" on convidados for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Seed com os valores reais do orcamento do Espaco Personare (memoria_produto_orcamento_espaco_personare.md)
insert into pacotes (nome, preco, itens_inclusos, itens_nao_inclusos) values (
  'Pacote Essencial',
  17800,
  '["Espaço Personare", "Som e iluminação", "DJ Kléo", "Decoração Personare Eventos", "Cerimonial", "Flores permanentes"]',
  '["Buffet", "Garçom", "Flores naturais", "TVs", "Painel de LED", "Pista de LED/Paris", "Banda"]'
);

insert into buffets (nome, preco_pessoa, descricao) values
  ('Clássico', 60, 'Buffet tradicional'),
  ('Especial', 70, 'Menu com entradas refinadas'),
  ('Churrasco Premium', 75, 'Menu churrasco'),
  ('Completo', 85, 'Maior variedade'),
  ('Finger Foods', 80, 'Menu volante / finger foods gourmet');

insert into extras (nome, tipo_preco, valor) values
  ('TV', 'unidade', 150),
  ('Garçom', 'unidade', 240),
  ('Painel de LED', 'fixo', 1800),
  ('Pista de LED ou Paris', 'fixo', 1500),
  ('Flores naturais', 'fixo', 4000),
  ('Banda', 'fixo', 6500),
  ('Taxa de uso da cozinha (buffet externo)', 'fixo', 2000);

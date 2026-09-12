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

-- Perfis/permissoes: admin (tudo) | atendente (CRM, sem financeiro/catalogo) | financeiro (contrato/pagamento).
-- Leitura liberada pra qualquer staff logado (saber quem e quem nao e sensivel);
-- escrita (trocar cargo, editar preco, marcar pagamento) e checada na API, nao aqui.
create table perfis (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'atendente', -- admin | atendente | financeiro
  created_at timestamptz not null default now()
);
alter table perfis enable row level security;
create policy "staff acesso total" on perfis for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- Sprint 2: CRM real (nao so configurador) -- baseado no schema_sprint2.sql
-- que o Joao gerou em outra sessao, adaptado em 2 pontos: (1) clientes.atendente_id
-- ganhou o mesmo default auth.uid() de propostas -- lead pertence a quem cadastrou;
-- (2) pipeline de negociacao ganhou app layer de verdade (rotas + telas), nao so o comentario.
-- ============================================================

-- 1. Atendente responsavel + visibilidade por dono
alter table clientes  add column atendente_id uuid references auth.users(id) default auth.uid();
alter table propostas add column atendente_id uuid references auth.users(id) default auth.uid();

-- 1b. Transferencia de lead com aprovacao de admin (decisao do Joao 2026-09-10:
-- vendedor solicita, admin aprova/rejeita -- nunca transferencia direta)
create table transferencias_lead (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  de_atendente_id uuid references auth.users(id),
  para_atendente_id uuid not null references auth.users(id),
  status text not null default 'pendente', -- pendente | aprovada | rejeitada
  solicitado_por uuid references auth.users(id) default auth.uid(),
  solicitado_em timestamptz not null default now(),
  resolvido_por uuid references auth.users(id),
  resolvido_em timestamptz
);
alter table transferencias_lead enable row level security;
create policy "staff acesso total" on transferencias_lead for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 2. Origem do lead (sem enum no banco, mesmo padrao dos outros status)
alter table clientes add column origem text;
-- indicacao | instagram | evento_personare | pesquisa_internet | site | outro

-- 3. Catalogo com foto (experiencia de proposta = projecao, nao lista de itens)
alter table pacotes add column fotos jsonb not null default '[]';
alter table buffets add column fotos jsonb not null default '[]';
alter table extras  add column fotos jsonb not null default '[]';

-- 4. Depoimentos (carrossel antes do preco na proposta publica)
create table depoimentos (
  id uuid primary key default gen_random_uuid(),
  autor_nome text not null,
  texto text not null,
  foto text,
  evento_tipo text, -- casamento | 15_anos | corporativo | outro
  ativo boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);
alter table depoimentos enable row level security;
create policy "staff acesso total" on depoimentos for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
-- unica leitura publica de conteudo de staff ate agora: necessaria pro slug
-- publico (/proposta/[slug]) mostrar o carrossel sem exigir login do cliente.
create policy "leitura publica de depoimentos ativos" on depoimentos for select using (ativo = true);

-- 5. Motivo de decisao + pipeline de negociacao da proposta
alter table propostas add column motivo_categoria text;
-- ganha: preco_justo | atendimento | espaco_estrutura | buffet | decoracao | indicacao_confianca
-- perdida: capacidade | preco_alto | data_indisponivel | concorrente |
--          buffet_nao_agradou | decoracao_nao_agradou | sem_retorno | outro
alter table propostas add column motivo_detalhe text;
alter table propostas add column decidido_em timestamptz;
-- status da proposta agora cobre negociacao, nao so envio/aceite:
-- rascunho | enviada | em_negociacao | pre_aprovada | aceita | perdida

create table propostas_ajustes (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references propostas(id) on delete cascade,
  valor_anterior numeric not null,
  valor_novo numeric not null,
  motivo text,
  ajustado_por uuid references auth.users(id) default auth.uid(),
  criado_em timestamptz not null default now()
);
alter table propostas_ajustes enable row level security;
create policy "staff acesso total" on propostas_ajustes for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Item de catalogo que faltava no seed original (esta no PDF real do orcamento)
insert into extras (nome, tipo_preco, valor) values ('Mesa de antepastos', 'pessoa', 30);

-- ============================================================
-- Vitrine de buffet curada: o atendente pre-seleciona ~3 opcoes que acha que
-- aquele cliente especifico vai gostar (nao as 5 todas), pro cliente navegar
-- tipo cardapio na proposta publica. buffet_id continua sendo o preco de
-- verdade (server-side); buffets_sugeridos e so a vitrine, sem impacto no total.
-- ============================================================
alter table propostas add column buffets_sugeridos jsonb not null default '[]';

-- Cardapio detalhado do buffet (pra vitrine virar slider com foto grande +
-- lista de itens ao lado, nao so nome/preco). Itens reais tirados do PDF
-- do orcamento (ORÇAMENTO ESPAÇO PERSONARE CASAMENTO.pdf).
alter table buffets add column itens jsonb not null default '[]';

update buffets set itens = '["Mix de folhas nobres com molho especial da casa", "Legumes da estação no vapor com ervas finas", "Arroz branco soltinho com salsinha fresca", "Espaguete ao alho dourado", "Estrogonofe de frango ao creme suave", "Posta bovina ao molho madeira"]' where nome = 'Clássico';
update buffets set itens = '["Barquetes crocantes recheadas com salpicão de frango", "Bruschettas italianas com tomate e manjericão", "Lasanha à bolonhesa caseira", "Pernil suíno assado com molho de ervas", "Posta ao molho madeira com cogumelos frescos"]' where nome = 'Especial';
update buffets set itens = '["Mix de antepastos: azeitonas, queijo curado, pepino agridoce", "Linguiça assada na brasa", "Pão de alho com manteiga de ervas", "Lasanha à bolonhesa com molho caseiro", "Churrasco: cortes nobres de alcatra grelhados na brasa"]' where nome = 'Churrasco Premium';
update buffets set itens = '["Escondidinho de carne seca com purê cremoso gratinado", "Rondelli artesanal de queijo e presunto", "Medalhão de frango ao molho de mostarda dijon", "Alcatra ao molho madeira com cogumelos", "Leitão à pururuca com pele crocante"]' where nome = 'Completo';
update buffets set itens = '["Batatas fritas crocantes com molho especial", "Bruschettas variadas com tomate e ervas", "Mini pizzas artesanais", "Iscas de alcatra ao ponto com molho barbecue", "Mini sanduíches gourmet", "Risoto do dia"]' where nome = 'Finger Foods';

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

-- Validade da proposta: preco de buffet muda rapido, entao a proposta so
-- garante o valor ate essa data -- precisa ficar bem visivel pro cliente
-- decidir rapido. Default 15 dias a partir da criacao.
alter table propostas add column valida_ate date not null default (current_date + 15);

-- Aceite self-service: o cliente clica "Aceitar proposta" no link publico e o
-- status muda pra aceita sozinho, sem depender do staff perceber e mudar
-- manualmente (sprint3_experiencia_proposta.md). Contrato continua manual.
alter table propostas add column aceita_em timestamptz;

-- Upload de fotos (pacote/buffet/extras/depoimentos): bucket 'catalogo-midia'
-- ja criado via Storage API (publico, service role bypassa RLS no insert/
-- delete pelo /api/midia -- nao precisa de policy separada em storage.objects,
-- so' o bucket publico pra leitura). Nao precisa rodar SQL pra isso.

-- Galeria "nosso espaco" -- fotos de ambiente pro atendente montar uma
-- historia visual na proposta publica, antes do preco (nao presas a nenhum
-- pacote especifico). `ordem` controla a sequencia da "historia".
create table fotos_espaco (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  legenda text,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table fotos_espaco enable row level security;
create policy "staff acesso total" on fotos_espaco for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "leitura publica de fotos ativas" on fotos_espaco for select using (ativo = true);

-- Ordenacao do catalogo (sprint4): sem isso, a ordem de exibicao dependia de
-- created_at, o que quebra assim que a equipe reorganiza o catalogo.
-- depoimentos e fotos_espaco ja tem "ordem" desde antes.
alter table pacotes add column ordem int not null default 0;
alter table buffets add column ordem int not null default 0;
alter table extras  add column ordem int not null default 0;

-- Personalizacao dos textos da proposta publica (sprint6): linha unica,
-- editada pelo admin em /painel/proposta. Cada capitulo tem eyebrow +
-- titulo + lead editaveis. Rendered public com fallback pros defaults do
-- codigo se algum campo for null.
create table proposta_textos (
  id smallint primary key default 1,  -- singleton (unica linha)
  espaco_eyebrow text, espaco_titulo text, espaco_lead text,
  buffet_eyebrow text, buffet_titulo text, buffet_lead text,
  pacote_eyebrow text, pacote_titulo text, pacote_lead text,
  investimento_eyebrow text, investimento_titulo text, investimento_lead text,
  depoimentos_eyebrow text, depoimentos_titulo text,
  atualizado_em timestamptz not null default now(),
  constraint proposta_textos_singleton check (id = 1)
);
insert into proposta_textos (id) values (1) on conflict do nothing;
alter table proposta_textos enable row level security;
create policy "staff edita" on proposta_textos for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "leitura publica" on proposta_textos for select using (true);

-- Momentos extras -- fotos-cheia entre capitulos, sem card, tipo o "photo
-- moment" da Apple. O admin adiciona quantos quiser em /painel/proposta e
-- escolhe em qual "gancho" (depois_de) o momento entra na narrativa.
create table proposta_momentos (
  id uuid primary key default gen_random_uuid(),
  foto_url text not null,
  frase text,  -- opcional; se preenchido vira legenda cinematografica
  depois_de text not null,  -- 'hero' | 'espaco' | 'buffet' | 'pacote' | 'investimento'
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table proposta_momentos enable row level security;
create policy "staff edita" on proposta_momentos for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "leitura publica" on proposta_momentos for select using (ativo = true);

-- Perfil do atendente: nome e whatsapp aparecem no rodape da proposta publica
-- (o casal precisa saber com quem estao falando + link direto pro contato).
alter table perfis add column if not exists nome text;
alter table perfis add column if not exists telefone_whatsapp text;

-- Evidencia legal do aceite (sprint7): sob a lei brasileira, uma "assinatura
-- eletronica simples" (clique num botao) so' vale como prova se houver
-- (a) consentimento inequivoco -- MP 2.200-2/2001, Lei 14.063/2020, Codigo
-- Civil art. 219 -- e (b) evidencia auditavel de quem, quando e de onde.
-- CDC art. 46 exige que os termos sejam apresentados antes do aceite.
-- LGPD exige base legal explicita pro tratamento de CPF (execucao de contrato).
alter table propostas add column if not exists aceite_ip text;
alter table propostas add column if not exists aceite_user_agent text;
alter table propostas add column if not exists aceite_cpf text;
alter table propostas add column if not exists aceite_nome_completo text;
alter table propostas add column if not exists aceite_termos_versao text;

-- sprint5 (alertas + desempenho por atendente): NAO cria as views do
-- schema_sprint5.sql original -- elas referenciavam nomes que ja mudamos
-- (valida_ate em vez de validade_ate, negocio_fechado em vez de
-- evento_confirmado) e um status "contrato" em propostas que nunca existiu
-- (contrato eh status de clientes, nao de propostas). E "interacoes" ja
-- existe desde o sprint2 com colunas diferentes (nota/created_at, nao
-- observacao/tipo/criado_em) -- recriar quebraria o que ja usa a tabela.
-- Os alertas e o desempenho por atendente foram implementados calculando em
-- cima dos dados existentes (ver /api/analytics), sem tabela nova.

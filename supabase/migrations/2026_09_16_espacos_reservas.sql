-- Estoque de agenda -- ate aqui nada no banco impedia duas propostas aceitas
-- pro mesmo sabado. eventos.data_evento e' um date solto, propostas.valida_ate
-- e' validade de PRECO, nao trava de agenda. Isso e' o furo mais caro do
-- projeto: e' onde a casa perde dinheiro de verdade (cliente aceita, casa
-- confirma, so' descobre o choque de data depois).
--
-- Minimo viavel: `reservas` com unique parcial em (espaco_id, data) pra
-- tipo='confirmada' -- o banco em si rejeita a segunda confirmacao pro
-- mesmo dia, nao depende de nenhuma checagem em app code lembrar de fazer
-- isso certo. `hold` (proposta enviada mas ainda nao aceita) fica no
-- schema pra uso futuro (nao wired nessa rodada -- so' a reserva
-- CONFIRMADA e' criada automaticamente, no aceite da proposta).
create table espacos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table espacos enable row level security;
create policy "staff acesso total" on espacos for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Projeto e' single-space hoje (Espaco Personare Eventos, Ponta Grossa/PR) --
-- semeia a unica linha que o app usa. Se um dia virar multi-espaco, o
-- catalogo (app/painel/catalogo) ganha uma tela pra gerenciar mais linhas
-- aqui; ate la o codigo so' usa `select ... limit 1`.
insert into espacos (nome) values ('Espaço Personare Eventos');

create table reservas (
  id uuid primary key default gen_random_uuid(),
  espaco_id uuid not null references espacos(id) on delete cascade,
  data date not null,
  tipo text not null default 'hold' check (tipo in ('hold', 'confirmada')),
  expira_em timestamptz, -- so' hold expira; confirmada fica null pra sempre
  proposta_id uuid references propostas(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table reservas enable row level security;
create policy "staff acesso total" on reservas for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- O index que resolve o problema: so' pode existir UMA reserva confirmada
-- por espaco+data. Uma segunda tentativa de INSERT com tipo='confirmada'
-- pro mesmo dia estoura unique_violation (23505) -- e' esse erro que
-- POST /api/propostas/[id]/aceitar agora pega e transforma em "data ja
-- reservada" pro cliente, sem nunca marcar a segunda proposta como aceita.
create unique index reservas_confirmada_unica on reservas (espaco_id, data) where tipo = 'confirmada';

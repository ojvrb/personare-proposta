-- RLS hardening -- ate aqui toda tabela tinha policy "for all using
-- (auth.role() = 'authenticated')", ou seja, QUALQUER staff logado podia
-- escrever QUALQUER coisa direto no PostgREST (NEXT_PUBLIC_SUPABASE_ANON_KEY
-- fica no browser), contornando toda checagem de papel que so' existia na
-- API (requireRole/mutateRoles em lib/perfil.js e lib/crudApi.js). A API
-- continua sendo a primeira linha de defesa (UX, mensagens de erro), mas
-- agora o banco tambem barra.
--
-- security definer pra evitar recursao ao checar o role de quem esta
-- logado: a funcao roda com o dono do schema (bypassa RLS de `perfis` so'
-- pra essa leitura pontual), em vez de cada policy reabrir a RLS de
-- `perfis` (que teoricamente e' seguro tambem, mas mais lento e mais dificil
-- de raciocinar). Padrao recomendado pela propria Supabase pra esse caso.
create or replace function auth_tem_papel(papeis text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from perfis p where p.user_id = auth.uid() and p.role = any(papeis)
  );
$$;

-- ============================================================
-- perfis -- o achado mais grave: policy era "for all" pra qualquer staff,
-- entao um atendente podia em tese PATCH /rest/v1/perfis?user_id=eq.<proprio>
-- com role=admin direto no PostgREST, escalando privilegio sem passar pela
-- UI (que so' deixa admin trocar cargo). Leitura continua aberta (getPerfil
-- precisa ler a propria linha); so' escrita fica restrita a admin.
-- ============================================================
drop policy if exists "staff acesso total" on perfis;
create policy "leitura staff" on perfis for select using (auth.role() = 'authenticated');
create policy "insercao restrita a admin" on perfis for insert with check (auth_tem_papel(array['admin']));
create policy "atualizacao restrita a admin" on perfis for update using (auth_tem_papel(array['admin'])) with check (auth_tem_papel(array['admin']));
create policy "delete restrito a admin" on perfis for delete using (auth_tem_papel(array['admin']));

-- ============================================================
-- Catalogo (pacotes/buffets/extras): so' admin edita preco/itens na API
-- (mutateRoles: ["admin"] em app/api/pacotes|buffets|extras). RLS agora
-- espelha isso -- sem essa policy, um atendente conseguia PATCH preco
-- direto no PostgREST mesmo sem o botao existir na UI dele.
-- ============================================================
drop policy if exists "staff acesso total" on pacotes;
create policy "leitura staff" on pacotes for select using (auth.role() = 'authenticated');
create policy "escrita restrita a admin" on pacotes for insert with check (auth_tem_papel(array['admin']));
create policy "atualizacao restrita a admin" on pacotes for update using (auth_tem_papel(array['admin'])) with check (auth_tem_papel(array['admin']));
create policy "delete restrito a admin" on pacotes for delete using (auth_tem_papel(array['admin']));

drop policy if exists "staff acesso total" on buffets;
create policy "leitura staff" on buffets for select using (auth.role() = 'authenticated');
create policy "escrita restrita a admin" on buffets for insert with check (auth_tem_papel(array['admin']));
create policy "atualizacao restrita a admin" on buffets for update using (auth_tem_papel(array['admin'])) with check (auth_tem_papel(array['admin']));
create policy "delete restrito a admin" on buffets for delete using (auth_tem_papel(array['admin']));

drop policy if exists "staff acesso total" on extras;
create policy "leitura staff" on extras for select using (auth.role() = 'authenticated');
create policy "escrita restrita a admin" on extras for insert with check (auth_tem_papel(array['admin']));
create policy "atualizacao restrita a admin" on extras for update using (auth_tem_papel(array['admin'])) with check (auth_tem_papel(array['admin']));
create policy "delete restrito a admin" on extras for delete using (auth_tem_papel(array['admin']));

-- ============================================================
-- Financeiro (contratos/pagamentos): mutateRoles ["admin","financeiro"] na
-- API -- sem RLS equivalente, um atendente podia marcar parcela como "pago"
-- ou editar valor_contratado direto no PostgREST.
-- ============================================================
drop policy if exists "staff acesso total" on contratos;
create policy "leitura staff" on contratos for select using (auth.role() = 'authenticated');
create policy "escrita restrita a admin/financeiro" on contratos for insert with check (auth_tem_papel(array['admin', 'financeiro']));
create policy "atualizacao restrita a admin/financeiro" on contratos for update using (auth_tem_papel(array['admin', 'financeiro'])) with check (auth_tem_papel(array['admin', 'financeiro']));
create policy "delete restrito a admin/financeiro" on contratos for delete using (auth_tem_papel(array['admin', 'financeiro']));

drop policy if exists "staff acesso total" on pagamentos;
create policy "leitura staff" on pagamentos for select using (auth.role() = 'authenticated');
create policy "escrita restrita a admin/financeiro" on pagamentos for insert with check (auth_tem_papel(array['admin', 'financeiro']));
create policy "atualizacao restrita a admin/financeiro" on pagamentos for update using (auth_tem_papel(array['admin', 'financeiro'])) with check (auth_tem_papel(array['admin', 'financeiro']));
create policy "delete restrito a admin/financeiro" on pagamentos for delete using (auth_tem_papel(array['admin', 'financeiro']));

-- ============================================================
-- clientes/eventos/propostas -- "atendente so' ve os proprios leads" hoje
-- existe SO' na API (.or(atendente_id.eq...) em GET /api/propostas). Uma
-- rota nova que esqueca esse filtro, ou uma chamada direta ao PostgREST,
-- mostra lead de outro atendente. Nao vaza pra fora da empresa (nao e'
-- multi-tenant, ver CLAUDE.md), mas e' defesa em profundidade que faltava.
-- admin/financeiro continuam vendo tudo (financeiro precisa pra fechamento
-- mensal e cobranca). Escrita fica aberta a qualquer staff autenticado
-- (criar/mover lead) -- so' LEITURA e' escopada por dono, pra nao quebrar
-- fluxo nenhum hoje (a API ja' e' quem decide quem pode reatribuir/mover).
-- ============================================================
drop policy if exists "staff acesso total" on clientes;
create policy "leitura por dono ou staff financeiro" on clientes for select using (
  atendente_id is null or atendente_id = auth.uid() or auth_tem_papel(array['admin', 'financeiro'])
);
create policy "escrita staff" on clientes for insert with check (auth.role() = 'authenticated');
create policy "atualizacao staff" on clientes for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "delete staff" on clientes for delete using (auth.role() = 'authenticated');

drop policy if exists "staff acesso total" on eventos;
create policy "leitura por dono ou staff financeiro" on eventos for select using (
  exists (
    select 1 from clientes c
    where c.id = eventos.cliente_id
      and (c.atendente_id is null or c.atendente_id = auth.uid() or auth_tem_papel(array['admin', 'financeiro']))
  )
);
create policy "escrita staff" on eventos for insert with check (auth.role() = 'authenticated');
create policy "atualizacao staff" on eventos for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "delete staff" on eventos for delete using (auth.role() = 'authenticated');

drop policy if exists "staff acesso total" on propostas;
create policy "leitura por dono ou staff financeiro" on propostas for select using (
  atendente_id is null or atendente_id = auth.uid() or auth_tem_papel(array['admin', 'financeiro'])
);
create policy "escrita staff" on propostas for insert with check (auth.role() = 'authenticated');
create policy "atualizacao staff" on propostas for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "delete staff" on propostas for delete using (auth.role() = 'authenticated');

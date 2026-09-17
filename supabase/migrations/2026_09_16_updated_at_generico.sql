-- updated_at generico -- so' os singletons (contrato_template, etc) tinham
-- atualizado_em; o resto (clientes, eventos, propostas, contratos, pagamentos,
-- convidados) nao registra quando um registro mudou. Sem isso nao ha
-- auditoria nem forma barata de sincronizacao incremental depois.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  tabela text;
begin
  foreach tabela in array array['clientes', 'eventos', 'propostas', 'contratos', 'pagamentos', 'convidados']
  loop
    execute format('alter table %I add column if not exists updated_at timestamptz not null default now()', tabela);
    execute format('drop trigger if exists set_updated_at on %I', tabela);
    execute format('create trigger set_updated_at before update on %I for each row execute function set_updated_at()', tabela);
  end loop;
end $$;

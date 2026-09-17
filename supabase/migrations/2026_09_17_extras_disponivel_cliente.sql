-- Controle granular de quais extras o cliente pode adicionar sozinho na
-- proposta publica (ExtrasCliente.js). Ate aqui era tudo-ou-nada: qualquer
-- extra ativo aparecia na vitrine do cliente. Default true preserva o
-- comportamento atual pros extras que ja existem.
alter table extras add column if not exists disponivel_cliente boolean not null default true;

-- Terceira categoria do cardapio do buffet, seguindo o padrao de
-- itens_entrada/itens_prato (ver 2026_09_15_buffet_entrada_prato.sql).
alter table buffets add column if not exists itens_sobremesa text[] not null default '{}';

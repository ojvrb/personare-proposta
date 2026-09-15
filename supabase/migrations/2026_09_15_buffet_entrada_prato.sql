-- Separa o cardapio do buffet em entrada e prato principal. O que ja existia
-- em `itens` era sempre o prato principal, entao migra sem perda; entrada
-- comeca vazia pro staff preencher. Padrao pra futuras categorias (ex:
-- sobremesa): mesma receita -- rename/add column `itens_<categoria>`, mais
-- allowlist da rota + campo no editor + bloco no BuffetSlider.
alter table buffets rename column itens to itens_prato;
alter table buffets add column if not exists itens_entrada text[] not null default '{}';

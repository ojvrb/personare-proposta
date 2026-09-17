-- depoimentos.evento_tipo (singular) foi substituida por evento_tipos
-- (array, ver supabase/migrations/2026_09_14_depoimentos_multi_tipos.sql) --
-- o codigo nao le mais essa coluna desde entao (confirmado por grep: so'
-- `evento_tipos` aparece na allowlist de app/api/depoimentos). Prazo pra
-- derrubar, marcado no CLAUDE.md, chegou.
alter table depoimentos drop column if exists evento_tipo;

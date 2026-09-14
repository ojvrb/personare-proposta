-- Depoimentos podem aparecer em múltiplos tipos de evento.
-- Antes: evento_tipo text (null = curinga, aparece em todos).
-- Depois: evento_tipos text[] (array vazio = curinga; ['casamento','15_anos'] = só nesses).
-- Rode UMA VEZ no Supabase (SQL editor) antes de subir o deploy novo.

alter table depoimentos add column if not exists evento_tipos text[] not null default '{}';

update depoimentos
   set evento_tipos = case when evento_tipo is null then '{}'::text[] else array[evento_tipo] end
 where evento_tipos = '{}';

-- Coluna antiga fica dormindo. Quando quiser eliminar de vez:
--   alter table depoimentos drop column evento_tipo;

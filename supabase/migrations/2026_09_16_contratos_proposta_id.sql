-- Rastreabilidade contratos -> proposta aceita. Ate aqui contratos.valor_contratado
-- duplicava propostas.total sem FK nenhuma pra proposta que o cliente realmente
-- aceitou -- podia divergir em silencio. Nao apaga nem recalcula nada existente,
-- so' adiciona a coluna (nullable, contrato antigo continua sem o vinculo) e
-- faz um backfill best-effort pra quem ja tem contrato + proposta aceita no
-- mesmo evento.
alter table contratos add column if not exists proposta_id uuid references propostas(id);

update contratos c
set proposta_id = p.id
from propostas p
where c.proposta_id is null
  and p.evento_id = c.evento_id
  and p.status = 'aceita'
  and p.id = (
    select id from propostas
    where evento_id = c.evento_id and status = 'aceita'
    order by versao desc, created_at desc
    limit 1
  );

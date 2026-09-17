-- aceite_termos_versao ja' existia mas e' so' um rotulo ("1.1.0") -- prova
-- qual versao do CODIGO estava ativa, nao o CONTEUDO exato que o cliente
-- leu (que e' parametrizado por valor/data/convidados, ver termos.js). O
-- hash do texto renderizado e' o que transforma "alegacao" em "evidencia"
-- num litigio: dado o texto salvo em git na versao aceita + os campos da
-- proposta, qualquer um recalcula o hash e confirma que bate.
alter table propostas add column if not exists aceite_termos_hash text;

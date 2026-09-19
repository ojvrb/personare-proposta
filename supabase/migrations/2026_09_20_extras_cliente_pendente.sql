-- Extras que o cliente vai marcando na proposta publica ANTES de aceitar.
-- Ate aqui so' existiam no browser dele (EscolhaBuffetContext) e o vendedor
-- so' descobria no aceite. Esta coluna e' so' sinal pro vendedor -- nao entra
-- no total; o valor definitivo continua sendo gravado e recalculado no
-- POST /aceitar (extras_selecionados com pelo_cliente: true).
alter table propostas add column if not exists extras_cliente_pendente jsonb not null default '[]';

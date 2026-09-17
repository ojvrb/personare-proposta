-- Status era texto livre em 6 tabelas, com os valores validos so' documentados
-- em comentario SQL -- um typo em clientes.status cria coluna fantasma no
-- kanban (o lead some do board sem erro nenhum). `check` trava isso no banco.
-- Valores confirmados por grep no codigo (nao so' pelo comentario do schema
-- original, que estava desatualizado: "evento_confirmado" nunca foi usado,
-- o valor real sempre foi "negocio_fechado" -- ver nota no fim de schema.sql;
-- e propostas ganhou "em_negociacao"/"pre_aprovada" depois do comentario
-- original "rascunho | enviada | aberta | aceita" ter sido escrito).

alter table clientes add constraint clientes_status_check check (status in (
  'novo_contato', 'visita_agendada', 'proposta_enviada', 'negociacao',
  'aguardando_decisao', 'contrato', 'negocio_fechado', 'perdido'
));

alter table propostas add constraint propostas_status_check check (status in (
  'rascunho', 'enviada', 'em_negociacao', 'pre_aprovada', 'aceita', 'perdida'
));

alter table contratos add constraint contratos_status_check check (status in (
  'rascunho', 'assinado', 'cancelado'
));

alter table pagamentos add constraint pagamentos_status_check check (status in (
  'pendente', 'pago'
));

alter table convidados add constraint convidados_status_check check (status in (
  'pendente', 'confirmado', 'nao_vai'
));

alter table transferencias_lead add constraint transferencias_lead_status_check check (status in (
  'pendente', 'aprovada', 'rejeitada'
));

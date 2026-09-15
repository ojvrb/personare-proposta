-- Extra que "substitui o buffet" (ex: "Taxa de uso da cozinha - buffet externo"):
-- quando incluido na proposta, o buffet interno deve sair do calculo. Client
-- (proposta publica) e server (POST /propostas + POST /aceitar) checam essa flag
-- pra zerar o preco do buffet e o buffet_id salvo.
alter table extras add column if not exists substitui_buffet boolean not null default false;

-- Categoria da galeria de fotos: 'espaco' (default, cap. 01) ou 'decoracao'
-- (cap. novo apos o espaco). Reutiliza a mesma tabela `fotos_espaco` --
-- mesmo shape, mesma UI de upload/ordenacao, so' filtra por categoria.
alter table fotos_espaco add column if not exists categoria text not null default 'espaco';

-- Textos configuraveis do novo capitulo "Decoracao". Segue o mesmo padrao dos
-- outros capitulos: linha unica em proposta_textos (padrao) + linha por tipo
-- de evento em proposta_textos_tipo. Fallback pros defaults do codigo se ficar em branco.
alter table proposta_textos      add column if not exists decoracao_eyebrow text;
alter table proposta_textos      add column if not exists decoracao_titulo  text;
alter table proposta_textos      add column if not exists decoracao_lead    text;

alter table proposta_textos_tipo add column if not exists decoracao_eyebrow text;
alter table proposta_textos_tipo add column if not exists decoracao_titulo  text;
alter table proposta_textos_tipo add column if not exists decoracao_lead    text;

-- ══════════════════════════════════════════════════════════════
-- Migração 2026-07-30 — Novo fluxo de solicitação + link de
-- preenchimento + novos campos de "Dados do Contrato"
-- ══════════════════════════════════════════════════════════════
-- Rodar no SQL Editor do Supabase do projeto contrato_terceirizado.
-- Todas as colunas usam "if not exists" — seguro rodar mais de uma vez.

-- Tipo/natureza do contrato (Serviço pontual / Campanha periódica / Outro)
-- — distinto de c_tipo_contratacao, que já significa Despachante/Prestador de Serviço.
alter table contratos add column if not exists c_natureza_contrato text;
alter table contratos add column if not exists c_natureza_contrato_outro text;

-- Objetivo do contrato (Campo / Relatório / Campo e relatório / Outros)
alter table contratos add column if not exists c_objetivo_contrato text;
alter table contratos add column if not exists c_objetivo_contrato_outro text;

-- Link único de preenchimento pelo terceirizado (expira em 24h, uso único)
alter table contratos add column if not exists c_link_token text;
alter table contratos add column if not exists c_link_expira_em timestamptz;
alter table contratos add column if not exists c_link_usado boolean not null default false;

-- Rede de segurança: script.js já grava cContratoHtml/cContratoGeradoEm ao gerar o
-- documento do contrato, mas essas colunas não estavam no supabase_setup_2026-07-15.sql.
alter table contratos add column if not exists c_contrato_html text;
alter table contratos add column if not exists c_contrato_gerado_em timestamptz;

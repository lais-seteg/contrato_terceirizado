-- ══════════════════════════════════════════════════════════════
-- Migração 2026-07-31 — Novo fluxo: líder só identifica o
-- terceirizado (Nome/CPF/Telefone) e reutiliza cadastro existente
-- por CPF; novos campos de "Dados do Contrato"; checklist de
-- documentação obrigatória (sem upload).
-- ══════════════════════════════════════════════════════════════
-- Rodar no SQL Editor do Supabase do projeto contrato_terceirizado.
-- Todas as colunas usam "if not exists" — seguro rodar mais de uma vez
-- e em qualquer ordem em relação à migração de 2026-07-30.

-- Cargo (ex.: ANALISTA AMBIENTAL I, TÉCNICO AMBIENTAL...) — distinto
-- de c_terc_funcao, que já é preenchido automaticamente com o valor
-- fixo "Despachante" para esse tipo de contratação.
alter table contratos add column if not exists c_cargo text;
alter table contratos add column if not exists c_cargo_outro text;

-- Setor (verificar no PGR do projeto; sem PGR específico, usar TÉCNICO
-- do PGR padrão Seteg).
alter table contratos add column if not exists c_setor text;

-- Dados para pagamento deste contrato (dados bancários / chave Pix) —
-- distinto de c_dados_pagamento, que já é usado para os dados bancários
-- pessoais do terceirizado (sincronizados do próprio cadastro dele).
alter table contratos add column if not exists c_condicoes_pagamento text;

-- Checklist de documentação obrigatória — apenas controle (recebido /
-- pendente), sem upload de arquivo. Documentos continuam sendo
-- trocados por fora do sistema (e-mail/WhatsApp).
alter table contratos add column if not exists c_doc_identidade boolean not null default false;
alter table contratos add column if not exists c_doc_comprovante_residencia boolean not null default false;
alter table contratos add column if not exists c_doc_cnpj boolean not null default false;
alter table contratos add column if not exists c_doc_curriculo boolean not null default false;

-- Repetição de segurança: colunas da migração de 2026-07-30, para o
-- caso de ela ainda não ter sido executada neste banco.
alter table contratos add column if not exists c_natureza_contrato text;
alter table contratos add column if not exists c_natureza_contrato_outro text;
alter table contratos add column if not exists c_objetivo_contrato text;
alter table contratos add column if not exists c_objetivo_contrato_outro text;
alter table contratos add column if not exists c_link_token text;
alter table contratos add column if not exists c_link_expira_em timestamptz;
alter table contratos add column if not exists c_link_usado boolean not null default false;

-- ──────────────────────────────────────────────────────────────
-- CPF único por terceirizado
-- ──────────────────────────────────────────────────────────────
-- Antes de rodar o índice abaixo, confira se já não existem CPFs
-- duplicados na base (o índice falha se houver duplicata real):
--
--   select t_cpf, count(*)
--   from terceirizados
--   where t_cpf is not null and t_cpf <> ''
--   group by t_cpf
--   having count(*) > 1;
--
-- Se a consulta acima retornar linhas, resolva manualmente (mesclar
-- ou apagar o cadastro duplicado) antes de criar o índice.

-- Índice único parcial: ignora linhas com CPF nulo/vazio (dados
-- legados incompletos), mas impede duas linhas com o mesmo CPF
-- preenchido.
create unique index if not exists ux_terceirizados_cpf
  on terceirizados (t_cpf)
  where t_cpf is not null and t_cpf <> '';

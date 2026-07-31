-- ══════════════════════════════════════════════════════════════
-- Contratação de Terceirizados · Seteg
-- SCRIPT ÚNICO E COMPLETO — reconstrução total do banco no Supabase
-- (projeto hqyoszdilauarrhxpgjg). Consolida:
--   - supabase_setup_2026-07-15.sql (estrutura original + seed de usuários)
--   - migracao_2026-07-30_workflow_link_dados_contrato.sql
--   - migracao_2026-07-31_fluxo_solicitante_cpf.sql
--   - migracao_2026-07-31c_status_financeiro.sql
-- Rode este arquivo inteiro no SQL Editor do Supabase, de uma vez.
--
-- ⚠⚠⚠ DESTRUTIVO ⚠⚠⚠
-- Os DROP TABLE abaixo apagam PERMANENTEMENTE todos os contratos,
-- terceirizados, avaliações e auditoria já cadastrados no banco atual.
-- Confirmado com a usuária que isso é intencional (recomeçar do zero).
-- Se em algum momento futuro este script for reaproveitado com dados
-- reais importantes no banco, NÃO rodar sem antes tirar um backup
-- (Database → Backups no painel do Supabase, ou pg_dump).
-- ══════════════════════════════════════════════════════════════

drop table if exists auditoria cascade;
drop table if exists avaliacoes cascade;
drop table if exists contratos cascade;
drop table if exists terceirizados cascade;
drop table if exists usuarios cascade;

-- ──────────────────────────────────────────────────────────────
-- 1) USUÁRIOS — login por código de acesso (hash SHA-256, ver script.js _sha256/validarLogin)
-- ──────────────────────────────────────────────────────────────
create table usuarios (
  id           bigint generated always as identity primary key,
  nome         text not null,
  perfil       text not null check (perfil in ('gestao','gestao-pessoas','solicitante')),
  iniciais     text,
  label        text,
  setor        text,
  gestor       text,
  codigo_hash  text not null unique,
  ativo        boolean not null default true,
  criado_em    timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- 2) TERCEIRIZADOS — cadastro de prestadores (index.html + cadastro.html)
-- ──────────────────────────────────────────────────────────────
create table terceirizados (
  id                 text primary key,
  t_nome             text,
  t_tipo             text,
  t_email            text,
  t_cpf              text,
  t_rg               text,
  t_nascimento       date,
  t_estado_civil     text,
  t_telefone         text,
  t_estado           text,
  t_cidade           text,
  t_endereco         text,
  t_graduacao        text,
  t_nivel_formacao   text,
  t_area_expertise   text,
  t_cursos_extras    text,
  t_lattes           text,
  t_registro         text,
  t_crbio2           text,
  t_ctf              text,
  t_cnh              text,
  t_exp_direcao      text,
  t_possui_cnpj      text,
  t_cnpj             text,
  t_comprovante      text,
  t_emissao          text,
  t_forma_pgto       text,
  t_parcelas         text,
  t_dados_bancarios  text,
  t_emerg1_nome      text,
  t_emerg1_tel       text,
  t_emerg2_nome      text,
  t_emerg2_tel       text,
  t_projetos_seteg   text,
  t_disponibilidade  text,
  t_outras_info      text,
  criado_em          timestamptz not null default now(),
  criado_por         text,
  atualizado_em      timestamptz
);

-- CPF único por terceirizado — índice parcial (ignora nulo/vazio, não
-- barra cadastros legados incompletos, mas impede duplicar CPF preenchido).
create unique index ux_terceirizados_cpf
  on terceirizados (t_cpf)
  where t_cpf is not null and t_cpf <> '';

-- ──────────────────────────────────────────────────────────────
-- 3) CONTRATOS
-- ──────────────────────────────────────────────────────────────
create table contratos (
  id                        text primary key,
  status                    text,
  c_razao_social            text,
  c_nome_fantasia           text,
  c_cnpj_empresa            text,
  c_resp_empresa            text,
  c_email_empresa           text,
  c_tel_empresa             text,
  c_end_empresa             text,
  c_numero_contrato         text,
  c_empresa_contratante     text,
  c_tipo_contratacao        text,
  c_tipo_outro              text,
  c_data_inicio             date,
  c_data_fim                date,
  c_centro_custo            text,
  c_projeto                 text,
  c_unidade                 text,
  c_valor_mensal            text,
  c_valor_total             text,
  c_objeto                  text,
  c_objeto_outro            text,
  c_art                     text,
  c_escopo                  text,
  c_cronograma              text,
  c_data_encaminhado_financeiro timestamptz,
  c_terceirizado_id         text,
  c_terc_nome               text,
  c_terc_email              text,
  c_terc_cpf                text,
  c_terc_rg                 text,
  c_terc_nascimento         date,
  c_terc_funcao             text,
  c_terc_telefone           text,
  c_terc_estado             text,
  c_terc_municipio          text,
  c_terc_endereco           text,
  c_terc_estado_civil       text,
  c_terc_graduacao          text,
  c_terc_nivel_formacao     text,
  c_terc_area_expertise     text,
  c_terc_registro           text,
  c_terc_crbio2             text,
  c_terc_ctf                text,
  c_terc_lattes             text,
  c_terc_cnh                text,
  c_terc_cursos_extras      text,
  c_terc_comprovante        text,
  c_terc_cnpj               text,
  c_terc_emissao            text,
  c_terc_forma_pgto         text,
  c_terc_parcelas           text,
  c_dados_pagamento         text,
  c_terc_disponibilidade    text,
  c_terc_emerg1_nome        text,
  c_terc_emerg1_tel         text,
  c_terc_emerg2_nome        text,
  c_terc_emerg2_tel         text,
  c_terc_projetos_seteg     text,
  c_resp_nome               text,
  c_resp_setor              text,
  c_resp_cargo              text,
  c_resp_email              text,
  c_resp_diretoria          text,
  c_outras_info             text,
  c_obs_gp                  text,
  c_obs_gestao              text,
  -- Migração 2026-07-30: fluxo de solicitação + link de preenchimento
  c_natureza_contrato       text,
  c_natureza_contrato_outro text,
  c_objetivo_contrato       text,
  c_objetivo_contrato_outro text,
  c_link_token              text,
  c_link_expira_em          timestamptz,
  c_link_usado              boolean not null default false,
  c_contrato_html           text,
  c_contrato_gerado_em      timestamptz,
  -- Migração 2026-07-31: líder só identifica por CPF; novos campos de
  -- "Dados do Contrato"; checklist de documentação obrigatória
  c_cargo                   text,
  c_cargo_outro             text,
  c_setor                   text,
  c_condicoes_pagamento     text,
  c_doc_identidade                boolean not null default false,
  c_doc_comprovante_residencia    boolean not null default false,
  c_doc_cnpj                      boolean not null default false,
  c_doc_curriculo                 boolean not null default false,
  historico                 jsonb not null default '[]'::jsonb,
  entregas                  jsonb not null default '[]'::jsonb,
  criado_em                 timestamptz not null default now(),
  criado_por                text,
  atualizado_em             timestamptz,
  atualizado_por            text
);

-- ──────────────────────────────────────────────────────────────
-- 4) AVALIAÇÕES
-- ──────────────────────────────────────────────────────────────
create table avaliacoes (
  id              text primary key,
  contrato_id     text,
  avaliador       text,
  avaliado        text,
  cliente         text,
  projeto         text,
  nivel_campo     text,
  nivel_relatorio text,
  prazo           text,
  relacionamento  text,
  motivo          text,
  obs             text,
  criado_em       timestamptz not null default now(),
  criado_por      text
);

-- ──────────────────────────────────────────────────────────────
-- 5) AUDITORIA
-- ──────────────────────────────────────────────────────────────
create table auditoria (
  id           text primary key,
  data         timestamptz not null default now(),
  usuario      text,
  perfil       text,
  acao         text,
  modulo       text,
  registro_id  text,
  status_ant   text,
  status_novo  text,
  detalhe      text
);

-- Índices usados nos filtros/ordenação do app
create index idx_contratos_criado_em     on contratos (criado_em desc);
create index idx_terceirizados_criado_em on terceirizados (criado_em desc);
create index idx_avaliacoes_criado_em    on avaliacoes (criado_em desc);
create index idx_auditoria_data          on auditoria (data desc);
create index idx_auditoria_registro_id   on auditoria (registro_id);

-- ══════════════════════════════════════════════════════════════
-- RLS — o app não usa Supabase Auth: o login é validado no cliente
-- comparando o hash do código digitado com usuarios.codigo_hash, e
-- todas as chamadas usam a mesma chave publishable (anon). Por isso
-- as políticas abaixo liberam CRUD para "anon" nas 4 tabelas
-- operacionais (igual ao comportamento que o app já tinha) e
-- restringem "usuarios" a leitura (necessária para o login).
--
-- ⚠ Aviso de segurança: com esse modelo, qualquer pessoa de posse da
-- chave publishable (que fica exposta no script.js do navegador)
-- consegue ler/gravar essas tabelas diretamente, inclusive o hash de
-- código de todo mundo em "usuarios". Limitação conhecida da
-- arquitetura atual (sem backend próprio) — não é algo novo deste
-- script.
-- ══════════════════════════════════════════════════════════════

alter table usuarios      enable row level security;
alter table terceirizados enable row level security;
alter table contratos     enable row level security;
alter table avaliacoes    enable row level security;
alter table auditoria     enable row level security;

create policy "anon select usuarios" on usuarios
  for select to anon using (true);

create policy "anon crud terceirizados" on terceirizados
  for all to anon using (true) with check (true);

create policy "anon crud contratos" on contratos
  for all to anon using (true) with check (true);

create policy "anon crud avaliacoes" on avaliacoes
  for all to anon using (true) with check (true);

create policy "anon crud auditoria" on auditoria
  for all to anon using (true) with check (true);

-- ══════════════════════════════════════════════════════════════
-- SEED — usuários e senhas de acesso
-- Perfis: 'gestao' (acesso total, único que pode excluir registros),
-- 'gestao-pessoas' (analisa/aprova/finaliza contratos) e
-- 'solicitante' (líder: só vê e edita os próprios contratos).
-- ══════════════════════════════════════════════════════════════

INSERT INTO usuarios (nome, perfil, codigo_hash, ativo) VALUES
  ('Gestão', 'gestao', '7ac0c61f5bc6cc81f594ba9e8ff8dd089d1bd9ab305c3c4e6fd83d7737261780', true),
  ('Gestão de Pessoas', 'gestao-pessoas', '6bb8f12bdc6d3b7e67b43533234828d0db34ec1fdc4703611160c7a0c6071672', true),
  ('Kevilla', 'gestao-pessoas', '2c2dd866510a9ba893eff4507d0057b20c65d40fbfbafeec37874383f2473200', true),
  ('Gustavo Toledo', 'solicitante', '5babe2bb9b258764f5a137ec81acb2595c19191cc561630e4db3624943a1c2dc', true),
  ('Hugo', 'solicitante', 'b188ba88571ab19dbd5fe7736e56b358b5f77f4cd7c3f44001156ca2d3258ad7', true),
  ('Haddad', 'solicitante', '18addf76ca945f0d96a52441030f38dae4063eaa1f16a7ea6b2a68832a566ce7', true),
  ('Matheus Fontenelle', 'solicitante', '4f6ce99c10299ca85296c3490642c67f8575a40eab76a098f578bec48540cdfe', true),
  ('Lizabeth Silva', 'solicitante', '063eab07404238e31e0739053bd2960aeeca8d7876b3524ffc26ebdae112e298', true),
  ('Juliana Vicente', 'solicitante', '6bfa719228a6232ccfa3702d33333688f2053d10f5f50e45c8c3419efc708610', true),
  ('Marcelo Holderbaum', 'solicitante', '3e5c77a4e0c86fc38b307fb6931e6914337fa3d593dda106ac3638a01f543894', true),
  ('Carina Rodrigues', 'solicitante', 'b222e1bfda9c0c3fe251af14966b26b44bf229f3bb1d1a3801432dbfe4b9542b', true),
  ('Fernando Sousa', 'solicitante', 'e3cfaa159e474729771ab20e1083f0d8b7a8dd478a42e3e2d8d33f9f2af989f8', true),
  ('Henrique Lima', 'solicitante', '544c7c687f316ac8f45f009d53900797d1379cdf4be62ea88ea60becac78e0b0', true),
  ('Laize Rodrigues', 'solicitante', 'e2b97720058b75a99154ba0cee3972160d0e83367575ab5f5e96caddd5c0dbd8', true),
  ('Tiago Soares', 'solicitante', '752bfb205821ba068134494ff20675098ecc9d27e5c3c46fb09f065745883b87', true),
  ('Juliana Aquino', 'solicitante', 'ff06ae8e3139add29c3fed7a75f2774c0ccb7a71dec248c25283654c3b50dd0c', true),
  ('Gyrliane Sales', 'solicitante', '80853fb8dc58230bf3fb320dfad4b420709915cae0ff89ecacc7f5716d4aa9e1', true),
  ('Ricardo Silveira', 'solicitante', '728bb360e15e94ff012a8ab0fb358f14c5a485665098f9a072aff5c3313147f1', true),
  ('Nadia Vieira', 'solicitante', '20a627e30ef62b980d30b48eb6d4075918b97c8884afb42733075ba067934d0f', true),
  ('Mariângela Ciodaro', 'solicitante', '02225f972456a8baca9b3715946b9efe19843afb0b4a87ee36fccc8545865c70', true),
  ('Eveline Mesquita', 'solicitante', '31e028fe84bd7b32f2a9c09a7c2270b92920fe90f474b0b121bf342f89fcafd9', true);

-- Verificação rápida (opcional): deve retornar 21 linhas
-- select nome, perfil, ativo from usuarios order by perfil, nome;

-- Verificação rápida das colunas novas em contratos (opcional): deve
-- retornar 18 linhas (as 9 de cada migração)
-- select column_name from information_schema.columns
-- where table_name = 'contratos' and column_name in (
--   'c_natureza_contrato','c_natureza_contrato_outro','c_objetivo_contrato',
--   'c_objetivo_contrato_outro','c_link_token','c_link_expira_em','c_link_usado',
--   'c_contrato_html','c_contrato_gerado_em','c_cargo','c_cargo_outro','c_setor',
--   'c_condicoes_pagamento','c_doc_identidade','c_doc_comprovante_residencia',
--   'c_doc_cnpj','c_doc_curriculo'
-- );

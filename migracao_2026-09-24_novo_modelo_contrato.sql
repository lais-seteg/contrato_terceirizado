-- ══════════════════════════════════════════════════════
--  NOVO MODELO DE CONTRATO (revisão set/2026) — campos que faltavam
-- ══════════════════════════════════════════════════════
--
--  A revisão do "Modelo de Contrato de Prestação de Serviços" mudou a
--  Cláusula 3ª: o valor deixou de ser mensal fechado e passou a ser unitário —
--  por DIÁRIA realizada ou por MÊS de prestação —, com o total variando
--  conforme a demanda. E a qualificação da CONTRATADA passou a exigir a
--  nacionalidade, que o sistema até aqui escrevia fixo como "brasileiro(a)".
--
--  Todas as colunas são text, como as demais de contratos/terceirizados —
--  os valores em reais circulam no formato brasileiro ("1.234,56").
--
--  Idempotente: pode rodar de novo sem quebrar.

-- ─── Modalidade de pagamento e valores da diária (Cláusula 3ª) ───
alter table public.contratos add column if not exists c_modalidade_pgto text;
alter table public.contratos add column if not exists c_valor_diaria    text;
alter table public.contratos add column if not exists c_qtd_diarias     text;

comment on column public.contratos.c_modalidade_pgto is
  'Modalidade da Cláusula 3ª: "Mensal" (valor por mês de prestação) ou "Diária" (valor por diária realizada). Vazio em contratos anteriores à revisão set/2026 — o gerador trata como Mensal.';
comment on column public.contratos.c_valor_diaria is
  'Valor unitário da diária, quando c_modalidade_pgto = Diária. Formato brasileiro.';
comment on column public.contratos.c_qtd_diarias is
  'Nº de diárias previstas, quando c_modalidade_pgto = Diária. c_valor_total = c_valor_diaria x c_qtd_diarias.';

-- ─── Nacionalidade (qualificação da CONTRATADA) ───
alter table public.terceirizados add column if not exists t_nacionalidade      text;
alter table public.contratos     add column if not exists c_terc_nacionalidade text;

comment on column public.terceirizados.t_nacionalidade is
  'Nacionalidade do terceirizado, usada na qualificação da CONTRATADA nos dois modelos de contrato. Antes era fixo "brasileiro(a)" no código.';

-- Cadastros que já existem são de brasileiros: sem isso, todo contrato gerado
-- a partir deles passaria a sair com a lacuna amarela [nacionalidade].
update public.terceirizados
   set t_nacionalidade = 'brasileiro(a)'
 where t_nacionalidade is null;

update public.contratos
   set c_terc_nacionalidade = 'brasileiro(a)'
 where c_terc_nacionalidade is null;

-- ─── RPC do cadastro público: passa a gravar a nacionalidade ───
-- A função lista as colunas uma a uma; sem esta linha o campo novo do
-- cadastro.html seria aceito na tela e descartado silenciosamente no banco.
create or replace function public.enviar_cadastro_terceirizado(p_contrato_id text, p_token text, p_dados jsonb)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_contrato record;
begin
  select c.id, c.c_terceirizado_id, c.historico
  into v_contrato
  from contratos c
  where c.id = p_contrato_id
    and c.c_link_token = p_token
    and coalesce(c.c_link_usado, false) = false
    and c.c_link_expira_em is not null
    and c.c_link_expira_em > now()
  limit 1;

  if not found or v_contrato.c_terceirizado_id is null then
    raise exception 'Link inválido, expirado ou já utilizado.';
  end if;

  update terceirizados set
    t_nome            = p_dados->>'t_nome',
    t_tipo            = p_dados->>'t_tipo',
    t_email           = p_dados->>'t_email',
    t_cpf             = p_dados->>'t_cpf',
    t_rg              = p_dados->>'t_rg',
    t_nascimento      = case when p_dados->>'t_nascimento' is not null and p_dados->>'t_nascimento' <> ''
                             then (p_dados->>'t_nascimento')::date else null end,
    -- Qualificação da CONTRATADA no contrato gerado
    t_nacionalidade   = p_dados->>'t_nacionalidade',
    t_estado_civil    = p_dados->>'t_estado_civil',
    t_telefone        = p_dados->>'t_telefone',
    t_estado          = p_dados->>'t_estado',
    t_cidade          = p_dados->>'t_cidade',
    t_endereco        = p_dados->>'t_endereco',
    t_graduacao       = p_dados->>'t_graduacao',
    t_nivel_formacao  = p_dados->>'t_nivel_formacao',
    t_area_expertise  = p_dados->>'t_area_expertise',
    t_cursos_extras   = p_dados->>'t_cursos_extras',
    t_lattes          = p_dados->>'t_lattes',
    t_registro        = p_dados->>'t_registro',
    t_crbio2          = p_dados->>'t_crbio2',
    t_ctf             = p_dados->>'t_ctf',
    t_cnh             = p_dados->>'t_cnh',
    t_exp_direcao     = p_dados->>'t_exp_direcao',
    t_possui_cnpj     = p_dados->>'t_possui_cnpj',
    t_cnpj            = p_dados->>'t_cnpj',
    -- Pessoa jurídica (modelo CNPJ do contrato)
    t_razao_social    = p_dados->>'t_razao_social',
    t_rep_legal       = p_dados->>'t_rep_legal',
    t_endereco_sede   = p_dados->>'t_endereco_sede',
    t_comprovante     = p_dados->>'t_comprovante',
    t_emissao         = p_dados->>'t_emissao',
    t_forma_pgto      = p_dados->>'t_forma_pgto',
    t_parcelas        = p_dados->>'t_parcelas',
    t_dados_bancarios = p_dados->>'t_dados_bancarios',
    -- Dados bancários separados, como o contrato pede (Nome/Banco/Ag/CC/Pix)
    t_titular_conta   = p_dados->>'t_titular_conta',
    t_banco           = p_dados->>'t_banco',
    t_agencia         = p_dados->>'t_agencia',
    t_conta           = p_dados->>'t_conta',
    t_pix             = p_dados->>'t_pix',
    t_disponibilidade = p_dados->>'t_disponibilidade',
    t_emerg1_nome     = p_dados->>'t_emerg1_nome',
    t_emerg1_tel      = p_dados->>'t_emerg1_tel',
    t_emerg2_nome     = p_dados->>'t_emerg2_nome',
    t_emerg2_tel      = p_dados->>'t_emerg2_tel',
    t_projetos_seteg  = p_dados->>'t_projetos_seteg',
    t_outras_info     = p_dados->>'t_outras_info',
    atualizado_em     = now()
  where id = v_contrato.c_terceirizado_id;

  update contratos set
    c_link_usado = true,
    status = 'Em Elaboração',
    historico = coalesce(v_contrato.historico, '[]'::jsonb) || jsonb_build_object(
      'data', now(),
      'usuario', p_dados->>'t_nome',
      'perfil', 'terceirizado',
      'status', 'Em Elaboração',
      'obs', 'Cadastro preenchido pelo terceirizado via link.'
    )
  where id = p_contrato_id;
end;
$function$;

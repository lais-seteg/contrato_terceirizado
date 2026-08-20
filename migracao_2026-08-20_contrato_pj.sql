-- ═══════════════════════════════════════════════════════════════════════
--  MIGRAÇÃO 2026-08-20 · Modelo CNPJ do Contrato de Prestação de Serviços
--
--  O contrato gerado pelo sistema passou a ter dois modelos: o de pessoa
--  física (que já existia) e o de pessoa jurídica, transcrito de
--  doc/MODELO_CONTRATO_PRESTACAO_SERVICOS_CNPJ_SETEG.docx. O modelo CNPJ
--  qualifica a CONTRATADA como empresa (razão social, CNPJ, sede,
--  representante legal) e pede os dados bancários em linhas separadas
--  (Nome / Banco / Ag / CC / Pix) — daí as colunas abaixo.
--
--  RODAR NO SQL EDITOR DO SUPABASE **ANTES** DE PUBLICAR O FRONT.
--  O sync do app envia todas as colunas de uma vez (_ctrToRow/_tercToRow em
--  script.js): se uma coluna não existir, o upsert inteiro falha e nada é
--  salvo.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Cadastro do terceirizado ────────────────────────────────────────
-- Preenchidos pelo próprio terceirizado em cadastro.html (bloco que só
-- aparece quando "Possui MEI / CNPJ?" = Sim) e editáveis pelo DP.
alter table public.terceirizados add column if not exists t_razao_social   text;
alter table public.terceirizados add column if not exists t_rep_legal      text;
alter table public.terceirizados add column if not exists t_endereco_sede  text;

-- Dados bancários separados. t_dados_bancarios continua existindo e é
-- recomposto a partir destes campos — telas, relatórios e os cadastros
-- antigos seguem lendo ele.
alter table public.terceirizados add column if not exists t_titular_conta  text;
alter table public.terceirizados add column if not exists t_banco          text;
alter table public.terceirizados add column if not exists t_agencia        text;
alter table public.terceirizados add column if not exists t_conta          text;
alter table public.terceirizados add column if not exists t_pix            text;

-- ── 2. Contrato ────────────────────────────────────────────────────────
-- Espelho dos campos acima no contrato: o DP pode corrigir sem alterar o
-- cadastro do terceirizado, e o contrato guarda o que valia na assinatura.
alter table public.contratos add column if not exists c_terc_razao_social  text;
alter table public.contratos add column if not exists c_terc_rep_legal     text;
alter table public.contratos add column if not exists c_terc_endereco_sede text;
alter table public.contratos add column if not exists c_terc_titular_conta text;
alter table public.contratos add column if not exists c_terc_banco         text;
alter table public.contratos add column if not exists c_terc_agencia       text;
alter table public.contratos add column if not exists c_terc_conta         text;
alter table public.contratos add column if not exists c_terc_pix           text;

-- Já existiam no schema desde versões anteriores (e já estavam em
-- CAMPOS_CONTRATO), mas passaram a ser efetivamente usados agora: o valor
-- mensal é preenchido pelo líder na solicitação e o CNPJ decide qual modelo
-- de contrato é gerado. O "if not exists" cobre bancos que não os tenham.
alter table public.contratos add column if not exists c_valor_mensal       text;
alter table public.contratos add column if not exists c_terc_cnpj          text;

-- Nº de parcelas do contrato, informado pelo líder na solicitação. Antes o
-- número de parcelas só existia no cadastro do terceirizado (t_parcelas), que
-- descreve como ele costuma receber — não os termos deste contrato.
alter table public.contratos add column if not exists c_parcelas           text;

-- Modelo do contrato fixado à mão pelo DP ("PJ" / "PF"). Vazio = automático,
-- decidido pelo cadastro do terceirizado. Necessário porque o DP costuma
-- elaborar o contrato antes do terceirizado responder ao link, quando ainda
-- não existe comprovante nem CNPJ em que se basear.
alter table public.contratos add column if not exists c_modelo_contrato    text;

-- ═══════════════════════════════════════════════════════════════════════
--  3. Função enviar_cadastro_terceirizado()
--
--  O cadastro externo (cadastro.html, sem login) não grava direto na tabela:
--  manda tudo num jsonb para esta RPC SECURITY DEFINER, que valida o token do
--  link antes de gravar. Como ela lista as colunas uma por uma, as 8 chaves
--  novas precisam ser acrescentadas aqui — senão o terceirizado preenche
--  razão social, sede e dados bancários e nada disso chega ao banco, sem
--  erro nenhum na tela.
--
--  Abaixo, a função na íntegra com as 8 linhas novas (t_razao_social,
--  t_rep_legal, t_endereco_sede, t_titular_conta, t_banco, t_agencia,
--  t_conta, t_pix). A validação do link e o avanço de status continuam
--  idênticos ao que já estava em produção.
-- ═══════════════════════════════════════════════════════════════════════

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

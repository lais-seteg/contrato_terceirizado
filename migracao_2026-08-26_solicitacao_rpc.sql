-- ═══════════════════════════════════════════════════════════════════
--  Criação da solicitação vira uma operação única no servidor.
--  Aplicado em 26/08/2026.
--
--  Motivo (reproduzido no banco, perfil por perfil):
--
--    upsert            contratos      terceirizados
--    solicitante       NEGADO(403)    NEGADO(403)
--    gestao-pessoas    permitido      permitido
--    gestao            NEGADO(403)    permitido
--
--  Ou seja, o fluxo principal — líder abre solicitação — estava quebrado
--  por RLS:
--
--   • terceirizados_insert exige gestao/gestao-pessoas, mas quem cria o
--     registro-base ao salvar é o próprio líder → "falha ao sincronizar
--     terceirizado". É por isso que TER-0004 nunca existiu, apesar de
--     CTR-0004 apontar para ele.
--   • terceirizados_select só mostra ao líder os vinculados aos contratos
--     dele — na prática 0 registros —, então uma busca de CPF feita pelo
--     cliente jamais encontraria um cadastro existente.
--   • o upsert de contratos exigia também permissão de UPDATE, que o
--     solicitante não tem para linha nova → 403 mesmo podendo inserir.
--
--  Resolver afrouxando o RLS daria ao líder leitura ampla da tabela que
--  guarda RG e dados bancários. Em vez disso, a criação passa por uma RPC
--  SECURITY DEFINER: o líder não precisa de permissão direta em
--  terceirizados, não passa a enxergar dado sensível de ninguém, e
--  contrato + registro-base gravam na mesma transação.
-- ═══════════════════════════════════════════════════════════════════

-- Consulta de CPF da tela de identificação. Devolve só o que o líder já vai
-- digitar de qualquer forma (nome/telefone) mais o aviso de cadastro
-- completo — nunca RG, endereço ou dados bancários.
create or replace function public.consultar_cpf_terceirizado(p_cpf text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $fn$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_t record;
begin
  if auth.uid() is null or perfil_atual() is null then
    raise exception 'sessao invalida ou usuario sem perfil' using errcode = '42501';
  end if;
  if length(v_cpf) <> 11 then
    return jsonb_build_object('encontrado', false);
  end if;

  select t.id, t.t_nome, t.t_telefone,
         (coalesce(btrim(t.t_email),'') <> '' or t.atualizado_em is not null) as completo
    into v_t
    from terceirizados t
   where regexp_replace(coalesce(t.t_cpf,''), '\D','','g') = v_cpf
   order by t.criado_em nulls last
   limit 1;

  if not found then
    return jsonb_build_object('encontrado', false);
  end if;

  return jsonb_build_object(
    'encontrado', true,
    'id',        v_t.id,
    'nome',      v_t.t_nome,
    'telefone',  v_t.t_telefone,
    'completo',  v_t.completo
  );
end $fn$;


create or replace function public.criar_solicitacao_contrato(p_dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_perfil  text := perfil_atual();
  v_nome    text := nome_atual();
  v_cpf     text;
  v_terc    record;
  v_terc_id text;
  v_completo boolean := false;
  v_precisa_link boolean;
  v_id      text;
  v_status  text;
  v_token   text;
  v_expira  timestamptz;
  v_agora   timestamptz := now();
  v_row     contratos%rowtype;
  v_obs     text;
begin
  if auth.uid() is null or v_perfil is null or v_nome is null then
    raise exception 'sessao invalida ou usuario sem perfil vinculado' using errcode = '42501';
  end if;

  v_cpf := regexp_replace(coalesce(p_dados->>'c_terc_cpf',''), '\D', '', 'g');
  if length(v_cpf) <> 11 then
    raise exception 'CPF do terceirizado invalido' using errcode = '22023';
  end if;

  -- Um registro só conta como cadastro de verdade quando tem e-mail (o DP
  -- preencheu pela tela) ou foi respondido pelo link
  -- (enviar_cadastro_terceirizado carimba atualizado_em). O registro-base
  -- criado por uma solicitação anterior não conta: a mesma linha é
  -- reaproveitada, mas um link novo é gerado.
  select t.id,
         (coalesce(btrim(t.t_email),'') <> '' or t.atualizado_em is not null) as completo
    into v_terc
    from terceirizados t
   where regexp_replace(coalesce(t.t_cpf,''), '\D','','g') = v_cpf
   order by t.criado_em nulls last
   limit 1;

  if found then
    v_terc_id  := v_terc.id;
    v_completo := v_terc.completo;
  end if;

  v_precisa_link := not v_completo;

  if v_terc_id is null then
    v_terc_id := proximo_id_seq('TER');
    insert into terceirizados (id, t_nome, t_cpf, t_telefone, t_tipo, criado_por, criado_em)
    values (v_terc_id,
            p_dados->>'c_terc_nome',
            p_dados->>'c_terc_cpf',
            p_dados->>'c_terc_telefone',
            p_dados->>'c_tipo_contratacao',
            v_nome, v_agora);
  end if;

  v_id := proximo_id_seq('CTR');

  -- Solicitante nunca escolhe o status: sai Pendente, ou já Em Elaboração
  -- quando não há nada a esperar do terceirizado. DP/Gestão mantêm o que
  -- vier do formulário.
  if v_perfil = 'solicitante' then
    v_status := case when v_precisa_link then 'Pendente' else 'Em Elaboração' end;
  else
    v_status := coalesce(nullif(p_dados->>'status',''), 'Pendente');
  end if;

  if v_precisa_link then
    v_token  := gen_random_uuid()::text;
    v_expira := v_agora + interval '24 hours';
    v_obs    := 'Contrato criado e enviado para análise.';
  else
    v_obs    := 'Contrato criado com terceirizado já cadastrado (CPF já existente) — encaminhado direto para elaboração.';
  end if;

  -- Campos que o cliente não decide são removidos antes de virar linha:
  -- id, status, autoria, vínculo, token do link e histórico saem daqui.
  v_row := jsonb_populate_record(null::contratos,
             p_dados - 'id' - 'status' - 'criado_por' - 'criado_em'
                     - 'atualizado_por' - 'atualizado_em' - 'c_terceirizado_id'
                     - 'c_link_token' - 'c_link_expira_em' - 'c_link_usado'
                     - 'historico' - 'c_contrato_html' - 'c_contrato_gerado_em');

  v_row.id                := v_id;
  v_row.status            := v_status;
  v_row.c_terceirizado_id := v_terc_id;
  v_row.criado_por        := v_nome;
  v_row.criado_em         := v_agora;
  v_row.c_link_token      := v_token;
  v_row.c_link_expira_em  := v_expira;
  v_row.c_link_usado      := false;
  v_row.entregas          := coalesce(p_dados->'entregas', '[]'::jsonb);
  v_row.historico         := jsonb_build_array(jsonb_build_object(
                               'data', v_agora, 'usuario', v_nome,
                               'perfil', v_perfil, 'status', v_status, 'obs', v_obs));

  insert into contratos select (v_row).*;

  return jsonb_build_object(
    'id',              v_id,
    'terceirizado_id', v_terc_id,
    'status',          v_status,
    'precisa_link',    v_precisa_link,
    'link_token',      v_token,
    'link_expira_em',  v_expira,
    'criado_em',       v_agora,
    'criado_por',      v_nome,
    'historico',       v_row.historico
  );
end $fn$;

revoke all on function public.consultar_cpf_terceirizado(text)  from public, anon;
revoke all on function public.criar_solicitacao_contrato(jsonb) from public, anon;
grant execute on function public.consultar_cpf_terceirizado(text)  to authenticated;
grant execute on function public.criar_solicitacao_contrato(jsonb) to authenticated;

-- Gestão passa a poder abrir solicitação como os demais perfis (decisão da
-- usuária em 26/08/2026). A regra que sobra é a de sempre: usuário
-- autenticado com perfil vinculado.
drop policy if exists "insert contratos exceto gestao" on public.contratos;
create policy "insert contratos usuarios com perfil" on public.contratos
  for insert to authenticated
  with check (perfil_atual() is not null);

-- ═══════════════════════════════════════════════════════════════════
--  IDs atômicos no servidor (CTR / TER / AVL / AUD)
--  Aplicado em 26/08/2026.
--
--  Antes, gerarId() no navegador calculava o próximo id a partir da
--  lista carregada no LOGIN. Aba aberta há horas = lista velha = id
--  repetido; e como a gravação era upsert(onConflict:'id'), o id
--  repetido SOBRESCREVIA em silêncio o registro de outra pessoa.
--  (Prova: CTR-0004 não tem entrada "Criação" na auditoria — o
--  AUD-000N gerado junto também colidiu e o insert foi descartado.)
--
--  As sequences abaixo já existiam no banco, criadas junto com uma
--  next_id(prefixo, seq_name) que nunca chegou a ser ligada ao front.
--  Aqui elas passam a ser usadas de verdade: nextval é atômico e, como
--  em proximo_numero_contrato(), número usado nunca volta — nem quando
--  o salvamento é desfeito.
-- ═══════════════════════════════════════════════════════════════════

-- Semente: (max + 1, false) = "o próximo é este". Com (max, true) o
-- primeiro id de uma tabela vazia sairia como AVL-0002.
-- Em TER entra também o que está referenciado em
-- contratos.c_terceirizado_id, senão um id órfão (é o caso de TER-0004)
-- seria reaproveitado.
select setval('public.seq_contratos',
  (select coalesce(max(nullif(regexp_replace(id,'\D','','g'),'')::int),0) from public.contratos) + 1, false);
select setval('public.seq_terceirizados',
  greatest(
    (select coalesce(max(nullif(regexp_replace(id,'\D','','g'),'')::int),0) from public.terceirizados),
    (select coalesce(max(nullif(regexp_replace(c_terceirizado_id,'\D','','g'),'')::int),0)
       from public.contratos where c_terceirizado_id is not null)) + 1, false);
select setval('public.seq_avaliacoes',
  (select coalesce(max(nullif(regexp_replace(id,'\D','','g'),'')::int),0) from public.avaliacoes) + 1, false);
select setval('public.seq_auditoria',
  (select coalesce(max(nullif(regexp_replace(id,'\D','','g'),'')::int),0) from public.auditoria) + 1, false);

create or replace function public.proximo_id_seq(p_prefixo text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_prefixo text := upper(trim(p_prefixo));
  v_seq text;
begin
  v_seq := case v_prefixo
             when 'CTR' then 'public.seq_contratos'
             when 'TER' then 'public.seq_terceirizados'
             when 'AVL' then 'public.seq_avaliacoes'
             when 'AUD' then 'public.seq_auditoria'
           end;
  if v_seq is null then
    raise exception 'prefixo invalido: %', p_prefixo using errcode = '22023';
  end if;
  return v_prefixo || '-' || lpad(nextval(v_seq)::text, 4, '0');
end $$;

-- Wrapper chamado pelo front. Exige sessão válida, como
-- proximo_numero_contrato() — sem isso qualquer visitante inferiria o
-- volume de contratos da empresa.
create or replace function public.proximo_id(p_prefixo text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then
    raise exception 'sessao invalida ou expirada' using errcode = '42501';
  end if;
  return proximo_id_seq(p_prefixo);
end $$;

-- A auditoria é gravada de forma síncrona em dezenas de pontos do
-- script; deixar o id vir por DEFAULT evita ter que tornar
-- registrarAuditoria() assíncrona só por causa disso.
alter table public.auditoria alter column id set default public.proximo_id_seq('AUD');

-- next_id(prefixo, seq_name) ficou da tentativa anterior: não é chamada
-- por nenhum default, trigger ou tela, e era a única função do schema
-- sem search_path fixo. Sai para não voltar a confundir com proximo_id().
drop function if exists public.next_id(text, text);

-- anon não tem o que fazer com numeração: proximo_id() já barra sessão
-- inválida, e proximo_id_seq() não pode ficar aberta para queimar
-- números. authenticated precisa manter execute em proximo_id_seq
-- porque o DEFAULT de auditoria.id roda com o papel de quem insere.
revoke all on function public.proximo_id_seq(text) from public, anon;
revoke all on function public.proximo_id(text)     from public, anon;
grant execute on function public.proximo_id_seq(text) to authenticated;
grant execute on function public.proximo_id(text)     to authenticated;

-- ══════════════════════════════════════════════════════════════
-- Contratação de Terceirizados · Seteg
-- Migração de segurança — 2026-08-03
--
-- Problema corrigido: a tabela "usuarios" tinha uma policy
-- `for select to anon using (true)`. Como o app roda 100% com a chave
-- publishable (anon) exposta no navegador, e RLS não sabe filtrar por
-- "qual coluna a query pediu" nem "qual WHERE o app mandou" — só decide
-- se a LINHA pode ser lida — qualquer pessoa de posse dessa chave
-- conseguia rodar `select * from usuarios` direto pela API REST do
-- Supabase (sem passar pelo app) e baixar nome/perfil/codigo_hash de
-- TODOS os 21 usuários. Com o hash em mãos, um ataque offline de força
-- bruta/rainbow table contra SHA-256 sem salt é totalmente viável.
--
-- Correção: a tabela "usuarios" deixa de ter qualquer policy para
-- "anon" (RLS passa a negar tudo por padrão). Todo o acesso de login
-- passa a ser feito através da função abaixo (SECURITY DEFINER), que:
--   1) Nunca devolve a coluna codigo_hash nem qualquer outra linha além
--      da que bate exatamente com o hash informado.
--   2) Aplica um limite de tentativas por IP (usando o cabeçalho
--      x-forwarded-for que o PostgREST expõe em request.headers),
--      bloqueando por 15 minutos após 10 falhas — proteção real contra
--      força bruta, que antes não existia (o app só tinha um timeout de
--      rede, sem nenhum controle de tentativas).
--
-- Rode este arquivo inteiro no SQL Editor do Supabase (idempotente —
-- pode rodar mais de uma vez sem erro).
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- 1) Tabela de tentativas de login, só para controle de força bruta.
--    Guarda apenas IP + resultado — nunca o código digitado nem o hash.
-- ──────────────────────────────────────────────────────────────
create table if not exists login_attempts (
  id        bigint generated always as identity primary key,
  ip        text not null,
  sucesso   boolean not null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_login_attempts_ip_tempo
  on login_attempts (ip, criado_em desc);

alter table login_attempts enable row level security;
-- Nenhuma policy para "anon" → só a função SECURITY DEFINER abaixo
-- consegue ler/escrever aqui (ela roda com o dono da função, não com o
-- papel "anon" da requisição).

-- Housekeeping: nunca deixa a tabela crescer sem limite.
delete from login_attempts where criado_em < now() - interval '7 days';

-- ──────────────────────────────────────────────────────────────
-- 2) Função de autenticação — substitui o `select * from usuarios`
--    direto que o script.js fazia antes.
-- ──────────────────────────────────────────────────────────────
create or replace function autenticar_usuario(p_hash text)
returns table (nome text, perfil text, setor text, gestor text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ip      text;
  v_falhas  int;
  v_usuario record;
begin
  v_ip := coalesce(
    nullif(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1), ''),
    'desconhecido'
  );

  select count(*) into v_falhas
  from login_attempts
  where ip = v_ip and sucesso = false and criado_em > now() - interval '15 minutes';

  if v_falhas >= 10 then
    raise exception 'Muitas tentativas de login deste endereço. Aguarde 15 minutos e tente novamente.';
  end if;

  select u.nome, u.perfil, u.setor, u.gestor
  into v_usuario
  from usuarios u
  where u.codigo_hash = p_hash and u.ativo = true
  limit 1;

  insert into login_attempts (ip, sucesso) values (v_ip, v_usuario.nome is not null);

  if v_usuario.nome is null then
    return;
  end if;

  return query select v_usuario.nome, v_usuario.perfil, v_usuario.setor, v_usuario.gestor;
end;
$$;

revoke all on function autenticar_usuario(text) from public;
grant execute on function autenticar_usuario(text) to anon;

-- ──────────────────────────────────────────────────────────────
-- 3) Remove o acesso direto de "anon" à tabela usuarios.
--    Sem nenhuma policy, RLS bloqueia SELECT/INSERT/UPDATE/DELETE por
--    padrão — o app nunca escreveu em usuarios, só lia para o login
--    (agora feito exclusivamente pela função acima).
-- ──────────────────────────────────────────────────────────────
drop policy if exists "anon select usuarios" on usuarios;

-- ──────────────────────────────────────────────────────────────
-- 4) Auditoria vira "somente inserção" para anon — o app nunca chama
--    update/delete em auditoria (grep confirmado em script.js), então
--    travar isso não quebra nada e impede que alguém apague/altere o
--    rastro de auditoria pela API direta.
-- ──────────────────────────────────────────────────────────────
drop policy if exists "anon crud auditoria" on auditoria;

create policy "anon select auditoria" on auditoria
  for select to anon using (true);

create policy "anon insert auditoria" on auditoria
  for insert to anon with check (true);

-- Verificação rápida (opcional):
-- select * from pg_policies where tablename in ('usuarios','auditoria');
-- select proname, prosecdef from pg_proc where proname = 'autenticar_usuario';

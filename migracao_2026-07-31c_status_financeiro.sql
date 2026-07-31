-- ══════════════════════════════════════════════════════════════
-- Migração 2026-07-31 (parte c) — Status "Aguardando Pagamento" +
-- alerta de prazo de pagamento (financeiro)
-- ══════════════════════════════════════════════════════════════
-- Rodar no SQL Editor do Supabase do projeto contrato_terceirizado.
-- Coluna com "if not exists" — seguro rodar mais de uma vez.

-- Data em que o DP encaminhou o contrato ao financeiro (status muda para
-- "Aguardando Pagamento"). O alerta de prazo de pagamento (10 dias
-- corridos a partir desta data) é calculado no cliente a partir dela —
-- ver diasAtePrazoPagamento() em script.js.
alter table contratos add column if not exists c_data_encaminhado_financeiro timestamptz;

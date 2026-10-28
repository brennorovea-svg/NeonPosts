-- Bloco 5: plano e assinatura de cada negócio. Só as funções do servidor (Stripe) mudam estas colunas.
-- Conta nova começa no plano grátis (5 peças); quem já existia mantém o limite que tinha.

alter table public.negocios
  add column plano text not null default 'gratis' check (plano in ('gratis', 'essencial', 'pro')),
  add column assinatura_status text,
  add column renova_em timestamptz,
  add column cancela_no_fim boolean not null default false,
  add column stripe_cliente text unique,
  add column stripe_assinatura text unique;

alter table public.negocios alter column limite_pecas set default 5;

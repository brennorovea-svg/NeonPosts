-- Versões anteriores de cada peça ("Gerar de novo" guarda a anterior aqui).
-- escolhida aponta para a versão que vai para o post: índice em [...versoes, roteiro atual];
-- vazio é a mais nova.
alter table public.pecas
  add column versoes jsonb not null default '[]'::jsonb,
  add column escolhida int;
grant update (escolhida) on public.pecas to authenticated;

-- Peça de boas-vindas: a primeira peça da marca, criada na entrada, não conta no limite do mês.
alter table public.pecas add column cortesia boolean not null default false;

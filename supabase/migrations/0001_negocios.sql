-- Bloco 1: cada conta tem um negócio, e cada negócio só enxerga os próprios dados.

create table public.negocios (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null unique references auth.users (id) on delete cascade,
  nome text,
  limite_pecas integer not null default 30,
  criado_em timestamptz not null default now()
);

alter table public.negocios enable row level security;

create policy "dono lê o próprio negócio"
  on public.negocios for select
  to authenticated
  using (dono = (select auth.uid()));

create policy "dono edita o próprio negócio"
  on public.negocios for update
  to authenticated
  using (dono = (select auth.uid()))
  with check (dono = (select auth.uid()));

-- O negócio nasce junto com a conta, no servidor; o app não precisa inserir.
create function public.criar_negocio_da_conta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.negocios (dono) values (new.id);
  return new;
end;
$$;

create trigger ao_criar_conta
  after insert on auth.users
  for each row execute function public.criar_negocio_da_conta();

-- A função só roda pelo gatilho, nunca chamada direto pela API.
revoke execute on function public.criar_negocio_da_conta() from public, anon, authenticated;

-- O dono só muda o nome; o limite de peças fica com o servidor.
revoke update on public.negocios from anon, authenticated;
grant update (nome) on public.negocios to authenticated;

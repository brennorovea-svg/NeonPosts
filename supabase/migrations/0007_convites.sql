-- Bloco 6: convite com a marca pronta. A Neon cadastra o perfil antes de o
-- cliente entrar; no primeiro login (pelo Google ou pelo link no e-mail),
-- o negócio já nasce com o perfil como versão 1.

create table public.convites (
  email text primary key check (email = lower(email)),
  perfil jsonb not null,          -- { identidade, voz, padrao, dados }, igual ao perfis_marca
  limite_pecas integer,           -- opcional: limite do beta; vazio = o do plano
  criado_em timestamptz not null default now(),
  usado_em timestamptz
);

-- Só o servidor lê e escreve: nenhum acesso pela API.
alter table public.convites enable row level security;
revoke all on public.convites from anon, authenticated;

create or replace function public.criar_negocio_da_conta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  negocio_id uuid;
  convite public.convites;
begin
  insert into public.negocios (dono) values (new.id) returning id into negocio_id;

  select * into convite from public.convites
    where email = lower(new.email) and usado_em is null
    for update;
  if found then
    insert into public.perfis_marca (negocio, versao, identidade, voz, padrao, dados)
    values (
      negocio_id, 0,
      coalesce(convite.perfil -> 'identidade', '{}'::jsonb),
      coalesce(convite.perfil -> 'voz', '{}'::jsonb),
      coalesce(convite.perfil -> 'padrao', '{}'::jsonb),
      coalesce(convite.perfil -> 'dados', '{}'::jsonb)
    );
    update public.negocios
      set nome = convite.perfil -> 'identidade' ->> 'nome',
          limite_pecas = coalesce(convite.limite_pecas, limite_pecas)
      where id = negocio_id;
    update public.convites set usado_em = now() where email = convite.email;
  end if;

  return new;
end;
$$;

revoke execute on function public.criar_negocio_da_conta() from public, anon, authenticated;

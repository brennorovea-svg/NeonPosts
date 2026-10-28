-- Peças geradas. Só a função gerar-peca (com a chave de serviço) cria e refaz;
-- o dono lê as suas e pode trocar modelo e formato e guardar a imagem desenhada.
create table public.pecas (
  id uuid primary key default gen_random_uuid(),
  negocio uuid not null references public.negocios (id) on delete cascade,
  perfil_versao int not null,
  formato text not null check (formato in ('post', 'story')),
  modelo text not null check (modelo in ('promo', 'aviso', 'bastidores')),
  pedido text not null check (char_length(pedido) between 3 and 600),
  roteiro jsonb not null,
  fotos text[] not null default '{}',
  imagem text,
  refeitas int not null default 0,
  criado_em timestamptz not null default now()
);

create index pecas_negocio_criado on public.pecas (negocio, criado_em desc);

alter table public.pecas enable row level security;

create policy "dono vê as peças" on public.pecas
  for select to authenticated
  using (negocio in (select id from public.negocios where dono = auth.uid()));

create policy "dono troca modelo, formato e imagem" on public.pecas
  for update to authenticated
  using (negocio in (select id from public.negocios where dono = auth.uid()))
  with check (negocio in (select id from public.negocios where dono = auth.uid()));

revoke all on public.pecas from anon;
revoke insert, update, delete on public.pecas from authenticated;
grant select on public.pecas to authenticated;
grant update (modelo, formato, imagem) on public.pecas to authenticated;

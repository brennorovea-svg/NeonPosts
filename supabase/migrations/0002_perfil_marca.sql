-- Bloco 2: o perfil da marca é o motor da criação e é versionado.
-- Cada vez que o cliente salva, nasce uma versão nova; nenhuma é alterada ou apagada.
-- A peça gerada (Bloco 3) vai guardar com qual versão foi feita.

create table public.perfis_marca (
  id uuid primary key default gen_random_uuid(),
  negocio uuid not null references public.negocios (id) on delete cascade,
  versao integer not null,
  identidade jsonb not null default '{}'::jsonb, -- nome, ramo, cores, logo, fotos
  voz jsonb not null default '{}'::jsonb,        -- tom, tratamento, palavras, exemplos
  padrao jsonb not null default '{}'::jsonb,     -- tipos de post, frequência, hashtags, chamada
  dados jsonb not null default '{}'::jsonb,      -- endereço, horário, contatos, itens e preços
  criado_em timestamptz not null default now(),
  unique (negocio, versao)
);

alter table public.perfis_marca enable row level security;

create policy "dono lê o perfil do próprio negócio"
  on public.perfis_marca for select
  to authenticated
  using (negocio in (select id from public.negocios where dono = (select auth.uid())));

create policy "dono cria versão do perfil do próprio negócio"
  on public.perfis_marca for insert
  to authenticated
  with check (negocio in (select id from public.negocios where dono = (select auth.uid())));

-- O número da versão sai do servidor: o app não escolhe.
create function public.numerar_versao_perfil()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.negocio::text));
  select coalesce(max(versao), 0) + 1 into new.versao
    from public.perfis_marca where negocio = new.negocio;
  return new;
end;
$$;

create trigger numerar_versao
  before insert on public.perfis_marca
  for each row execute function public.numerar_versao_perfil();

revoke execute on function public.numerar_versao_perfil() from public, anon, authenticated;
revoke all on public.perfis_marca from anon;
revoke update, delete on public.perfis_marca from authenticated;

-- Logo e fotos: storage privado, uma pasta por negócio (marcas/<id do negócio>/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marcas', 'marcas', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

create policy "dono lê os arquivos da própria marca"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'marcas' and (storage.foldername(name))[1] in
    (select id::text from public.negocios where dono = (select auth.uid())));

create policy "dono envia arquivos da própria marca"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'marcas' and (storage.foldername(name))[1] in
    (select id::text from public.negocios where dono = (select auth.uid())));

create policy "dono apaga arquivos da própria marca"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'marcas' and (storage.foldername(name))[1] in
    (select id::text from public.negocios where dono = (select auth.uid())));

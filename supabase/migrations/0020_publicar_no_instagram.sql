-- Publicar sozinho no Instagram (piloto interno, Brenno, 13/11/2026).
-- Só para a conta da própria Neon Scripts (@neon.scripts), pela API oficial da Meta com o
-- app "Publicador Neon Scripts" em modo de desenvolvimento. Cliente nenhum entra aqui antes
-- da revisão da Meta + CNPJ (ou de um intermediário como o Upload-Post).
--
-- Como funciona:
--   1. No Planner, num post pronto, o dono toca em "Publicar sozinho no Instagram". O app sobe o
--      arquivo final (JPEG ou MP4) no bucket privado `publicar` e liga `agenda.publicar`.
--      Esse toque é o ok para aquele post: nada sai sem ele.
--   2. A cada 5 minutos o pg_cron chama a função `publicar`. Ela pega o que chegou na hora,
--      cria o contêiner no Instagram, espera processar e publica. Vídeo pode levar mais de uma volta.
--   3. Deu certo: `postado_em`, `publicado_id` e `permalink`. Deu errado: `publicacao_estado = 'erro'`
--      e o motivo em `publicacao_erro`; o post volta a ser postado à mão.
--
-- O que o Brenno faz uma vez, fora desta migração (o token nunca fica no repositório nem no chat):
--   - Supabase › Edge Functions › Secrets: INSTAGRAM_TOKEN_NEON_SCRIPTS = o token EAA do config.env.
--   - Publicar a função: `supabase functions deploy publicar --no-verify-jwt`.
--   O segredo do cron é o mesmo do `avisar` (cofre: avisar_segredo; Secret: AVISAR_SEGREDO).

-- Quais negócios publicam direto e em qual conta. O token fica num Secret das Edge Functions;
-- aqui só o NOME do Secret. Só o banco (SQL) liga um negócio: o app não escreve nesta tabela.
create table public.publicacao_direta (
  negocio uuid primary key references public.negocios (id) on delete cascade,
  rede text not null default 'instagram' check (rede = 'instagram'),
  conta_id text not null,
  conta_nome text,
  segredo text not null check (segredo ~ '^INSTAGRAM_TOKEN_[A-Z0-9_]+$'),
  ligado boolean not null default true,
  criado_em timestamptz not null default now()
);
alter table public.publicacao_direta enable row level security;
create policy "dono vê se a marca publica direto" on public.publicacao_direta
  for select to authenticated
  using (negocio in (select id from public.negocios where dono = auth.uid()));
revoke all on public.publicacao_direta from anon, authenticated;
grant select (negocio, rede, conta_nome, ligado) on public.publicacao_direta to authenticated;

-- Piloto: só a Neon Scripts (@neon.scripts, ID 17841420092437279).
insert into public.publicacao_direta (negocio, conta_id, conta_nome, segredo)
select id, '17841420092437279', 'neon.scripts', 'INSTAGRAM_TOKEN_NEON_SCRIPTS'
from public.negocios where id = 'efc2a3e0-91b2-497b-8649-879fbcac84eb'
on conflict (negocio) do nothing;

-- Estado de cada marcação que vai sair sozinha.
alter table public.agenda
  add column if not exists publicar boolean not null default false,
  add column if not exists midia text,
  add column if not exists legenda text check (legenda is null or char_length(legenda) <= 2200),
  add column if not exists publicacao_estado text check (publicacao_estado in ('agendado', 'processando', 'publicado', 'erro')),
  add column if not exists publicacao_erro text,
  add column if not exists container_id text,
  add column if not exists publicado_id text,
  add column if not exists permalink text,
  add column if not exists tentativas int not null default 0,
  add column if not exists publicando_em timestamptz;

create index if not exists agenda_publicar on public.agenda (quando) where publicar and postado_em is null;

-- O arquivo final de cada post agendado: JPEG (o Instagram não aceita PNG) ou MP4.
-- Privado; a função lê com link assinado de 1 hora. Pasta = id do negócio, como em `marcas`.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('publicar', 'publicar', false, 52428800, array['image/jpeg', 'video/mp4'])
on conflict (id) do nothing;

create policy "dono envia o arquivo a publicar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'publicar' and (storage.foldername(name))[1] in (select id::text from public.negocios where dono = (select auth.uid())));
create policy "dono lê o arquivo a publicar" on storage.objects
  for select to authenticated
  using (bucket_id = 'publicar' and (storage.foldername(name))[1] in (select id::text from public.negocios where dono = (select auth.uid())));
create policy "dono apaga o arquivo a publicar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'publicar' and (storage.foldername(name))[1] in (select id::text from public.negocios where dono = (select auth.uid())));

-- Pega o trabalho da vez e marca como "em andamento" na mesma operação, para duas voltas do cron
-- nunca publicarem o mesmo post duas vezes. Entra:
--   - agendado que chegou na hora (até 2 h de atraso; depois disso vira erro "passou da hora");
--   - processando cujo contêiner ainda não terminou (vídeo).
-- Um item preso em "em andamento" há mais de 10 min (função caiu no meio) volta a ser pego.
create or replace function public.pegar_publicacoes()
returns table (id uuid, negocio uuid, titulo text, formato text, quando timestamptz, midia text, legenda text,
               publicacao_estado text, container_id text, tentativas int, conta_id text, segredo text)
language sql
security definer
set search_path = public
as $$
  with vez as (
    select a.id
    from agenda a
    join publicacao_direta d on d.negocio = a.negocio and d.ligado
    where a.publicar and a.postado_em is null and a.midia is not null
      and a.publicacao_estado in ('agendado', 'processando')
      and a.quando <= now()
      and (a.publicando_em is null or a.publicando_em < now() - interval '10 minutes')
    order by a.quando
    limit 3
    for update of a skip locked
  )
  update agenda a set publicando_em = now(), tentativas = a.tentativas + 1
  from vez, publicacao_direta d
  where a.id = vez.id and d.negocio = a.negocio
  returning a.id, a.negocio, a.titulo, a.formato, a.quando, a.midia, a.legenda,
            a.publicacao_estado, a.container_id, a.tentativas, d.conta_id, d.segredo
$$;
revoke all on function public.pegar_publicacoes() from public, anon, authenticated;

-- O aviso "hora de postar" não vale para o que vai sair sozinho (o resto da função fica igual à 0018).
create or replace function public.avisos_pendentes()
returns table (tipo text, id uuid, negocio uuid, titulo text, rede text, formato text, quando timestamptz, peca uuid)
language sql
security definer
set search_path = public
as $$
  select 'hora', a.id, a.negocio, a.titulo, a.rede, a.formato, a.quando, a.peca
  from agenda a
  where a.postado_em is null and a.avisado_em is null and a.peca is not null and not a.publicar
    and a.quando - make_interval(mins => a.lembrete_minutos) between now() - interval '60 minutes' and now()
  union all
  select 'vespera', a.id, a.negocio, a.titulo, a.rede, a.formato, a.quando, a.peca
  from agenda a
  where a.postado_em is null and a.lembrado_vespera_em is null and a.peca is null
    and a.quando - interval '24 hours' between now() - interval '60 minutes' and now()
  order by 7
  limit 200
$$;
revoke all on function public.avisos_pendentes() from public, anon, authenticated;

-- Relógio: a cada 5 minutos. Mesmo segredo do avisar, lido do cofre.
select cron.schedule(
  'neonposts-publicar',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://eqpecumfyzpijocjyhqw.supabase.co/functions/v1/publicar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-segredo', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'avisar_segredo' limit 1), '')
    ),
    body := '{"acao":"hora"}'::jsonb,
    timeout_milliseconds := 120000
  )
  $$
);

-- Aviso com o app fechado (Web Push). Cada aparelho que liga os avisos guarda uma assinatura;
-- a função `avisar` (Edge Function) manda o push na hora de postar e quando a pessoa pede
-- "Mandar para o celular". O relógio é o pg_cron, chamando a função a cada minuto pelo pg_net.
--
-- O que o Brenno faz uma vez, fora desta migração (segredos nunca ficam no repositório):
--   1. Gerar as chaves VAPID: `npx web-push generate-vapid-keys`.
--   2. Secrets das Edge Functions: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
--      VAPID_SUBJECT = mailto:neonposts@neonscripts.com.br e AVISAR_SEGREDO (uma senha longa qualquer).
--   3. No SQL Editor, o mesmo segredo no cofre, para o cron se identificar:
--      select vault.create_secret('<o mesmo AVISAR_SEGREDO>', 'avisar_segredo');
--   4. Publicar a função: `supabase functions deploy avisar --no-verify-jwt` (a função confere o login por dentro).

-- Assinaturas de push: uma por aparelho. Só o dono do negócio cria e apaga as suas;
-- quem lê para enviar é a função, com a chave de serviço.
create table public.assinaturas_push (
  id uuid primary key default gen_random_uuid(),
  negocio uuid not null references public.negocios (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  aparelho text,
  criado_em timestamptz not null default now(),
  usado_em timestamptz
);
create index assinaturas_push_negocio on public.assinaturas_push (negocio);

alter table public.assinaturas_push enable row level security;
create policy "dono mexe nas próprias assinaturas" on public.assinaturas_push
  for all to authenticated
  using (negocio in (select id from public.negocios where dono = auth.uid()))
  with check (negocio in (select id from public.negocios where dono = auth.uid()));
revoke all on public.assinaturas_push from anon;
grant select, insert, update, delete on public.assinaturas_push to authenticated;

-- Marcação sem post avisada na véspera ("Amanhã tem..."): antes ficava só no aparelho.
alter table public.agenda add column if not exists lembrado_vespera_em timestamptz;

-- O que precisa de aviso agora: 'hora' (chegou a hora menos o lembrete, nos últimos 60 min)
-- e 'vespera' (marcação ainda sem post, 24 h antes). Só a função chama, com a chave de serviço.
create or replace function public.avisos_pendentes()
returns table (tipo text, id uuid, negocio uuid, titulo text, rede text, formato text, quando timestamptz, peca uuid)
language sql
security definer
set search_path = public
as $$
  select 'hora', a.id, a.negocio, a.titulo, a.rede, a.formato, a.quando, a.peca
  from agenda a
  where a.postado_em is null and a.avisado_em is null and a.peca is not null
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

-- Relógio: a cada minuto, o banco chama a função avisar. O segredo sai do cofre (vault),
-- nunca do SQL. Sem o segredo no cofre, a chamada sai sem cabeçalho e a função recusa.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'neonposts-avisar',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://eqpecumfyzpijocjyhqw.supabase.co/functions/v1/avisar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-segredo', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'avisar_segredo' limit 1), '')
    ),
    body := '{"acao":"hora"}'::jsonb,
    timeout_milliseconds := 20000
  )
  $$
);

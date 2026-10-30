-- Bloco 7: planner. Cada linha é uma postagem marcada num dia e numa rede.
-- A peça pode vir depois (a pessoa planeja "promoção de sexta" e cria a arte
-- na véspera). Até o Bloco 10, quem posta é a pessoa: o app avisa na hora
-- (avisado_em) e abre o compartilhar; postado_em marca que ela confirmou.

create table public.agenda (
  id uuid primary key default gen_random_uuid(),
  negocio uuid not null references public.negocios (id) on delete cascade,
  peca uuid references public.pecas (id) on delete set null,
  titulo text not null check (char_length(titulo) between 1 and 120),
  rede text not null check (rede in ('instagram', 'facebook', 'whatsapp')),
  formato text not null check (formato in ('post', 'story')),
  quando timestamptz not null,
  lembrete_minutos int not null default 10 check (lembrete_minutos between 0 and 1440),
  avisado_em timestamptz,
  postado_em timestamptz,
  criado_em timestamptz not null default now()
);

create index agenda_negocio_quando on public.agenda (negocio, quando);

alter table public.agenda enable row level security;

create policy "dono mexe na agenda" on public.agenda
  for all to authenticated
  using (negocio in (select id from public.negocios where dono = auth.uid()))
  with check (negocio in (select id from public.negocios where dono = auth.uid()));

revoke all on public.agenda from anon;
grant select, insert, update, delete on public.agenda to authenticated;

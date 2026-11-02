-- Bloco 8: LinkedIn. Rede nova no planner e o perfil profissional, versionado junto com a marca.
-- O perfil profissional (nome, cargo, carreira, resultados, temas, público, o que nunca dizer)
-- só é usado nos posts do LinkedIn feitos "como pessoa". O PDF do LinkedIn é lido no aparelho;
-- aqui fica só o texto.
alter table public.perfis_marca add column if not exists profissional jsonb not null default '{}'::jsonb;

alter table public.agenda drop constraint if exists agenda_rede_check;
alter table public.agenda add constraint agenda_rede_check check (rede in ('instagram', 'facebook', 'whatsapp', 'tiktok', 'linkedin'));

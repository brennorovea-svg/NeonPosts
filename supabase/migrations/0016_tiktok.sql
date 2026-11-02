-- Bloco 8: TikTok entra na lista de redes do planner. No TikTok a marcação é sempre vídeo em pé (formato story).
alter table public.agenda drop constraint if exists agenda_rede_check;
alter table public.agenda add constraint agenda_rede_check check (rede in ('instagram', 'facebook', 'whatsapp', 'tiktok'));

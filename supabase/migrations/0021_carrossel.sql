-- Carrossel (Brenno, 13/11/2026): uma peça com 5 a 10 slides 4:5, parada ou animada.
-- Os slides ficam no roteiro (roteiro.slides); a peça é formato 'post' e modelo 'carrossel'.

-- Conta como tantos posts quantos slides tiver: o limite do mês soma o peso.
alter table public.pecas add column if not exists peso int not null default 1 check (peso between 1 and 10);

-- Lista de layouts: entra o carrossel e os 14 layouts de 04/11 (dossie a pictograma), que o
-- banco ainda recusava ao guardar (o check parou nos animados feitos para a foto).
alter table public.pecas drop constraint if exists pecas_modelo_check;
alter table public.pecas add constraint pecas_modelo_check check (modelo in (
  'promo', 'aviso', 'bastidores', 'manchete', 'lista', 'citacao', 'dividido', 'foto', 'cartao', 'numero', 'cupom',
  'agenda', 'conversa', 'mosaico', 'faixas', 'capa', 'comparar', 'tabela', 'enquete', 'polaroid', 'cenas',
  'direct', 'busca', 'contador', 'painel', 'semana', 'impacto', 'acende', 'revelacao', 'glitch', 'pergunta',
  'inclui', 'comemoracao', 'pronto', 'movimento', 'estrelas', 'aovivo', 'contagem', 'escolha', 'vitrine', 'local',
  'zoom', 'cortina', 'cardfoto', 'deslize', 'moldura', 'portas', 'foco',
  'tarja', 'mira', 'maquete', 'lancamento', 'dossie', 'suica', 'lupa', 'caderno', 'deco', 'popup',
  'lousa', 'memphis', 'terminal', 'pictograma',
  'carrossel'
));

-- Publicar sozinho no Instagram: o carrossel sobe um arquivo por slide (na ordem).
-- `midia` continua com o primeiro, para quem já lê só ela.
alter table public.agenda add column if not exists midias text[];

-- A função publicar recebe a lista toda.
drop function if exists public.pegar_publicacoes();
create function public.pegar_publicacoes()
returns table (id uuid, negocio uuid, titulo text, formato text, quando timestamptz, midia text, midias text[], legenda text,
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
  returning a.id, a.negocio, a.titulo, a.formato, a.quando, a.midia, a.midias, a.legenda,
            a.publicacao_estado, a.container_id, a.tentativas, d.conta_id, d.segredo
$$;
revoke all on function public.pegar_publicacoes() from public, anon, authenticated;

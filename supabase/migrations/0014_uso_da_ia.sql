-- Etapa de segurança: tetos de uso da IA, para o custo não fugir do controle.
-- Cada chamada à IA (post, refazer, calibração, entrevista, "Isso não é a minha marca") passa
-- antes por usar_ia(), que confere os tetos e anota o uso numa linha só. Só as funções do servidor
-- (chave de serviço) leem e gravam aqui: a tabela não tem política para o app.

create table public.uso_ia (
  id bigint generated always as identity primary key,
  negocio uuid not null references public.negocios(id) on delete cascade,
  funcao text not null check (funcao in ('gerar', 'calibrar', 'entrevista', 'regra')),
  plano text not null,
  peso int not null default 1 check (peso between 1 and 10),
  criado_em timestamptz not null default now()
);
create index uso_ia_negocio_quando on public.uso_ia (negocio, criado_em desc);
create index uso_ia_plano_quando on public.uso_ia (plano, criado_em desc);

alter table public.uso_ia enable row level security;
revoke all on public.uso_ia from anon, authenticated;

-- Devolve null quando pode usar (e já anota o uso) ou o motivo do bloqueio:
-- 'hora' (mais de 40 chamadas na última hora), 'dia' (teto diário da função)
-- ou 'gratis_cheio' (todas as contas grátis juntas passaram do teto do dia).
-- Para mudar um teto, nova migração trocando os números abaixo.
create or replace function public.usar_ia(p_negocio uuid, p_funcao text, p_peso int default 1)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plano text;
  v_hoje timestamptz := (date_trunc('day', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo';
  v_teto_dia int := case p_funcao when 'calibrar' then 3 when 'entrevista' then 30 when 'regra' then 10 else null end;
  v_teto_hora constant int := 40;
  v_teto_gratis_dia constant int := 300;
  v_soma int;
begin
  select plano into v_plano from negocios where id = p_negocio;
  if v_plano is null then return 'negocio'; end if;

  -- Uma chamada por vez para o mesmo negócio: duas abas ao mesmo tempo não furam o teto.
  perform pg_advisory_xact_lock(hashtext('usar_ia:' || p_negocio::text));

  select coalesce(sum(peso), 0) into v_soma from uso_ia
    where negocio = p_negocio and criado_em > now() - interval '1 hour';
  if v_soma + p_peso > v_teto_hora then return 'hora'; end if;

  if v_teto_dia is not null then
    select count(*) into v_soma from uso_ia
      where negocio = p_negocio and funcao = p_funcao and criado_em >= v_hoje;
    if v_soma >= v_teto_dia then return 'dia'; end if;
  end if;

  if v_plano = 'gratis' then
    select coalesce(sum(peso), 0) into v_soma from uso_ia
      where plano = 'gratis' and criado_em >= v_hoje;
    if v_soma + p_peso > v_teto_gratis_dia then return 'gratis_cheio'; end if;
  end if;

  insert into uso_ia (negocio, funcao, plano, peso) values (p_negocio, p_funcao, v_plano, p_peso);
  return null;
end;
$$;

revoke all on function public.usar_ia(uuid, text, int) from public, anon, authenticated;

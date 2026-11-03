-- Bloco 10: imagem com IA (Nano Banana) só no plano Pro (Brenno, 03/11).
-- Cada imagem passa por usar_ia() com a função 'imagem': só Pro, até 30 por mês e 10 por dia.
-- Para mudar os tetos, nova migração trocando os números abaixo (e IMAGENS_POR_MES no app e na função).

alter table public.uso_ia drop constraint uso_ia_funcao_check;
alter table public.uso_ia add constraint uso_ia_funcao_check
  check (funcao in ('gerar', 'calibrar', 'entrevista', 'regra', 'imagem'));

-- Igual à 0014, com dois motivos novos só para 'imagem':
-- 'plano' (não é Pro) e 'mes' (passou das 30 imagens do mês).
create or replace function public.usar_ia(p_negocio uuid, p_funcao text, p_peso int default 1)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plano text;
  v_hoje timestamptz := (date_trunc('day', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo';
  v_mes timestamptz := (date_trunc('month', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo';
  v_teto_dia int := case p_funcao when 'calibrar' then 3 when 'entrevista' then 30 when 'regra' then 10 when 'imagem' then 10 else null end;
  v_teto_hora constant int := 40;
  v_teto_gratis_dia constant int := 300;
  v_teto_imagem_mes constant int := 30;
  v_soma int;
begin
  select plano into v_plano from negocios where id = p_negocio;
  if v_plano is null then return 'negocio'; end if;
  if p_funcao = 'imagem' and v_plano <> 'pro' then return 'plano'; end if;

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

  if p_funcao = 'imagem' then
    select count(*) into v_soma from uso_ia
      where negocio = p_negocio and funcao = 'imagem' and criado_em >= v_mes;
    if v_soma >= v_teto_imagem_mes then return 'mes'; end if;
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

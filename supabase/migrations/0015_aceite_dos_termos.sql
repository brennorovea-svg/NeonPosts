-- LGPD: registro de quando o dono aceitou os Termos de uso e a Política de privacidade, e qual versão.
-- O app mostra a tela de aceite depois do login enquanto a versão aceita for diferente da vigente
-- (a versão vigente está em src/lib/termos.js e no topo de public/termos/ e public/privacidade/).
alter table public.negocios
  add column aceitou_termos_em timestamptz,
  add column termos_versao text;

-- O dono grava o próprio aceite pelo app (só estas duas colunas, além do nome que já podia).
grant update (aceitou_termos_em, termos_versao) on public.negocios to authenticated;

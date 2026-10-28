-- Seis modelos novos de arte, além de promo, aviso e bastidores.
alter table public.pecas drop constraint pecas_modelo_check;
alter table public.pecas add constraint pecas_modelo_check
  check (modelo in ('promo', 'aviso', 'bastidores', 'manchete', 'lista', 'citacao', 'dividido', 'foto', 'cartao'));

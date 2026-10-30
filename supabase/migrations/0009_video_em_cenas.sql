-- Vídeo em cenas, só no formato vídeo (Bloco 6, 30/10).
alter table public.pecas drop constraint pecas_modelo_check;
alter table public.pecas add constraint pecas_modelo_check
  check (modelo in ('promo', 'aviso', 'bastidores', 'manchete', 'lista', 'citacao', 'dividido', 'foto', 'cartao',
    'numero', 'cupom', 'agenda', 'conversa', 'mosaico', 'faixas', 'capa', 'comparar', 'tabela', 'enquete', 'cenas'));

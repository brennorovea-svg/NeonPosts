-- Os 20 stories com movimento (historias.js) entram na lista de modelos aceitos em pecas.
-- Sem isso a gerar-peca falha ao guardar um story em vídeo com um deles ("Não deu para guardar a peça").
alter table public.pecas drop constraint if exists pecas_modelo_check;
alter table public.pecas add constraint pecas_modelo_check check (modelo in (
  'promo', 'aviso', 'bastidores', 'manchete', 'lista', 'citacao', 'dividido', 'foto', 'cartao',
  'numero', 'cupom', 'agenda', 'conversa', 'mosaico', 'faixas', 'capa', 'comparar', 'tabela', 'enquete', 'cenas',
  'direct', 'busca', 'contador', 'painel', 'semana', 'impacto', 'acende', 'revelacao', 'glitch', 'pergunta',
  'inclui', 'comemoracao', 'pronto', 'movimento', 'estrelas', 'aovivo', 'contagem', 'escolha', 'vitrine', 'local'
));

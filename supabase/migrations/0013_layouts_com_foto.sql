-- Os layouts com a foto no centro (PR #34) entram na lista de modelos aceitos em pecas:
-- polaroid (parado) e os 7 animados feitos para a foto.
-- Sem isso a gerar-peca falha ao guardar um post com um deles ("Não deu para guardar o post").
alter table public.pecas drop constraint if exists pecas_modelo_check;
alter table public.pecas add constraint pecas_modelo_check check (modelo in (
  'promo', 'aviso', 'bastidores', 'manchete', 'lista', 'citacao', 'dividido', 'foto', 'cartao',
  'numero', 'cupom', 'agenda', 'conversa', 'mosaico', 'faixas', 'capa', 'comparar', 'tabela', 'enquete', 'cenas',
  'direct', 'busca', 'contador', 'painel', 'semana', 'impacto', 'acende', 'revelacao', 'glitch', 'pergunta',
  'inclui', 'comemoracao', 'pronto', 'movimento', 'estrelas', 'aovivo', 'contagem', 'escolha', 'vitrine', 'local',
  'polaroid', 'zoom', 'cortina', 'cardfoto', 'deslize', 'moldura', 'portas', 'foco'
));

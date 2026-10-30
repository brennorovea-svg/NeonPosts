// Vitrine da entrada: 4 peças de amostra com o nome e a cor da marca, desenhadas no aparelho,
// sem IA. Mostram a marca viva antes da primeira peça de verdade.

export const RAMOS = ['Restaurante', 'Café ou padaria', 'Loja', 'Beleza e estética', 'Saúde', 'Academia', 'Serviços', 'Agência ou estúdio']

// Frase de apoio por ramo: o que a pessoa vê embaixo do título da amostra.
const APOIO = {
  Restaurante: 'Comida boa, feita na hora. A partir de agora, por aqui também.',
  'Café ou padaria': 'Saindo do forno todo dia. A partir de agora, por aqui também.',
  Loja: 'Novidade toda semana. A partir de agora, por aqui também.',
  'Beleza e estética': 'Cuidado de verdade, do seu jeito. A partir de agora, por aqui também.',
  Saúde: 'Bem-estar com atenção. A partir de agora, por aqui também.',
  Academia: 'Treino com foco e evolução. A partir de agora, por aqui também.',
  Serviços: 'Trabalho bem feito, no prazo. A partir de agora, por aqui também.',
  'Agência ou estúdio': 'Ideia que vira resultado. A partir de agora, por aqui também.',
}
const CURTA = {
  Restaurante: 'Feito na hora, do jeito que você gosta',
  'Café ou padaria': 'Fresquinho, saindo do forno',
  Loja: 'Chegou novidade na loja',
  'Beleza e estética': 'Se sentir bem começa aqui',
  Saúde: 'Agende o seu horário',
  Academia: 'Bora treinar hoje?',
  Serviços: 'Orçamento sem compromisso',
  'Agência ou estúdio': 'Do zero ao ar, a gente cuida',
}
const apoioDe = (ramo) => APOIO[ramo] || 'O que a gente faz, do jeito que a gente faz. A partir de agora, por aqui também.'
const curtaDe = (ramo) => CURTA[ramo] || 'Vem conhecer a gente'

const base = (modelo, titulo, apoio, chamada, destaque, extra = {}) => ({
  modelo, titulo, apoio, chamada, itens: [], pontos: [], autor: '', numero: '', cupom: '', data: '', horario: '',
  arte: { destaque, tamanho_titulo: 'normal', alinhamento: '', fundo: '' }, cores: {}, legenda: '', hashtags: [], avisos: [], ...extra,
})

// Cada amostra: formato, se é vídeo, modelo e o roteiro pronto para desenhar.
export function pecasDaVitrine(perfil) {
  const nome = perfil.identidade.nome.trim() || 'Sua marca'
  const ramo = perfil.identidade.ramo
  return [
    { chave: 'post', formato: 'post', video: false, modelo: 'manchete', rotulo: 'Post', roteiro: base('manchete', `Prazer, a gente é a ${nome}`, apoioDe(ramo), 'Segue a gente', nome) },
    { chave: 'video', formato: 'story', video: true, modelo: 'acende', rotulo: 'Story em vídeo', roteiro: base('acende', 'Chegamos no Instagram', apoioDe(ramo), 'Chama no WhatsApp', 'Instagram') },
    { chave: 'story', formato: 'story', video: false, modelo: 'cartao', rotulo: 'Story', roteiro: base('cartao', curtaDe(ramo), 'Hoje', 'Vem conhecer', curtaDe(ramo).split(' ').slice(-2).join(' ')) },
    { chave: 'cardapio', formato: 'post', video: false, modelo: 'promo', rotulo: 'Post com preço', roteiro: base('promo', 'Os mais pedidos', 'Escolha o seu e chama a gente.', 'Chama no WhatsApp', 'mais pedidos', { itens: [{ nome: '[ITEM]', preco: '[SEU PREÇO]' }, { nome: '[ITEM]', preco: '[SEU PREÇO]' }] }) },
  ]
}

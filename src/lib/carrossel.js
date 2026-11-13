// Carrossel (13/11/2026, skill instagram-carousel): uma peça com 5 a 10 slides 4:5.
// A IA escreve os slides (gerar-peca/carrossel.ts); aqui ficam as opções do Criar, os arquivos
// de cada slide (PNG parado ou MP4 animado) e o carrossel de exemplo do modo de teste.
import { desenhar, paraArquivo, slidesDe } from './desenhar.js'
import { gravar } from './video.js'

// Mesmos tipos e quantidades da função (supabase/functions/gerar-peca/carrossel.ts): manter iguais.
export const TIPOS_DE_CARROSSEL = {
  apresentacao: { nome: 'Apresentação', padrao: 7, descricao: 'Gancho, problema, solução, o que tem, detalhes, como funciona e chamada.' },
  lista: { nome: 'Lista', padrao: 7, descricao: 'Um item por slide: dicas, erros, motivos.' },
  passos: { nome: 'Passo a passo', padrao: 7, descricao: 'Por quê, os passos e o resultado.' },
  comparacao: { nome: 'Comparação', padrao: 5, descricao: 'Duas opções lado a lado e qual escolher.' },
}
export const GANCHOS = {
  ia: 'A IA escolhe',
  pergunta: 'Pergunta que dói',
  numero: 'Número + benefício',
  afirmacao: 'Afirmação forte',
  resultado: 'Resultado concreto',
}
export const MIN_SLIDES = 5
export const MAX_SLIDES = 10

export function sequencia(tipo, n) {
  const meio = n - 2
  if (tipo === 'lista') return ['gancho', ...Array(meio).fill('item'), 'chamada']
  if (tipo === 'passos') return ['gancho', 'contexto', ...Array(Math.max(1, meio - 2)).fill('passo'), 'resultado', 'chamada'].slice(0, n)
  if (tipo === 'comparacao') return ['gancho', 'opcao', 'opcao', ...Array(Math.max(0, meio - 3)).fill('detalhes'), 'veredito', 'chamada']
  const base = ['problema', 'solucao', 'recursos', 'detalhes', 'passos']
  const corpo = meio <= base.length
    ? base.filter((p) => !(meio < 5 && p === 'detalhes') && !(meio < 4 && p === 'recursos')).slice(0, meio)
    : [...base.slice(0, 4), ...Array(meio - 5).fill('detalhes'), 'passos']
  return ['gancho', ...corpo, 'chamada']
}

export const ehCarrossel = (peca) => peca?.modelo === 'carrossel'
// O carrossel guarda no roteiro se sai animado (o Planner gera os arquivos do mesmo jeito).
export const carrosselAnimado = (roteiro) => Boolean(roteiro?.carrossel?.animado)
export const quantosSlides = (roteiro) => slidesDe(roteiro).length

// Um arquivo por slide, na ordem. Parado: PNG na hora. Animado: um vídeo curto por slide,
// gravado um depois do outro; `aoAvancar` recebe de 0 a 1 do carrossel inteiro.
export async function arquivosDoCarrossel(opcoes, { video = false, nome = 'carrossel', aoAvancar = () => {}, sinal = null } = {}) {
  const total = quantosSlides(opcoes.roteiro)
  const arquivos = []
  for (let i = 0; i < total; i++) {
    const n = String(i + 1).padStart(2, '0')
    if (video) {
      const r = await gravar({ ...opcoes, slide: i }, `${nome}-${n}`, (p) => aoAvancar((i + p) / total), sinal)
      arquivos.push(r.arquivo)
    } else {
      const quadro = document.createElement('canvas')
      desenhar(quadro, { ...opcoes, slide: i })
      arquivos.push(await paraArquivo(quadro, `${nome}-${n}.png`))
      aoAvancar((i + 1) / total)
    }
  }
  return arquivos
}

// Modo de teste: um carrossel de exemplo no tipo e na quantidade pedidos, sem chamar a IA.
const EXEMPLO = {
  gancho: { etiqueta: 'Site em 7 dias', titulo: 'Seu cliente procura no Google e acha o concorrente', texto: 'Dá para mudar isso em uma semana, sem complicação.' },
  problema: { etiqueta: 'O problema', titulo: 'Sem site, você depende só do Instagram', texto: 'Quem não te segue não te acha. E quem acha não sabe o preço, o horário nem onde fica.' },
  solucao: { etiqueta: 'A solução', titulo: 'Um site simples, com a cara da sua marca', texto: 'Cardápio, endereço e botão de WhatsApp num lugar só.' },
  recursos: { etiqueta: 'O que vem junto', titulo: 'Tudo o que o cliente precisa ver', itens: ['Cardápio com fotos', 'Botão de WhatsApp em cada página', 'Mapa e horário', 'Aparece no Google'] },
  detalhes: { etiqueta: 'Do seu jeito', titulo: 'Cores, fotos e texto da sua marca', texto: 'Nada de modelo pronto igual ao do vizinho.' },
  passos: { etiqueta: 'Como funciona', titulo: 'Três passos até o ar', itens: ['Você conta como é o negócio', 'A gente monta e te mostra', 'Ajusta e publica'] },
  item: { etiqueta: 'Dica', titulo: 'Foto de verdade vende mais que banco de imagem', texto: 'Cliente quer ver o prato que vai chegar, não um prato bonito de outro lugar.' },
  contexto: { etiqueta: 'Por quê', titulo: 'Quem acha você no Google já quer comprar', texto: 'É o cliente mais fácil de fechar. Só falta ele te encontrar.' },
  passo: { etiqueta: 'Passo', titulo: 'Cadastre o negócio no Google', texto: 'Endereço, horário e telefone iguais em todo lugar.' },
  resultado: { etiqueta: 'No fim', titulo: 'Cliente chega já sabendo o que pedir', texto: 'Menos pergunta no direct, mais pedido no WhatsApp.' },
  opcao: { etiqueta: 'Opção', titulo: 'Só Instagram', texto: 'Rápido de começar, mas quem não te segue não te acha.' },
  veredito: { etiqueta: 'Na prática', titulo: 'Os dois juntos vendem mais', texto: 'O Instagram mostra o dia a dia. O site fecha a venda.' },
  chamada: { titulo: 'Bora acender a sua marca?', texto: 'Manda SITE no direct que a gente te responde hoje.', botao: 'Manda SITE no direct' },
}
export function carrosselDeTeste(tipo, n, animado = false) {
  let passo = 0, opcao = 0
  const slides = sequencia(tipo, n).map((papel) => {
    const base = { etiqueta: '', titulo: '', texto: '', itens: [], botao: '', ...EXEMPLO[papel], papel }
    if (papel === 'passo') base.etiqueta = `Passo ${++passo}`
    if (papel === 'opcao') { base.etiqueta = `Opção ${'AB'[opcao]}`; if (opcao++) { base.titulo = 'Site + Instagram'; base.texto = 'Quem procura acha, e quem acha já sabe como pedir.' } }
    return base
  })
  return {
    modelo: 'carrossel', carrossel: { tipo, gancho: 'ia', animado }, slides,
    titulo: slides[0].titulo, apoio: slides[0].texto, chamada: slides.at(-1).botao,
    legenda: 'Arrasta para o lado e vê por que o seu cliente ainda não te acha no Google. No fim tem o jeito mais rápido de resolver. Manda SITE no direct.',
    hashtags: ['#NeonScripts', '#SiteProfissional', '#PequenosNegocios'],
    itens: [], pontos: [], reels: '', autor: '', numero: '', cupom: '', data: '', horario: '', ordem_fotos: [],
    arte: { destaque: 'Google', tamanho_titulo: 'normal', alinhamento: 'esquerda', fundo: 'marca' }, cores: {}, avisos: [],
  }
}

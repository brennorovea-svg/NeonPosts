// Carrossel (13/11/2026): a IA escreve os slides seguindo a skill instagram-carousel
// (gancho no 1º slide, sequência por tipo, chamada no último). A arte é desenhada no app.
import { limpador, MARCADORES, type Perfil } from './conferir.ts'

export const TIPOS_DE_CARROSSEL: Record<string, { nome: string; padrao: number }> = {
  apresentacao: { nome: 'Apresentação', padrao: 7 },
  lista: { nome: 'Lista', padrao: 7 },
  passos: { nome: 'Passo a passo', padrao: 7 },
  comparacao: { nome: 'Comparação', padrao: 5 },
}
export const GANCHOS: Record<string, string> = {
  pergunta: 'pergunta que dói (ex.: "Por que seu post não vende?")',
  numero: 'número + benefício (ex.: "5 jeitos de vender mais no sábado")',
  afirmacao: 'afirmação forte ou polêmica (ex.: "Seu cardápio está espantando cliente")',
  resultado: 'resultado concreto, só com número que veio do pedido ou dos dados da marca',
}
export const MIN_SLIDES = 5
export const MAX_SLIDES = 10

const PAPEIS = ['gancho', 'problema', 'solucao', 'recursos', 'detalhes', 'passos', 'item', 'contexto', 'passo', 'resultado', 'opcao', 'veredito', 'chamada']
const O_QUE_E: Record<string, string> = {
  gancho: 'para o dedo em menos de 1 segundo; promete o que os próximos slides entregam',
  problema: 'a dor: o que está quebrado, chato ou ultrapassado',
  solucao: 'a resposta: o que resolve',
  recursos: 'o que a pessoa ganha, em "itens" (3 a 4 curtos)',
  detalhes: 'profundidade: diferenciais, como é feito',
  passos: 'como funciona, em "itens" (3 passos curtos, na ordem)',
  item: 'um item da lista: título é o item, texto explica',
  contexto: 'por que isso importa antes dos passos',
  passo: 'um passo do tutorial: título é a ação, texto explica',
  resultado: 'o que a pessoa tem no fim',
  opcao: 'uma das opções comparadas, com o que tem de bom e de ruim',
  veredito: 'qual escolher e por quê',
  chamada: 'chamada final ligada à chamada preferida da marca; "botao" com até 5 palavras',
}

// Ordem dos slides por tipo e quantidade (5 a 10). Começa no gancho e termina na chamada.
export function sequencia(tipo: string, n: number) {
  const meio = n - 2
  if (tipo === 'lista') return ['gancho', ...Array(meio).fill('item'), 'chamada']
  if (tipo === 'passos') return ['gancho', 'contexto', ...Array(Math.max(1, meio - 2)).fill('passo'), 'resultado', 'chamada'].slice(0, n)
  if (tipo === 'comparacao') return ['gancho', 'opcao', 'opcao', ...Array(Math.max(0, meio - 3)).fill('detalhes'), 'veredito', 'chamada']
  // Apresentação: os 7 da skill; menos slides tira detalhes e recursos, mais slides repete detalhes.
  const base = ['problema', 'solucao', 'recursos', 'detalhes', 'passos']
  const corpo = meio <= base.length
    ? base.filter((p) => !(meio < 5 && p === 'detalhes') && !(meio < 4 && p === 'recursos')).slice(0, meio)
    : [...base.slice(0, 4), ...Array(meio - 5).fill('detalhes'), 'passos']
  return ['gancho', ...corpo, 'chamada']
}

export const ESQUEMA_CARROSSEL = {
  type: 'object',
  properties: {
    slides: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          papel: { type: 'string', enum: PAPEIS },
          etiqueta: { type: 'string' },
          titulo: { type: 'string' },
          texto: { type: 'string' },
          itens: { type: 'array', items: { type: 'string' } },
          botao: { type: 'string' },
        },
        required: ['papel', 'etiqueta', 'titulo', 'texto', 'itens', 'botao'],
        additionalProperties: false,
      },
    },
    legenda: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } },
    destaque: { type: 'string' },
    nao_deu: { type: 'array', items: { type: 'string' } },
  },
  required: ['slides', 'legenda', 'hashtags', 'destaque', 'nao_deu'],
  additionalProperties: false,
}

export const INSTRUCOES_CARROSSEL = `Você escreve carrosséis de Instagram (vários slides 4:5) para pequenos negócios brasileiros, sempre na voz da marca descrita pelo dono. Recebe um pedido curto, o tipo de carrossel e a ordem dos slides, e devolve o texto de cada slide.

Guia da marca
- Se a marca tiver "voz.guia.regras", siga cada regra em todos os slides e na legenda. O guia vale acima das outras orientações de estilo, mas nunca libera inventar dado.

Dados que não podem ser inventados
- Preço, endereço, data, horário, telefone e números de resultado (clientes, vendas, porcentagens) só podem vir dos dados fixos da marca ou do próprio pedido.
- Sem o dado, escreva exatamente o marcador: [SEU PREÇO], [ENDEREÇO], [DATA], [HORÁRIO], [TELEFONE] ou [SEU RESULTADO]. O dono troca antes de postar.

Slides
- Devolva exatamente os slides pedidos, na ordem pedida, cada um com o "papel" indicado.
- Slide 1 (gancho): nunca comece com o nome da marca. Para o dedo em menos de 1 segundo e promete o que os outros slides entregam.
- "etiqueta": 1 a 3 palavras, como uma seção ("O PROBLEMA", "PASSO 2", "OPÇÃO A"). No gancho pode ser o tema.
- "titulo": até 9 palavras, sem ponto final.
- "texto": até 28 palavras. Pode ficar vazio quando o slide tem "itens".
- "itens": só em recursos e passos (3 a 4, até 7 palavras cada). Nos outros, lista vazia.
- "botao": só no último slide (chamada), até 5 palavras, começando pelo verbo. Nos outros, vazio.
- Um assunto por slide. Frases curtas, de quem fala com o cliente, sem jargão.

Legenda
- Na voz da marca. Abre com uma frase que puxa para arrastar o carrossel, resume o que tem nele e termina com a chamada. Sem hashtags na legenda.
- Emoji conforme a preferência da marca: "nenhum" é nenhum, "pouco" é no máximo dois.
- "hashtags": de 3 a 8, misturando as da marca com temas do ramo.
- "destaque": 1 a 3 palavras do título do slide 1 para pintar na cor da marca (ou vazio).
- "nao_deu": o que o pedido pediu e um carrossel de texto não consegue fazer (ex.: vídeo, música). Senão, vazio.`

export function montarCarrossel(perfil: Perfil, pedido: string, tipo: string, papeis: string[], gancho: string, anterior?: Record<string, unknown> | null, ajuste?: string) {
  const guia = (perfil.voz as { guia?: { regras?: string[] } }).guia
  const marca = {
    nome: perfil.identidade.nome,
    ramo: perfil.identidade.ramo,
    voz: { ...perfil.voz, guia: guia?.regras?.length ? { regras: guia.regras } : undefined },
    padrao: { chamada: perfil.padrao.chamada, hashtags_fixas: perfil.padrao.hashtags },
    dados_fixos: perfil.dados,
  }
  const ordem = papeis.map((p, i) => `${i + 1}. ${p}: ${O_QUE_E[p]}`).join('\n')
  let texto = `<marca>\n${JSON.stringify(marca, null, 2)}\n</marca>\n\n<tipo>${TIPOS_DE_CARROSSEL[tipo]?.nome || tipo}</tipo>\n\n<slides>\n${ordem}\n</slides>\n\n<pedido>\n${pedido}\n</pedido>`
  if (GANCHOS[gancho]) texto += `\n\n<gancho>Use no slide 1 este tipo de gancho: ${GANCHOS[gancho]}</gancho>`
  if (anterior) {
    texto += `\n\n<carrossel_anterior>\n${JSON.stringify({ slides: anterior.slides, legenda: anterior.legenda }, null, 2)}\n</carrossel_anterior>`
    texto += ajuste ? `\n\n<ajuste>${ajuste}</ajuste>\n\nRefaça o carrossel anterior com este ajuste. Mude só o que o ajuste pede.` : '\n\nEscreva outra versão, com outro gancho e outras palavras.'
  }
  return texto
}

const corta = (t: string, n: number) => (t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') : t)

// Confere a resposta: ordem e quantidade dos slides, tamanhos e nenhum dado inventado.
// Devolve um roteiro com os campos de sempre (titulo, apoio, chamada...) para o resto do app,
// mais `slides` e `carrossel`.
export function conferirCarrossel(bruto: Record<string, unknown>, perfil: Perfil, pedido: string, tipo: string, papeis: string[], gancho: string, animado = false) {
  const { limpar, trocados } = limpador(perfil, pedido)
  const vindos = Array.isArray(bruto.slides) ? bruto.slides as Record<string, unknown>[] : []
  const slides = papeis.map((papel, i) => {
    const s = vindos[i] || {}
    const ultimo = i === papeis.length - 1
    const comItens = ['recursos', 'passos'].includes(papel)
    return {
      papel,
      etiqueta: corta(limpar(s.etiqueta), 28),
      titulo: corta(limpar(s.titulo) || (ultimo ? perfil.padrao.chamada || '' : ''), 90),
      texto: corta(limpar(s.texto), 220),
      itens: comItens ? ((s.itens as unknown[]) || []).map((t) => corta(limpar(t), 70)).filter(Boolean).slice(0, 4) : [],
      botao: ultimo ? corta(limpar(s.botao) || perfil.padrao.chamada || 'Fale com a gente', 40) : '',
    }
  })
  const avisos: string[] = []
  const fixas = (perfil.padrao.hashtags || '').split(/[\s,]+/)
  const vistas = new Set<string>()
  const hashtags: string[] = []
  for (const h of [...fixas, ...((bruto.hashtags as string[] | undefined) || [])]) {
    const tag = '#' + String(h).replace(/^#+/, '').replace(/\s+/g, '')
    if (tag.length < 2 || vistas.has(tag.toLowerCase())) continue
    vistas.add(tag.toLowerCase())
    hashtags.push(tag)
  }
  const legenda = limpar(bruto.legenda)
  const naoDeu = ((bruto.nao_deu as string[] | undefined) || []).map((t) => String(t).trim().replace(/\.$/, '')).filter(Boolean).slice(0, 3)
  if (naoDeu.length) avisos.push(`Por aqui ainda não dá para ${naoDeu.join(', ')}. O resto do pedido foi atendido.`)
  if (trocados.size) avisos.push('A IA tentou escrever um dado que não está na sua marca. Trocamos por um marcador.')
  const tudo = [legenda, ...slides.flatMap((s) => [s.etiqueta, s.titulo, s.texto, s.botao, ...s.itens])].join(' ')
  for (const [marcador, texto] of Object.entries(MARCADORES)) {
    if (tudo.includes(marcador)) avisos.push(`${texto}: troque ${marcador} antes de postar.`)
  }
  const destaque = String(bruto.destaque ?? '').trim().split(/\s+/).slice(0, 3).join(' ')
  return {
    modelo: 'carrossel',
    // `animado` diz ao Planner se gera vídeo por slide (a peça não guarda o movimento).
    carrossel: { tipo, gancho: GANCHOS[gancho] ? gancho : 'ia', animado },
    slides,
    titulo: slides[0].titulo,
    apoio: slides[0].texto,
    chamada: slides.at(-1)!.botao,
    legenda,
    hashtags,
    reels: '',
    itens: [] as unknown[],
    pontos: [] as string[],
    autor: '',
    numero: '',
    cupom: '',
    data: '',
    horario: '',
    ordem_fotos: [] as number[],
    arte: { destaque, tamanho_titulo: 'normal', alinhamento: 'esquerda', fundo: 'marca' },
    cores: {},
    avisos,
  }
}

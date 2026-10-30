// Dados que a IA não pode inventar. Quando falta um, a peça vem com o marcador e o app
// pede o dado antes de baixar, trocando o marcador na arte e na legenda.
export const MARCADORES = {
  '[HORÁRIO]': { nome: 'o horário', pergunta: 'Qual o horário?', exemplo: 'Ex.: sábado, das 9h às 13h' },
  '[DATA]': { nome: 'a data', pergunta: 'Qual a data?', exemplo: 'Ex.: 15 de novembro' },
  '[SEU PREÇO]': { nome: 'o preço', pergunta: 'Qual o preço?', exemplo: 'Ex.: R$ 49,90' },
  '[ENDEREÇO]': { nome: 'o endereço', pergunta: 'Qual o endereço?', exemplo: 'Ex.: Rua Augusta, 1200' },
  '[TELEFONE]': { nome: 'o telefone', pergunta: 'Qual o telefone?', exemplo: 'Ex.: (11) 99999-0000' },
  '[CUPOM]': { nome: 'o código do cupom', pergunta: 'Qual o código do cupom?', exemplo: 'Ex.: BEMVINDO10' },
}

// "o horário", "o horário e o preço", "a data, o horário e o preço".
export function listaDeNomes(marcadores) {
  const nomes = marcadores.map((m) => MARCADORES[m].nome)
  return nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}` : nomes[0] || ''
}

const textos = (r) => [r.titulo, r.apoio, r.chamada, r.legenda, r.autor, r.numero, r.cupom, r.data, r.horario, ...(r.pontos || []), ...(r.itens || []).map((i) => i.preco)]

export function marcadoresDe(roteiro) {
  const tudo = textos(roteiro || {}).join(' ')
  return Object.keys(MARCADORES).filter((m) => tudo.includes(m))
}

export function preencher(roteiro, valores) {
  const trocar = (t) => Object.entries(valores).reduce((s, [m, v]) => (v.trim() ? s.split(m).join(v.trim()) : s), String(t ?? ''))
  return {
    ...roteiro,
    titulo: trocar(roteiro.titulo),
    apoio: trocar(roteiro.apoio),
    chamada: trocar(roteiro.chamada),
    legenda: trocar(roteiro.legenda),
    autor: trocar(roteiro.autor),
    numero: trocar(roteiro.numero),
    cupom: trocar(roteiro.cupom),
    data: trocar(roteiro.data),
    horario: trocar(roteiro.horario),
    pontos: (roteiro.pontos || []).map(trocar),
    itens: (roteiro.itens || []).map((i) => ({ ...i, preco: trocar(i.preco) })),
    // Os avisos dos marcadores viram campos; os outros continuam.
    avisos: (roteiro.avisos || []).filter((a) => !Object.keys(MARCADORES).some((m) => a.includes(m))),
  }
}

// Antes de gerar: o pedido pede um dado que a marca não tem? Pergunta na hora de escrever,
// não na hora de postar. Só sinais fortes; em dúvida, a IA deixa o marcador e o app pergunta depois.
const SINAIS = [
  ['[HORÁRIO]', /hor[áa]rio|abr(e|imos|ir|indo)|fech(a|amos|ar|ado)|feriado|funciona/i, /\b\d{1,2}\s?(h|:\d{2})\b/i, (d) => d.horario],
  ['[SEU PREÇO]', /pre[çc]o|desconto|promo[çc][ãa]o|custa|valor|combo|a partir de/i, /R\$|\d+\s?%|gr[áa]tis|gratuito/i, (d) => d.itens?.length],
  ['[ENDEREÇO]', /endere[çc]o|onde fica|como chegar|inaugura|mudamos|loja nova|unidade nova/i, /\b(rua|av\.?|avenida|alameda|travessa|pra[çc]a)\b/i, (d) => d.endereco],
  ['[DATA]', /sorteio|evento|inaugura[çc][ãa]o|workshop|aula experimental|encontro|degusta[çc][ãa]o|resultado/i, /\b(dia \d|\d{1,2}\/\d{1,2}|segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo|hoje|amanh[ãa])\b/i, () => false],
  ['[CUPOM]', /cupom|c[óo]digo/i, /\b[A-Z][A-Z0-9]{3,}\b/, () => false],
]
export function perguntasAntes(pedido, dados = {}) {
  const t = pedido || ''
  return SINAIS.filter(([, pede, jaTem, naMarca]) => pede.test(t) && !jaTem.test(t) && !naMarca(dados)).map(([m]) => m)
}
// "horário: sábado, 9h às 13h; preço: R$ 49,90" para a IA usar sem inventar.
export function dadosEmTexto(valores) {
  const partes = Object.entries(valores).filter(([, v]) => v.trim()).map(([m, v]) => `${MARCADORES[m].nome.replace(/^(o|a) /, '')}: ${v.trim()}`)
  return partes.length ? `\n\nUse estes dados: ${partes.join('; ')}.` : ''
}

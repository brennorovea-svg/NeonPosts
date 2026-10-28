// Parte pura da função gerar-peca: instruções para a IA, formato da resposta e a
// conferência final, que tira qualquer preço, data, horário ou telefone inventado.

export const MODELOS = ['promo', 'aviso', 'bastidores']

export const ESQUEMA = {
  type: 'object',
  properties: {
    modelo: { type: 'string', enum: MODELOS },
    titulo: { type: 'string' },
    apoio: { type: 'string' },
    itens: { type: 'array', items: { type: 'string' } },
    chamada: { type: 'string' },
    legenda: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } },
  },
  required: ['modelo', 'titulo', 'apoio', 'itens', 'chamada', 'legenda', 'hashtags'],
  additionalProperties: false,
}

export const INSTRUCOES = `Você escreve posts e stories de Instagram para pequenos negócios brasileiros, sempre na voz da marca descrita pelo dono. Recebe um pedido curto e devolve o roteiro de uma peça.

Dados que não podem ser inventados
- Preço, endereço, data, horário e telefone só podem vir dos dados fixos da marca ou do próprio pedido.
- Se a peça precisar de um desses e ele não existir, escreva exatamente o marcador: [SEU PREÇO], [ENDEREÇO], [DATA], [HORÁRIO] ou [TELEFONE]. O dono troca antes de postar.
- Em "itens", use só nomes da lista de itens da marca, escritos igual. O sistema coloca o preço; não escreva preço em nenhum outro campo. Deixe "itens" vazio se o pedido não fala de itens.

Texto da arte
- "titulo": até 6 palavras, forte, sem ponto final.
- "apoio": uma frase de até 18 palavras que completa o título.
- "chamada": até 5 palavras, começando pelo verbo, ligada à chamada preferida da marca.

Legenda
- Na voz da marca: tom, tratamento, palavras que usa e que evita, e no jeito das legendas de exemplo.
- Emoji conforme a preferência da marca: "nenhum" é nenhum, "pouco" é no máximo dois.
- Termina com a chamada. Sem hashtags na legenda.

Como escrever bem
- A primeira linha da legenda é o gancho: uma pergunta, um benefício direto ou uma frase curta que faça parar de rolar. Evite aberturas gastas como "Chegou o dia" quando não forem exatamente o caso.
- Fale do ganho de quem lê, com detalhes concretos do pedido e da marca. Se a frase serviria para qualquer negócio, reescreva.
- Título da arte, apoio e legenda se completam; não repita a mesma frase.
- Post de feed: legenda de 3 a 6 frases curtas, em parágrafos. Story: legenda de 1 ou 2 frases, porque a arte faz o trabalho.
- Contato (WhatsApp, site, Instagram) só quando a chamada pedir, e escrito como está nos dados fixos.

"hashtags": de 3 a 8, sem repetir, incluindo as fixas da marca.

"modelo": "promo" para oferta, preço ou itens; "aviso" para novidade, comunicado, evento ou horário; "bastidores" para rotina, equipe, processo ou foto do dia a dia.`

type Perfil = {
  identidade: { nome: string; ramo: string }
  voz: Record<string, unknown>
  padrao: { tipos: string[]; hashtags: string; chamada: string }
  dados: { endereco: string; horario: string; whatsapp: string; instagram: string; site: string; itens: { nome: string; preco: string }[] }
}

export function montarMensagem(perfil: Perfil, pedido: string, formato: string, anterior?: Record<string, unknown> | null, ajuste?: string) {
  const marca = {
    nome: perfil.identidade.nome,
    ramo: perfil.identidade.ramo,
    voz: perfil.voz,
    padrao: { tipos: perfil.padrao.tipos, chamada: perfil.padrao.chamada, hashtags_fixas: perfil.padrao.hashtags },
    dados_fixos: perfil.dados,
  }
  let texto = `<marca>\n${JSON.stringify(marca, null, 2)}\n</marca>\n\n<formato>${formato === 'story' ? 'story (9:16)' : 'post de feed (4:5)'}</formato>\n\n<pedido>\n${pedido}\n</pedido>`
  if (anterior) {
    const { titulo, apoio, chamada, legenda } = anterior as Record<string, string>
    texto += `\n\n<versao_anterior>\n${JSON.stringify({ titulo, apoio, chamada, legenda }, null, 2)}\n</versao_anterior>\n\nO dono pediu outra versão. Escreva uma peça nova de verdade: outro ângulo, outro título, outra primeira linha na legenda. Não reaproveite frases da versão anterior.`
  }
  if (ajuste) texto += `\n\n<ajuste>\n${ajuste}\n</ajuste>\n\nSiga o ajuste acima com prioridade.`
  return texto
}

const MARCADORES: Record<string, string> = {
  '[SEU PREÇO]': 'Falta o preço',
  '[ENDEREÇO]': 'Falta o endereço',
  '[DATA]': 'Falta a data',
  '[HORÁRIO]': 'Falta o horário',
  '[TELEFONE]': 'Falta o telefone',
}

// Cada número que aparece nos dados ou no pedido, com e sem separadores.
function numerosDaFonte(fonte: string) {
  const set = new Set<string>()
  for (const m of fonte.matchAll(/\d[\d.,:/h-]*\d|\d/gi)) {
    const so = m[0].replace(/\D/g, '')
    const partes = [so, ...m[0].split(/\D+/)]
    if (so.endsWith('00')) partes.push(so.slice(0, -2))
    for (const parte of partes) if (parte) set.add(semZero(parte))
  }
  return set
}

const semZero = (n: string) => n.replace(/^0+(?=\d)/, '')

function permitido(trecho: string, fonte: Set<string>) {
  const so = semZero(trecho.replace(/\D/g, ''))
  if (!so) return true
  return fonte.has(so) || (so.endsWith('00') && fonte.has(so.slice(0, -2))) || fonte.has(so + '00')
}

const SUSPEITOS: [RegExp, string][] = [
  [/R\$\s?\d[\d.,]*/g, '[SEU PREÇO]'],
  [/\(?\b\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g, '[TELEFONE]'],
  [/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, '[DATA]'],
  [/\b\d{1,2}\s?(?:h|:)\s?\d{0,2}\b(?:\s?min)?/gi, '[HORÁRIO]'],
]

export function formatarPreco(preco: string) {
  const limpo = String(preco ?? '').trim()
  if (!limpo) return '[SEU PREÇO]'
  if (/^\d+([.,]\d{1,2})?$/.test(limpo)) {
    const valor = Number(limpo.replace(',', '.'))
    return 'R$ ' + valor.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(valor) ? 0 : 2, maximumFractionDigits: 2 })
  }
  return /^r\$/i.test(limpo) ? limpo : `R$ ${limpo}`
}

export function conferir(bruto: Record<string, unknown>, perfil: Perfil, pedido: string) {
  const fonte = numerosDaFonte(pedido + ' ' + JSON.stringify(perfil.dados))
  const avisos: string[] = []
  const trocados = new Set<string>()

  const limpar = (texto: unknown) => {
    let t = String(texto ?? '').trim()
    for (const [padrao, marcador] of SUSPEITOS) {
      t = t.replace(padrao, (trecho) => {
        if (permitido(trecho, fonte)) return trecho
        trocados.add(marcador)
        return marcador
      })
    }
    return t
  }

  const roteiro = {
    modelo: MODELOS.includes(bruto.modelo as string) ? bruto.modelo as string : 'aviso',
    titulo: limpar(bruto.titulo),
    apoio: limpar(bruto.apoio),
    chamada: limpar(bruto.chamada),
    legenda: limpar(bruto.legenda),
    itens: [] as { nome: string; preco: string }[],
    hashtags: [] as string[],
    avisos,
  }

  const daMarca = perfil.dados.itens || []
  for (const nome of (bruto.itens as string[] | undefined) || []) {
    const achado = daMarca.find((i) => i.nome.trim().toLowerCase() === String(nome).trim().toLowerCase())
    if (achado) roteiro.itens.push({ nome: achado.nome, preco: formatarPreco(achado.preco) })
  }

  const fixas = (perfil.padrao.hashtags || '').split(/[\s,]+/)
  const todas = [...fixas, ...((bruto.hashtags as string[] | undefined) || [])]
  const vistas = new Set<string>()
  for (const h of todas) {
    const tag = '#' + String(h).replace(/^#+/, '').replace(/\s+/g, '')
    if (tag.length < 2 || vistas.has(tag.toLowerCase())) continue
    vistas.add(tag.toLowerCase())
    roteiro.hashtags.push(tag)
  }

  if (trocados.size) avisos.push('A IA tentou escrever um dado que não está na sua marca. Trocamos por um marcador.')
  const tudo = [roteiro.titulo, roteiro.apoio, roteiro.chamada, roteiro.legenda, ...roteiro.itens.map((i) => i.preco)].join(' ')
  for (const [marcador, texto] of Object.entries(MARCADORES)) {
    if (tudo.includes(marcador)) avisos.push(`${texto}: troque ${marcador} antes de postar.`)
  }
  return roteiro
}

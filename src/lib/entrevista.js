import { supabase } from './supabase.js'
import { modoDeTeste } from './perfil.js'

// Entrevista da marca: 4 rodadas de até 3 perguntas. As respostas viram o guia da marca,
// uma lista de regras curtas que vai para a IA em toda peça (perfil.voz.guia).

const COMIDA = /restaurante|caf[eé]|padaria|food|lanche|doce|confeitaria|bar\b|pizz|hamb|comida|cozinha|marmita|granola/i
const SERVICO = /sa[uú]de|beleza|est[eé]tica|academia|servi[cç]o|cl[ií]nica|sal[aã]o|psic|pilates|advoca|ag[eê]ncia|est[uú]dio|software|consult/i

function tipoDoRamo(ramo = '') {
  if (COMIDA.test(ramo)) return 'comida'
  if (SERVICO.test(ramo)) return 'servico'
  return 'loja'
}

const SEMPRE_SABER = {
  comida: { exemplo: 'Ex.: contém glúten e leite, tem opção vegetariana, porção serve 2.', opcoes: ['alergênicos', 'opção vegetariana', 'tamanho da porção', 'feito na hora'] },
  servico: { exemplo: 'Ex.: atendimento só com hora marcada, sessão de 50 minutos, primeira conversa sem custo.', opcoes: ['só com hora marcada', 'duração do atendimento', 'primeira conversa sem custo', 'atende online'] },
  loja: { exemplo: 'Ex.: tamanhos do P ao GG, peça única, troca em 7 dias.', opcoes: ['tamanhos', 'peça única', 'política de troca', 'envio para todo o Brasil'] },
}

const PROMESSAS = {
  comida: ['entrega', 'tempo de espera', 'desconto', 'sempre ter de tudo'],
  servico: ['resultado garantido', 'prazo de entrega', 'desconto', 'cura ou milagre'],
  loja: ['entrega rápida', 'estoque', 'desconto', 'frete grátis'],
}

export function rodadasDaEntrevista(perfil) {
  const tipo = tipoDoRamo(perfil.identidade.ramo)
  const nome = perfil.identidade.nome || 'sua marca'
  return [
    {
      titulo: 'Como a marca se chama',
      perguntas: [
        { id: 'se_refere', pergunta: 'Quando a marca fala de si mesma, ela diz o quê?', opcoes: ['a gente', 'nós', 'eu (sou eu que atendo)', `o nome: "${nome}"`] },
        { id: 'genero', pergunta: `É "o ${nome}" ou "a ${nome}"?`, opcoes: [`o ${nome}`, `a ${nome}`, 'só o nome, sem artigo'], uma: true },
        { id: 'bordao', pergunta: 'Tem algum bordão ou frase que você sempre usa?', exemplo: 'Ex.: "os melhores clientes do mundo", "feito com carinho".' },
      ],
    },
    {
      titulo: 'O que a marca nunca diz',
      perguntas: [
        { id: 'proibidas', pergunta: 'Que palavras ou apelidos você não quer ver nos posts?', exemplo: 'Ex.: um apelido do produto que te irrita, gíria, palavrão, termo técnico.' },
        { id: 'concorrentes', pergunta: 'Pode citar ou comparar com concorrentes?', opcoes: ['nunca', 'comparar sem citar nome', 'pode citar'], uma: true },
        { id: 'promessas', pergunta: 'Que promessas a marca não pode fazer?', opcoes: PROMESSAS[tipo] },
      ],
    },
    {
      titulo: 'Preço e produto',
      perguntas: [
        { id: 'preco', pergunta: 'Quando o preço aparece no post?', opcoes: ['sempre que tiver', 'só em promoção ou evento', 'nunca, só no direct'], uma: true },
        { id: 'carro_chefe', pergunta: 'O que mais vende ou é o carro-chefe?', exemplo: 'Ex.: o yakissoba grande, o corte de cabelo masculino, o site em 7 dias.' },
        { id: 'sempre_saber', pergunta: 'O que o cliente precisa saber sempre que o produto aparece?', ...SEMPRE_SABER[tipo] },
      ],
    },
    {
      titulo: 'Onde, quando e para quem',
      perguntas: [
        { id: 'onde', pergunta: 'Onde e quando o cliente encontra você?', exemplo: 'Ex.: ponto fixo, agenda que muda toda semana, só online, preço muda por evento.' },
        { id: 'cliente', pergunta: 'Quem é o seu cliente?', exemplo: 'Ex.: famílias do bairro no fim de semana, donos de pequenos negócios, mulheres de 30 a 50 anos.' },
        { id: 'chama_cliente', pergunta: 'Como você chama o seu cliente?', opcoes: ['pelo nome dele', 'você', 'pessoal', 'um apelido da marca'] },
      ],
    },
  ]
}

// Guia em modo de teste: uma regra por resposta, sem IA.
function guiaDeTeste(respostas) {
  return respostas.filter((r) => r.resposta.trim()).map((r) => `${r.pergunta.replace(/\?$/, '')}: ${r.resposta.trim()}.`)
}

export async function montarGuia(respostas) {
  if (modoDeTeste()) {
    await new Promise((ok) => setTimeout(ok, 2500))
    return guiaDeTeste(respostas)
  }
  const data = await chamar('entrevista', { respostas }, 'Não deu para montar o guia agora. Tente de novo.')
  return data.regras
}

// Motivos do "Isso não é a minha marca" (os mesmos da função entrevista).
export const MOTIVOS = ['Não é assim que a gente fala', 'Isso a gente não vende ou não faz', 'O preço não devia aparecer', 'Tem palavra que a gente não usa', 'Prometeu o que a gente não pode']

async function chamar(funcao, corpo, padrao) {
  const { data, error } = await supabase.functions.invoke(funcao, { body: corpo })
  if (error) {
    let mensagem = padrao
    try { mensagem = (await error.context.json()).erro || mensagem } catch { /* resposta sem corpo */ }
    throw new Error(mensagem)
  }
  return data
}

// Calibração: 3 peças de teste com as regras que a pessoa ainda está conferindo. Não contam no limite.
const CALIBRACAO_DE_TESTE = [
  { formato: 'post', modelo: 'promo', roteiro: { modelo: 'promo', titulo: 'Seu site novo em 7 dias', apoio: 'Nós entregamos um site rápido e bonito, com resultado garantido.', itens: [], chamada: 'Chama no WhatsApp', legenda: 'Nós da Neon Scripts fazemos o seu site em 7 dias, com resultado garantido. Chama no WhatsApp.', hashtags: ['#NeonScripts'], pontos: [], arte: {}, cores: {}, avisos: [] } },
  { formato: 'story', modelo: 'aviso', roteiro: { modelo: 'aviso', titulo: 'A gente atende online', apoio: 'De segunda a sexta, do jeito da sua marca.', itens: [], chamada: 'Manda um oi', legenda: 'A gente atende online, de segunda a sexta. Manda um oi no direct.', hashtags: ['#NeonScripts'], pontos: [], arte: {}, cores: {}, avisos: [] } },
  { formato: 'post', modelo: 'bastidores', roteiro: { modelo: 'bastidores', titulo: 'Por trás de cada site', apoio: 'Café, código e muita conversa com o cliente.', itens: [], chamada: 'Vem conhecer', legenda: 'Por trás de cada site tem muita conversa com quem vai usar. É assim que a gente trabalha.', hashtags: ['#NeonScripts'], pontos: [], arte: {}, cores: {}, avisos: [] } },
]

export async function calibrar(regras, carroChefe = '') {
  if (modoDeTeste()) {
    await new Promise((ok) => setTimeout(ok, 3000))
    return CALIBRACAO_DE_TESTE
  }
  const data = await chamar('gerar-peca', { calibrar: true, regras, carro_chefe: carroChefe }, 'Não deu para gerar os posts de teste agora. Tente de novo.')
  return data.pecas
}

// "Isso não é a minha marca": a IA lê a peça e o motivo e propõe 1 ou 2 regras para o guia.
export async function proporRegra({ peca, motivos, comentario, regras }) {
  const { titulo, apoio, chamada, legenda, pontos } = peca
  if (modoDeTeste()) {
    await new Promise((ok) => setTimeout(ok, 1800))
    const deTeste = {
      'Prometeu o que a gente não pode': 'Nunca prometa "resultado garantido" nem prazo que o cliente não combinou.',
      'Não é assim que a gente fala': 'Diga "a gente", nunca "nós", quando a marca fala de si mesma.',
    }
    const lista = motivos.map((m) => deTeste[m]).filter(Boolean)
    if (!lista.length) lista.push(`Evite o que apareceu neste post: ${comentario.trim() || motivos[0]}.`)
    return lista.slice(0, 2)
  }
  const data = await chamar('entrevista', { acao: 'regra', peca: { titulo, apoio, chamada, legenda, pontos }, motivos, comentario, regras }, 'Não deu para propor a regra agora. Tente de novo.')
  return data.regras
}

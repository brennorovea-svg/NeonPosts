// Transforma as respostas da entrevista da marca em regras curtas (o guia da marca).
// O app mostra as regras para o dono conferir antes de salvar no perfil. Não conta no limite de peças.
import Anthropic from 'npm:@anthropic-ai/sdk@0.132.1'
import { createClient } from 'npm:@supabase/supabase-js@2.117.3'

const CABECALHOS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CABECALHOS, 'Content-Type': 'application/json' } })
}
const erro = (mensagem: string, status: number) => resposta({ erro: mensagem }, status)

function chaveDeServico() {
  const antiga = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (antiga) return antiga
  try { return Object.values(JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'))[0] as string } catch { return '' }
}

const ESQUEMA = {
  type: 'object',
  properties: { regras: { type: 'array', items: { type: 'string' } } },
  required: ['regras'],
  additionalProperties: false,
}

const INSTRUCOES = `Você monta o guia de comunicação de um pequeno negócio brasileiro. Recebe o perfil da marca e as respostas do dono a uma entrevista, e devolve regras curtas que uma IA vai seguir ao escrever posts de Instagram para essa marca.

Como escrever as regras
- De 5 a 12 regras, cada uma com até 20 palavras, começando pelo verbo no imperativo ("Diga", "Nunca use", "Mostre").
- Uma ideia por regra. Concretas, com as palavras exatas do dono entre aspas quando ele deu exemplo ("o Narua", "os melhores clientes do mundo").
- Só o que veio das respostas. Não invente regra, preço, endereço, data, horário ou promessa que o dono não disse.
- Cubra, quando houver resposta: como a marca se refere a si mesma e se é "o" ou "a"; bordão; palavras e apelidos proibidos; concorrentes; promessas que não pode fazer; quando o preço aparece; o carro-chefe; o que o cliente precisa saber sempre; onde e quando encontra a marca; quem é o cliente e como chamá-lo.
- Sobre preço, escreva a regra de forma que a IA saiba o que fazer: por exemplo "Mostre preço só em post de promoção ou evento; nos outros, não liste itens com preço."
- Resposta vazia ou "não sei" não vira regra.
- Português do Brasil, sem emoji, sem jargão.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS })
  if (req.method !== 'POST') return erro('Método não aceito.', 405)

  const banco = createClient(Deno.env.get('SUPABASE_URL')!, chaveDeServico(), { auth: { persistSession: false } })
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  const { data: conta } = await banco.auth.getUser(token)
  if (!conta?.user) return erro('Entre de novo para continuar.', 401)

  const { data: negocio } = await banco.from('negocios').select('id').eq('dono', conta.user.id).single()
  if (!negocio) return erro('Não achamos o seu negócio.', 404)

  let corpo: { respostas?: { pergunta?: string; resposta?: string }[] }
  try { corpo = await req.json() } catch { return erro('Pedido inválido.', 400) }
  const respostas = (corpo.respostas || [])
    .map((r) => ({ pergunta: String(r.pergunta || '').slice(0, 200), resposta: String(r.resposta || '').trim().slice(0, 600) }))
    .filter((r) => r.pergunta && r.resposta)
    .slice(0, 20)
  if (!respostas.length) return erro('Responda pelo menos uma pergunta.', 400)

  const { data: perfil } = await banco.from('perfis_marca').select('identidade, voz, dados')
    .eq('negocio', negocio.id).order('versao', { ascending: false }).limit(1).maybeSingle()

  const chave = Deno.env.get('ANTHROPIC_API_KEY')
  if (!chave) return erro('A IA ainda não foi ligada. Tente mais tarde.', 503)
  const ia = new Anthropic({ apiKey: chave, timeout: 60_000, maxRetries: 1 })

  const marca = perfil ? {
    nome: perfil.identidade?.nome, ramo: perfil.identidade?.ramo,
    tom: perfil.voz?.tom, tratamento: perfil.voz?.tratamento, usa: perfil.voz?.usa, evita: perfil.voz?.evita,
    itens: (perfil.dados?.itens || []).map((i: { nome: string }) => i.nome),
  } : {}

  try {
    // Mesmo modelo da gerar-peca (Haiku 5.5, esforço médio): a tarefa é resumir, não criar.
    const msg = await ia.messages.create({
      model: 'claude-haiku-5-5',
      max_tokens: 8000,
      // @ts-ignore: output_config.format ainda sem tipo nesta versão do SDK
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: ESQUEMA } },
      system: INSTRUCOES,
      messages: [{
        role: 'user',
        content: `<marca>\n${JSON.stringify(marca, null, 2)}\n</marca>\n\n<respostas>\n${JSON.stringify(respostas, null, 2)}\n</respostas>`,
      }],
    })
    if (msg.stop_reason === 'refusal') return erro('A IA não conseguiu montar o guia. Tente mudar alguma resposta.', 422)
    const texto = msg.content.find((b) => b.type === 'text')
    if (!texto || texto.type !== 'text') throw new Error('sem texto')
    const regras = (JSON.parse(texto.text).regras as unknown[])
      .map((r) => String(r).trim()).filter(Boolean).slice(0, 12)
    return resposta({ regras })
  } catch (falha) {
    console.error('ia', falha)
    if (falha instanceof Anthropic.RateLimitError) return erro('Muita gente usando agora. Tente de novo em um minuto.', 503)
    return erro('A IA não respondeu agora. Tente de novo.', 502)
  }
})

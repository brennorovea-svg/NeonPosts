// Bloco 10: cria a imagem do post com o Nano Banana (modelo de imagem do Gemini), só no plano Pro.
// A chave fica só aqui (segredo GEMINI_API_KEY). As fotos da marca vão como referência,
// para a IA manter o produto, a embalagem e o jeito das fotos de verdade.
// A imagem volta para o aparelho, que envia pelo mesmo caminho das fotos do Criar.
import { createClient } from 'npm:@supabase/supabase-js@2.117.3'

const CABECALHOS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}
// Nano Banana. Para trocar de versão, mudar só aqui.
const MODELO = 'gemini-2.5-flash-image'
const IMAGENS_POR_MES = 30 // igual à migração 0020 e a src/lib/imagemIa.js
const MAX_REFERENCIAS = 3
const MAX_BYTES_REFERENCIA = 4_000_000

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CABECALHOS, 'Content-Type': 'application/json' } })
}
const erro = (mensagem: string, status: number) => resposta({ erro: mensagem }, status)

const AVISOS_DE_USO: Record<string, string> = {
  plano: 'A imagem com IA é do plano Pro.',
  mes: `Você usou as ${IMAGENS_POR_MES} imagens com IA deste mês. O contador zera no dia 1.`,
  dia: 'Você já criou 10 imagens hoje. Tente de novo amanhã.',
  hora: 'Você usou bastante a IA na última hora. Espere um pouco e tente de novo.',
}

function chaveDeServico() {
  const antiga = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (antiga) return antiga
  try { return Object.values(JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'))[0] as string } catch { return '' }
}

function base64(bytes: Uint8Array) {
  let texto = ''
  for (let i = 0; i < bytes.length; i += 0x8000) texto += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(texto)
}

function inicioDoMes() {
  const [ano, mes] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' })
    .format(new Date()).split('-')
  return `${ano}-${mes}-01T00:00:00-03:00`
}

// Monta o pedido para a IA de imagem com o perfil da marca. Sem texto e sem logo na imagem:
// o Neonposts escreve por cima, e texto feito pela IA de imagem sai com erro.
export function montarPrompt(perfil: Record<string, any>, pedido: string, formato: string, comReferencia: boolean) {
  const i = perfil.identidade || {}
  const v = perfil.voz || {}
  const story = formato === 'story'
  const linhas = [
    `Crie uma foto realista para um ${story ? 'story' : 'post'} de Instagram, formato vertical ${story ? '9:16' : '4:5'}.`,
    i.ramo ? `Negócio: ${i.ramo}${i.nome ? ` (${i.nome})` : ''}.` : '',
    pedido
      ? `A imagem é sobre: "${pedido}". Mostre o assunto como protagonista, numa cena real e bem iluminada.`
      : 'Mostre os produtos ou o trabalho do negócio numa cena bonita e real, que funcione como foto de vitrine.',
    comReferencia
      ? 'Use as fotos anexadas como referência: mantenha o mesmo produto, a mesma embalagem e o mesmo estilo de foto da marca. Não copie textos nem logos das fotos.'
      : '',
    Array.isArray(i.cores) && i.cores.length
      ? `Use as cores da marca na cena (fundo, objetos, luz), sem exagero: ${i.cores.slice(0, 4).join(', ')}.`
      : '',
    Array.isArray(v.tom) && v.tom.length ? `Clima da foto: ${v.tom.slice(0, 3).map((t: string) => t.toLowerCase()).join(', ')}.` : '',
    story
      ? 'Deixe uma faixa mais limpa no meio da imagem, com espaço para texto.'
      : 'Deixe uma área mais limpa na parte de cima, com espaço para texto.',
    "Não escreva nenhum texto, letra, número, preço ou logo na imagem. Sem marca d'água. Sem pessoas famosas nem marcas de outras empresas.",
  ]
  return linhas.filter(Boolean).join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS })
  if (req.method !== 'POST') return erro('Método não aceito.', 405)

  const banco = createClient(Deno.env.get('SUPABASE_URL')!, chaveDeServico(), { auth: { persistSession: false } })
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  const { data: conta } = await banco.auth.getUser(token)
  if (!conta?.user) return erro('Entre de novo para continuar.', 401)

  const { data: negocio } = await banco.from('negocios').select('id, plano').eq('dono', conta.user.id).single()
  if (!negocio) return erro('Não achamos o seu negócio.', 404)
  if (negocio.plano !== 'pro') return erro(AVISOS_DE_USO.plano, 403)

  let corpo: { pedido?: string; formato?: string; referencias?: string[] }
  try { corpo = await req.json() } catch { return erro('Pedido inválido.', 400) }
  const pedido = String(corpo.pedido || '').trim().slice(0, 400)
  const formato = corpo.formato === 'story' ? 'story' : 'post'

  const { data: perfil } = await banco.from('perfis_marca').select('identidade, voz')
    .eq('negocio', negocio.id).order('versao', { ascending: false }).limit(1).maybeSingle()
  if (!perfil) return erro('Conte a sua marca antes de criar uma imagem.', 409)

  // Só fotos do próprio negócio: da marca ou já enviadas no Criar.
  const caminhos = (corpo.referencias || [])
    .filter((c) => typeof c === 'string' && c.startsWith(`${negocio.id}/`))
    .slice(0, MAX_REFERENCIAS)
  const referencias = (await Promise.all(caminhos.map(async (caminho) => {
    const previa = await banco.storage.from('marcas').download(`${caminho}.previa.jpg`)
    const arquivo = previa.data ?? (await banco.storage.from('marcas').download(caminho)).data
    if (!arquivo || arquivo.size > MAX_BYTES_REFERENCIA || !/^image\/(jpeg|png|webp)$/.test(arquivo.type || 'image/jpeg')) return null
    return { mimeType: previa.data ? 'image/jpeg' : arquivo.type || 'image/jpeg', data: base64(new Uint8Array(await arquivo.arrayBuffer())) }
  }))).filter((r): r is { mimeType: string; data: string } => Boolean(r))

  const chave = Deno.env.get('GEMINI_API_KEY')
  if (!chave) return erro('A imagem com IA ainda não foi ligada. Tente mais tarde.', 503)

  // Confere e anota o uso antes de chamar a IA. Sem resposta do banco, não chama.
  const { data: barrado, error: falhaDeUso } = await banco.rpc('usar_ia', { p_negocio: negocio.id, p_funcao: 'imagem', p_peso: 1 })
  if (falhaDeUso) { console.error('usar_ia', falhaDeUso); return erro('Não deu para conferir o seu uso agora. Tente de novo.', 503) }
  if (barrado) return erro(AVISOS_DE_USO[barrado] || 'Você chegou ao limite de uso. Tente mais tarde.', 429)

  const prompt = montarPrompt(perfil, pedido, formato, referencias.length > 0)
  let imagem: { mimeType: string; data: string } | null = null
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
      signal: AbortSignal.timeout(90_000),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }, ...referencias.map((inlineData) => ({ inlineData }))] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: formato === 'story' ? '9:16' : '4:5' } },
      }),
    })
    const dados = await r.json()
    if (!r.ok) {
      console.error('gemini', r.status, JSON.stringify(dados).slice(0, 500))
      return erro(r.status === 429 ? 'Muita gente criando agora. Tente de novo em um minuto.' : 'A IA de imagem não respondeu agora. Tente de novo.', 502)
    }
    const partes = dados?.candidates?.[0]?.content?.parts || []
    imagem = partes.find((p: { inlineData?: { data?: string } }) => p.inlineData?.data)?.inlineData || null
  } catch (falha) {
    console.error('gemini', falha)
    return erro('A IA de imagem não respondeu agora. Tente de novo.', 502)
  }
  if (!imagem) return erro('A IA não quis criar essa imagem. Tente descrever a cena com outras palavras.', 422)

  const { count } = await banco.from('uso_ia').select('id', { count: 'exact', head: true })
    .eq('negocio', negocio.id).eq('funcao', 'imagem').gte('criado_em', inicioDoMes())
  return resposta({ imagem: imagem.data, tipo: imagem.mimeType || 'image/png', usadas: count ?? 0, limite: IMAGENS_POR_MES })
})

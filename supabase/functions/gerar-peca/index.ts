// Recebe o pedido do cliente, junta com o perfil da marca e pede o roteiro à IA.
// A chave da IA fica só aqui (segredo ANTHROPIC_API_KEY). A peça é desenhada no aparelho.
import Anthropic from 'npm:@anthropic-ai/sdk@0.132.1'
import { createClient } from 'npm:@supabase/supabase-js@2.117.3'
import { conferir, ESQUEMA, INSTRUCOES, MODELOS, montarMensagem, SO_NO_VIDEO } from './conferir.ts'

const CABECALHOS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // O navegador guarda a checagem de CORS por um dia e não repete o OPTIONS a cada peça.
  'Access-Control-Max-Age': '86400',
}
const MAX_REFEITAS = 3
const PEDIDO_DE_BOAS_VINDAS = 'Post de apresentação da marca para quem chegou agora no perfil: quem a gente é, o que a gente faz e um convite para seguir e chamar no WhatsApp. Tom de boas-vindas, sem preço.'

// Calibração do guia da marca: 3 pedidos fixos, montados aqui com o ramo e o carro-chefe,
// para a função não virar um jeito de criar peça sem contar no limite.
function pedidosDeCalibracao(carroChefe: string) {
  return [
    { formato: 'post', pedido: carroChefe ? `Post de promoção do ${carroChefe}` : 'Post de promoção do que mais vende' },
    { formato: 'story', pedido: 'Story contando onde e quando o cliente encontra a gente' },
    { formato: 'post', pedido: 'Post de bastidores mostrando como a gente trabalha' },
  ]
}

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CABECALHOS, 'Content-Type': 'application/json' } })
}
const erro = (mensagem: string, status: number) => resposta({ erro: mensagem }, status)

// Bytes da imagem em base64, em pedaços (o spread de um arquivo inteiro estoura a pilha).
function base64(bytes: Uint8Array) {
  let texto = ''
  for (let i = 0; i < bytes.length; i += 0x8000) texto += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(texto)
}

function chaveDeServico() {
  const antiga = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (antiga) return antiga
  try { return Object.values(JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'))[0] as string } catch { return '' }
}

// Primeiro dia do mês no horário de São Paulo (sem horário de verão desde 2019).
function inicioDoMes() {
  const [ano, mes] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' })
    .format(new Date()).split('-')
  return `${ano}-${mes}-01T00:00:00-03:00`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS })
  if (req.method !== 'POST') return erro('Método não aceito.', 405)

  const banco = createClient(Deno.env.get('SUPABASE_URL')!, chaveDeServico(), { auth: { persistSession: false } })
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  const { data: conta } = await banco.auth.getUser(token)
  if (!conta?.user) return erro('Entre de novo para continuar.', 401)

  const { data: negocio } = await banco.from('negocios').select('id, limite_pecas').eq('dono', conta.user.id).single()
  if (!negocio) return erro('Não achamos o seu negócio.', 404)

  let corpo: { pedido?: string; formato?: string; video?: boolean; fotos?: string[]; refazer?: string; ajuste?: string; modelo?: string; calibrar?: boolean; regras?: string[]; carro_chefe?: string; boas_vindas?: boolean }
  try { corpo = await req.json() } catch { return erro('Pedido inválido.', 400) }
  if (corpo.calibrar) return calibrar(banco, negocio.id, corpo)

  // Peça de boas-vindas: pedido fixo, uma por marca, não conta no limite (coluna cortesia).
  const boasVindas = corpo.boas_vindas === true && !corpo.refazer
  let pedido = boasVindas ? PEDIDO_DE_BOAS_VINDAS : String(corpo.pedido || '').trim()
  let formato = corpo.formato === 'story' ? 'story' : 'post'
  const video = corpo.video === true
  let fotos = (corpo.fotos || []).filter((f) => typeof f === 'string' && f.startsWith(`${negocio.id}/`)).slice(0, 4)
  let refeita: { id: string; pedido: string; refeitas: number; roteiro: Record<string, unknown>; versoes: { roteiro: Record<string, unknown> }[]; escolhida: number | null } | null = null
  const ajuste = String(corpo.ajuste || '').trim().slice(0, 300)
  // Layout que o dono escolheu nas miniaturas, antes da peça nova. Sem escolha, a IA decide.
  let layout = !corpo.refazer && MODELOS.includes(String(corpo.modelo)) ? String(corpo.modelo) : ''

  // Perfil e (peça antiga ou contagem do mês) saem do banco ao mesmo tempo.
  const [{ data: perfil }, anterior] = await Promise.all([
    banco.from('perfis_marca').select('versao, identidade, voz, padrao, dados')
      .eq('negocio', negocio.id).order('versao', { ascending: false }).limit(1).maybeSingle(),
    corpo.refazer
      ? banco.from('pecas').select('id, pedido, formato, fotos, refeitas, roteiro, versoes, escolhida')
        .eq('id', corpo.refazer).eq('negocio', negocio.id).maybeSingle()
      : boasVindas
        ? banco.from('pecas').select('id', { count: 'exact', head: true }).eq('negocio', negocio.id).eq('cortesia', true)
        : banco.from('pecas').select('id', { count: 'exact', head: true })
          .eq('negocio', negocio.id).eq('cortesia', false).gte('criado_em', inicioDoMes()),
  ])

  if (corpo.refazer) {
    const data = anterior.data as (NonNullable<typeof refeita> & { formato: string; fotos: string[] }) | null
    if (!data) return erro('Não achamos esse post.', 404)
    if (data.refeitas >= MAX_REFEITAS) return erro(`Você já refez este post ${MAX_REFEITAS} vezes. Escreva um pedido novo.`, 429)
    refeita = data
    pedido = pedido || data.pedido
    formato = corpo.formato ? formato : data.formato
    fotos = data.fotos
  } else if (boasVindas) {
    if ((anterior.count ?? 0) > 0) return erro('O post de boas-vindas já foi criado. Escreva um pedido novo.', 409)
  } else if ((anterior.count ?? 0) >= negocio.limite_pecas) {
    return erro(`Você usou os ${negocio.limite_pecas} posts deste mês.`, 429)
  }
  if (pedido.length < 3 || pedido.length > 600) return erro('Escreva o pedido com 3 a 600 letras.', 400)

  if (!perfil) return erro('Conte a sua marca antes de criar um post.', 409)
  if (layout === 'foto' && !fotos.length) layout = ''
  if (SO_NO_VIDEO.includes(layout) && !(video && formato === 'story')) layout = ''

  // A IA olha a cópia pequena de cada foto (feita no aparelho ao enviar). Sem cópia, escreve sem ver.
  const imagens = (await Promise.all(fotos.map(async (caminho) => {
    const { data } = await banco.storage.from('marcas').download(`${caminho}.previa.jpg`)
    return data && data.size < 1_500_000 ? base64(new Uint8Array(await data.arrayBuffer())) : null
  }))).filter((d): d is string => Boolean(d))

  const chave = Deno.env.get('ANTHROPIC_API_KEY')
  if (!chave) return erro('A IA ainda não foi ligada. Tente mais tarde.', 503)
  const ia = new Anthropic({ apiKey: chave, timeout: 90_000, maxRetries: 1 })

  let bruto: Record<string, unknown>
  try {
    // Haiku 5.5 no post e no story: a arte é desenhada no app, então a IA só escolhe texto e layout,
    // e no teste com a IA real o Haiku no médio fez isso bem (Brenno, 28/10). O baixo saiu mais rápido,
    // mas errou a voz da marca e o tamanho do texto. As instruções ficam em cache.
    // O Haiku 5.5 não tem fallback no servidor, então o pedido vai sem `fallbacks`.
    const msg = await ia.messages.create({
      model: 'claude-haiku-5-5',
      max_tokens: 16000,
      // @ts-ignore: output_config.format ainda sem tipo nesta versão do SDK
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: ESQUEMA } },
      system: [{ type: 'text', text: INSTRUCOES, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: [
          ...imagens.map((data) => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data } })),
          { type: 'text' as const, text: montarMensagem(perfil, pedido, formato, refeita && (refeita.versoes?.[refeita.escolhida ?? -1]?.roteiro || refeita.roteiro), ajuste, fotos.length, layout, video && formato === 'story', imagens.length) },
        ],
      }],
    })
    if (msg.stop_reason === 'refusal') return erro('A IA não quis escrever esse pedido. Tente com outras palavras.', 422)
    const texto = msg.content.find((b) => b.type === 'text')
    if (!texto || texto.type !== 'text') throw new Error('sem texto')
    bruto = JSON.parse(texto.text)
  } catch (falha) {
    console.error('ia', falha)
    if (falha instanceof Anthropic.RateLimitError) return erro('Muita gente criando agora. Tente de novo em um minuto.', 503)
    return erro('A IA não respondeu agora. Tente de novo.', 502)
  }

  const roteiro = conferir(bruto, perfil, pedido, layout, fotos.length, video && formato === 'story')
  // Ajuste que a IA não consegue fazer (trocar foto, layout, fonte) volta igual; avisa em vez de parecer que nada aconteceu.
  const base = refeita && (refeita.versoes?.[refeita.escolhida ?? -1]?.roteiro || refeita.roteiro) as Record<string, unknown> | null
  const igual = (k: string) => JSON.stringify(base?.[k] ?? null) === JSON.stringify((roteiro as Record<string, unknown>)[k] ?? null)
  if (ajuste && base && ['modelo', 'titulo', 'apoio', 'chamada', 'legenda', 'pontos', 'numero', 'cupom', 'data', 'horario', 'arte', 'cores', 'ordem_fotos'].every(igual)) {
    roteiro.avisos.push('Esse ajuste não mudou nada. Por aqui a IA muda o texto, as cores, o layout, o destaque e a ordem das fotos; trocar a foto ou a fonte ainda não dá (a fonte fica no perfil da marca).')
  }
  const linha = {
    perfil_versao: perfil.versao,
    formato,
    modelo: roteiro.modelo,
    roteiro,
    imagem: null,
  }
  const consulta = refeita
    ? banco.from('pecas').update({
      ...linha, pedido, refeitas: refeita.refeitas + 1, escolhida: null,
      versoes: [...(refeita.versoes || []), { pedido: refeita.pedido, roteiro: refeita.roteiro }],
    }).eq('id', refeita.id)
    : banco.from('pecas').insert({ ...linha, negocio: negocio.id, pedido, fotos, cortesia: boasVindas })
  const { data: peca, error } = await consulta.select('*').single()
  if (error) { console.error('banco', error); return erro('Não deu para guardar o post. Tente de novo.', 500) }
  return resposta({ peca, refeitasRestantes: MAX_REFEITAS - peca.refeitas })
})

// Gera as 3 peças de teste com as regras que o dono ainda está conferindo (não salvas).
// Não grava nada e não conta no limite: a peça só aparece na tela da entrevista.
async function calibrar(banco: ReturnType<typeof createClient>, negocioId: string, corpo: { regras?: string[]; carro_chefe?: string }) {
  const regras = (corpo.regras || []).map((r) => String(r).trim().slice(0, 300)).filter(Boolean).slice(0, 20)
  if (!regras.length) return erro('Monte o guia antes de testar.', 400)
  const { data: perfil } = await banco.from('perfis_marca').select('versao, identidade, voz, padrao, dados')
    .eq('negocio', negocioId).order('versao', { ascending: false }).limit(1).maybeSingle()
  if (!perfil) return erro('Conte a sua marca antes de testar o guia.', 409)
  const comGuia = { ...perfil, voz: { ...perfil.voz, guia: { regras } } }

  const chave = Deno.env.get('ANTHROPIC_API_KEY')
  if (!chave) return erro('A IA ainda não foi ligada. Tente mais tarde.', 503)
  const ia = new Anthropic({ apiKey: chave, timeout: 90_000, maxRetries: 1 })

  const pedidos = pedidosDeCalibracao(String(corpo.carro_chefe || '').trim().slice(0, 80))
  try {
    // As 3 ao mesmo tempo, com as mesmas instruções (em cache) das peças de verdade.
    const pecas = await Promise.all(pedidos.map(async ({ formato, pedido }) => {
      const msg = await ia.messages.create({
        model: 'claude-haiku-5-5',
        max_tokens: 16000,
        // @ts-ignore: output_config.format ainda sem tipo nesta versão do SDK
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: ESQUEMA } },
        system: [{ type: 'text', text: INSTRUCOES, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: montarMensagem(comGuia, pedido, formato) }],
      })
      const texto = msg.content.find((b) => b.type === 'text')
      if (msg.stop_reason === 'refusal' || !texto || texto.type !== 'text') throw new Error('sem texto')
      const roteiro = conferir(JSON.parse(texto.text), comGuia, pedido, '', 0, false)
      return { formato, pedido, modelo: roteiro.modelo, roteiro }
    }))
    return resposta({ pecas })
  } catch (falha) {
    console.error('ia', falha)
    if (falha instanceof Anthropic.RateLimitError) return erro('Muita gente criando agora. Tente de novo em um minuto.', 503)
    return erro('A IA não respondeu agora. Tente de novo.', 502)
  }
}

// Recebe o pedido do cliente, junta com o perfil da marca e pede o roteiro à IA.
// A chave da IA fica só aqui (segredo ANTHROPIC_API_KEY). A peça é desenhada no aparelho.
import Anthropic from 'npm:@anthropic-ai/sdk@0.132.1'
import { createClient } from 'npm:@supabase/supabase-js@2.117.3'
import { conferir, ESQUEMA, INSTRUCOES, montarMensagem } from './conferir.ts'

const CABECALHOS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // O navegador guarda a checagem de CORS por um dia e não repete o OPTIONS a cada peça.
  'Access-Control-Max-Age': '86400',
}
const MAX_REFEITAS = 3

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CABECALHOS, 'Content-Type': 'application/json' } })
}
const erro = (mensagem: string, status: number) => resposta({ erro: mensagem }, status)

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

  let corpo: { pedido?: string; formato?: string; fotos?: string[]; refazer?: string; ajuste?: string }
  try { corpo = await req.json() } catch { return erro('Pedido inválido.', 400) }

  let pedido = String(corpo.pedido || '').trim()
  let formato = corpo.formato === 'story' ? 'story' : 'post'
  let fotos = (corpo.fotos || []).filter((f) => typeof f === 'string' && f.startsWith(`${negocio.id}/`)).slice(0, 4)
  let refeita: { id: string; pedido: string; refeitas: number; roteiro: Record<string, unknown>; versoes: { roteiro: Record<string, unknown> }[]; escolhida: number | null } | null = null
  const ajuste = String(corpo.ajuste || '').trim().slice(0, 300)

  // Perfil e (peça antiga ou contagem do mês) saem do banco ao mesmo tempo.
  const [{ data: perfil }, anterior] = await Promise.all([
    banco.from('perfis_marca').select('versao, identidade, voz, padrao, dados')
      .eq('negocio', negocio.id).order('versao', { ascending: false }).limit(1).maybeSingle(),
    corpo.refazer
      ? banco.from('pecas').select('id, pedido, formato, fotos, refeitas, roteiro, versoes, escolhida')
        .eq('id', corpo.refazer).eq('negocio', negocio.id).maybeSingle()
      : banco.from('pecas').select('id', { count: 'exact', head: true })
        .eq('negocio', negocio.id).gte('criado_em', inicioDoMes()),
  ])

  if (corpo.refazer) {
    const data = anterior.data as (NonNullable<typeof refeita> & { formato: string; fotos: string[] }) | null
    if (!data) return erro('Não achamos essa peça.', 404)
    if (data.refeitas >= MAX_REFEITAS) return erro(`Você já refez esta peça ${MAX_REFEITAS} vezes. Escreva um pedido novo.`, 429)
    refeita = data
    pedido = pedido || data.pedido
    formato = corpo.formato ? formato : data.formato
    fotos = data.fotos
  } else if ((anterior.count ?? 0) >= negocio.limite_pecas) {
    return erro(`Você usou as ${negocio.limite_pecas} peças deste mês.`, 429)
  }
  if (pedido.length < 3 || pedido.length > 600) return erro('Escreva o pedido com 3 a 600 letras.', 400)

  if (!perfil) return erro('Conte a sua marca antes de criar um post.', 409)

  const chave = Deno.env.get('ANTHROPIC_API_KEY')
  if (!chave) return erro('A IA ainda não foi ligada. Tente mais tarde.', 503)
  const ia = new Anthropic({ apiKey: chave, timeout: 90_000, maxRetries: 1 })

  let bruto: Record<string, unknown>
  try {
    // Post: Haiku 5.5, rápido e barato para texto curto. Story: Opus 5.5, com mais cuidado.
    // Esforço médio: no teste com a IA real o baixo saiu mais rápido, mas errou a voz da marca
    // e o tamanho do texto. O Brenno escolheu a qualidade (28/10). As instruções ficam em cache.
    // O Haiku 5.5 não tem fallback no servidor, então o pedido dele vai sem `fallbacks`.
    const pedidoIA = {
      max_tokens: 16000,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: ESQUEMA } },
      system: [{ type: 'text' as const, text: INSTRUCOES, cache_control: { type: 'ephemeral' as const } }],
      messages: [{ role: 'user' as const, content: montarMensagem(perfil, pedido, formato, refeita && (refeita.versoes?.[refeita.escolhida ?? -1]?.roteiro || refeita.roteiro), ajuste, fotos.length > 0) }],
    }
    const msg = formato === 'story'
      ? await ia.beta.messages.create({
        ...pedidoIA,
        model: 'claude-opus-5-5',
        betas: ['server-side-fallback-2026-07-01'],
        // @ts-ignore: campo novo da API, ainda sem tipo nesta versão do SDK
        fallbacks: 'default',
      })
      // @ts-ignore: output_config.format ainda sem tipo nesta versão do SDK
      : await ia.messages.create({ ...pedidoIA, model: 'claude-haiku-5-5' })
    if (msg.stop_reason === 'refusal') return erro('A IA não quis escrever esse pedido. Tente com outras palavras.', 422)
    const texto = msg.content.find((b) => b.type === 'text')
    if (!texto || texto.type !== 'text') throw new Error('sem texto')
    bruto = JSON.parse(texto.text)
  } catch (falha) {
    console.error('ia', falha)
    if (falha instanceof Anthropic.RateLimitError) return erro('Muita gente criando agora. Tente de novo em um minuto.', 503)
    return erro('A IA não respondeu agora. Tente de novo.', 502)
  }

  const roteiro = conferir(bruto, perfil, pedido)
  // Ajuste que a IA não consegue fazer (trocar foto, layout, fonte) volta igual; avisa em vez de parecer que nada aconteceu.
  const base = refeita && (refeita.versoes?.[refeita.escolhida ?? -1]?.roteiro || refeita.roteiro) as Record<string, unknown> | null
  const igual = (k: string) => JSON.stringify(base?.[k] ?? null) === JSON.stringify((roteiro as Record<string, unknown>)[k] ?? null)
  if (ajuste && base && ['modelo', 'titulo', 'apoio', 'chamada', 'legenda', 'pontos', 'arte', 'cores'].every(igual)) {
    roteiro.avisos.push('Esse ajuste não mudou nada. Por aqui a IA muda o texto, as cores, o layout e o destaque; trocar a foto ou a fonte ainda não dá.')
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
    : banco.from('pecas').insert({ ...linha, negocio: negocio.id, pedido, fotos })
  const { data: peca, error } = await consulta.select('*').single()
  if (error) { console.error('banco', error); return erro('Não deu para guardar a peça. Tente de novo.', 500) }
  return resposta({ peca, refeitasRestantes: MAX_REFEITAS - peca.refeitas })
})

// Publicar: posta sozinho no Instagram o que o dono agendou no Planner com "Publicar sozinho".
// Piloto só da Neon Scripts (tabela publicacao_direta). Não chama a IA.
// - "hora" (pg_cron, a cada 5 min, cabeçalho x-segredo): pega o que chegou na hora, cria o contêiner,
//   espera processar e publica. Vídeo que ainda processa fica para a próxima volta.
// - "teste" (login do dono): confere token e conta, sem publicar nada.
// Deploy: supabase functions deploy publicar --no-verify-jwt (a função confere o acesso por dentro).
// Token: Secret com o nome guardado em publicacao_direta.segredo (ex.: INSTAGRAM_TOKEN_NEON_SCRIPTS).
// Lógica da API igual à do ig.mjs (setup-instagram): token EAA = graph.facebook.com, não vence.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.117.3'

const CABECALHOS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-segredo',
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
const banco = createClient(Deno.env.get('SUPABASE_URL')!, chaveDeServico(), { auth: { persistSession: false } })
const SEGREDO = Deno.env.get('AVISAR_SEGREDO') || ''
const VERSAO = Deno.env.get('META_API_VERSION') || 'v24.0'
const ATRASO_MAXIMO_MIN = 120 // passou disso, não publica: o post perdeu a hora e vira erro
const MAX_TENTATIVAS = 4

// Aviso no celular com o resultado (mesmas chaves do avisar; sem chaves, só não avisa).
const VAPID_PUBLICA = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVADA = Deno.env.get('VAPID_PRIVATE_KEY') || ''
if (VAPID_PUBLICA && VAPID_PRIVADA) webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:neonposts@neonscripts.com.br', VAPID_PUBLICA, VAPID_PRIVADA)
async function avisar(negocio: string, titulo: string, corpo: string, url: string, tag: string) {
  if (!VAPID_PUBLICA || !VAPID_PRIVADA) return
  const { data } = await banco.from('assinaturas_push').select('endpoint, p256dh, auth').eq('negocio', negocio)
  await Promise.all((data || []).map((a) => webpush.sendNotification(
    { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
    JSON.stringify({ titulo, corpo, url, tag }), { TTL: 3600 },
  ).catch(() => {})))
}

type Item = {
  id: string; negocio: string; titulo: string; formato: 'post' | 'story'; quando: string; midia: string; legenda: string | null
  publicacao_estado: 'agendado' | 'processando'; container_id: string | null; tentativas: number; conta_id: string; segredo: string
}

// Erros da Meta em português, com o que fazer (mesmas dicas do ig.mjs).
function explicar(e: { message?: string; code?: number; error_subcode?: number }) {
  const c = e.code, s = e.error_subcode
  const dica =
    c === 190 ? 'Token inválido. Gere outro no painel da Meta e troque o Secret.' :
    c === 10 || c === 200 ? 'Falta permissão de publicar no token.' :
    c === 4 || c === 9 || s === 2207042 ? 'Limite de publicações da Meta atingido. Tente amanhã.' :
    c === 9004 || s === 2207052 ? 'O Instagram não conseguiu baixar o arquivo.' :
    s === 2207026 ? 'Formato de vídeo não aceito (precisa MP4 H.264).' :
    s === 2207009 ? 'Proporção da imagem fora do aceito.' : ''
  return `${dica ? dica + ' ' : ''}(${e.message || 'erro'}; código ${c}${s ? '/' + s : ''})`
}
class ErroMeta extends Error { definitivo: boolean; constructor(m: string, definitivo: boolean) { super(m); this.definitivo = definitivo } }

function meta(token: string) {
  const api = token.startsWith('EAA') ? `https://graph.facebook.com/${VERSAO}` : `https://graph.instagram.com/${VERSAO}`
  return async (metodo: 'GET' | 'POST', caminho: string, campos: Record<string, string> = {}) => {
    const q = new URLSearchParams({ ...campos, access_token: token })
    const r = metodo === 'GET' ? await fetch(`${api}${caminho}?${q}`) : await fetch(api + caminho, { method: 'POST', body: q })
    const j = await r.json().catch(() => ({ error: { message: `resposta ${r.status} sem JSON` } }))
    if (j.error) {
      // Token, permissão e formato não melhoram tentando de novo; o resto (rede, limite) pode.
      const definitivo = [190, 10, 200, 100].includes(j.error.code) || [2207026, 2207009].includes(j.error.error_subcode)
      throw new ErroMeta(explicar(j.error), definitivo)
    }
    return j
  }
}

const ehVideo = (midia: string) => /\.mp4$/i.test(midia)
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function marcar(id: string, campos: Record<string, unknown>) {
  await banco.from('agenda').update({ publicando_em: null, ...campos }).eq('id', id)
}

// Uma marcação: cria o contêiner (se ainda não tem), confere o processamento e publica.
async function publicarItem(item: Item) {
  const token = Deno.env.get(item.segredo) || ''
  if (!token) return marcar(item.id, { publicacao_estado: 'erro', publicacao_erro: 'Token do Instagram não configurado.' })
  const chamar = meta(token)
  const video = ehVideo(item.midia)

  if (item.publicacao_estado === 'agendado' && Date.now() - new Date(item.quando).getTime() > ATRASO_MAXIMO_MIN * 60000) {
    return marcar(item.id, { publicacao_estado: 'erro', publicacao_erro: 'Passou da hora e não saiu. Poste à mão ou marque outro horário.' })
  }

  try {
    let container = item.container_id
    if (!container) {
      const { data: link, error } = await banco.storage.from('publicar').createSignedUrl(item.midia, 60 * 60)
      if (error || !link) throw new ErroMeta('Arquivo do post não encontrado.', true)
      const campos: Record<string, string> = item.formato === 'story'
        ? { media_type: 'STORIES', [video ? 'video_url' : 'image_url']: link.signedUrl }
        : video
          ? { media_type: 'REELS', video_url: link.signedUrl, caption: item.legenda || '', share_to_feed: 'true' }
          : { image_url: link.signedUrl, caption: item.legenda || '' }
      container = (await chamar('POST', `/${item.conta_id}/media`, campos)).id as string
      await banco.from('agenda').update({ container_id: container, publicacao_estado: 'processando' }).eq('id', item.id)
    }

    // Imagem processa em segundos; vídeo pode passar de minutos e volta na próxima rodada.
    let pronto = false
    for (let i = 0; i < (video ? 6 : 12); i++) {
      const s = await chamar('GET', `/${container}`, { fields: 'status_code,status' })
      if (s.status_code === 'FINISHED') { pronto = true; break }
      if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new ErroMeta(`O Instagram recusou o arquivo: ${s.status || s.status_code}`, true)
      await espera(5000)
    }
    if (!pronto) {
      if (item.tentativas >= MAX_TENTATIVAS + 4) throw new ErroMeta('O Instagram demorou demais para processar.', true)
      return marcar(item.id, { publicacao_estado: 'processando' })
    }

    const pub = await chamar('POST', `/${item.conta_id}/media_publish`, { creation_id: container })
    const info = await chamar('GET', `/${pub.id}`, { fields: 'permalink' }).catch(() => ({}))
    await marcar(item.id, {
      publicacao_estado: 'publicado', publicacao_erro: null, publicado_id: String(pub.id),
      permalink: (info as { permalink?: string }).permalink || null, postado_em: new Date().toISOString(),
    })
    await avisar(item.negocio, `Saiu no Instagram: ${item.titulo}`, 'Toque para ver no Planner.', `./?agenda=${item.id}`, `publicado-${item.id}`)
    // O arquivo já foi para o Instagram: não precisa mais ficar guardado.
    await banco.storage.from('publicar').remove([item.midia]).catch(() => {})
  } catch (e) {
    const definitivo = e instanceof ErroMeta ? e.definitivo : false
    const mensagem = e instanceof Error ? e.message : String(e)
    if (!definitivo && item.tentativas < MAX_TENTATIVAS) {
      // Falha passageira: tenta de novo na próxima volta, com o mesmo contêiner se já existe.
      return marcar(item.id, { publicacao_erro: mensagem })
    }
    await marcar(item.id, { publicacao_estado: 'erro', publicacao_erro: mensagem })
    await avisar(item.negocio, `Não saiu no Instagram: ${item.titulo}`, 'Toque para ver o motivo e postar à mão.', `./?agenda=${item.id}`, `erro-${item.id}`)
  }
}

async function hora() {
  const { data, error } = await banco.rpc('pegar_publicacoes')
  if (error) return erro(error.message, 500)
  const itens = (data || []) as Item[]
  // Um por vez: a Meta não gosta de rajada na mesma conta.
  for (const item of itens) await publicarItem(item)
  return resposta({ itens: itens.length })
}

// Confere se o token e a conta respondem. Não publica nada.
async function teste(negocio: string) {
  const { data: d } = await banco.from('publicacao_direta').select('conta_id, segredo, ligado').eq('negocio', negocio).maybeSingle()
  if (!d) return erro('Esta marca ainda não publica direto.', 404)
  const token = Deno.env.get(d.segredo) || ''
  if (!token) return resposta({ ok: false, motivo: 'Token do Instagram não configurado.' })
  const chamar = meta(token)
  try {
    const conta = await chamar('GET', `/${d.conta_id}`, { fields: 'id,username' })
    const uso = await chamar('GET', `/${d.conta_id}/content_publishing_limit`, { fields: 'quota_usage,config' }).catch(() => null)
    const u = uso?.data?.[0]
    return resposta({ ok: true, conta: conta.username, ligado: d.ligado, uso: u ? `${u.quota_usage} de ${u.config?.quota_total ?? '?'} nas últimas 24h` : null })
  } catch (e) {
    return resposta({ ok: false, motivo: e instanceof Error ? e.message : String(e) })
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS })
  if (req.method !== 'POST') return erro('Método não permitido.', 405)
  let corpo: { acao?: string } = {}
  try { corpo = await req.json() } catch { /* sem corpo */ }
  const acao = corpo.acao || 'hora'

  if (acao === 'hora') {
    if (!SEGREDO || req.headers.get('x-segredo') !== SEGREDO) return erro('Sem permissão.', 401)
    return hora()
  }

  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  const { data: conta } = await banco.auth.getUser(token)
  if (!conta?.user) return erro('Entre de novo para continuar.', 401)
  const { data: negocio } = await banco.from('negocios').select('id').eq('dono', conta.user.id).single()
  if (!negocio) return erro('Não achamos o seu negócio.', 404)

  if (acao === 'teste') return teste(negocio.id)
  return erro('Ação desconhecida.', 400)
})

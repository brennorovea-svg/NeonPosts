// Avisar: push para o celular com o app fechado. Não chama a IA.
// - "hora" (pg_cron, a cada minuto, com o cabeçalho x-segredo): manda o aviso de quem chegou na hora
//   de postar e a lembrança da véspera de quem ainda não criou o post; marca avisado_em / lembrado_vespera_em.
// - "celular" (login da pessoa): manda o post pronto para os celulares dela ("Mandar para o celular").
// - "teste" (login da pessoa): um aviso para conferir que está ligado.
// - "chave" (sem login): a chave pública VAPID, que o navegador precisa para assinar.
// Deploy: supabase functions deploy avisar --no-verify-jwt (a função confere o login por dentro).
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

const VAPID_PUBLICA = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVADA = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_ASSUNTO = Deno.env.get('VAPID_SUBJECT') || 'mailto:neonposts@neonscripts.com.br'
const SEGREDO = Deno.env.get('AVISAR_SEGREDO') || ''
if (VAPID_PUBLICA && VAPID_PRIVADA) webpush.setVapidDetails(VAPID_ASSUNTO, VAPID_PUBLICA, VAPID_PRIVADA)

const horaDe = (quando: string) => new Date(quando).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

type Assinatura = { id: string; negocio: string; endpoint: string; p256dh: string; auth: string }
type Aviso = { titulo: string; corpo: string; url: string; tag: string }

// Manda o mesmo aviso para todas as assinaturas; apaga as que a rede diz que morreram (404/410).
async function enviar(assinaturas: Assinatura[], aviso: Aviso) {
  let enviados = 0
  const mortas: string[] = []
  await Promise.all(assinaturas.map(async (a) => {
    try {
      await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, JSON.stringify(aviso), { TTL: 3600, urgency: 'high' })
      enviados += 1
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) mortas.push(a.id)
    }
  }))
  if (mortas.length) await banco.from('assinaturas_push').delete().in('id', mortas)
  const vivas = assinaturas.filter((a) => !mortas.includes(a.id)).map((a) => a.id)
  if (vivas.length) await banco.from('assinaturas_push').update({ usado_em: new Date().toISOString() }).in('id', vivas)
  return enviados
}

async function assinaturasDe(negocios: string[]) {
  if (!negocios.length) return [] as Assinatura[]
  const { data } = await banco.from('assinaturas_push').select('id, negocio, endpoint, p256dh, auth').in('negocio', negocios)
  return (data || []) as Assinatura[]
}

// Chegou a hora: um aviso por marcação, só para quem tem celular com avisos ligados.
async function hora() {
  const { data, error } = await banco.rpc('avisos_pendentes')
  if (error) return erro(error.message, 500)
  const pendentes = (data || []) as { tipo: string; id: string; negocio: string; titulo: string; rede: string | null; formato: string; quando: string; peca: string | null }[]
  const assinaturas = await assinaturasDe([...new Set(pendentes.map((p) => p.negocio))])
  let enviados = 0
  const agora = new Date().toISOString()
  for (const p of pendentes) {
    const minhas = assinaturas.filter((a) => a.negocio === p.negocio)
    // Marca como avisado mesmo sem celular, para o app aberto não avisar duas vezes e para não repetir amanhã.
    if (minhas.length) {
      enviados += await enviar(minhas, p.tipo === 'hora'
        ? { titulo: `Hora de postar: ${p.titulo}`, corpo: `${p.formato === 'story' ? 'Story' : 'Post'} às ${horaDe(p.quando)}. Toque para abrir e postar.`, url: `./?agenda=${p.id}`, tag: `agenda-${p.id}` }
        : { titulo: `Amanhã tem ${p.titulo}`, corpo: 'O post ainda não existe. Toque para criar agora.', url: `./?agenda=${p.id}`, tag: `criar-${p.id}` })
      await banco.from('agenda').update(p.tipo === 'hora' ? { avisado_em: agora } : { lembrado_vespera_em: agora }).eq('id', p.id)
    } else if (p.tipo === 'vespera') {
      await banco.from('agenda').update({ lembrado_vespera_em: agora }).eq('id', p.id)
    }
  }
  return resposta({ pendentes: pendentes.length, enviados })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS })
  if (req.method !== 'POST') return erro('Método não permitido.', 405)
  if (!VAPID_PUBLICA || !VAPID_PRIVADA) return erro('Avisos ainda não configurados.', 503)

  let corpo: { acao?: string; peca?: string; agenda?: string } = {}
  try { corpo = await req.json() } catch { /* sem corpo */ }
  const acao = corpo.acao || 'hora'

  if (acao === 'chave') return resposta({ chave: VAPID_PUBLICA })

  if (acao === 'hora') {
    if (!SEGREDO || req.headers.get('x-segredo') !== SEGREDO) return erro('Sem permissão.', 401)
    return hora()
  }

  // As outras ações são da pessoa logada.
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  const { data: conta } = await banco.auth.getUser(token)
  if (!conta?.user) return erro('Entre de novo para continuar.', 401)
  const { data: negocio } = await banco.from('negocios').select('id').eq('dono', conta.user.id).single()
  if (!negocio) return erro('Não achamos o seu negócio.', 404)
  const assinaturas = await assinaturasDe([negocio.id])
  if (!assinaturas.length) return resposta({ enviados: 0, celulares: 0 })

  if (acao === 'teste') {
    const enviados = await enviar(assinaturas, { titulo: 'Avisos ligados', corpo: 'Na hora de postar, a gente avisa aqui.', url: './', tag: 'teste' })
    return resposta({ enviados, celulares: assinaturas.length })
  }

  if (acao === 'celular') {
    let aviso: Aviso | null = null
    if (corpo.agenda) {
      const { data: item } = await banco.from('agenda').select('id, titulo').eq('id', corpo.agenda).eq('negocio', negocio.id).maybeSingle()
      if (item) aviso = { titulo: `Pronto para postar: ${item.titulo}`, corpo: 'Toque para abrir e postar pelo celular.', url: `./?agenda=${item.id}`, tag: `celular-${item.id}` }
    } else if (corpo.peca) {
      const { data: peca } = await banco.from('pecas').select('id, roteiro').eq('id', corpo.peca).eq('negocio', negocio.id).maybeSingle()
      if (peca) aviso = { titulo: `Pronto para postar: ${(peca.roteiro as { titulo?: string })?.titulo || 'seu post'}`, corpo: 'Toque para abrir e postar pelo celular.', url: `./?peca=${peca.id}`, tag: `celular-${peca.id}` }
    }
    if (!aviso) return erro('Não achamos esse post.', 404)
    const enviados = await enviar(assinaturas, aviso)
    return resposta({ enviados, celulares: assinaturas.length })
  }

  return erro('Ação desconhecida.', 400)
})

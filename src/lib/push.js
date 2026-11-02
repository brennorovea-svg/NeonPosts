// Aviso com o app fechado (Web Push). O aparelho assina com a chave pública da função `avisar`,
// a assinatura fica em assinaturas_push (só o dono mexe), e o servidor manda o push na hora.
// Funciona no Android (Chrome) e no iPhone (iOS 16.4+, com o app instalado na tela inicial).
import { supabase } from './supabase.js'
import { modoDeTeste } from './perfil.js'

export const pushDisponivel = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && Boolean(supabase)

// App instalado na tela inicial (ou aberto como app no computador).
export const instalado = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
export const ehIphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

let registro = null
export async function registrarSW() {
  if (!('serviceWorker' in navigator)) return null
  registro ??= navigator.serviceWorker.register('./sw.js').catch(() => null)
  return registro
}

function chaveEmBytes(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const texto = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(texto, (c) => c.charCodeAt(0))
}

let chaveGuardada = null
async function chavePublica() {
  if (chaveGuardada) return chaveGuardada
  const { data, error } = await supabase.functions.invoke('avisar', { body: { acao: 'chave' } })
  if (error || !data?.chave) throw new Error('Os avisos ainda não estão configurados no servidor.')
  chaveGuardada = data.chave
  return chaveGuardada
}

async function guardar(negocioId, assinatura) {
  const json = assinatura.toJSON()
  const { error } = await supabase.from('assinaturas_push').upsert(
    { negocio: negocioId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, aparelho: navigator.userAgent.slice(0, 160) },
    { onConflict: 'endpoint' },
  )
  if (error) throw error
}

// Pede a permissão (tem de vir de um toque), assina e guarda. Devolve true quando ligou.
export async function ligarAvisos(negocioId) {
  if (!pushDisponivel() || modoDeTeste()) return false
  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') return false
  const reg = await registrarSW()
  if (!reg) return false
  const chave = await chavePublica()
  const assinatura = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveEmBytes(chave) }))
  await guardar(negocioId, assinatura)
  return true
}

// Ao abrir o app: se este aparelho já assinou, confirma a linha no banco (ela pode ter sido apagada).
export async function conferirAvisos(negocioId) {
  if (!pushDisponivel() || modoDeTeste() || Notification.permission !== 'granted') return false
  try {
    const reg = await registrarSW()
    const assinatura = await reg?.pushManager.getSubscription()
    if (!assinatura) return false
    await guardar(negocioId, assinatura)
    return true
  } catch { return false }
}

// "Mandar para o celular": o servidor avisa os celulares desta conta com o post pronto.
// Devolve quantos celulares receberam (0 = nenhum com avisos ligados).
export async function mandarParaCelular({ peca = null, agenda = null }) {
  if (!supabase || modoDeTeste()) return 0
  const { data, error } = await supabase.functions.invoke('avisar', { body: { acao: 'celular', peca, agenda } })
  if (error) throw new Error('Não deu para mandar agora. Tente de novo.')
  return data?.enviados ?? 0
}

// O app aberto recebe o toque no aviso (service worker) e abre o que o endereço pede.
export function ouvirAvisos(aoAbrir) {
  if (!('serviceWorker' in navigator)) return () => {}
  const ouvinte = (e) => { if (e.data?.tipo === 'abrir' && e.data.url) aoAbrir(new URL(e.data.url).searchParams) }
  navigator.serviceWorker.addEventListener('message', ouvinte)
  return () => navigator.serviceWorker.removeEventListener('message', ouvinte)
}

// Parâmetros ?agenda= e ?peca= (do aviso), lidos uma vez e tirados do endereço.
export function pedidoDoEndereco() {
  const parametros = new URLSearchParams(location.search)
  const agenda = parametros.get('agenda')
  const peca = parametros.get('peca')
  if (!agenda && !peca) return null
  parametros.delete('agenda'); parametros.delete('peca')
  const resto = parametros.toString()
  history.replaceState(null, '', location.pathname + (resto ? `?${resto}` : ''))
  return { agenda, peca }
}

// Convite para instalar (Android/Chrome avisa quando dá; o iPhone é pelo menu Compartilhar).
let pedidoDeInstalar = null
const ouvintesDeInstalar = new Set()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pedidoDeInstalar = e; ouvintesDeInstalar.forEach((f) => f(true)) })
  window.addEventListener('appinstalled', () => { pedidoDeInstalar = null; ouvintesDeInstalar.forEach((f) => f(false)) })
}
export const podeInstalar = () => Boolean(pedidoDeInstalar)
export function aoMudarInstalar(f) { ouvintesDeInstalar.add(f); return () => ouvintesDeInstalar.delete(f) }
export async function instalar() {
  if (!pedidoDeInstalar) return false
  pedidoDeInstalar.prompt()
  const { outcome } = await pedidoDeInstalar.userChoice
  pedidoDeInstalar = null
  return outcome === 'accepted'
}

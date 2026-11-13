import { supabase } from './supabase.js'
import { modoDeTeste } from './perfil.js'
import { mudarAgenda } from './agenda.js'

// Publicar sozinho no Instagram (piloto da Neon Scripts, migração 0020).
// O dono toca em "Publicar sozinho" num post pronto do Planner: o app sobe o arquivo final
// (JPEG, que o Instagram exige no lugar do PNG, ou MP4) e liga a marcação. A função `publicar`
// posta na hora marcada. Só aparece para marca ligada na tabela publicacao_direta.

// A marca publica direto? Devolve { conta_nome } ou null. Sem a migração, também null.
export async function contaDireta(negocioId) {
  // No modo de teste, `&direto=1` na URL mostra a opção para conferir a tela.
  if (modoDeTeste()) return new URLSearchParams(location.search).has('direto') ? { conta_nome: 'neon.scripts', ligado: true } : null
  if (!negocioId) return null
  const { data, error } = await supabase.from('publicacao_direta').select('conta_nome, ligado').eq('negocio', negocioId).maybeSingle()
  if (error || !data?.ligado) return null
  return data
}

// Marcador que a IA deixou sem dado ([SEU PREÇO], [HORÁRIO]...): não pode ir assim para o ar.
export const temMarcador = (texto) => /\[[A-ZÀ-Ú0-9 ]{3,}\]/.test(texto || '')

// PNG desenhado -> JPEG no mesmo tamanho (fundo preto onde houver transparência).
async function paraJpeg(arquivo) {
  const bitmap = await createImageBitmap(arquivo)
  const tela = document.createElement('canvas')
  tela.width = bitmap.width
  tela.height = bitmap.height
  const ctx = tela.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, tela.width, tela.height)
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close?.()
  return new Promise((ok, falhou) => tela.toBlob((b) => (b ? ok(b) : falhou(new Error('jpeg'))), 'image/jpeg', 0.92))
}

// Erros que a tela mostra com texto próprio.
export class NaoDaParaPublicar extends Error {}

export async function agendarNoInstagram(negocioId, item, arquivo, legenda) {
  if (temMarcador(legenda)) throw new NaoDaParaPublicar('A legenda ainda tem um dado para preencher. Abra o post e complete antes.')
  if (legenda.length > 2200) throw new NaoDaParaPublicar('A legenda passou de 2.200 caracteres, o limite do Instagram.')
  const video = arquivo.type.startsWith('video/')
  if (video && !arquivo.type.startsWith('video/mp4')) throw new NaoDaParaPublicar('Este navegador gravou o vídeo num formato que o Instagram não aceita. Agende pelo computador (Chrome).')
  if (modoDeTeste()) return mudarAgenda(item.id, { publicar: true, legenda, publicacao_estado: 'agendado' })
  const corpo = video ? arquivo : await paraJpeg(arquivo)
  const caminho = `${negocioId}/${item.id}-${Date.now()}.${video ? 'mp4' : 'jpg'}`
  const { error } = await supabase.storage.from('publicar').upload(caminho, corpo, { contentType: video ? 'video/mp4' : 'image/jpeg' })
  if (error) throw error
  if (item.midia) await supabase.storage.from('publicar').remove([item.midia])
  return mudarPublicacao(item.id, {
    publicar: true, midia: caminho, legenda, publicacao_estado: 'agendado',
    publicacao_erro: null, container_id: null, tentativas: 0, publicando_em: null,
  })
}

export async function cancelarNoInstagram(item) {
  if (modoDeTeste()) return mudarAgenda(item.id, { publicar: false, publicacao_estado: null })
  if (item.midia) await supabase.storage.from('publicar').remove([item.midia])
  return mudarPublicacao(item.id, { publicar: false, midia: null, publicacao_estado: null, publicacao_erro: null, container_id: null })
}

async function mudarPublicacao(id, campos) {
  const { data, error } = await supabase.from('agenda').update(campos).eq('id', id).select('id').single()
  if (error) throw error
  return data
}

// Confere token e conta sem publicar nada (tela Redes).
export async function testarConta() {
  const { data, error } = await supabase.functions.invoke('publicar', { body: { acao: 'teste' } })
  if (error) throw error
  return data
}

import { supabase } from './supabase.js'
import { modoDeTeste } from './perfil.js'

// Bloco 10: imagem com IA (Nano Banana), só no plano Pro. Quem confere o plano e o limite é a função
// gerar-imagem e a migração 0020; se mudar o número lá, mudar aqui.
export const IMAGENS_POR_MES = 30
export const MAX_REFERENCIAS = 3

function paraArquivo(base64, tipo) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const extensao = tipo === 'image/jpeg' ? 'jpg' : tipo === 'image/webp' ? 'webp' : 'png'
  return new File([bytes], `imagem-ia-${Date.now()}.${extensao}`, { type: tipo })
}

// Modo de teste: uma imagem desenhada no aparelho, sem chamar a IA (nada de custo).
async function imagemDeTeste(formato, pedido) {
  await new Promise((ok) => setTimeout(ok, 2500))
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = formato === 'story' ? 1920 : 1350
  const ctx = canvas.getContext('2d')
  const fundo = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  fundo.addColorStop(0, '#3B2A1E')
  fundo.addColorStop(1, '#C8922A')
  ctx.fillStyle = fundo
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = 'rgba(243, 233, 216, .9)'
  ctx.beginPath()
  ctx.ellipse(canvas.width / 2, canvas.height * 0.62, 340, 200, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(16, 16, 20, .55)'
  ctx.font = '500 36px system-ui, sans-serif'
  ctx.fillText(`Imagem de teste: ${String(pedido || 'cena da marca').slice(0, 40)}`, 60, canvas.height - 80)
  const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/png'))
  return new File([blob], `imagem-ia-${Date.now()}.png`, { type: 'image/png' })
}

let usadasNoTeste = 0

// Devolve { arquivo: File, usadas, limite }. A imagem só vira foto do post quando a pessoa escolhe usar.
export async function criarImagemIa({ pedido, formato, referencias = [] }) {
  if (modoDeTeste()) {
    if (/erro/i.test(pedido || '')) { await new Promise((ok) => setTimeout(ok, 1200)); throw new Error('A IA não quis criar essa imagem. Tente descrever a cena com outras palavras.') }
    const arquivo = await imagemDeTeste(formato, pedido)
    usadasNoTeste += 1
    return { arquivo, usadas: usadasNoTeste, limite: IMAGENS_POR_MES }
  }
  const { data, error } = await supabase.functions.invoke('gerar-imagem', { body: { pedido, formato, referencias: referencias.slice(0, MAX_REFERENCIAS) } })
  if (error) {
    let mensagem = 'Não deu para criar a imagem agora. Tente de novo.'
    try { mensagem = (await error.context.json()).erro || mensagem } catch { /* resposta sem corpo */ }
    throw new Error(mensagem)
  }
  return { arquivo: paraArquivo(data.imagem, data.tipo), usadas: data.usadas, limite: data.limite }
}

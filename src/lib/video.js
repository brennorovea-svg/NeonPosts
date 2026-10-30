// Story em vídeo: a mesma arte, desenhada quadro a quadro com o relógio do desenhar().
// Gravado no próprio aparelho com MediaRecorder, sem som. MP4 quando o aparelho grava MP4;
// senão WebM (o app avisa, porque o Instagram nem sempre aceita).
import { desenhar, duracaoDasCenas } from './desenhar.js'

export const DURACAO = 10
// O vídeo em cenas dura conforme o número de cenas (cerca de 12 a 17 s).
export const duracaoDe = (opcoes) => (opcoes.modelo === 'cenas' ? duracaoDasCenas(opcoes.roteiro) : DURACAO)

const TIPOS = [
  ['video/mp4;codecs=avc1.42E01E', 'mp4'],
  ['video/mp4;codecs=avc1', 'mp4'],
  ['video/mp4', 'mp4'],
  ['video/webm;codecs=vp9', 'webm'],
  ['video/webm;codecs=vp8', 'webm'],
  ['video/webm', 'webm'],
]

export function formatoDoVideo() {
  if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) return null
  const achado = TIPOS.find(([tipo]) => MediaRecorder.isTypeSupported(tipo))
  return achado ? { tipo: achado[0], extensao: achado[1] } : null
}

// Toca a animação em loop no canvas da prévia. Devolve a função que para.
export function tocar(canvas, opcoes) {
  let id
  const inicio = performance.now()
  const total = duracaoDe(opcoes)
  const quadro = (agora) => {
    const t = ((agora - inicio) / 1000) % total
    desenhar(canvas, { ...opcoes, tempo: t, total })
    id = requestAnimationFrame(quadro)
  }
  id = requestAnimationFrame(quadro)
  return () => cancelAnimationFrame(id)
}

// Grava os DURACAO segundos num canvas fora da tela. `aoAvancar` recebe de 0 a 1.
export function gravar(opcoes, nome, aoAvancar = () => {}) {
  const formato = formatoDoVideo()
  if (!formato) return Promise.reject(new Error('Este aparelho não grava vídeo pelo navegador. Tente no Chrome ou no Safari atualizado.'))
  const canvas = document.createElement('canvas')
  const total = duracaoDe(opcoes)
  desenhar(canvas, { ...opcoes, tempo: 0, total })
  const fluxo = canvas.captureStream(30)
  const gravador = new MediaRecorder(fluxo, { mimeType: formato.tipo, videoBitsPerSecond: 8_000_000 })
  const partes = []
  gravador.ondataavailable = (e) => { if (e.data.size) partes.push(e.data) }
  return new Promise((ok, falha) => {
    let id
    gravador.onerror = (e) => { cancelAnimationFrame(id); falha(e.error || new Error('Não deu para gravar o vídeo.')) }
    gravador.onstop = () => {
      fluxo.getTracks().forEach((t) => t.stop())
      const tipo = formato.tipo.split(';')[0]
      ok({ arquivo: new File(partes, `${nome}.${formato.extensao}`, { type: tipo }), extensao: formato.extensao })
    }
    gravador.start(250)
    const inicio = performance.now()
    const quadro = (agora) => {
      const t = (agora - inicio) / 1000
      desenhar(canvas, { ...opcoes, tempo: Math.min(t, total), total })
      aoAvancar(Math.min(1, t / total))
      if (t < total) id = requestAnimationFrame(quadro)
      else gravador.stop()
    }
    id = requestAnimationFrame(quadro)
  })
}

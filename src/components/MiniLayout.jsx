import { useEffect, useRef } from 'react'
import { desenhar, prepararFontes } from '../lib/desenhar.js'
import { duracaoDe } from '../lib/video.js'

// Miniatura leve de um layout: desenha em 1080 num canvas compartilhado e copia para um canvas pequeno.
// Só desenha quando aparece na tela. Animado mostra o quadro final, como a prévia do Criar.
// Usada em Meus layouts e no "Escolha 3" do Começar, onde aparecem dezenas de uma vez.
let quadro = null
const LARGURA = 360

export default function MiniLayout({ opcoes, animado = false }) {
  const canvas = useRef(null)
  useEffect(() => {
    const alvo = canvas.current
    if (!alvo) return
    let vivo = true
    const pintar = async () => {
      await prepararFontes(opcoes.fonte)
      if (!vivo) return
      quadro ??= document.createElement('canvas')
      if (animado) { const total = duracaoDe(opcoes); desenhar(quadro, { ...opcoes, tempo: total, total }) }
      else desenhar(quadro, opcoes)
      alvo.width = LARGURA
      alvo.height = Math.round(LARGURA * (quadro.height / quadro.width))
      alvo.getContext('2d').drawImage(quadro, 0, 0, alvo.width, alvo.height)
    }
    if (typeof IntersectionObserver === 'undefined') { pintar(); return () => { vivo = false } }
    const olho = new IntersectionObserver((entradas) => {
      if (entradas.some((e) => e.isIntersecting)) { olho.disconnect(); pintar() }
    }, { rootMargin: '300px 0px' })
    olho.observe(alvo)
    return () => { vivo = false; olho.disconnect() }
  }, [opcoes, animado])
  return <canvas ref={canvas} width={LARGURA} height={450} aria-hidden="true" />
}

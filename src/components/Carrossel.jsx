import { useEffect, useRef, useState } from 'react'
import './Carrossel.css'

// Fileira que rola para o lado. No celular, arrasta com o dedo; no computador, setas.
export default function Carrossel({ rotulo, className = '', children }) {
  const trilho = useRef(null)
  const [pontas, setPontas] = useState({ inicio: true, fim: true })

  useEffect(() => {
    const el = trilho.current
    if (!el) return
    const medir = () => setPontas({ inicio: el.scrollLeft < 8, fim: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 })
    medir()
    el.addEventListener('scroll', medir, { passive: true })
    const observar = new ResizeObserver(medir)
    observar.observe(el)
    return () => { el.removeEventListener('scroll', medir); observar.disconnect() }
  }, [])

  function andar(direcao) {
    const el = trilho.current
    const parado = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({ left: direcao * el.clientWidth * 0.8, behavior: parado ? 'auto' : 'smooth' })
  }

  return (
    <div className={`carrossel ${className}`}>
      <div className="carrossel__trilho" ref={trilho} role="group" aria-label={rotulo}>{children}</div>
      {!pontas.inicio && <button type="button" className="carrossel__seta carrossel__seta--antes" aria-label="Anteriores" onClick={() => andar(-1)}>‹</button>}
      {!pontas.fim && <button type="button" className="carrossel__seta carrossel__seta--depois" aria-label="Próximos" onClick={() => andar(1)}>›</button>}
    </div>
  )
}

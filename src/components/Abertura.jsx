import { useEffect, useState } from 'react'
import Obturador from './Obturador.jsx'
import './Abertura.css'

const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 4)

// Tempos do playbook: abre em 1s, clique de 0,36s em 1,25s com flash e faísca
// em 1,40s, nome sobe em 1,6s. Total 2,1s.
function quadro(t) {
  let o = ease(t / 1.0)
  if (t >= 1.25 && t < 1.61) {
    const q = (t - 1.25) / 0.36
    o = q < 0.4 ? 1 - (q / 0.4) * 0.9 : 0.1 + ease((q - 0.4) / 0.6) * 0.9
  }
  const ft = (t - 1.4) / 0.32
  const flash = ft < 0 || ft > 1 ? 0 : ft < 0.25 ? ft / 0.25 : 1 - ease((ft - 0.25) / 0.75)
  const kt = (t - 1.4) / 0.45
  const faisca = kt < 0 || kt > 1 ? 0 : kt < 0.3 ? kt / 0.3 : 1 - (kt - 0.3) / 0.7
  return { abertura: o, flash, faisca, escalaFaisca: 0.5 + 0.5 * ease(kt), nome: ease((t - 1.6) / 0.5) }
}

const PARADO = { abertura: 1, flash: 0, faisca: 0, escalaFaisca: 1, nome: 1 }
const FIM = 2.2

export default function Abertura({ onFim }) {
  const reduzido = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [q, setQ] = useState(reduzido ? PARADO : quadro(0))

  useEffect(() => {
    if (reduzido) {
      const t = setTimeout(() => onFim?.(), 900)
      return () => clearTimeout(t)
    }
    let id, espera
    const inicio = performance.now()
    const passo = (agora) => {
      const t = (agora - inicio) / 1000
      setQ(quadro(Math.min(t, FIM)))
      if (t < FIM) id = requestAnimationFrame(passo)
      else espera = setTimeout(() => onFim?.(), 500)
    }
    id = requestAnimationFrame(passo)
    return () => { cancelAnimationFrame(id); clearTimeout(espera) }
  }, [reduzido, onFim])

  const sobe = { opacity: q.nome, transform: `translateY(${(1 - q.nome) * 12}px)` }

  return (
    <main className="abertura">
      <Obturador abertura={q.abertura} flash={q.flash} faisca={q.faisca} escalaFaisca={q.escalaFaisca} tamanho={168} />
      <div className="abertura__texto" style={sobe}>
        <h1 className="abertura__nome">Neon<span>posts</span></h1>
        <p className="abertura__frase">Uma frase. Um post pronto. <span>Com a cara da sua marca.</span></p>
        <p className="abertura__assinatura">da Neon Scripts</p>
      </div>
    </main>
  )
}

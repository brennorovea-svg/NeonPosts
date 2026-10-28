import { useEffect, useState } from 'react'
import Obturador from '../components/Obturador.jsx'
import { PARTES } from './PerfilMarca.jsx'
import './ApresentacaoMarca.css'

const ease = (t) => 1 - Math.pow(1 - t, 3)

// Primeira vez configurando a marca: explica para que serve antes de começar.
// O obturador abre, as frases sobem e as 4 partes acendem uma a uma.
export default function ApresentacaoMarca({ onComecar, onDepois }) {
  const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [abertura, setAbertura] = useState(reduzido ? 1 : 0)

  useEffect(() => {
    if (reduzido) return
    let id
    const inicio = performance.now()
    const passo = (agora) => {
      const t = Math.min(1, (agora - inicio) / 1000)
      setAbertura(ease(t))
      if (t < 1) id = requestAnimationFrame(passo)
    }
    id = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(id)
  }, [reduzido])

  return (
    <main className="apresenta">
      <div className="apresenta__icone"><Obturador abertura={abertura} tamanho={88} /></div>

      <h1 className="apresenta__titulo">
        <span className="apresenta__linha" style={{ '--atraso': '700ms' }}>Para cuidar das suas redes, a gente precisa conhecer a sua marca melhor.</span>
        <span className="apresenta__linha apresenta__linha--lilas" style={{ '--atraso': '1000ms' }}>Só vai tomar 1 minutinho, e vai valer muito a pena.</span>
      </h1>

      <ol className="apresenta__partes" aria-label="O que a gente vai perguntar">
        {PARTES.map((p, i) => (
          <li key={p.chave} className="apresenta__parte" style={{ '--atraso': `${1400 + i * 220}ms` }}>
            <span className="mono apresenta__num">{p.numero}</span>
            <span>{p.titulo}</span>
          </li>
        ))}
      </ol>

      <p className="apresenta__nota apresenta__linha" style={{ '--atraso': '2400ms' }}>
        Configure 1 vez para nunca mais... a menos que queira algo novo, rsrs.
      </p>

      <div className="apresenta__acoes apresenta__linha" style={{ '--atraso': '2600ms' }}>
        <button type="button" className="botao botao--destaque" onClick={onComecar}>Bora começar</button>
        <button type="button" className="perfil__depois" onClick={onDepois}>Agora não</button>
      </div>
    </main>
  )
}

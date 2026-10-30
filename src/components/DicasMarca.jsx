import { useState } from 'react'
import { IMPACTO } from '../lib/dicas.js'
import './DicasMarca.css'

// Cartão da Área: onde mexer na marca para as peças saírem melhores.
const MOSTRAR = 3

export default function DicasMarca({ dicas, forca, onAbrir }) {
  const [todas, setTodas] = useState(false)
  if (!dicas.length) return null
  const vistas = todas ? dicas : dicas.slice(0, MOSTRAR)
  return (
    <section className="dicas" aria-labelledby="dicas-titulo">
      <div className="dicas__topo">
        <h2 id="dicas-titulo" className="dicas__titulo">Deixe os posts com mais a sua cara</h2>
        <span className="mono dicas__forca">{forca}% da marca</span>
      </div>
      <span className="dicas__barra" aria-hidden="true"><span style={{ transform: `scaleX(${forca / 100})` }} /></span>
      <p className="dicas__texto">
        {dicas.length === 1 ? 'Falta 1 coisa' : `Faltam ${dicas.length} coisas`} na sua marca. Comece pelas que mudam mais o resultado.
      </p>
      <ul className="dicas__lista">
        {vistas.map((d) => (
          <li key={d.id}>
            <button type="button" className="dicas__item" onClick={() => onAbrir(d)}>
              <span className={`mono dicas__peso dicas__peso--${d.peso}`}>{IMPACTO[d.peso]}</span>
              <span className="dicas__corpo">
                <strong>{d.titulo}</strong>
                <span>{d.porque}</span>
              </span>
              <span className="dicas__ir">Completar</span>
            </button>
          </li>
        ))}
      </ul>
      {dicas.length > MOSTRAR && (
        <button type="button" className="link-botao dicas__mais" onClick={() => setTodas(!todas)} aria-expanded={todas}>
          {todas ? 'Mostrar só as principais' : `Ver mais ${dicas.length - MOSTRAR}`}
        </button>
      )}
    </section>
  )
}

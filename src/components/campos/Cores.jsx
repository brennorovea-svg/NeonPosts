import { useEffect, useState } from 'react'
import { hexParaRgb, lerCor } from '../../lib/cores.js'

const NOMES = ['Principal', 'Apoio', 'Destaque']

function LinhaDeCor({ cor, indice, podeTirar, onTrocar, onTirar }) {
  const [texto, setTexto] = useState(cor)
  const [invalida, setInvalida] = useState(false)
  useEffect(() => { setTexto(cor); setInvalida(false) }, [cor])

  function confirmar() {
    const lida = lerCor(texto)
    if (lida) { onTrocar(lida); setTexto(lida); setInvalida(false) } else setInvalida(true)
  }

  return (
    <div className="cor">
      <label className="cor__amostra" style={{ background: cor }}>
        <input type="color" value={cor} onChange={(e) => onTrocar(e.target.value.toUpperCase())} aria-label={`Escolher a cor ${NOMES[indice].toLowerCase()}`} />
      </label>
      <div className="cor__info">
        <span className="cor__nome">{NOMES[indice]}</span>
        <input
          className="cor__codigo mono"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmar() } }}
          aria-label={`Código da cor ${NOMES[indice].toLowerCase()}, em HEX ou RGB`}
          aria-invalid={invalida}
          spellCheck={false}
        />
        <span className="cor__rgb mono">{invalida ? 'Use #FF2E9A ou 255, 46, 154' : `RGB ${hexParaRgb(cor).join(', ')}`}</span>
      </div>
      {podeTirar && <button type="button" className="cor__tirar" onClick={onTirar} aria-label={`Tirar a cor ${NOMES[indice].toLowerCase()}`}>×</button>}
    </div>
  )
}

// De 1 a 3 cores. Toque na amostra para o seletor do aparelho ou digite o código.
export default function Cores({ valor, onChange }) {
  return (
    <div className="cores">
      {valor.map((cor, i) => (
        <LinhaDeCor
          key={i}
          cor={cor}
          indice={i}
          podeTirar={valor.length > 1}
          onTrocar={(nova) => onChange(valor.map((c, j) => (j === i ? nova : c)))}
          onTirar={() => onChange(valor.filter((_, j) => j !== i))}
        />
      ))}
      {valor.length < 3 && (
        <button type="button" className="cor cor--nova" onClick={() => onChange([...valor, '#F5F5F7'])}>
          <span className="cor__amostra cor__amostra--vazia" aria-hidden="true">+</span>
          <span>Adicionar cor</span>
        </button>
      )}
    </div>
  )
}

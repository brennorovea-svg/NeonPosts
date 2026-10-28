import { useRef, useState } from 'react'
import { hexParaHsv, hsvParaHex } from '../../lib/cores.js'

const PALETA = ['#FF2E9A', '#E5484D', '#F76B15', '#FFC53D', '#46A758', '#12A594', '#40E6DC', '#2E8CFF', '#7B5CFF', '#A24BFF', '#1C1C23', '#F5F5F7']

const limitar = (v) => Math.min(1, Math.max(0, v))

// Arrasta com dedo ou mouse dentro de um elemento e devolve a posição de 0 a 1.
function useArrastar(aoMover) {
  const ref = useRef(null)
  function posicao(e) {
    const r = ref.current.getBoundingClientRect()
    aoMover(limitar((e.clientX - r.left) / r.width), limitar((e.clientY - r.top) / r.height))
  }
  const eventos = {
    onPointerDown: (e) => { ref.current.setPointerCapture(e.pointerId); posicao(e) },
    onPointerMove: (e) => { if (ref.current.hasPointerCapture(e.pointerId)) posicao(e) },
  }
  return [ref, eventos]
}

// Seletor no visual do app: área de tom, faixa de matiz e cores prontas.
export default function SeletorDeCor({ cor, onChange, onFechar }) {
  const [hsv, setHsv] = useState(() => hexParaHsv(cor))
  const fundo = hsvParaHex({ h: hsv.h, s: 1, v: 1 })

  function mudar(novo) {
    const proximo = { ...hsv, ...novo }
    setHsv(proximo)
    onChange(hsvParaHex(proximo))
  }

  const [refArea, arrastarArea] = useArrastar((x, y) => mudar({ s: x, v: 1 - y }))
  const [refMatiz, arrastarMatiz] = useArrastar((x) => mudar({ h: x * 359 }))

  function teclaArea(e) {
    const passo = e.shiftKey ? 0.1 : 0.02
    const mapa = { ArrowLeft: ['s', -passo], ArrowRight: ['s', passo], ArrowUp: ['v', passo], ArrowDown: ['v', -passo] }
    if (!mapa[e.key]) return
    e.preventDefault()
    const [k, d] = mapa[e.key]
    mudar({ [k]: limitar(hsv[k] + d) })
  }

  function teclaMatiz(e) {
    const d = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5 }[e.key]
    if (!d) return
    e.preventDefault()
    mudar({ h: (hsv.h + d + 360) % 360 })
  }

  return (
    <div className="seletor">
      <div
        ref={refArea}
        className="seletor__area"
        style={{ backgroundColor: fundo }}
        {...arrastarArea}
        role="slider"
        tabIndex={0}
        aria-label="Intensidade e brilho da cor"
        aria-valuetext={`Intensidade ${Math.round(hsv.s * 100)}%, brilho ${Math.round(hsv.v * 100)}%`}
        onKeyDown={teclaArea}
      >
        <span className="seletor__alca" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: cor }} />
      </div>
      <div
        ref={refMatiz}
        className="seletor__matiz"
        {...arrastarMatiz}
        role="slider"
        tabIndex={0}
        aria-label="Matiz"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        onKeyDown={teclaMatiz}
      >
        <span className="seletor__alca seletor__alca--matiz" style={{ left: `${(hsv.h / 359) * 100}%`, background: fundo }} />
      </div>
      <div className="seletor__paleta" role="group" aria-label="Cores prontas">
        {PALETA.map((c) => (
          <button
            key={c}
            type="button"
            className="seletor__pronta"
            style={{ background: c }}
            aria-label={c}
            aria-pressed={c === cor}
            onClick={() => { setHsv(hexParaHsv(c)); onChange(c) }}
          />
        ))}
      </div>
      <button type="button" className="botao botao--fantasma seletor__pronto" onClick={onFechar}>Pronto</button>
    </div>
  )
}

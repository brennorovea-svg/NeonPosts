// Íris de 6 lâminas. `abertura` vai de 0 (fechado) a 1 (aberto). Sem giro.
// Geometria do playbook: hexágono de raio 3 + 15·o, lâmina até o círculo R=34
// no ângulo k·60° + 75° − 15°·o.
export function iris(o) {
  const C = 60, R = 34, h = 3 + 15 * o
  const pts = []
  let d = ''
  for (let k = 0; k < 6; k++) {
    const a = (k * 60 * Math.PI) / 180
    const vx = C + h * Math.cos(a), vy = C + h * Math.sin(a)
    pts.push(`${vx.toFixed(2)},${vy.toFixed(2)}`)
    const b = ((k * 60 + 75 - 15 * o) * Math.PI) / 180
    d += `M${vx.toFixed(2)} ${vy.toFixed(2)}L${(C + R * Math.cos(b)).toFixed(2)} ${(C + R * Math.sin(b)).toFixed(2)}`
  }
  return { hex: pts.join(' '), d }
}

// As 6 fatias roxas entre as lâminas, cada uma num caminho próprio para acender sozinha.
export function fatiasDaIris(o) {
  const C = 60, R = 34, h = 3 + 15 * o
  const v = (k) => { const a = (k * 60 * Math.PI) / 180; return [C + h * Math.cos(a), C + h * Math.sin(a)] }
  const p = (k) => { const b = ((k * 60 + 75 - 15 * o) * Math.PI) / 180; return [C + R * Math.cos(b), C + R * Math.sin(b)] }
  const f = (n) => n.toFixed(2)
  return [0, 1, 2, 3, 4, 5].map((k) => {
    const [ax, ay] = v(k), [bx, by] = p(k), [cx, cy] = p(k + 1), [dx, dy] = v(k + 1)
    return `M${f(ax)} ${f(ay)}L${f(bx)} ${f(by)}A${R} ${R} 0 0 1 ${f(cx)} ${f(cy)}L${f(dx)} ${f(dy)}Z`
  })
}

// `fatias` (opcional): brilho de cada fatia, de 0 a 1. Sem ele, o disco fica inteiro aceso.
export default function Obturador({ abertura = 1, flash = 0, faisca = 0, escalaFaisca = 1, tamanho = 160, fatias = null }) {
  const { hex, d } = iris(abertura)
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 120 120" overflow="visible" aria-hidden="true">
      <defs>
        <radialGradient id="flash">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".35" stopColor="#FFFFFF" stopOpacity=".7" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      {fatias ? (
        <>
          <circle cx="60" cy="60" r="34" fill="var(--violeta)" opacity=".14" />
          {fatiasDaIris(abertura).map((caminho, k) => (
            <path
              key={k} d={caminho} fill="var(--violeta)" opacity={fatias[k]}
              style={{ transformOrigin: '60px 60px', transform: `scale(${0.9 + 0.1 * fatias[k]})` }}
            />
          ))}
        </>
      ) : (
        <circle cx="60" cy="60" r="34" fill="var(--violeta)" />
      )}
      <path d={d} stroke="var(--grafite)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <polygon points={hex} fill="var(--neve)" />
      <circle cx="60" cy="60" r="40" fill="url(#flash)" opacity={flash * 0.9} />
      <path
        d="M92 14 C93 23 95.5 25.5 104 27 C95.5 28.5 93 31 92 40 C91 31 88.5 28.5 80 27 C88.5 25.5 91 23 92 14 Z"
        fill="var(--neve)"
        opacity={faisca}
        style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: `scale(${escalaFaisca})` }}
      />
    </svg>
  )
}

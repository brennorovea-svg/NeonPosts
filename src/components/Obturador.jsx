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

export default function Obturador({ abertura = 1, flash = 0, faisca = 0, escalaFaisca = 1, tamanho = 160 }) {
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
      <circle cx="60" cy="60" r="34" fill="var(--violeta)" />
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

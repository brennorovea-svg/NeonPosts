// Número com botões − e + no visual do app (sem as setinhas do navegador).
export default function Contador({ valor, onChange, minimo = 0, maximo = 50, rotulo }) {
  const mudar = (n) => onChange(Math.min(maximo, Math.max(minimo, n)))
  return (
    <div className="contador" role="group" aria-label={rotulo}>
      <button type="button" className="contador__botao" onClick={() => mudar(valor - 1)} disabled={valor <= minimo} aria-label={`Menos ${rotulo.toLowerCase()}`}>−</button>
      <input
        className="contador__valor mono"
        value={valor}
        inputMode="numeric"
        onChange={(e) => mudar(Number(e.target.value.replace(/\D/g, '')) || 0)}
        aria-label={rotulo}
      />
      <button type="button" className="contador__botao" onClick={() => mudar(valor + 1)} disabled={valor >= maximo} aria-label={`Mais ${rotulo.toLowerCase()}`}>+</button>
    </div>
  )
}

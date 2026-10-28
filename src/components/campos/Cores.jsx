// De 1 a 3 cores da marca, com o seletor do próprio aparelho.
export default function Cores({ valor, onChange }) {
  function trocar(i, cor) { onChange(valor.map((c, j) => (j === i ? cor.toUpperCase() : c))) }
  return (
    <div className="cores">
      {valor.map((cor, i) => (
        <div key={i} className="cor">
          <label className="cor__amostra" style={{ background: cor }}>
            <input type="color" value={cor} onChange={(e) => trocar(i, e.target.value)} aria-label={`Cor ${i + 1}`} />
          </label>
          <span className="mono">{cor}</span>
          {valor.length > 1 && (
            <button type="button" className="cor__tirar" onClick={() => onChange(valor.filter((_, j) => j !== i))} aria-label={`Tirar a cor ${i + 1}`}>×</button>
          )}
        </div>
      ))}
      {valor.length < 3 && (
        <button type="button" className="cor cor--nova" onClick={() => onChange([...valor, '#F5F5F7'])}>
          <span className="cor__amostra cor__amostra--vazia">+</span>
          <span>Adicionar cor</span>
        </button>
      )}
    </div>
  )
}

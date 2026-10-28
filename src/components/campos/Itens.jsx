// Itens e preços que a IA pode citar. Preço em branco vira [SEU PREÇO] na peça.
export default function Itens({ valor, onChange }) {
  function mudar(i, campo, texto) { onChange(valor.map((item, j) => (j === i ? { ...item, [campo]: texto } : item))) }
  return (
    <div className="itens">
      {valor.map((item, i) => (
        <div key={i} className="item">
          <input value={item.nome} onChange={(e) => mudar(i, 'nome', e.target.value)} placeholder="Produto ou serviço" aria-label={`Item ${i + 1}`} />
          <input value={item.preco} onChange={(e) => mudar(i, 'preco', e.target.value)} placeholder="R$ 0,00" inputMode="decimal" aria-label={`Preço do item ${i + 1}`} className="item__preco" />
          <button type="button" className="item__tirar" onClick={() => onChange(valor.filter((_, j) => j !== i))} aria-label={`Tirar o item ${i + 1}`}>×</button>
        </div>
      ))}
      <button type="button" className="botao botao--fantasma" onClick={() => onChange([...valor, { nome: '', preco: '' }])}>
        Adicionar item
      </button>
    </div>
  )
}

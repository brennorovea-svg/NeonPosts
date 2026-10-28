import { useState } from 'react'

// Lista de opções em fichas. "varias" deixa marcar mais de uma; "outra" deixa escrever uma nova.
export default function Fichas({ opcoes, valor, onChange, varias = false, outra = false, rotulo }) {
  const [nova, setNova] = useState('')
  const marcadas = varias ? valor : [valor]
  const todas = [...opcoes, ...marcadas.filter((v) => v && !opcoes.includes(v))]

  function alternar(opcao) {
    if (!varias) return onChange(opcao === valor ? '' : opcao)
    onChange(valor.includes(opcao) ? valor.filter((v) => v !== opcao) : [...valor, opcao])
  }

  function adicionar(e) {
    e.preventDefault()
    const texto = nova.trim()
    if (!texto) return
    if (varias) { if (!valor.includes(texto)) onChange([...valor, texto]) } else onChange(texto)
    setNova('')
  }

  return (
    <div className="fichas" role="group" aria-label={rotulo}>
      {todas.map((opcao) => (
        <button
          key={opcao}
          type="button"
          className="ficha"
          aria-pressed={marcadas.includes(opcao)}
          onClick={() => alternar(opcao)}
        >
          {opcao}
        </button>
      ))}
      {outra && (
        <span className="ficha ficha--nova">
          <input
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && adicionar(e)}
            placeholder="Outro..."
            aria-label={`Adicionar outro: ${rotulo}`}
          />
          {nova.trim() && <button type="button" onClick={adicionar} aria-label="Adicionar">+</button>}
        </span>
      )}
    </div>
  )
}

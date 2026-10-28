import { useEffect, useState } from 'react'
import { enderecoDaImagem, enviarImagem } from '../../lib/perfil.js'

function Miniatura({ caminho, onTirar }) {
  const [src, setSrc] = useState(null)
  useEffect(() => { enderecoDaImagem(caminho).then(setSrc) }, [caminho])
  return (
    <div className="imagem">
      {src && <img src={src} alt="" />}
      <button type="button" className="imagem__tirar" onClick={onTirar} aria-label="Tirar esta imagem">×</button>
    </div>
  )
}

// Envia na hora para o storage privado e guarda só o caminho no perfil.
export default function Imagens({ negocioId, valor, onChange, maximo, tipo, texto, onArquivo }) {
  const lista = maximo === 1 ? (valor ? [valor] : []) : valor
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function escolher(e) {
    const arquivos = [...e.target.files].slice(0, maximo - lista.length)
    e.target.value = ''
    if (!arquivos.length) return
    setEnviando(true)
    setErro('')
    try {
      const novos = []
      for (const arquivo of arquivos) {
        if (arquivo.size > 10 * 1024 * 1024) throw new Error('grande')
        novos.push(await enviarImagem(negocioId, arquivo, tipo))
      }
      onChange(maximo === 1 ? novos[0] : [...lista, ...novos])
      onArquivo?.(arquivos[0])
    } catch (falha) {
      setErro(falha.message === 'grande' ? 'Essa imagem passa de 10 MB. Tente uma menor.' : 'Não deu para enviar agora. Tente de novo.')
    }
    setEnviando(false)
  }

  function tirar(caminho) { onChange(maximo === 1 ? null : lista.filter((c) => c !== caminho)) }

  return (
    <div>
      <div className="imagens">
        {lista.map((c) => <Miniatura key={c} caminho={c} onTirar={() => tirar(c)} />)}
        {lista.length < maximo && (
          <label className="imagem imagem--nova">
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" multiple={maximo > 1} onChange={escolher} disabled={enviando} />
            <span>{enviando ? 'Enviando...' : texto}</span>
          </label>
        )}
      </div>
      {erro && <p className="campo__erro" role="alert">{erro}</p>}
    </div>
  )
}

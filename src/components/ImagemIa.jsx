import { useEffect, useRef, useState } from 'react'
import Obturador from './Obturador.jsx'
import { enderecoDaImagem, enviarImagem } from '../lib/perfil.js'
import { criarImagemIa, IMAGENS_POR_MES, MAX_REFERENCIAS } from '../lib/imagemIa.js'
import './ImagemIa.css'

function Referencia({ caminho, marcada, onTrocar }) {
  const [src, setSrc] = useState(null)
  useEffect(() => { enderecoDaImagem(caminho).then(setSrc) }, [caminho])
  return (
    <button type="button" className="imagem-ia__ref" aria-pressed={marcada} onClick={onTrocar} aria-label={marcada ? 'Tirar das referências' : 'Usar como referência'}>
      {src && <img src={src} alt="" />}
      <span className="imagem-ia__marca" aria-hidden="true" />
    </button>
  )
}

// Íris abrindo e fechando enquanto a IA cria a imagem (some com prefers-reduced-motion).
function Esperando() {
  const [abertura, setAbertura] = useState(0.3)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    let quadro
    const inicio = performance.now()
    const passo = (t) => { setAbertura(0.3 + 0.6 * (0.5 - 0.5 * Math.cos((t - inicio) / 700))); quadro = requestAnimationFrame(passo) }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [])
  return <Obturador tamanho={72} abertura={abertura} />
}

// Bloco 10: só aparece no plano Pro. A imagem nasce com o pedido e as fotos da marca como referência,
// e só vira foto do post quando a pessoa toca em "Usar no post".
export default function ImagemIa({ negocioId, perfil, pedido, formato, onUsar }) {
  const fotosDaMarca = perfil.identidade.fotos || []
  const [aberto, setAberto] = useState(false)
  const [cena, setCena] = useState('')
  const [referencias, setReferencias] = useState(() => fotosDaMarca.slice(0, MAX_REFERENCIAS))
  const [estado, setEstado] = useState('pronto') // pronto | criando | criada | enviando
  const [resultado, setResultado] = useState(null) // { arquivo, url, usadas, limite }
  const [erro, setErro] = useState('')
  const painel = useRef(null)

  useEffect(() => () => { if (resultado?.url) URL.revokeObjectURL(resultado.url) }, [resultado])

  function abrir() {
    setCena(pedido.trim())
    setAberto(true)
    setErro('')
    requestAnimationFrame(() => painel.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  }

  function trocar(caminho) {
    setReferencias((r) => (r.includes(caminho) ? r.filter((c) => c !== caminho) : r.length < MAX_REFERENCIAS ? [...r, caminho] : r))
  }

  async function criar() {
    setEstado('criando')
    setErro('')
    try {
      const novo = await criarImagemIa({ pedido: cena.trim(), formato, referencias })
      setResultado({ ...novo, url: URL.createObjectURL(novo.arquivo) })
      setEstado('criada')
    } catch (falha) {
      setErro(falha.message)
      setEstado(resultado ? 'criada' : 'pronto')
    }
  }

  async function usar() {
    setEstado('enviando')
    setErro('')
    try {
      const caminho = await enviarImagem(negocioId, resultado.arquivo, 'peca-foto', { previa: true })
      onUsar(caminho)
      setAberto(false)
      setResultado(null)
      setEstado('pronto')
    } catch {
      setErro('Não deu para colocar a imagem no post. Tente de novo.')
      setEstado('criada')
    }
  }

  const restam = resultado ? Math.max(0, resultado.limite - resultado.usadas) : null

  if (!aberto) {
    return (
      <button type="button" className="imagem-ia__abrir" onClick={abrir}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.6L12 15l-1.8-4.4L5.5 9l4.7-1.4z" /><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></svg>
        <span><strong>Criar imagem com IA</strong><small>A IA cria a foto com a cara da sua marca</small></span>
      </button>
    )
  }

  return (
    <div className="imagem-ia" ref={painel}>
      <div className="imagem-ia__topo">
        <strong>Criar imagem com IA</strong>
        <button type="button" className="imagem-ia__fechar" onClick={() => setAberto(false)} aria-label="Fechar">×</button>
      </div>

      {estado === 'criando' ? (
        <div className="imagem-ia__esperando" role="status">
          <Esperando />
          <p>Criando a sua imagem. Leva uns 15 segundos.</p>
        </div>
      ) : resultado ? (
        <div className="imagem-ia__resultado">
          <img src={resultado.url} alt="Imagem criada pela IA" className={`imagem-ia__foto imagem-ia__foto--${formato}`} />
          <p className="imagem-ia__nota mono">Restam {restam} de {resultado.limite} imagens neste mês</p>
          <button type="button" className="botao botao--destaque" onClick={usar} disabled={estado === 'enviando'}>
            {estado === 'enviando' ? 'Colocando no post...' : 'Usar no post'}
          </button>
          <button type="button" className="botao botao--fantasma" onClick={() => setResultado(null)} disabled={estado === 'enviando'}>Mudar a cena e criar outra</button>
        </div>
      ) : (
        <>
          <div className="campo">
            <label htmlFor="imagem-ia-cena">O que aparece na imagem</label>
            <textarea id="imagem-ia-cena" rows={3} maxLength={400} value={cena} onChange={(e) => setCena(e.target.value)}
              placeholder="Ex.: tigela de granola com frutas vermelhas numa mesa de madeira, luz da manhã" />
          </div>
          <div className="campo">
            <span className="campo__rotulo">Fotos de referência</span>
            {fotosDaMarca.length ? (
              <>
                <p className="campo__ajuda">A IA usa estas fotos para acertar o seu produto. Escolha até {MAX_REFERENCIAS}.</p>
                <div className="imagem-ia__refs">
                  {fotosDaMarca.map((c) => <Referencia key={c} caminho={c} marcada={referencias.includes(c)} onTrocar={() => trocar(c)} />)}
                </div>
              </>
            ) : (
              <p className="campo__ajuda">Sem fotos da marca, a IA cria a cena do zero. Para ela acertar o seu produto, adicione fotos na aba Marca.</p>
            )}
          </div>
          <p className="imagem-ia__nota">A imagem sai sem texto. O Neonposts escreve o título por cima. Até {IMAGENS_POR_MES} imagens por mês no Pro.</p>
          <button type="button" className="botao botao--destaque" onClick={criar}>Criar imagem</button>
        </>
      )}
      {erro && <p className="campo__erro" role="alert">{erro}</p>}
    </div>
  )
}

import { useState } from 'react'
import { WHATSAPP_SUPORTE } from '../config.js'
import './DeuProblema.css'

// Botão do beta: a pessoa conta o que aconteceu e manda pelo WhatsApp, junto com
// o pedido e a imagem da tela de criação. No celular abre o compartilhar com a
// imagem; sem isso (computador), abre o WhatsApp só com o texto.
export default function DeuProblema({ contexto = {}, imagem }) {
  const [aberto, setAberto] = useState(false)
  const [relato, setRelato] = useState('')
  const [enviando, setEnviando] = useState(false)

  function montarTexto() {
    const linhas = ['Deu problema no Neonposts.', '', `O que aconteceu: ${relato.trim() || '(não contou)'}`]
    for (const [rotulo, valor] of Object.entries(contexto)) if (valor) linhas.push(`${rotulo}: ${valor}`)
    linhas.push(`Aparelho: ${aparelho()}`, `Quando: ${new Date().toLocaleString('pt-BR')}`)
    return linhas.join('\n')
  }

  async function enviar() {
    setEnviando(true)
    const texto = montarTexto()
    try {
      const arquivo = imagem ? await imagem().catch(() => null) : null
      if (arquivo && navigator.canShare?.({ files: [arquivo], text: texto })) {
        try {
          await navigator.share({ files: [arquivo], text: texto })
          fechar()
          return
        } catch (e) {
          if (e.name === 'AbortError') return
        }
      }
      window.open(`https://wa.me/${WHATSAPP_SUPORTE}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener')
      fechar()
    } finally {
      setEnviando(false)
    }
  }

  function fechar() { setAberto(false); setRelato('') }

  if (!aberto) {
    return (
      <button type="button" className="deu-problema__abrir" onClick={() => setAberto(true)}>
        Deu problema? Avise a gente
      </button>
    )
  }
  return (
    <div className="deu-problema">
      <div className="campo">
        <label htmlFor="relato">O que aconteceu?</label>
        <textarea
          id="relato" rows={3} maxLength={500} value={relato} autoFocus
          onChange={(e) => setRelato(e.target.value)}
          placeholder="Ex.: o título saiu cortado, o horário veio errado"
        />
      </div>
      <p className="deu-problema__nota">Vai pelo WhatsApp, com o seu pedido e a imagem desta tela.</p>
      <div className="deu-problema__acoes">
        <button type="button" className="botao botao--fantasma" onClick={fechar}>Cancelar</button>
        <button type="button" className="botao botao--destaque" disabled={enviando} onClick={enviar}>Enviar pelo WhatsApp</button>
      </div>
    </div>
  )
}

function aparelho() {
  const ua = navigator.userAgent
  const sistema = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'outro'
  const navegador = /CriOS|Chrome/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : /Firefox/.test(ua) ? 'Firefox' : 'outro'
  return `${sistema}, ${navegador}, tela ${window.innerWidth}x${window.innerHeight}`
}

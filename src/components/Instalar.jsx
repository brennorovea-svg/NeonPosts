import { useEffect, useState } from 'react'
import { aoMudarInstalar, ehIphone, instalado, instalar, podeInstalar } from '../lib/push.js'
import './Instalar.css'

// Convite para pôr o Neonposts na tela inicial. No iPhone o aviso só chega com o app
// instalado; no Android o Chrome oferece o botão. Some quando já está instalado.
const CHAVE = 'neonposts-instalar-depois'
const dispensou = () => { try { return localStorage.getItem(CHAVE) === '1' } catch { return false } }

export default function Instalar({ motivo = 'Para receber o aviso na hora de postar, mesmo com o app fechado.', compacto = false }) {
  const [pode, setPode] = useState(podeInstalar())
  const [escondido, setEscondido] = useState(() => compacto && dispensou())
  useEffect(() => aoMudarInstalar(setPode), [])
  if (instalado() || escondido) return null
  const iphone = ehIphone()
  if (!iphone && !pode) return null
  const depois = () => { try { localStorage.setItem(CHAVE, '1') } catch { /* sem armazenamento, pergunta de novo */ } setEscondido(true) }
  return (
    <div className={`instalar${compacto ? ' instalar--compacto' : ''}`}>
      <strong>Coloque o Neonposts na tela inicial</strong>
      <span>{motivo}</span>
      {iphone ? (
        <ol className="instalar__passos">
          <li>Toque em <strong>Compartilhar</strong> (o quadrado com a seta para cima).</li>
          <li>Toque em <strong>Adicionar à Tela de Início</strong>.</li>
          <li>Abra pelo ícone e ligue os avisos em Redes.</li>
        </ol>
      ) : (
        <div className="instalar__acoes">
          <button type="button" className="botao botao--primario" onClick={() => instalar().then((ok) => ok && setPode(false))}>Instalar</button>
          {compacto && <button type="button" className="botao botao--fantasma" onClick={depois}>Depois</button>}
        </div>
      )}
      {iphone && compacto && <button type="button" className="botao botao--fantasma instalar__depois" onClick={depois}>Depois</button>}
    </div>
  )
}

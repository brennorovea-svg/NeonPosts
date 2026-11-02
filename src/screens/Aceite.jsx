import { useState } from 'react'
import Obturador from '../components/Obturador.jsx'
import { aceitarTermos, LINK_PRIVACIDADE, LINK_TERMOS, TERMOS_VERSAO } from '../lib/termos.js'
import './Aceite.css'

const dataDaVersao = new Date(`${TERMOS_VERSAO}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

// Depois do login, antes de entrar no app: a pessoa aceita os Termos e a Privacidade.
// Aparece de novo quando a versão vigente muda (TERMOS_VERSAO).
export default function Aceite({ negocio, deNovo, onAceitou, onSair }) {
  const [marcado, setMarcado] = useState(false)
  const [estado, setEstado] = useState('parado') // parado | gravando | erro
  const [erro, setErro] = useState('')

  async function aceitar() {
    setEstado('gravando'); setErro('')
    try {
      await aceitarTermos(negocio.id)
      onAceitou()
    } catch (falha) {
      setEstado('erro'); setErro(falha.message)
    }
  }

  return (
    <main className="aceite">
      <header className="aceite__topo">
        <Obturador tamanho={56} />
        <p className="marca aceite__marca">Neon<span>posts</span></p>
      </header>

      <section className="aceite__cartao" aria-labelledby="aceite-titulo">
        <h1 id="aceite-titulo" className="aceite__titulo">{deNovo ? 'Os termos mudaram' : 'Antes de começar'}</h1>
        <p className="aceite__texto">
          {deNovo
            ? `A gente atualizou os Termos de uso e a Política de privacidade em ${dataDaVersao}. Dê uma olhada e aceite de novo para continuar.`
            : 'Leia como o Neonposts funciona e o que a gente guarda da sua marca. Leva dois minutos.'}
        </p>
        <ul className="aceite__links">
          <li><a href={LINK_TERMOS} target="_blank" rel="noopener">Termos de uso</a></li>
          <li><a href={LINK_PRIVACIDADE} target="_blank" rel="noopener">Política de privacidade</a></li>
        </ul>
        <label className="aceite__caixa">
          <input type="checkbox" checked={marcado} onChange={(e) => setMarcado(e.target.checked)} />
          <span>Li e aceito os Termos de uso e a Política de privacidade.</span>
        </label>
        <button type="button" className="botao botao--destaque" onClick={aceitar} disabled={!marcado || estado === 'gravando'}>
          {estado === 'gravando' ? 'Guardando...' : 'Continuar'}
        </button>
        {erro && <p className="campo__erro" role="alert">{erro}</p>}
        <button type="button" className="botao botao--fantasma aceite__sair" onClick={onSair}>Sair sem aceitar</button>
      </section>

      <p className="aceite__rodape mono">da Neon Scripts</p>
    </main>
  )
}

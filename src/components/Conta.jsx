import { useState } from 'react'
import { baixarMeusDados, excluirConta } from '../lib/conta.js'
import { LINK_PRIVACIDADE, LINK_TERMOS } from '../lib/termos.js'
import './Conta.css'

// Sua conta (LGPD): baixar tudo que a conta guarda e excluir a conta. Fica no fim da tela Plano e conta.
export default function Conta({ email, assinante }) {
  const [esperando, setEsperando] = useState(null) // 'baixar' | 'excluir'
  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  async function baixar() {
    setErro(''); setAviso(''); setEsperando('baixar')
    try {
      await baixarMeusDados()
      setAviso('Pronto, o arquivo foi baixado. Os links das imagens valem por 1 hora.')
    } catch (falha) { setErro(falha.message) }
    setEsperando(null)
  }

  async function excluir() {
    setErro(''); setEsperando('excluir')
    try {
      await excluirConta()
      // O signOut leva para a tela de entrada, que mostra o aviso.
    } catch (falha) { setErro(falha.message); setEsperando(null) }
  }

  return (
    <section className="conta" aria-labelledby="conta-titulo">
      <h2 id="conta-titulo" className="conta__titulo">Sua conta</h2>
      <p className="conta__texto">Você entra como <strong>{email}</strong>. Tudo que o Neonposts guarda é seu: dá para baixar ou apagar quando quiser.</p>

      <div className="conta__acoes">
        <button type="button" className="botao botao--fantasma" onClick={baixar} disabled={esperando !== null}>
          {esperando === 'baixar' ? 'Montando o arquivo...' : 'Baixar meus dados'}
        </button>
        {confirmando ? (
          <div className="conta__confirmar" role="group" aria-label="Confirmar exclusão">
            <p>
              Isso apaga a marca, as fotos, os posts, o planner e o seu login{assinante ? ', e cancela a assinatura na hora' : ''}. Não dá para desfazer.
            </p>
            <div className="conta__botoes">
              <button type="button" className="botao botao--perigo" onClick={excluir} disabled={esperando !== null}>
                {esperando === 'excluir' ? 'Excluindo...' : 'Excluir tudo agora'}
              </button>
              <button type="button" className="botao botao--fantasma" onClick={() => setConfirmando(false)} disabled={esperando !== null}>Deixa pra lá</button>
            </div>
          </div>
        ) : (
          <button type="button" className="botao botao--fantasma conta__excluir" onClick={() => { setAviso(''); setConfirmando(true) }} disabled={esperando !== null}>Excluir conta</button>
        )}
      </div>

      {aviso && <p className="conta__aviso" role="status">{aviso}</p>}
      {erro && <p className="campo__erro" role="alert">{erro}</p>}

      <p className="conta__nota">
        <a href={LINK_TERMOS} target="_blank" rel="noopener">Termos de uso</a> · <a href={LINK_PRIVACIDADE} target="_blank" rel="noopener">Política de privacidade</a> · Dúvidas sobre seus dados: neonposts@neonscripts.com.br
      </p>
    </section>
  )
}

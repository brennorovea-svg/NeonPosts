import { useState } from 'react'
import Obturador from '../components/Obturador.jsx'
import { supabase, enderecoDeVolta } from '../lib/supabase.js'
import './Entrar.css'

function IconeGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  )
}

export default function Entrar() {
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState('parado') // parado | enviando | enviado | erro
  const [erro, setErro] = useState('')

  const semConfig = !supabase

  async function entrarComGoogle() {
    setErro('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: enderecoDeVolta() },
    })
    if (error) {
      setEstado('erro')
      setErro('Não deu para abrir o Google agora. Tente de novo ou use o link no e-mail.')
    }
  }

  async function enviarLink(e) {
    e.preventDefault()
    if (!email.includes('@')) {
      setEstado('erro')
      setErro('Confira o e-mail: parece que falta alguma coisa.')
      return
    }
    setEstado('enviando')
    setErro('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: enderecoDeVolta() },
    })
    if (error) {
      setEstado('erro')
      setErro(error.status === 429
        ? 'Muitos pedidos seguidos. Espere um minutinho e peça o link de novo.'
        : 'Não deu para enviar o link agora. Tente de novo em instantes.')
      return
    }
    setEstado('enviado')
  }

  return (
    <main className="entrar">
      <header className="entrar__topo">
        <Obturador tamanho={56} />
        <p className="marca entrar__marca">Neon<span>posts</span></p>
      </header>

      <section className="entrar__cartao" aria-labelledby="entrar-titulo">
        {estado === 'enviado' ? (
          <div className="entrar__enviado" role="status">
            <h1 id="entrar-titulo" className="entrar__titulo">Confira seu e-mail</h1>
            <p className="entrar__texto">
              Mandamos um link para <strong>{email.trim()}</strong>. Abra no aparelho em que você quer usar o Neonposts.
            </p>
            <button type="button" className="botao botao--fantasma" onClick={() => setEstado('parado')}>
              Usar outro e-mail
            </button>
          </div>
        ) : (
          <>
            <h1 id="entrar-titulo" className="entrar__titulo">Entre para criar seus posts</h1>
            <p className="entrar__texto">Sem senha para decorar.</p>

            <button type="button" className="botao botao--primario" onClick={entrarComGoogle} disabled={semConfig}>
              <IconeGoogle /> Entrar com Google
            </button>

            <div className="entrar__ou" aria-hidden="true"><span>ou</span></div>

            <form className="entrar__form" onSubmit={enviarLink} noValidate>
              <div className="campo">
                <label htmlFor="email">Seu e-mail</label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="voce@seunegocio.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={estado === 'erro'}
                  aria-describedby={erro ? 'entrar-erro' : undefined}
                />
              </div>
              <button type="submit" className="botao botao--destaque" disabled={semConfig || estado === 'enviando'}>
                {estado === 'enviando' ? 'Enviando...' : 'Receber link de acesso'}
              </button>
            </form>

            {erro && <p id="entrar-erro" className="entrar__erro" role="alert">{erro}</p>}
            {semConfig && <p className="entrar__erro" role="alert">O login ainda não foi ligado ao banco. Volte em instantes.</p>}
          </>
        )}
      </section>

      <p className="entrar__rodape mono">da Neon Scripts</p>
    </main>
  )
}

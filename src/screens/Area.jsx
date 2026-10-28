import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import './Area.css'

const PASSOS = [
  ['01', 'Identidade visual', 'logo, cores, ramo e fotos'],
  ['02', 'Como a marca fala', 'tom, palavras que usa e evita'],
  ['03', 'Padrão de postagem', 'tipos de post e frequência'],
  ['04', 'Dados fixos', 'endereço, horário, preços'],
]

export default function Area({ sessao }) {
  const [negocio, setNegocio] = useState(null)
  const usuario = sessao.user
  const nome = (usuario.user_metadata?.full_name || usuario.user_metadata?.name || '').split(' ')[0]

  useEffect(() => {
    if (!supabase) return
    supabase.from('negocios').select('id, nome, limite_pecas').maybeSingle()
      .then(({ data }) => setNegocio(data))
  }, [])

  const limite = negocio?.limite_pecas ?? 30

  return (
    <div className="area">
      <header className="area__topo">
        <p className="marca area__marca">Neon<span>posts</span></p>
        <div className="area__direita">
          <span className="mono area__contador" title="Peças usadas neste mês">0/{limite} peças</span>
          <button type="button" className="botao botao--fantasma" onClick={() => supabase?.auth.signOut()}>Sair</button>
        </div>
      </header>

      <main className="area__conteudo">
        <p className="mono area__ola">{nome ? `Olá, ${nome}` : 'Olá'}</p>
        <h1 className="area__titulo">Primeiro, conte a sua marca.</h1>
        <p className="area__texto">
          Com isso, cada post já sai com as suas cores, o seu jeito de falar e os seus dados certos.
          Leva uns 10 minutos e fica guardado.
        </p>

        <ol className="area__passos">
          {PASSOS.map(([n, titulo, desc]) => (
            <li key={n} className="area__passo">
              <span className="mono area__num">{n}</span>
              <div>
                <strong>{titulo}</strong>
                <span>{desc}</span>
              </div>
            </li>
          ))}
        </ol>

        <button type="button" className="botao botao--primario area__cta" disabled>
          Começar · em breve
        </button>
        <p className="area__email mono">{usuario.email}</p>
      </main>
    </div>
  )
}

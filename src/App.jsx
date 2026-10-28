import { useCallback, useEffect, useState } from 'react'
import Abertura from './components/Abertura.jsx'
import Entrar from './screens/Entrar.jsx'
import Area from './screens/Area.jsx'
import { supabase } from './lib/supabase.js'

// Só no computador de desenvolvimento: ?tela=area mostra a área sem login, para prints.
const sessaoDeTeste = import.meta.env.DEV && new URLSearchParams(location.search).get('tela') === 'area'
  ? { user: { email: 'brenno@exemplo.com.br', user_metadata: { full_name: 'Brenno Rovea' } } }
  : null

export default function App() {
  const [abertura, setAbertura] = useState(true)
  const [sessao, setSessao] = useState(sessaoDeTeste)
  const fimDaAbertura = useCallback(() => setAbertura(false), [])

  useEffect(() => {
    if (!supabase || sessaoDeTeste) return
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (abertura) return <Abertura onFim={fimDaAbertura} />
  return sessao ? <Area sessao={sessao} /> : <Entrar />
}

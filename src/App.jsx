import { useCallback, useEffect, useState } from 'react'
import Abertura from './components/Abertura.jsx'
import Entrar from './screens/Entrar.jsx'
import Area from './screens/Area.jsx'
import { supabase } from './lib/supabase.js'
import { usarModoDeTeste } from './lib/perfil.js'

// Só no computador de desenvolvimento: ?tela=area mostra a área sem login, para prints.
// ?tela=area&marca=exemplo já começa com uma marca preenchida.
const parametros = new URLSearchParams(location.search)
const sessaoDeTeste = import.meta.env.DEV && parametros.get('tela') === 'area'
  ? { user: { email: 'brenno@exemplo.com.br', user_metadata: { full_name: 'Brenno Rovea' } } }
  : null
const MARCA_DE_EXEMPLO = {
  identidade: { nome: 'Neon Scripts', ramo: 'Software House', cores: ['#F43399', '#40E6DC', '#A24BFF'], logo: '/teste/logo.png', fotos: ['/teste/foto.jpg'] },
  voz: { tom: ['Divertido', 'Próximo'], tratamento: 'você', usa: 'a gente', evita: '', exemplos: '', emoji: 'pouco' },
  padrao: { tipos: ['Novidade', 'Bastidores', 'Depoimento', 'Antes e depois'], feedPorSemana: 3, storiesPorSemana: 5, hashtags: '#NeonScripts', chamada: 'WhatsApp' },
  dados: { endereco: '', horario: 'Seg a Sex, 9h às 19h', whatsapp: '11999392800', instagram: '@neon.scripts', site: 'neonscripts.com.br', itens: [{ nome: 'Sites', preco: '1000' }] },
}
if (sessaoDeTeste) usarModoDeTeste(parametros.get('marca') === 'exemplo' ? MARCA_DE_EXEMPLO : null)

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
  return sessao ? <Area sessao={sessao} teste={Boolean(sessaoDeTeste)} /> : <Entrar />
}

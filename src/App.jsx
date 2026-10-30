import { useCallback, useEffect, useState } from 'react'
import Abertura from './components/Abertura.jsx'
import Entrar from './screens/Entrar.jsx'
import Area from './screens/Area.jsx'
import { supabase } from './lib/supabase.js'
import { usarModoDeTeste } from './lib/perfil.js'

// Só no computador de desenvolvimento: ?tela=area mostra a área sem login, para prints.
// ?tela=area&marca=exemplo (ou narua) já começa com uma marca preenchida.
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
const MARCA_NARUA = {
  identidade: { nome: 'Narua', ramo: 'Food truck de comida asiática de rua', cores: ['#E73334', '#F6AF43', '#181818'], fonte: 'divertida', logo: '/teste/logo.png', fotos: [] },
  voz: { tom: ['Divertido', 'Direto', 'Acolhedor'], tratamento: 'você', usa: 'o Narua, nós do Narua, comida asiática de rua', evita: 'miojo, comida japonesa, comparar com outros food trucks, prometer entrega ou tempo de espera', exemplos: '', emoji: 'pouco' },
  padrao: { tipos: ['Cardápio ou catálogo', 'Promoção', 'Aviso de horário', 'Bastidores', 'Novidade'], feedPorSemana: 3, storiesPorSemana: 5, hashtags: '#narua #foodtruck #comidaasiatica #caieiras', chamada: 'Vem pro Narua' },
  dados: {
    endereco: 'Food truck: toda quinta em Caieiras e todo sábado em Franco da Rocha (SP)', horario: '', whatsapp: '11943283434', instagram: '@narua.foodtruck', site: 'naruafoodtruck.com.br',
    itens: [['Yakissoba P', '25'], ['Yakissoba G', '40'], ['Big Poke 450g', '60'], ['Karaaguê', '20'], ['Tempurá', '18'], ['Corn dog coreano', '18'], ['Takoyaki (5 un.)', '20'], ['Nikkuman (3 un.)', '18'], ['Guioza (5 un.)', '18'], ['Shimeji', '18'], ['Harumaki (5 un.)', '18'], ['Refrigerante lata', '7']].map(([nome, preco]) => ({ nome, preco })),
  },
}
const MARCAS_DE_TESTE = { exemplo: MARCA_DE_EXEMPLO, narua: MARCA_NARUA }
if (sessaoDeTeste) usarModoDeTeste(MARCAS_DE_TESTE[parametros.get('marca')] || null)

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

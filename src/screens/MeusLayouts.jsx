import { useEffect, useMemo, useState } from 'react'
import MiniLayout from '../components/MiniLayout.jsx'
import { carregarImagem, layoutsDoGrupo, NOMES_DOS_MODELOS } from '../lib/desenhar.js'
import { enderecoDaImagem, salvarPerfil } from '../lib/perfil.js'
import { roteiroDeAmostra, sugerirLayouts } from '../lib/sugerir.js'
import { comPreferencias, preferencias } from '../lib/meusLayouts.js'
import './PerfilMarca.css'
import './MeusLayouts.css'

// Marca › Meus layouts (Bloco 11): todos os layouts com a marca do dono, para marcar "Gosto" ou "Não usar".
// Guardado no perfil da marca (padrao.layouts). A IA escolhe só entre os que ele gosta e nunca usa os escondidos.
const TIPOS = ['Promoção', 'Novidade', 'Bastidores', 'Dica', 'Cardápio ou catálogo', 'Depoimento', 'Aviso de horário', 'Antes e depois']
const tipoDoLayout = (modelo, temFoto, animado) => TIPOS.find((t) => sugerirLayouts(t, temFoto, animado).includes(modelo)) || 'Novidade'

export default function MeusLayouts({ negocioId, perfilInicial, onSair }) {
  const inicial = preferencias(perfilInicial)
  const [gosto, setGosto] = useState(inicial.gosto)
  const [nao, setNao] = useState(inicial.nao)
  const [animado, setAnimado] = useState(false)
  const [comFoto, setComFoto] = useState(perfilInicial.identidade.fotos?.length > 0)
  const [imagens, setImagens] = useState({ logo: null, foto: null })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let vivo = true
    const carregar = (caminho) => (caminho ? enderecoDaImagem(caminho).then(carregarImagem).catch(() => null) : Promise.resolve(null))
    Promise.all([carregar(perfilInicial.identidade.logo), carregar(perfilInicial.identidade.fotos?.[0])])
      .then(([logo, foto]) => vivo && setImagens({ logo, foto }))
    return () => { vivo = false }
  }, [perfilInicial])

  const grupo = layoutsDoGrupo(comFoto, animado)
  // Os que ele gosta primeiro, os escondidos no fim. A ordem só muda ao trocar de aba, para nada pular embaixo do dedo.
  const ordem = useMemo(() => {
    const peso = (m) => (gosto.includes(m) ? 0 : nao.includes(m) ? 2 : 1)
    return [...grupo].sort((a, b) => peso(a) - peso(b))
  }, [comFoto, animado]) // eslint-disable-line react-hooks/exhaustive-deps

  const opcoesDe = useMemo(() => {
    const i = perfilInicial.identidade
    const cache = {}
    return (modelo) => (cache[modelo] ??= {
      formato: 'post', modelo, roteiro: roteiroDeAmostra(modelo, tipoDoLayout(modelo, comFoto, animado), perfilInicial, comFoto),
      cores: i.cores, nome: i.nome, fonte: i.fonte, logo: imagens.logo, fotos: comFoto && imagens.foto ? [imagens.foto] : [],
    })
  }, [perfilInicial, comFoto, animado, imagens])

  function marcar(modelo, valor) {
    const ja = valor === 'gosto' ? gosto.includes(modelo) : nao.includes(modelo)
    setGosto((g) => (valor === 'gosto' && !ja ? [...g, modelo] : g.filter((m) => m !== modelo)))
    setNao((n) => (valor === 'nao' && !ja ? [...n, modelo] : n.filter((m) => m !== modelo)))
  }

  const doGrupo = (lista) => lista.filter((m) => grupo.includes(m)).length
  const nG = doGrupo(gosto)
  const nN = doGrupo(nao)
  const conta = nG
    ? `${nG} que você gosta${nN ? ` · ${nN} ${nN > 1 ? 'escondidos' : 'escondido'}` : ''}. A IA escolhe só entre os que você gosta.`
    : nN ? `${nN} ${nN > 1 ? 'escondidos' : 'escondido'}. A IA escolhe entre os outros.` : 'Nenhum marcado aqui. A IA escolhe entre todos.'
  const mudou = gosto.join() !== inicial.gosto.join() || nao.join() !== inicial.nao.join()

  async function salvar() {
    setSalvando(true)
    setErro('')
    const novo = comPreferencias(perfilInicial, gosto, nao)
    try {
      await salvarPerfil(negocioId, novo)
      onSair(novo)
    } catch {
      setErro('Não deu para salvar agora. Confira a internet e tente de novo.')
      setSalvando(false)
    }
  }

  return (
    <div className="perfil meus">
      <header className="perfil__topo">
        <button type="button" className="botao botao--fantasma" onClick={() => onSair(null)}>Voltar</button>
        <span className="mono perfil__contagem">{perfilInicial.identidade.nome}</span>
      </header>

      <main className="perfil__conteudo meus__conteudo">
        <p className="mono perfil__num">Marca</p>
        <h1 className="perfil__titulo">Meus layouts</h1>
        <p className="meus__texto">Marque os que têm a cara da sua marca. Os que você esconder não aparecem nos seus posts.</p>

        <div className="meus__filtros">
          <span className="meus__seg" role="group" aria-label="Movimento">
            <button type="button" aria-pressed={!animado} onClick={() => setAnimado(false)}>Parado</button>
            <button type="button" aria-pressed={animado} onClick={() => setAnimado(true)}>Animado</button>
          </span>
          <span className="meus__seg" role="group" aria-label="Foto">
            <button type="button" aria-pressed={comFoto} onClick={() => setComFoto(true)}>Com foto</button>
            <button type="button" aria-pressed={!comFoto} onClick={() => setComFoto(false)}>Sem foto</button>
          </span>
        </div>
        <p className="mono meus__conta" role="status">{conta}</p>
        {comFoto && !perfilInicial.identidade.fotos?.length && <p className="perfil__aviso">Mande uma foto da marca em Identidade para ver estes layouts com a sua foto.</p>}

        <ul className="meus__grade">
          {ordem.map((m) => {
            const estado = gosto.includes(m) ? 'gosto' : nao.includes(m) ? 'nao' : ''
            return (
              <li key={`${m}-${comFoto}-${animado}`} className="meus__item" data-estado={estado}>
                <span className="meus__tela"><MiniLayout opcoes={opcoesDe(m)} animado={animado} /></span>
                <span className="meus__nome">{NOMES_DOS_MODELOS[m] || m}{estado === 'nao' && <span> · escondido</span>}</span>
                <span className="meus__acoes">
                  <button type="button" data-v="gosto" aria-pressed={estado === 'gosto'} onClick={() => marcar(m, 'gosto')}>Gosto</button>
                  <button type="button" data-v="nao" aria-pressed={estado === 'nao'} onClick={() => marcar(m, 'nao')}>Não usar</button>
                </span>
              </li>
            )
          })}
        </ul>
      </main>

      <footer className="meus__rodape">
        {erro && <p className="campo__erro" role="alert">{erro}</p>}
        <button type="button" className="botao botao--destaque" disabled={!mudou || salvando} onClick={salvar}>{salvando ? 'Salvando...' : 'Salvar meus layouts'}</button>
      </footer>
    </div>
  )
}

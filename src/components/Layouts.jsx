import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Obturador from './Obturador.jsx'
import { desenhar, NOMES_DOS_MODELOS, prepararFontes } from '../lib/desenhar.js'
import { layoutsVisiveis, preferencias } from '../lib/meusLayouts.js'
import { roteiroDeAmostra, sugerirLayouts, todosOsLayouts } from '../lib/sugerir.js'
import Carrossel from './Carrossel.jsx'

// Os layouts do grupo em miniatura (os 3 sugeridos na frente), desenhados com as cores e o logo da marca, mais a opção de
// deixar a IA escolher. A escolha vai junto com o pedido e a IA escreve dentro dela.
// Grupo (Brenno, 30/10): com foto ou da marca, parado ou animado. Uma frase no topo diz em qual a pessoa está.
function Miniatura({ modelo, tipo, perfil, formato, logo, foto, fotoDaMarca, roteiro = null }) {
  const canvas = useRef(null)
  useEffect(() => {
    let vivo = true
    prepararFontes(perfil.identidade.fonte).then(() => {
      if (!vivo || !canvas.current) return
      const fotoDaPeca = foto || (modelo === 'bastidores' ? fotoDaMarca : null)
      desenhar(canvas.current, {
        formato, modelo, roteiro: roteiro ? { ...roteiro, modelo } : roteiroDeAmostra(modelo, tipo, perfil, Boolean(foto)),
        cores: perfil.identidade.cores, nome: perfil.identidade.nome, fonte: perfil.identidade.fonte, logo, foto: fotoDaPeca,
      })
    })
    return () => { vivo = false }
  }, [modelo, tipo, formato, logo, foto, fotoDaMarca, perfil.identidade.fonte, roteiro])
  return <canvas ref={canvas} aria-hidden="true" />
}

// Ver todos: a página inteira, um bloco por tipo de post com os layouts que combinam com ele; no fim, os que sobram.
const TIPOS = ['Promoção', 'Novidade', 'Bastidores', 'Dica', 'Cardápio ou catálogo', 'Depoimento', 'Aviso de horário', 'Antes e depois']
function TodosOsLayouts({ grupo, animado, foto, formato, opcao, onFechar }) {
  useEffect(() => {
    const fechar = (e) => e.key === 'Escape' && onFechar()
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', fechar)
    return () => { document.body.style.overflow = antes; window.removeEventListener('keydown', fechar) }
  }, [onFechar])
  const porTipo = TIPOS.map((t) => [t, sugerirLayouts(t, Boolean(foto), animado).filter((m) => grupo.includes(m))]).filter(([, l]) => l.length)
  const usados = new Set(porTipo.flatMap(([, l]) => l))
  const outros = grupo.filter((m) => !usados.has(m))
  const secoes = outros.length ? [...porTipo, ['Outros layouts', outros]] : porTipo
  return (
    <div className="todos" role="dialog" aria-modal="true" aria-label="Todos os layouts">
      <header className="todos__topo">
        <button type="button" className="botao botao--fantasma" onClick={onFechar}>Voltar</button>
        <span className="mono todos__conta">{grupo.length} layouts</span>
      </header>
      <div className="todos__conteudo">
        <h1 className="todos__titulo">Todos os layouts</h1>
        <p className="todos__ajuda">
          {animado ? 'Animados' : 'Parados'} {foto ? 'com a sua foto' : 'com as cores e o logo da sua marca'}, por tipo de post. Toque em um para usar.
        </p>
        {secoes.map(([t, l]) => (
          <section key={t} className="todos__secao">
            <h2 className="todos__tipo">{t} <span className="layouts__conta">· {l.length}</span></h2>
            <div className={`todos__grade todos__grade--${formato}`} role="radiogroup" aria-label={t}>
              {l.map((m, i) => opcao(m, i, t === 'Outros layouts' ? null : t))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

// `roteiro`: no post pronto, as miniaturas mostram o texto de verdade em cada layout, e a opção da IA some.
export default function Layouts({ sugeridos, escolhido, onEscolher, tipo, perfil, formato, animado = false, logo, foto, fotoDaMarca, roteiro = null }) {
  // Os escondidos em Meus layouts não aparecem; os que o dono gosta ganham o selo.
  const grupo = layoutsVisiveis(Boolean(foto), animado, perfil)
  const { gosto } = preferencias(perfil)
  // Ver todos (Brenno, 05/11): uma página com todos os layouts do grupo, separados por tipo de post.
  const [pagina, setPagina] = useState(false)
  const lista = todosOsLayouts(sugeridos, grupo)
  const opcao = (modelo, i, tipoDaOpcao = tipo, aoEscolher = onEscolher) => (
    <button
      key={`${modelo}-${formato}`} type="button" role="radio" aria-checked={escolhido === modelo}
      className="layouts__opcao" style={{ animationDelay: `${Math.min(i, 5) * 50}ms` }} onClick={() => aoEscolher(modelo)}
    >
      <span className="layouts__miniatura">
        <Miniatura modelo={modelo} tipo={tipoDaOpcao} perfil={perfil} formato={formato} logo={logo} foto={foto} fotoDaMarca={fotoDaMarca} roteiro={roteiro} />
      </span>
      <span className="layouts__nome">
        {NOMES_DOS_MODELOS[modelo]}
        {gosto.includes(modelo) ? <span className="mono layouts__selo">Você gosta</span> : sugeridos.includes(modelo) && <span className="mono layouts__selo">Sugerido</span>}
      </span>
    </button>
  )
  return (
    <div className="layouts" role="radiogroup" aria-label="Layout">
      <p className="layouts__grupo">
        Layouts {animado ? 'animados' : 'parados'} {foto ? 'com a sua foto' : 'com as cores e o logo da sua marca'} <span className="layouts__conta">· {grupo.length}</span>
      </p>
      {!roteiro && <button type="button" role="radio" aria-checked={escolhido === 'ia'} className="layouts__ia" onClick={() => onEscolher('ia')}>
        <span className="layouts__icone"><Obturador tamanho={36} abertura={0.55} /></span>
        <span>
          <strong>Deixar a IA escolher</strong>
          <span className="layouts__ajuda">{gosto.length ? 'Ela olha o seu pedido e escolhe entre os layouts que você gosta.' : 'Ela olha o seu pedido e decide a arte.'}</span>
        </span>
      </button>}
      <Carrossel rotulo="Layouts" inicio={`${sugeridos.join()}-${grupo.length}`} className={`layouts__carrossel layouts__carrossel--${formato}`}>{lista.map((m, i) => opcao(m, i))}</Carrossel>
      <button type="button" className="botao botao--fantasma layouts__ver" onClick={() => setPagina(true)}>Ver todos</button>
      {pagina && createPortal(
        <TodosOsLayouts
          grupo={grupo} animado={animado} foto={foto} formato={formato}
          opcao={(m, i, t) => opcao(m, i, t, (escolha) => { onEscolher(escolha); setPagina(false) })}
          onFechar={() => setPagina(false)}
        />,
        document.body,
      )}
    </div>
  )
}

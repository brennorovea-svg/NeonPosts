import { useEffect, useRef } from 'react'
import Obturador from './Obturador.jsx'
import { desenhar, layoutsDoGrupo, NOMES_DOS_MODELOS, prepararFontes } from '../lib/desenhar.js'
import { roteiroDeAmostra, todosOsLayouts } from '../lib/sugerir.js'
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

// `roteiro`: no post pronto, as miniaturas mostram o texto de verdade em cada layout, e a opção da IA some.
export default function Layouts({ sugeridos, escolhido, onEscolher, tipo, perfil, formato, animado = false, logo, foto, fotoDaMarca, roteiro = null }) {
  const grupo = layoutsDoGrupo(Boolean(foto), animado)
  return (
    <div className="layouts" role="radiogroup" aria-label="Layout">
      <p className="layouts__grupo">
        Layouts {animado ? 'animados' : 'parados'} {foto ? 'com a sua foto' : 'com as cores e o logo da sua marca'} <span className="layouts__conta">· {grupo.length}</span>
      </p>
      {!roteiro && <button type="button" role="radio" aria-checked={escolhido === 'ia'} className="layouts__ia" onClick={() => onEscolher('ia')}>
        <span className="layouts__icone"><Obturador tamanho={36} abertura={0.55} /></span>
        <span>
          <strong>Deixar a IA escolher</strong>
          <span className="layouts__ajuda">Ela olha o seu pedido e decide a arte.</span>
        </span>
      </button>}
      <Carrossel rotulo="Layouts" inicio={`${sugeridos.join()}-${grupo.length}`} className={`layouts__carrossel layouts__carrossel--${formato}`}>
        {todosOsLayouts(sugeridos, grupo).map((modelo, i) => (
          <button
            key={`${modelo}-${formato}`} type="button" role="radio" aria-checked={escolhido === modelo}
            className="layouts__opcao" style={{ animationDelay: `${Math.min(i, 5) * 50}ms` }} onClick={() => onEscolher(modelo)}
          >
            <span className="layouts__miniatura">
              <Miniatura modelo={modelo} tipo={tipo} perfil={perfil} formato={formato} logo={logo} foto={foto} fotoDaMarca={fotoDaMarca} roteiro={roteiro} />
            </span>
            <span className="layouts__nome">
              {NOMES_DOS_MODELOS[modelo]}
              {sugeridos.includes(modelo) && <span className="mono layouts__selo">Sugerido</span>}
            </span>
          </button>
        ))}
      </Carrossel>
    </div>
  )
}

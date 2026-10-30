import { useEffect, useRef } from 'react'
import Obturador from './Obturador.jsx'
import { desenhar, NOMES_DOS_MODELOS, prepararFontes, SO_NO_VIDEO } from '../lib/desenhar.js'
import { roteiroDeAmostra, todosOsLayouts } from '../lib/sugerir.js'
import Carrossel from './Carrossel.jsx'

// Todos os layouts em miniatura (os 3 sugeridos na frente) desenhadas com as cores e o logo da marca, mais a opção de
// deixar a IA escolher. A escolha vai junto com o pedido e a IA escreve dentro dela.
function Miniatura({ modelo, tipo, perfil, formato, logo, foto, fotoDaMarca }) {
  const canvas = useRef(null)
  useEffect(() => {
    let vivo = true
    prepararFontes(perfil.identidade.fonte).then(() => {
      if (!vivo || !canvas.current) return
      const fotoDaPeca = foto || (modelo === 'bastidores' ? fotoDaMarca : null)
      desenhar(canvas.current, {
        formato, modelo, roteiro: roteiroDeAmostra(modelo, tipo, perfil, Boolean(foto)),
        cores: perfil.identidade.cores, nome: perfil.identidade.nome, fonte: perfil.identidade.fonte, logo, foto: fotoDaPeca,
      })
    })
    return () => { vivo = false }
  }, [modelo, tipo, formato, logo, foto, fotoDaMarca, perfil.identidade.fonte])
  return <canvas ref={canvas} aria-hidden="true" />
}

export default function Layouts({ sugeridos, escolhido, onEscolher, tipo, perfil, formato, video = false, logo, foto, fotoDaMarca }) {
  return (
    <div className="layouts" role="radiogroup" aria-label="Layout">
      <button type="button" role="radio" aria-checked={escolhido === 'ia'} className="layouts__ia" onClick={() => onEscolher('ia')}>
        <span className="layouts__icone"><Obturador tamanho={36} abertura={0.55} /></span>
        <span>
          <strong>Deixar a IA escolher</strong>
          <span className="layouts__ajuda">Ela olha o seu pedido e decide a arte.</span>
        </span>
      </button>
      <Carrossel rotulo="Layouts" inicio={sugeridos.join()} className={`layouts__carrossel layouts__carrossel--${formato}`}>
        {todosOsLayouts(sugeridos, Object.keys(NOMES_DOS_MODELOS), SO_NO_VIDEO, video).map((modelo, i) => (
          <button
            key={`${modelo}-${formato}`} type="button" role="radio" aria-checked={escolhido === modelo}
            className="layouts__opcao" style={{ animationDelay: `${Math.min(i, 5) * 50}ms` }} onClick={() => onEscolher(modelo)}
          >
            <span className="layouts__miniatura">
              <Miniatura modelo={modelo} tipo={tipo} perfil={perfil} formato={formato} logo={logo} foto={foto} fotoDaMarca={fotoDaMarca} />
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

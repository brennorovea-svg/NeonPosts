import { REDES } from '../lib/agenda.js'
import './Redes.css'

// Redes: por enquanto, postar é pelo celular, em um toque. Conectar de verdade
// (postar sozinho) é o Bloco 9 e depende da revisão das redes.
export default function Redes({ avisos, onAtivarAvisos }) {
  return (
    <section className="redes">
      <h1 className="redes__titulo">Suas redes</h1>
      <p className="redes__texto">
        Hoje o Neonposts planeja e prepara o post; quem publica é você, em um toque pelo celular. Postar direto daqui,
        sem passar pelo celular, vem numa próxima versão.
      </p>
      <ol className="redes__passos">
        <li>Toque em <strong>Postar</strong>. O compartilhar do celular abre com a arte ou o vídeo, e a legenda já fica copiada.</li>
        <li>Escolha a rede. No Instagram, toque em Avançar e cole a legenda.</li>
        <li>Volte aqui e confirme com <strong>Sim, postei</strong>. O planner marca como postado.</li>
      </ol>
      <ul className="redes__lista">
        {Object.entries(REDES).map(([chave, r]) => (
          <li key={chave} className="redes__rede">
            <span className="redes__ponto" style={{ background: r.cor }} aria-hidden="true" />
            <span className="redes__nome">{r.nome}</span>
            <span className="mono redes__estado">Postar pelo celular</span>
          </li>
        ))}
      </ul>
      <div className="redes__avisos">
        <strong>{avisos ? 'Avisos ligados neste navegador.' : 'Avisos desligados.'}</strong>
        <span>O lembrete funciona com o app aberto numa aba ou instalado na tela inicial do celular.</span>
        {!avisos && <button type="button" className="botao botao--fantasma" onClick={onAtivarAvisos}>Ativar avisos</button>}
      </div>
    </section>
  )
}

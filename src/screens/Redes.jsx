import { REDES } from '../lib/agenda.js'
import { pushDisponivel } from '../lib/push.js'
import Instalar from '../components/Instalar.jsx'
import './Redes.css'

// Redes: por enquanto, postar é pelo celular, em um toque. Conectar de verdade
// (postar sozinho) é o Bloco 9 e depende da revisão das redes.
export default function Redes({ avisos, push = false, onAtivarAvisos }) {
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
        <strong>{push ? 'Avisos ligados neste aparelho, mesmo com o app fechado.' : avisos ? 'Avisos ligados só com o app aberto.' : 'Avisos desligados.'}</strong>
        <span>
          {push
            ? 'Na hora de postar, o aviso chega aqui. Tocar nele abre o post com o Postar pronto.'
            : pushDisponivel()
              ? 'Ligue para receber o aviso na hora de postar, mesmo com o app fechado. No computador, o botão "Mandar para o celular" manda o post pronto para cá.'
              : 'Neste navegador o aviso só chega com o app aberto. No celular, instale o app na tela inicial para receber com ele fechado.'}
        </span>
        {!push && <button type="button" className="botao botao--fantasma" onClick={onAtivarAvisos}>{avisos ? 'Ligar com o app fechado' : 'Ativar avisos'}</button>}
      </div>
      <Instalar motivo="No celular, o aviso com o app fechado chega pelo app da tela inicial. É de graça e leva 10 segundos." />
    </section>
  )
}

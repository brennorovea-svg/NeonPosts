import { REDES } from '../lib/agenda.js'
import './Redes.css'

// Redes: por enquanto, só o modo lembrete. Conectar de verdade (postar sozinho)
// é o Bloco 10, depois do lançamento.
export default function Redes({ avisos, onAtivarAvisos }) {
  return (
    <section className="redes">
      <h1 className="redes__titulo">Suas redes</h1>
      <p className="redes__texto">
        Hoje o Neonposts planeja e prepara o post; quem publica é você. Na hora marcada, a gente avisa, abre o compartilhar
        do aparelho e já deixa a legenda copiada. Postar direto daqui, sem passar pelo celular, vem numa próxima versão.
      </p>
      <ul className="redes__lista">
        {Object.entries(REDES).map(([chave, r]) => (
          <li key={chave} className="redes__rede">
            <span className="redes__ponto" style={{ background: r.cor }} aria-hidden="true" />
            <span className="redes__nome">{r.nome}</span>
            <span className="mono redes__estado">Modo lembrete</span>
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

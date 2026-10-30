import './Menu.css'

// Menu do app: barra lateral no computador, barra de baixo no celular.
const ICONES = {
  planner: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>,
  criar: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>,
  pecas: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></svg>,
  marca: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></svg>,
  redes: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.3 10.8l7.4-3.6M8.3 13.2l7.4 3.6" /></svg>,
  plano: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v12H4zM4 11h16M9 7V5h6v2" /></svg>,
}
export const ABAS = [['planner', 'Planner'], ['criar', 'Criar'], ['pecas', 'Peças'], ['marca', 'Marca'], ['redes', 'Redes'], ['plano', 'Plano']]

export default function Menu({ aba, onIr, nomeMarca, usadas, limite, onSair }) {
  return (
    <nav className="menu" aria-label="Menu">
      <p className="marca menu__marca">Neon<span>posts</span></p>
      <ul className="menu__lista">
        {ABAS.map(([chave, rotulo]) => (
          <li key={chave}>
            <button type="button" className="menu__item" aria-current={aba === chave ? 'page' : undefined} onClick={() => onIr(chave)}>
              {ICONES[chave]}<span>{rotulo}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="menu__rodape">
        <div className="menu__conta">
          <span className="menu__conta-rotulo">Marca ativa</span>
          <strong>{nomeMarca || 'Sua marca'}</strong>
          <span className="mono menu__contador">{usadas} de {limite} peças no mês</span>
        </div>
        <button type="button" className="botao botao--fantasma menu__sair" onClick={onSair}>Sair</button>
      </div>
    </nav>
  )
}

import { useRef, useState } from 'react'
import { PERFIL_VAZIO, salvarPerfil } from '../lib/perfil.js'
import { textoDoPdf } from '../lib/pdf.js'
import './PerfilMarca.css'

// Perfil profissional: só para os posts do LinkedIn feitos em nome da pessoa.
// Fica guardado na mesma versão da marca. A IA usa só o que estiver aqui:
// cargo, empresa e números nunca são inventados.

const PERGUNTAS = [
  ['resultados', 'Resultados seus, com número', 'Um por linha. É daqui que saem os números dos posts.', 'Dobramos as encomendas de bolo em 2025\nTreinei 12 pessoas na equipe'],
  ['temas', 'Sobre o que você quer falar', 'Os assuntos dos seus posts.', 'Gestão de equipe, confeitaria, empreender'],
  ['publico', 'Para quem você escreve', 'Quem você quer que leia.', 'Donos de pequenos negócios de comida'],
  ['nunca', 'O que você nunca diz', 'Assuntos e palavras que ficam de fora.', 'Política, falar mal de concorrente'],
]

export default function PerfilProfissional({ negocioId, perfilInicial, onSair }) {
  const [p, setP] = useState({ ...PERFIL_VAZIO.profissional, ...(perfilInicial.profissional || {}) })
  const [lendo, setLendo] = useState(false)
  const [lido, setLido] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const arquivo = useRef(null)

  const mudar = (trecho) => setP((v) => ({ ...v, ...trecho }))

  async function lerPdf(e) {
    const escolhido = e.target.files?.[0]
    e.target.value = ''
    if (!escolhido) return
    setErro('')
    setLido('')
    setLendo(true)
    try {
      const texto = await textoDoPdf(escolhido)
      if (texto.length < 40) setErro('Não deu para ler texto neste PDF. Cole o texto do seu perfil no campo abaixo.')
      else { mudar({ carreira: texto }); setLido('Texto do PDF lido. Confira e apague o que não quiser usar.') }
    } catch {
      setErro('Não deu para abrir este PDF. Cole o texto do seu perfil no campo abaixo.')
    }
    setLendo(false)
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    const limpo = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v || '').trim()]))
    const novo = { ...perfilInicial, profissional: limpo }
    try {
      await salvarPerfil(negocioId, novo)
      onSair(novo)
    } catch {
      setErro('Não deu para salvar agora. Confira a internet e tente de novo.')
      setSalvando(false)
    }
  }

  return (
    <div className="perfil">
      <header className="perfil__topo">
        <button type="button" className="botao botao--fantasma" onClick={() => onSair(null)}>Voltar</button>
        <span className="mono perfil__contagem">LinkedIn</span>
      </header>

      <main className="perfil__conteudo">
        <p className="mono perfil__num">Marca</p>
        <h1 className="perfil__titulo">Perfil profissional</h1>
        <section className="porque" aria-label="Por que isso importa">
          <p className="porque__texto">É o que permite postar no LinkedIn em seu nome. A IA usa só o que estiver aqui: cargo, empresa e número nunca são inventados.</p>
          <div className="porque__exemplo">
            <p className="porque__lado porque__lado--sem"><small>Sem isso</small>"Sou apaixonada pelo que faço e sempre busco crescer."</p>
            <p className="porque__lado porque__lado--com"><small>Com isso</small>"Comecei como chefe de produção. Hoje a minha padaria tem duas lojas."</p>
          </div>
        </section>

        <form className="perfil__form" onSubmit={salvar}>
          <div className="campo">
            <label htmlFor="prof-nome">Seu nome</label>
            <input id="prof-nome" maxLength={80} value={p.nome} onChange={(e) => mudar({ nome: e.target.value })} placeholder="Como aparece no LinkedIn" />
          </div>
          <div className="campo">
            <label htmlFor="prof-cargo">Cargo e empresa de hoje</label>
            <input id="prof-cargo" maxLength={120} value={p.cargo} onChange={(e) => mudar({ cargo: e.target.value })} placeholder="Sócia e confeiteira na Padaria Trigo Bom" />
          </div>

          <div className="campo">
            <label htmlFor="prof-carreira">Sua carreira</label>
            <p className="campo__ajuda">Suba o PDF do seu LinkedIn ou cole o texto do perfil. No LinkedIn, abra o seu perfil, toque em Mais e em Salvar como PDF. O PDF é lido no seu aparelho; só o texto fica guardado.</p>
            <input ref={arquivo} type="file" accept="application/pdf" hidden onChange={lerPdf} id="prof-pdf" />
            <button type="button" className="botao botao--fantasma perfil__pdf" onClick={() => arquivo.current?.click()} disabled={lendo}>
              {lendo ? 'Lendo o PDF...' : 'Subir o PDF do LinkedIn'}
            </button>
            {lido && <p className="cores__aviso" role="status">{lido}</p>}
            <textarea
              id="prof-carreira" rows={8} maxLength={6000} value={p.carreira}
              onChange={(e) => mudar({ carreira: e.target.value })}
              placeholder={'Sócia e confeiteira, Padaria Trigo Bom, 2019 até hoje\nChefe de produção, Rede Pão de Mel, 2014 a 2019\nGastronomia, Senac São Paulo, 2012'}
            />
          </div>

          {PERGUNTAS.map(([chave, rotulo, ajuda, exemplo]) => (
            <div className="campo" key={chave}>
              <label htmlFor={`prof-${chave}`}>{rotulo}</label>
              <p className="campo__ajuda">{ajuda}</p>
              <textarea id={`prof-${chave}`} rows={chave === 'resultados' ? 3 : 2} maxLength={800} value={p[chave]} onChange={(e) => mudar({ [chave]: e.target.value })} placeholder={exemplo} />
            </div>
          ))}

          {erro && <p className="campo__erro" role="alert">{erro}</p>}
          <div className="perfil__acoes">
            <button type="submit" className="botao botao--destaque" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar perfil profissional'}</button>
          </div>
        </form>
      </main>
    </div>
  )
}

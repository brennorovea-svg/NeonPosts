import { useMemo, useState } from 'react'
import Obturador from '../components/Obturador.jsx'
import { salvarPerfil } from '../lib/perfil.js'
import { montarGuia, rodadasDaEntrevista } from '../lib/entrevista.js'
import './PerfilMarca.css'
import './Entrevista.css'

// Entrevista da marca: 4 rodadas, a IA transforma as respostas em regras,
// a pessoa confere e salva. Com `revisar`, abre direto nas regras já guardadas.

// Liga e desliga uma opção dentro da resposta separada por vírgula.
function alternar(texto, opcao) {
  const lista = texto.split(',').map((p) => p.trim()).filter(Boolean)
  return (lista.includes(opcao) ? lista.filter((p) => p !== opcao) : [...lista, opcao]).join(', ')
}

function Pergunta({ p, valor, onChange }) {
  const marcadas = valor.split(',').map((t) => t.trim())
  return (
    <div className="campo">
      <label htmlFor={p.id}>{p.pergunta}</label>
      {p.exemplo && <p className="campo__ajuda">{p.exemplo}</p>}
      {p.opcoes && (
        <div className="sugestoes" role="group" aria-label={p.pergunta}>
          {p.opcoes.map((o) => (
            <button
              key={o} type="button" className="ficha" aria-pressed={p.uma ? valor === o : marcadas.includes(o)}
              onClick={() => onChange(p.uma ? (valor === o ? '' : o) : alternar(valor, o))}
            >{o}</button>
          ))}
        </div>
      )}
      {!p.uma && <textarea id={p.id} rows={2} value={valor} onChange={(e) => onChange(e.target.value)} placeholder={p.opcoes ? 'Toque acima ou escreva do seu jeito' : 'Escreva do seu jeito'} />}
    </div>
  )
}

export default function Entrevista({ negocioId, perfil, revisar = false, onSair }) {
  const rodadas = useMemo(() => rodadasDaEntrevista(perfil), [perfil])
  const guia = perfil.voz.guia || {}
  const [respostas, setRespostas] = useState(guia.respostas || {})
  const [etapa, setEtapa] = useState(revisar && guia.regras?.length ? 'regras' : 0) // 0 a 3, 'montando' ou 'regras'
  const [regras, setRegras] = useState(guia.regras || [])
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const total = rodadas.length
  const rodada = typeof etapa === 'number' ? rodadas[etapa] : null
  const respondidas = Object.values(respostas).filter((r) => r.trim()).length

  function rolarParaCima() { window.scrollTo({ top: 0 }) }

  async function montar() {
    setEtapa('montando')
    setErro('')
    try {
      const lista = rodadas.flatMap((r) => r.perguntas).map((p) => ({ pergunta: p.pergunta, resposta: respostas[p.id] || '' }))
      const novas = await montarGuia(lista.filter((r) => r.resposta.trim()))
      setRegras(novas)
      setEtapa('regras')
    } catch (e) {
      setErro(e.message)
      setEtapa(total - 1)
    }
    rolarParaCima()
  }

  function seguir() {
    if (etapa < total - 1) { setEtapa(etapa + 1); rolarParaCima() } else montar()
  }

  async function salvar() {
    setSalvando(true)
    setErro('')
    const limpas = regras.map((r) => r.trim()).filter(Boolean)
    const novo = { ...perfil, voz: { ...perfil.voz, guia: { regras: limpas, respostas, feito_em: new Date().toISOString() } } }
    try {
      await salvarPerfil(negocioId, novo)
      onSair(novo)
    } catch {
      setErro('Não deu para salvar agora. Confira a internet e tente de novo.')
      setSalvando(false)
    }
  }

  if (etapa === 'montando') {
    return (
      <main className="entrevista entrevista--montando" aria-busy="true">
        <Obturador abertura={0.6} tamanho={72} />
        <h1 className="perfil__titulo">Montando o guia da sua marca...</h1>
        <p className="campo__ajuda">A IA está transformando as suas respostas em regras curtas. Leva uns segundos.</p>
      </main>
    )
  }

  return (
    <div className="perfil">
      <header className="perfil__topo">
        <button type="button" className="botao botao--fantasma" onClick={() => onSair(null)}>Voltar</button>
        <div className="perfil__passos" aria-label={rodada ? `Rodada ${etapa + 1} de ${total}` : 'Guia da marca'}>
          {rodadas.map((r, i) => <span key={r.titulo} className={etapa === 'regras' || i <= etapa ? 'aceso' : ''} />)}
        </div>
        <span className="mono perfil__contagem">{rodada ? `${etapa + 1}/${total}` : 'guia'}</span>
      </header>

      {rodada ? (
        <main className="perfil__conteudo" key={etapa}>
          <p className="mono perfil__num">Entrevista da marca · rodada {etapa + 1}</p>
          <h1 className="perfil__titulo">{rodada.titulo}</h1>
          {etapa === 0 && (
            <p className="entrevista__intro">
              São 12 perguntas rápidas, 3 por vez. O que você responder vira o guia da marca, e a IA segue esse guia em todo post.
              Não sabe alguma? Pode pular.
            </p>
          )}
          <form className="perfil__form" onSubmit={(e) => { e.preventDefault(); seguir() }}>
            {rodada.perguntas.map((p) => (
              <Pergunta key={p.id} p={p} valor={respostas[p.id] || ''} onChange={(v) => setRespostas((r) => ({ ...r, [p.id]: v }))} />
            ))}
            {erro && <p className="campo__erro" role="alert">{erro}</p>}
            <div className="perfil__acoes">
              <button type="submit" className="botao botao--destaque" disabled={etapa === total - 1 && !respondidas}>
                {etapa < total - 1 ? 'Continuar' : 'Montar o guia da marca'}
              </button>
              {etapa > 0 && <button type="button" className="perfil__depois" onClick={() => { setEtapa(etapa - 1); rolarParaCima() }}>Voltar uma rodada</button>}
            </div>
          </form>
        </main>
      ) : (
        <main className="perfil__conteudo">
          <p className="mono perfil__num">Guia da marca</p>
          <h1 className="perfil__titulo">Confira as regras</h1>
          <p className="entrevista__intro">
            A IA segue estas regras em todo post. Mude o que não soar como você, tire o que não serve e acrescente o que faltou.
          </p>
          <ol className="entrevista__regras campo">
            {regras.map((r, i) => (
              <li key={i} className="entrevista__regra">
                <span className="mono entrevista__num">{String(i + 1).padStart(2, '0')}</span>
                <textarea rows={3} value={r} aria-label={`Regra ${i + 1}`} onChange={(e) => setRegras(regras.map((x, j) => (j === i ? e.target.value : x)))} />
                <button type="button" className="item__tirar" aria-label={`Tirar a regra ${i + 1}`} onClick={() => setRegras(regras.filter((_, j) => j !== i))}>×</button>
              </li>
            ))}
          </ol>
          <button type="button" className="botao botao--fantasma entrevista__mais" onClick={() => setRegras([...regras, ''])}>Adicionar regra</button>
          {erro && <p className="campo__erro" role="alert">{erro}</p>}
          <div className="perfil__acoes">
            <button type="button" className="botao botao--destaque" onClick={salvar} disabled={salvando || !regras.some((r) => r.trim())}>
              {salvando ? 'Salvando...' : 'Salvar o guia'}
            </button>
            <button type="button" className="perfil__depois" onClick={() => { setEtapa(0); rolarParaCima() }}>Refazer a entrevista</button>
          </div>
        </main>
      )}
    </div>
  )
}

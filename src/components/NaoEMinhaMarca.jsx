import { useState } from 'react'
import { MOTIVOS, proporRegra } from '../lib/entrevista.js'
import './NaoEMinhaMarca.css'

// "Isso não é a minha marca": a pessoa marca o motivo, a IA propõe 1 ou 2 regras,
// a pessoa confere e a regra entra no guia da marca. Serve na calibração e em toda peça.
export default function NaoEMinhaMarca({ roteiro, regras, onSalvar, salva = null, abrir = false }) {
  const [etapa, setEtapa] = useState(abrir ? 'motivo' : 'fechado') // fechado | motivo | pensando | propor | salvando | salva
  const [motivos, setMotivos] = useState([])
  const [comentario, setComentario] = useState('')
  const [propostas, setPropostas] = useState([])
  const [erro, setErro] = useState('')

  function fechar() { setEtapa('fechado'); setMotivos([]); setComentario(''); setPropostas([]); setErro('') }
  const alternar = (m) => setMotivos((l) => (l.includes(m) ? l.filter((x) => x !== m) : [...l, m]))

  async function propor() {
    setEtapa('pensando')
    setErro('')
    try {
      const novas = await proporRegra({ peca: roteiro, motivos, comentario, regras })
      setPropostas(novas.length ? novas : [''])
      setEtapa('propor')
    } catch (e) {
      setErro(e.message)
      setEtapa('motivo')
    }
  }

  async function salvar() {
    setEtapa('salvando')
    setErro('')
    try {
      await onSalvar(propostas.map((r) => r.trim()).filter(Boolean))
      setEtapa('salva')
    } catch (e) {
      setErro(e.message || 'Não deu para salvar agora. Tente de novo.')
      setEtapa('propor')
    }
  }

  if (etapa === 'fechado') {
    return <button type="button" className="nao-marca__abrir" onClick={() => setEtapa('motivo')}>Isso não é a minha marca</button>
  }
  if (etapa === 'salva') {
    return (
      <div className="nao-marca nao-marca--salva" role="status">
        <p className="nao-marca__titulo">Regra salva no guia da marca</p>
        <p className="nao-marca__nota">As próximas peças já seguem essa regra.</p>
        {salva}
      </div>
    )
  }
  return (
    <div className="nao-marca">
      {etapa === 'motivo' || etapa === 'pensando' ? (
        <>
          <p className="nao-marca__titulo">O que não soou como você?</p>
          <div className="fichas" role="group" aria-label="Motivos">
            {MOTIVOS.map((m) => (
              <button key={m} type="button" className="ficha" aria-pressed={motivos.includes(m)} onClick={() => alternar(m)}>{m}</button>
            ))}
          </div>
          <div className="campo">
            <label htmlFor="nao-marca-texto">Conte do seu jeito (opcional)</label>
            <textarea
              id="nao-marca-texto" rows={2} maxLength={400} value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder='Ex.: a gente nunca diz "nós", e não faz entrega'
            />
          </div>
          {erro && <p className="campo__erro" role="alert">{erro}</p>}
          <div className="nao-marca__acoes">
            <button type="button" className="botao botao--fantasma" onClick={fechar}>Cancelar</button>
            <button type="button" className="botao botao--destaque" disabled={etapa === 'pensando' || (!motivos.length && comentario.trim().length < 3)} onClick={propor}>
              {etapa === 'pensando' ? 'Pensando na regra...' : 'Criar regra para o guia'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="nao-marca__titulo">{propostas.length > 1 ? 'Estas regras entram no guia' : 'Esta regra entra no guia'}</p>
          <p className="nao-marca__nota">Mude o que quiser antes de salvar. A IA segue o guia em toda peça.</p>
          <ol className="nao-marca__regras campo">
            {propostas.map((r, i) => (
              <li key={i}>
                <textarea rows={2} value={r} aria-label={`Regra nova ${i + 1}`} onChange={(e) => setPropostas(propostas.map((x, j) => (j === i ? e.target.value : x)))} />
              </li>
            ))}
          </ol>
          {erro && <p className="campo__erro" role="alert">{erro}</p>}
          <div className="nao-marca__acoes">
            <button type="button" className="botao botao--fantasma" onClick={() => setEtapa('motivo')}>Voltar</button>
            <button type="button" className="botao botao--destaque" disabled={etapa === 'salvando' || !propostas.some((r) => r.trim())} onClick={salvar}>
              {etapa === 'salvando' ? 'Salvando...' : 'Salvar no guia'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

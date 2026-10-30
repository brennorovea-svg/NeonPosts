import { useEffect, useMemo, useRef, useState } from 'react'
import Obturador from '../components/Obturador.jsx'
import NaoEMinhaMarca from '../components/NaoEMinhaMarca.jsx'
import { enderecoDaImagem, salvarPerfil } from '../lib/perfil.js'
import { calibrar, montarGuia, rodadasDaEntrevista } from '../lib/entrevista.js'
import { carregarImagem, desenhar, prepararFontes } from '../lib/desenhar.js'
import './PerfilMarca.css'
import './Entrevista.css'

// Entrevista da marca: 4 rodadas, a IA transforma as respostas em regras,
// a pessoa confere e salva. Com `revisar`, abre direto nas regras já guardadas.
// Depois de salvar, a calibração gera 3 peças de teste; o que não soar como a marca vira regra nova.

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

// Peça de teste da calibração, desenhada no aparelho como as peças de verdade.
function PecaDeTeste({ peca, perfil }) {
  const canvas = useRef(null)
  useEffect(() => {
    let vivo = true
    const imagem = (c) => (c ? enderecoDaImagem(c).then(carregarImagem).catch(() => null) : Promise.resolve(null))
    const foto = peca.modelo === 'bastidores' ? perfil.identidade.fotos?.[0] : null
    Promise.all([prepararFontes(perfil.identidade.fonte), imagem(perfil.identidade.logo), imagem(foto)]).then(([, logo, f]) => {
      if (!vivo || !canvas.current) return
      desenhar(canvas.current, {
        formato: peca.formato, modelo: peca.modelo, roteiro: peca.roteiro, cores: perfil.identidade.cores,
        nome: perfil.identidade.nome, fonte: perfil.identidade.fonte, logo, fotos: f ? [f] : [],
      })
    })
    return () => { vivo = false }
  }, [peca])
  return <canvas ref={canvas} className={`calibrar__arte calibrar__arte--${peca.formato}`} aria-label={`Peça de teste: ${peca.roteiro.titulo}`} />
}

export default function Entrevista({ negocioId, perfil, revisar = false, onSair }) {
  const rodadas = useMemo(() => rodadasDaEntrevista(perfil), [perfil])
  const guia = perfil.voz.guia || {}
  const [respostas, setRespostas] = useState(guia.respostas || {})
  const [etapa, setEtapa] = useState(revisar && guia.regras?.length ? 'regras' : 0) // 0 a 3, 'montando', 'regras', 'calibrando' ou 'calibrar'
  const [regras, setRegras] = useState(guia.regras || [])
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [atual, setAtual] = useState(perfil) // perfil salvo mais novo (a calibração salva regra por regra)
  const [teste, setTeste] = useState([]) // as 3 peças de teste
  const [soam, setSoam] = useState({}) // índice da peça -> true quando soa como a marca
  const [novas, setNovas] = useState(0) // regras que a calibração juntou ao guia

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

  async function guardar(lista, base = atual) {
    const novo = { ...base, voz: { ...base.voz, guia: { ...base.voz.guia, regras: lista, respostas, feito_em: new Date().toISOString() } } }
    await salvarPerfil(negocioId, novo)
    setAtual(novo)
    return novo
  }

  async function salvar(testarDepois) {
    setSalvando(true)
    setErro('')
    const limpas = regras.map((r) => r.trim()).filter(Boolean)
    try {
      const novo = await guardar(limpas)
      setRegras(limpas)
      setSalvando(false)
      if (testarDepois) testar(limpas)
      else onSair(novo)
    } catch {
      setErro('Não deu para salvar agora. Confira a internet e tente de novo.')
      setSalvando(false)
    }
  }

  async function testar(lista = regras) {
    setEtapa('calibrando')
    setErro('')
    rolarParaCima()
    try {
      setTeste(await calibrar(lista, respostas.carro_chefe || ''))
      setSoam({})
      setEtapa('calibrar')
    } catch (e) {
      setErro(e.message)
      setEtapa('regras')
    }
  }

  // Regra nova da calibração: entra no guia na hora, como uma versão nova do perfil.
  async function juntar(lista) {
    const todas = [...regras, ...lista]
    await guardar(todas)
    setRegras(todas)
    setNovas((n) => n + lista.length)
  }

  if (etapa === 'montando' || etapa === 'calibrando') {
    return (
      <main className="entrevista entrevista--montando" aria-busy="true">
        <Obturador abertura={0.6} tamanho={72} />
        <h1 className="perfil__titulo">{etapa === 'montando' ? 'Montando o guia da sua marca...' : 'Criando 3 peças de teste...'}</h1>
        <p className="campo__ajuda">
          {etapa === 'montando'
            ? 'A IA está transformando as suas respostas em regras curtas. Leva uns segundos.'
            : 'Um post de promoção, um story de onde encontrar você e um post de bastidores, todos seguindo o guia. Não contam no seu limite.'}
        </p>
      </main>
    )
  }

  if (etapa === 'calibrar') {
    const conferidas = teste.filter((_, i) => soam[i]).length
    return (
      <div className="perfil">
        <header className="perfil__topo">
          <button type="button" className="botao botao--fantasma" onClick={() => { setEtapa('regras'); rolarParaCima() }}>Voltar</button>
          <span className="mono perfil__contagem">teste</span>
        </header>
        <main className="perfil__conteudo calibrar">
          <p className="mono perfil__num">Guia da marca · teste</p>
          <h1 className="perfil__titulo">Isso soa como a sua marca?</h1>
          <p className="entrevista__intro">
            A IA criou 3 peças seguindo o guia. Se alguma não soar como você, toque em "Isso não é a minha marca" e conte o porquê. Cada correção vira uma regra nova.
          </p>
          <ol className="calibrar__lista">
            {teste.map((p, i) => (
              <li key={`${i}-${p.roteiro.titulo}`} className="calibrar__peca">
                <PecaDeTeste peca={p} perfil={atual} />
                <div className="calibrar__lado">
                  <p className="calibrar__legenda">{p.roteiro.legenda}</p>
                  <button type="button" className="ficha calibrar__soa" aria-pressed={Boolean(soam[i])} onClick={() => setSoam((s) => ({ ...s, [i]: !s[i] }))}>
                    Soa como a gente
                  </button>
                  {!soam[i] && <NaoEMinhaMarca roteiro={p.roteiro} regras={regras} onSalvar={juntar} />}
                </div>
              </li>
            ))}
          </ol>
          {novas > 0 && <p className="calibrar__resumo" role="status">{novas === 1 ? '1 regra nova entrou no guia.' : `${novas} regras novas entraram no guia.`} Gere de novo para ver a diferença.</p>}
          {erro && <p className="campo__erro" role="alert">{erro}</p>}
          <div className="perfil__acoes">
            <button type="button" className="botao botao--destaque" onClick={() => onSair(atual)}>
              {conferidas === teste.length ? 'Pronto, é a minha marca' : 'Concluir'}
            </button>
            <button type="button" className="perfil__depois" onClick={() => testar()}>Gerar outras 3 peças</button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="perfil">
      <header className="perfil__topo">
        <button type="button" className="botao botao--fantasma" onClick={() => onSair(atual === perfil ? null : atual)}>Voltar</button>
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
            <button type="button" className="botao botao--destaque" onClick={() => salvar(true)} disabled={salvando || !regras.some((r) => r.trim())}>
              {salvando ? 'Salvando...' : 'Salvar e testar com 3 peças'}
            </button>
            <button type="button" className="botao botao--fantasma" onClick={() => salvar(false)} disabled={salvando || !regras.some((r) => r.trim())}>Salvar sem testar</button>
            <button type="button" className="perfil__depois" onClick={() => { setEtapa(0); rolarParaCima() }}>Refazer a entrevista</button>
          </div>
        </main>
      )}
    </div>
  )
}

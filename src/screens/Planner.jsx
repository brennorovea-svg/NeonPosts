import { useEffect, useMemo, useState } from 'react'
import { agendar, chaveDoDia, horaDe, juntarDiaEHora, LEMBRETES, mudarAgenda, padraoDaSemana, REDES, tirarDaAgenda } from '../lib/agenda.js'
import { avisosDisponiveis, avisosNegados } from '../lib/avisos.js'
import { enderecoDaImagem } from '../lib/perfil.js'
import './Planner.css'

// Planner: calendário do mês no computador, lista da semana no celular.
// Cada marcação tem rede (cor), formato (quadrado = post, alto = story) e hora.
// Tocar num dia abre o painel do dia: o que está marcado, criar a peça, postar agora.

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const porExtenso = (d, opcoes) => d.toLocaleDateString('pt-BR', opcoes)
const comMaiuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1)
const tituloDaSemana = (inicio) => { const fim = somarDias(inicio, 6); return inicio.getMonth() === fim.getMonth() ? `${inicio.getDate()} a ${porExtenso(fim, { day: 'numeric', month: 'long' })}` : `${porExtenso(inicio, { day: 'numeric', month: 'long' })} a ${porExtenso(fim, { day: 'numeric', month: 'long' })}` }
const inicioDaSemana = (d) => { const r = new Date(d.getFullYear(), d.getMonth(), d.getDate()); r.setDate(r.getDate() - ((r.getDay() + 6) % 7)); return r }
const somarDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const Forma = ({ formato }) => (
  <svg className="planner__forma" viewBox="0 0 24 24" aria-hidden="true">
    {formato === 'story' ? <rect x="7" y="3" width="10" height="18" rx="2.5" /> : <rect x="3" y="3" width="18" height="18" rx="2.5" />}
  </svg>
)
const Ponto = ({ rede }) => <span className="planner__ponto" style={{ background: REDES[rede]?.cor }} aria-hidden="true" />

// Legenda da versão escolhida da peça (a mesma regra da tela Criar).
function legendaDe(peca) {
  if (!peca) return ''
  const versoes = [...(peca.versoes || []), { roteiro: peca.roteiro }]
  const r = versoes[Math.min(peca.escolhida ?? versoes.length - 1, versoes.length - 1)]?.roteiro
  return r ? `${r.legenda || ''}\n\n${(r.hashtags || []).join(' ')}`.trim() : ''
}

function Miniatura({ peca, formato }) {
  const [src, setSrc] = useState(null)
  useEffect(() => { enderecoDaImagem(peca?.imagem).then(setSrc) }, [peca?.imagem])
  return (
    <div className={`planner__arte planner__arte--${formato}${peca ? '' : ' planner__arte--vazia'}`}>
      {src ? <img src={src} alt="" /> : <Forma formato={formato} />}
    </div>
  )
}

export default function Planner({ negocioId, perfil, itens, pecas, avisos, onAtivarAvisos, onMudou, onCriar, onAbrirPeca, onFaixa, abrir }) {
  const hoje = useMemo(() => new Date(), [])
  const [mes, setMes] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1))
  const [semana, setSemana] = useState(inicioDaSemana(hoje))
  const [visao, setVisao] = useState('mes') // no celular: 'mes' ou 'semana'
  const [dia, setDia] = useState(null) // chave do dia aberto
  const [planejando, setPlanejando] = useState(false)
  const [novo, setNovo] = useState({ titulo: '', redes: ['instagram'], formatos: ['post'], hora: '12:00', lembrete: 10 })
  // Liga ou desliga uma opção da lista, sem deixar a lista vazia.
  const alternar = (chave, valor) => setNovo((n) => ({ ...n, [chave]: n[chave].includes(valor) ? (n[chave].length > 1 ? n[chave].filter((v) => v !== valor) : n[chave]) : [...n[chave], valor] }))
  const [mudandoDia, setMudandoDia] = useState(null) // id do item com o campo de data aberto
  const [erro, setErro] = useState('')
  const [arrastando, setArrastando] = useState(null)
  const [ocupado, setOcupado] = useState(null) // id do item sendo compartilhado
  const [avisoPost, setAvisoPost] = useState('')
  const pecaPorId = useMemo(() => Object.fromEntries((pecas || []).map((p) => [p.id, p])), [pecas])
  const porDia = useMemo(() => {
    const mapa = {}
    for (const i of itens) (mapa[chaveDoDia(new Date(i.quando))] ??= []).push(i)
    return mapa
  }, [itens])

  // Quem veio pelo aviso cai direto no dia da peça.
  useEffect(() => {
    if (!abrir) return
    const d = new Date(abrir.quando)
    setMes(new Date(d.getFullYear(), d.getMonth(), 1))
    setSemana(inicioDaSemana(d))
    setDia(chaveDoDia(d))
  }, [abrir])

  useEffect(() => {
    const fim = new Date(mes.getFullYear(), mes.getMonth() + 1, 1)
    onFaixa?.(somarDias(mes, -7), somarDias(fim, 7))
  }, [mes])

  const celulas = useMemo(() => {
    const primeiro = inicioDaSemana(mes)
    return Array.from({ length: 42 }, (_, i) => {
      const d = somarDias(primeiro, i)
      return { data: d, chave: chaveDoDia(d), fora: d.getMonth() !== mes.getMonth(), hoje: chaveDoDia(d) === chaveDoDia(hoje) }
    })
  }, [mes, hoje])
  const diasDaSemana = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = somarDias(semana, i); return { data: d, chave: chaveDoDia(d), hoje: chaveDoDia(d) === chaveDoDia(hoje) } }), [semana, hoje])

  function abrirDia(chave, comForm = false) {
    setDia(chave)
    setPlanejando(comForm)
    setErro('')
    setMudandoDia(null)
    const d = juntarDiaEHora(chave, '12:00')
    setSemana(inicioDaSemana(d))
    window.scrollTo({ top: 0 })
  }

  async function tentar(acao) {
    setErro('')
    try { await acao(); onMudou() } catch { setErro('Não deu para salvar agora. Confira a internet e tente de novo.') }
  }

  function planejar() {
    if (!novo.titulo.trim()) { setErro('Dê um nome para a postagem.'); return }
    // Uma marcação por rede e por formato escolhidos (post e story no Instagram viram duas).
    tentar(async () => {
      for (const rede of novo.redes) {
        for (const formato of novo.formatos) {
          await agendar(negocioId, { titulo: novo.titulo, rede, formato, quando: juntarDiaEHora(dia, novo.hora), lembrete_minutos: novo.lembrete })
        }
      }
      setNovo((n) => ({ ...n, titulo: '' }))
      setPlanejando(false)
    })
  }

  function soltar(chave) {
    if (!arrastando) return
    const item = itens.find((i) => i.id === arrastando)
    setArrastando(null)
    if (!item || chaveDoDia(new Date(item.quando)) === chave) return
    tentar(() => mudarAgenda(item.id, { quando: juntarDiaEHora(chave, horaDe(new Date(item.quando))) }))
  }

  // Postar agora: baixa a arte, copia a legenda e abre o compartilhar do aparelho.
  async function postar(item) {
    const peca = pecaPorId[item.peca]
    if (!peca?.imagem) { onAbrirPeca(peca, new Date(item.quando)); return }
    setOcupado(item.id)
    setAvisoPost('')
    try {
      const legenda = legendaDe(peca)
      const resposta = await fetch(await enderecoDaImagem(peca.imagem))
      const arquivo = new File([await resposta.blob()], `${item.titulo.replace(/\s+/g, '-').toLowerCase()}.png`, { type: 'image/png' })
      try { await navigator.clipboard.writeText(legenda) } catch { /* sem a área de transferência, a legenda fica na tela */ }
      let feito = false
      if (navigator.canShare?.({ files: [arquivo] })) {
        try { await navigator.share({ files: [arquivo], text: legenda }); feito = true } catch (e) { if (e.name === 'AbortError') return }
      }
      if (!feito) {
        const link = document.createElement('a')
        link.href = URL.createObjectURL(arquivo)
        link.download = arquivo.name
        link.click()
        setTimeout(() => URL.revokeObjectURL(link.href), 4000)
        setAvisoPost('Arte baixada e legenda copiada. Agora é só postar na rede.')
      }
      await mudarAgenda(item.id, { postado_em: new Date().toISOString() })
      onMudou()
    } catch {
      setErro('Não deu para abrir a peça agora. Tente de novo.')
    } finally {
      setOcupado(null)
    }
  }

  const padrao = padraoDaSemana(perfil)
  const nestaSemana = diasDaSemana.flatMap((d) => porDia[d.chave] || [])
  const contagem = { posts: nestaSemana.filter((i) => i.formato === 'post').length, stories: nestaSemana.filter((i) => i.formato === 'story').length }
  const faltam = { posts: Math.max(0, padrao.posts - contagem.posts), stories: Math.max(0, padrao.stories - contagem.stories) }

  const cabecalho = (
    <header className="planner__topo">
      <div className="planner__navegar">
        <button type="button" className="planner__seta" aria-label={dia || visao === 'semana' ? 'Semana anterior' : 'Mês anterior'} onClick={() => (dia || visao === 'semana' ? setSemana((s) => somarDias(s, -7)) : setMes((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1)))}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <h1 className="planner__titulo">
          {dia || visao === 'semana'
            ? tituloDaSemana(semana)
            : comMaiuscula(porExtenso(mes, { month: 'long', year: 'numeric' }))}
        </h1>
        <button type="button" className="planner__seta" aria-label={dia || visao === 'semana' ? 'Próxima semana' : 'Próximo mês'} onClick={() => (dia || visao === 'semana' ? setSemana((s) => somarDias(s, 7)) : setMes((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1)))}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>
        <button type="button" className="botao botao--fantasma planner__hoje" onClick={() => { setMes(new Date(hoje.getFullYear(), hoje.getMonth(), 1)); setSemana(inicioDaSemana(hoje)); if (dia) setDia(chaveDoDia(hoje)) }}>Hoje</button>
      </div>
      <div className="planner__direita">
        <ul className="planner__legenda" aria-label="Redes">
          {Object.entries(REDES).map(([chave, r]) => <li key={chave}><Ponto rede={chave} />{r.nome}</li>)}
        </ul>
        {!dia && (
          <div className="planner__visoes" role="group" aria-label="Ver por">
            <button type="button" className="planner__visao" aria-pressed={visao === 'mes'} onClick={() => setVisao('mes')}>Mês</button>
            <button type="button" className="planner__visao" aria-pressed={visao === 'semana'} onClick={() => setVisao('semana')}>Semana</button>
          </div>
        )}
        <button type="button" className="botao botao--destaque planner__planejar" onClick={() => abrirDia(dia || chaveDoDia(hoje), true)}>Planejar peça</button>
      </div>
    </header>
  )

  const avisoDeLembrete = avisosDisponiveis() && !avisos && (
    <div className="planner__avisos">
      <p>{avisosNegados() ? 'Os avisos estão bloqueados neste navegador. Libere nas configurações do site para receber o lembrete na hora de postar.' : 'Quer um aviso na hora de postar? Com o app aberto ou instalado, a gente avisa e abre o compartilhar.'}</p>
      {!avisosNegados() && <button type="button" className="botao botao--fantasma" onClick={onAtivarAvisos}>Ativar avisos</button>}
    </div>
  )

  const marcacao = (item, compacto = false) => (
    <span key={item.id} className={`planner__item${item.postado_em ? ' planner__item--postado' : ''}`} draggable={!compacto} onDragStart={() => setArrastando(item.id)} onDragEnd={() => setArrastando(null)}>
      <Ponto rede={item.rede} />
      {!compacto && <Forma formato={item.formato} />}
      {!compacto && <span className="planner__item-titulo">{item.titulo}</span>}
      {!compacto && <span className="mono planner__item-hora">{horaDe(new Date(item.quando))}</span>}
    </span>
  )

  // Vista do mês (no celular, só pontos nos dias).
  const grade = (
    <div className="planner__mes">
      <div className="planner__semana-nomes" aria-hidden="true">{DIAS.map((d) => <span key={d}>{d}</span>)}</div>
      <div className="planner__grade">
        {celulas.map((c) => (
          <button
            key={c.chave} type="button"
            className={`planner__dia${c.fora ? ' planner__dia--fora' : ''}${c.hoje ? ' planner__dia--hoje' : ''}${arrastando ? ' planner__dia--alvo' : ''}`}
            onClick={() => abrirDia(c.chave)}
            onDragOver={(e) => { if (arrastando) e.preventDefault() }}
            onDrop={(e) => { e.preventDefault(); soltar(c.chave) }}
            aria-label={`${porExtenso(c.data, { weekday: 'long', day: 'numeric', month: 'long' })}, ${(porDia[c.chave] || []).length} marcadas`}
          >
            <span className="mono planner__numero">{c.data.getDate()}</span>
            <span className="planner__itens">
              {(porDia[c.chave] || []).map((i) => marcacao(i))}
            </span>
            <span className="planner__pontos">
              {(porDia[c.chave] || []).map((i) => marcacao(i, true))}
            </span>
          </button>
        ))}
      </div>
      <p className="planner__dica">Arraste uma peça para outro dia para mudar a data. O ponto é a rede; o quadrado é post, o retângulo alto é story.</p>
    </div>
  )

  // Lista da semana (celular, e a coluna da esquerda quando um dia está aberto).
  const lista = (
    <div className="planner__lista">
      {diasDaSemana.map((d) => {
        const doDia = porDia[d.chave] || []
        return (
          <button key={d.chave} type="button" className={`planner__dia-linha${dia === d.chave ? ' planner__dia-linha--aberto' : ''}${d.hoje ? ' planner__dia-linha--hoje' : ''}`} onClick={() => abrirDia(d.chave)}>
            <span className="planner__dia-cabeca">
              <span className="mono planner__dia-numero">{d.data.getDate()}</span>
              <span className="planner__dia-nome">{DIAS[(d.data.getDay() + 6) % 7]}</span>
              {d.hoje && <span className="planner__hoje-rotulo">Hoje</span>}
            </span>
            <span className="planner__dia-itens">
              {doDia.map((i) => (
                <span key={i.id} className={`planner__item${i.postado_em ? ' planner__item--postado' : ''}`}>
                  <Ponto rede={i.rede} /><Forma formato={i.formato} /><span className="planner__item-titulo">{i.titulo}</span><span className="mono planner__item-hora">{horaDe(new Date(i.quando))}</span>
                </span>
              ))}
              {doDia.length === 0 && <span className="planner__nada">Nada planejado</span>}
            </span>
          </button>
        )
      })}
    </div>
  )

  const doDiaAberto = dia ? (porDia[dia] || []) : []
  const painelDoDia = dia && (
    <section className="planner__painel" aria-label={`Dia ${dia}`}>
      <header className="planner__painel-topo">
        <button type="button" className="botao botao--fantasma planner__voltar" onClick={() => { setDia(null); setPlanejando(false) }}>Voltar</button>
        <div>
          <h2 className="planner__painel-titulo">{comMaiuscula(porExtenso(juntarDiaEHora(dia, '12:00'), { weekday: 'long', day: 'numeric', month: 'long' }))}</h2>
          <p className="planner__painel-sub">{doDiaAberto.length === 0 ? 'Nada planejado ainda.' : `${doDiaAberto.length} ${doDiaAberto.length === 1 ? 'peça planejada' : 'peças planejadas'}.`}</p>
        </div>
        {!planejando && <button type="button" className="botao botao--destaque planner__nova" onClick={() => setPlanejando(true)}>Planejar peça</button>}
      </header>

      {planejando && (
        <form className="planner__form" onSubmit={(e) => { e.preventDefault(); planejar() }}>
          <div className="campo">
            <label htmlFor="planner-titulo">O que vai postar</label>
            <input id="planner-titulo" maxLength={120} value={novo.titulo} autoFocus onChange={(e) => setNovo((n) => ({ ...n, titulo: e.target.value }))} placeholder="Ex.: promoção do combo de sexta" />
          </div>
          <div className="campo">
            <span className="campo__rotulo">Onde vai postar</span>
            <p className="campo__ajuda">Pode marcar mais de uma: cada rede vira uma marcação.</p>
            <div className="fichas">
              {Object.entries(REDES).map(([chave, r]) => (
                <button key={chave} type="button" className="ficha" aria-pressed={novo.redes.includes(chave)} onClick={() => alternar('redes', chave)}><Ponto rede={chave} />{r.nome}</button>
              ))}
            </div>
          </div>
          <div className="planner__form-linha">
            <div className="campo">
              <span className="campo__rotulo">Formato (um ou os dois)</span>
              <div className="fichas">
                {[['post', 'Post'], ['story', 'Story']].map(([v, r]) => (
                  <button key={v} type="button" className="ficha" aria-pressed={novo.formatos.includes(v)} onClick={() => alternar('formatos', v)}>{r}</button>
                ))}
              </div>
            </div>
            <div className="campo campo--curto">
              <label htmlFor="planner-hora">Hora</label>
              <input id="planner-hora" type="time" value={novo.hora} onChange={(e) => setNovo((n) => ({ ...n, hora: e.target.value }))} />
            </div>
            <div className="campo">
              <label htmlFor="planner-lembrete">Avisar</label>
              <select id="planner-lembrete" className="planner__select" value={novo.lembrete} onChange={(e) => setNovo((n) => ({ ...n, lembrete: Number(e.target.value) }))}>
                {LEMBRETES.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="planner__acoes-linha">
            <button type="button" className="botao botao--fantasma" onClick={() => setPlanejando(false)}>Cancelar</button>
            <button type="submit" className="botao botao--primario">Marcar no planner</button>
          </div>
        </form>
      )}

      {doDiaAberto.map((item) => {
        const peca = pecaPorId[item.peca]
        const quando = new Date(item.quando)
        return (
          <article key={item.id} className={`planner__cartao${item.postado_em ? ' planner__cartao--postado' : ''}`}>
            <Miniatura peca={peca} formato={item.formato} />
            <div className="planner__cartao-corpo">
              <div className="planner__cartao-tags">
                <span className="planner__tag"><Ponto rede={item.rede} />{REDES[item.rede]?.nome}</span>
                <span className="planner__tag">{item.formato === 'story' ? 'Story' : 'Post'}</span>
                <span className="mono planner__cartao-hora">{horaDe(quando)}</span>
                {item.postado_em && <span className="planner__tag planner__tag--ok">Postada</span>}
              </div>
              <h3 className="planner__cartao-titulo">{item.titulo}</h3>
              {peca ? <p className="planner__cartao-texto">{legendaDe(peca).split('\n')[0]}</p> : <p className="planner__cartao-texto">A peça ainda não foi criada. Crie quando quiser; ela já entra neste dia.</p>}
              {!item.postado_em && (
                <div className="planner__cartao-lembrete">
                  <label htmlFor={`lembrete-${item.id}`}>Avisar</label>
                  <select id={`lembrete-${item.id}`} className="planner__select" value={item.lembrete_minutos} onChange={(e) => tentar(() => mudarAgenda(item.id, { lembrete_minutos: Number(e.target.value), avisado_em: null }))}>
                    {LEMBRETES.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                  </select>
                  <span className="planner__cartao-nota">{avisos ? 'Na hora, o aviso abre o compartilhar com a legenda copiada.' : 'Ative os avisos para receber o lembrete.'}</span>
                </div>
              )}
              <div className="planner__cartao-acoes">
                {peca ? (
                  <>
                    {!item.postado_em && <button type="button" className="botao botao--destaque" disabled={ocupado === item.id} onClick={() => postar(item)}>{ocupado === item.id ? 'Abrindo...' : 'Postar agora'}</button>}
                    <button type="button" className="botao botao--fantasma" onClick={() => onAbrirPeca(peca, quando)}>Abrir a peça</button>
                  </>
                ) : (
                  <button type="button" className="botao botao--destaque" onClick={() => onCriar({ agendaId: item.id, titulo: item.titulo, formato: item.formato, quando })}>Criar a peça</button>
                )}
                <button type="button" className="botao botao--fantasma" onClick={() => setMudandoDia(mudandoDia === item.id ? null : item.id)}>Mudar o dia</button>
                <button type="button" className="botao botao--fantasma" onClick={() => tentar(() => tirarDaAgenda(item.id))}>Tirar</button>
              </div>
              {mudandoDia === item.id && (
                <div className="planner__mudar">
                  <input type="date" aria-label="Novo dia" defaultValue={chaveDoDia(quando)} onChange={(e) => { if (e.target.value) { tentar(() => mudarAgenda(item.id, { quando: juntarDiaEHora(e.target.value, horaDe(quando)), avisado_em: null })); setMudandoDia(null) } }} />
                  <input type="time" aria-label="Nova hora" defaultValue={horaDe(quando)} onChange={(e) => { if (e.target.value) tentar(() => mudarAgenda(item.id, { quando: juntarDiaEHora(chaveDoDia(quando), e.target.value), avisado_em: null })) }} />
                </div>
              )}
            </div>
          </article>
        )
      })}

      {(padrao.posts > 0 || padrao.stories > 0) && (faltam.posts > 0 || faltam.stories > 0) && (
        <div className="planner__sugestao">
          <div>
            <strong>Pelo seu padrão, esta semana ainda cabe {[faltam.posts > 0 && `${faltam.posts} ${faltam.posts === 1 ? 'post' : 'posts'}`, faltam.stories > 0 && `${faltam.stories} ${faltam.stories === 1 ? 'story' : 'stories'}`].filter(Boolean).join(' e ')}.</strong>
            <span>Você disse que posta {padrao.posts} no feed e {padrao.stories} stories por semana. Esta semana tem {contagem.posts} e {contagem.stories}.</span>
          </div>
          <button type="button" className="botao botao--fantasma" onClick={() => { setNovo((n) => ({ ...n, formatos: [faltam.posts > 0 ? 'post' : 'story'] })); setPlanejando(true) }}>Planejar {faltam.posts > 0 ? 'um post' : 'um story'}</button>
        </div>
      )}
      {avisoPost && <p className="planner__ok" role="status">{avisoPost}</p>}
    </section>
  )

  return (
    <div className={`planner${dia ? ' planner--dia' : ''}`}>
      {cabecalho}
      {erro && <p className="campo__erro" role="alert">{erro}</p>}
      {avisoDeLembrete}
      {dia ? (
        <div className="planner__duas">
          {lista}
          {painelDoDia}
        </div>
      ) : (
        <>
          <div className={`planner__so-mes${visao === 'semana' ? ' planner__so-mes--escondido' : ''}`}>{grade}</div>
          <div className={`planner__so-semana${visao === 'mes' ? ' planner__so-semana--escondido' : ''}`}>{lista}</div>
        </>
      )}
    </div>
  )
}

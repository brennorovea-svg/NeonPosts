import { useEffect, useMemo, useState } from 'react'
import { agendar, chaveDoDia, horaDe, juntarDiaEHora, LEMBRETES, mudarAgenda, padraoDaSemana, tirarDaAgenda } from '../lib/agenda.js'
import { avisosDisponiveis, avisosNegados } from '../lib/avisos.js'
import { enderecoDaImagem } from '../lib/perfil.js'
import { gerarGrade, ideiaDoDia } from '../lib/preencher.js'
import { avisoDoResultado, baixarArquivo, ehAnimado, entregar, legendaDe, nomeDoArquivo, opcoesDaPeca, podeCompartilhar, prepararArquivo } from '../lib/publicar.js'
import { ehIphone, instalado } from '../lib/push.js'
import Instalar from '../components/Instalar.jsx'
import './Planner.css'

// Planner: calendário do mês no computador, lista da semana no celular.
// Cada marcação tem formato (quadrado = post, alto = story) e hora. Sem rede: quem escolhe o app é a pessoa, na hora de postar.
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
const Ponto = () => <span className="planner__ponto" aria-hidden="true" />

function Miniatura({ peca, formato }) {
  const [src, setSrc] = useState(null)
  useEffect(() => { enderecoDaImagem(peca?.imagem).then(setSrc) }, [peca?.imagem])
  return (
    <div className={`planner__arte planner__arte--${formato}${peca ? '' : ' planner__arte--vazia'}`}>
      {src ? <img src={src} alt="" /> : <Forma formato={formato} />}
    </div>
  )
}

export default function Planner({ negocioId, perfil, itens, pecas, avisos, push = false, onAtivarAvisos, onMandarParaCelular = null, onMudou, onCriar, onAbrirPeca, onFaixa, abrir, saldo = 0, onPlanos }) {
  const hoje = useMemo(() => new Date(), [])
  const [mes, setMes] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1))
  const [semana, setSemana] = useState(inicioDaSemana(hoje))
  const [visao, setVisao] = useState('mes') // no celular: 'mes' ou 'semana'
  const [dia, setDia] = useState(null) // chave do dia aberto
  const [planejando, setPlanejando] = useState(false)
  const [novo, setNovo] = useState({ titulo: '', formatos: ['post'], hora: '12:00', lembrete: 10 })
  // Liga ou desliga uma opção da lista, sem deixar a lista vazia.
  const alternar = (chave, valor) => setNovo((n) => ({ ...n, [chave]: n[chave].includes(valor) ? (n[chave].length > 1 ? n[chave].filter((v) => v !== valor) : n[chave]) : [...n[chave], valor] }))
  const [editando, setEditando] = useState(null) // { id, titulo, formato, dia, hora } do item em edição
  const [erro, setErro] = useState('')
  const [arrastando, setArrastando] = useState(null)
  const [excluindo, setExcluindo] = useState(null) // id do item esperando o segundo toque em Excluir
  const [confirmando, setConfirmando] = useState(null) // { id, resultado } do item esperando "postou?" depois do compartilhar
  const [prontos, setProntos] = useState({})
  const [celular, setCelular] = useState(null) // { id, estado: 'enviando' | 'enviado' | 'nenhum' } do Mandar para o celular // id da marcação -> { arquivo, progresso, erro }: o arquivo pronto antes do toque
  const [sugestao, setSugestao] = useState(null) // Preencher o mês: a grade sugerida, esperando a pessoa aprovar
  const [fora, setFora] = useState([]) // ids que a pessoa tirou da grade
  const [marcando, setMarcando] = useState(false)
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
    setSugestao(null) // a grade sugerida é do mês que estava aberto
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
    setEditando(null); setConfirmando(null); setExcluindo(null)
    const d = juntarDiaEHora(chave, '12:00')
    setSemana(inicioDaSemana(d))
    window.scrollTo({ top: 0 })
  }

  // Fecha o dia e volta para o calendário do mês desse dia.
  function fecharDia() {
    if (dia) { const d = juntarDiaEHora(dia, '12:00'); setMes(new Date(d.getFullYear(), d.getMonth(), 1)) }
    setDia(null); setPlanejando(false); setEditando(null); setConfirmando(null); setExcluindo(null)
    setVisao('mes')
  }

  // Esc também fecha o dia aberto (menos quando está digitando num campo).
  useEffect(() => {
    if (!dia) return
    const tecla = (e) => { if (e.key === 'Escape' && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) fecharDia() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [dia])

  async function tentar(acao) {
    setErro('')
    try { await acao(); onMudou(); return true } catch { setErro('Não deu para salvar agora. Confira a internet e tente de novo.'); return false }
  }

  function planejar() {
    if (!novo.titulo.trim()) { setErro('Dê um nome para a postagem.'); return }
    // Uma marcação por formato escolhido (post e story viram duas).
    tentar(async () => {
      for (const formato of novo.formatos) {
        await agendar(negocioId, { titulo: novo.titulo, formato, quando: juntarDiaEHora(dia, novo.hora), lembrete_minutos: novo.lembrete })
      }
      setNovo((n) => ({ ...n, titulo: '' }))
      setPlanejando(false)
    })
  }

  // Preencher o mês: o que sobra no plano, menos o que já está marcado e ainda sem post neste mês.
  function abrirPreencher() {
    const fimDoMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 1)
    const reservados = itens.filter((i) => !i.peca && !i.postado_em && new Date(i.quando) >= hoje && new Date(i.quando) < fimDoMes).length
    const cabe = Math.max(0, saldo - reservados)
    const doMes = itens.filter((i) => { const d = new Date(i.quando); return d.getMonth() === mes.getMonth() && d.getFullYear() === mes.getFullYear() })
    setSugestao({ lista: gerarGrade({ perfil, itens: doMes, mes, saldo: cabe, hoje }), cabe })
    setFora([])
    setErro('')
    window.scrollTo({ top: 0 })
  }
  async function marcarGrade() {
    const lista = sugestao.lista.filter((g) => !fora.includes(g.id))
    setMarcando(true)
    const deu = await tentar(async () => {
      for (const g of lista) await agendar(negocioId, { titulo: g.titulo, formato: g.formato, quando: g.quando })
    })
    setMarcando(false)
    if (deu) setSugestao(null)
  }

  function soltar(chave) {
    if (!arrastando) return
    const item = itens.find((i) => i.id === arrastando)
    setArrastando(null)
    if (!item || chaveDoDia(new Date(item.quando)) === chave) return
    tentar(() => mudarAgenda(item.id, { quando: juntarDiaEHora(chave, horaDe(new Date(item.quando))) }))
  }

  // Editar: título, formato (só sem peça), dia e hora de uma marcação. Mudou a hora, o aviso volta a valer.
  async function salvarEdicao(item) {
    const e = editando
    const quando = juntarDiaEHora(e.dia, e.hora)
    const mudou = quando.getTime() !== new Date(item.quando).getTime()
    const deu = await tentar(() => mudarAgenda(item.id, { titulo: e.titulo.trim().slice(0, 120), formato: e.formato, quando, ...(mudou ? { avisado_em: null } : {}) }))
    if (!deu) return
    setEditando(null)
    if (mudou) setDia(chaveDoDia(quando))
  }

  // Postar agora: com o arquivo já pronto, copia a legenda e abre o compartilhar do aparelho no mesmo toque.
  async function postar(item) {
    const pronto = prontos[item.id]
    if (!pronto?.arquivo) return
    setErro('')
    const r = await entregar(pronto.arquivo, legendaDe(pecaPorId[item.peca]))
    if (r === 'cancelou') return
    // Só vira "Postada" quando a pessoa confirma: o compartilhar abrir não quer dizer que postou (Brenno, 30/10).
    setConfirmando({ id: item.id, resultado: r })
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
        {dia && (
          <button type="button" className="botao botao--fantasma planner__ver-mes" onClick={fecharDia}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" /></svg>
            Ver o mês
          </button>
        )}
        <button type="button" className="botao botao--fantasma planner__hoje" onClick={() => { setMes(new Date(hoje.getFullYear(), hoje.getMonth(), 1)); setSemana(inicioDaSemana(hoje)); if (dia) setDia(chaveDoDia(hoje)) }}>Hoje</button>
      </div>
      <div className="planner__direita">
        {!dia && (
          <div className="planner__visoes" role="group" aria-label="Ver por">
            <button type="button" className="planner__visao" aria-pressed={visao === 'mes'} onClick={() => setVisao('mes')}>Mês</button>
            <button type="button" className="planner__visao" aria-pressed={visao === 'semana'} onClick={() => setVisao('semana')}>Semana</button>
          </div>
        )}
        {!dia && !sugestao && <button type="button" className="botao botao--fantasma planner__preencher" onClick={abrirPreencher}>Preencher o mês</button>}
        <button type="button" className="botao botao--destaque planner__planejar" onClick={() => { setSugestao(null); abrirDia(dia || chaveDoDia(hoje), true) }}>Planejar post</button>
      </div>
    </header>
  )

  // No iPhone o aviso com o app fechado só chega com o app na tela inicial: convida antes de pedir o aviso.
  const avisoDeLembrete = ehIphone() && !instalado() ? <Instalar compacto />
    : avisosDisponiveis() && !avisos && (
    <div className="planner__avisos">
      <p>{avisosNegados() ? 'Os avisos estão bloqueados neste navegador. Libere nas configurações do site para receber o lembrete na hora de postar.' : 'Quer um aviso na hora de postar, mesmo com o app fechado? A gente avisa e abre o compartilhar.'}</p>
      {!avisosNegados() && <button type="button" className="botao botao--fantasma" onClick={onAtivarAvisos}>Ativar avisos</button>}
    </div>
  )

  // "Mandar para o celular" (computador): o servidor avisa os celulares desta conta com o post pronto.
  async function mandarParaCelular(item) {
    setCelular({ id: item.id, estado: 'enviando' })
    try { setCelular({ id: item.id, estado: (await onMandarParaCelular({ agenda: item.id })) > 0 ? 'enviado' : 'nenhum' }) } catch { setCelular(null); setErro('Não deu para mandar agora. Tente de novo.') }
  }

  const marcacao = (item, compacto = false) => (
    <span key={item.id} className={`planner__item${item.postado_em ? ' planner__item--postado' : ''}`} draggable={!compacto} onDragStart={() => setArrastando(item.id)} onDragEnd={() => setArrastando(null)}>
      {compacto && <Ponto />}
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
      <p className="planner__dica">Arraste um post para outro dia para mudar a data. O quadrado é post, o retângulo alto é story.</p>
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
                  <Forma formato={i.formato} /><span className="planner__item-titulo">{i.titulo}</span><span className="mono planner__item-hora">{horaDe(new Date(i.quando))}</span>
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

  // Arquivo de cada post do dia pronto antes do toque: o PNG guardado sai na hora; o animado
  // grava no aparelho, um por vez, com a barra. Assim o toque em Postar abre o compartilhar sem espera.
  const assinaturaDoDia = doDiaAberto.map((i) => `${i.id}:${i.peca}:${i.postado_em || ''}`).join(',')
  useEffect(() => {
    setProntos({})
    if (!dia) return
    const controle = new AbortController()
    let vivo = true
    const marcar = (id, valor) => { if (vivo) setProntos((p) => ({ ...p, [id]: { ...(p[id] || {}), ...valor } })) }
    const fila = doDiaAberto.filter((i) => i.peca && !i.postado_em && pecaPorId[i.peca])
    fila.sort((a, b) => Number(ehAnimado(pecaPorId[a.peca].modelo)) - Number(ehAnimado(pecaPorId[b.peca].modelo)))
    ;(async () => {
      for (const item of fila) {
        const peca = pecaPorId[item.peca]
        const animado = ehAnimado(peca.modelo)
        const nome = nomeDoArquivo(item.titulo, peca, animado)
        try {
          let arquivo
          if (!animado && peca.imagem) {
            const resposta = await fetch(await enderecoDaImagem(peca.imagem), { signal: controle.signal })
            arquivo = new File([await resposta.blob()], `${nome}.png`, { type: 'image/png' })
          } else {
            if (animado) marcar(item.id, { progresso: 0 })
            const opcoes = await opcoesDaPeca(peca, perfil)
            ;({ arquivo } = await prepararArquivo(opcoes, { video: animado, nome, aoAvancar: (p) => marcar(item.id, { progresso: p }), sinal: controle.signal }))
          }
          if (!vivo) return
          marcar(item.id, { arquivo, progresso: null })
        } catch (e) {
          if (e.name === 'AbortError') return
          marcar(item.id, { erro: true, progresso: null })
        }
      }
    })()
    return () => { vivo = false; controle.abort() }
  }, [dia, assinaturaDoDia, pecas])
  const painelDoDia = dia && (
    <section className="planner__painel" aria-label={`Dia ${dia}`}>
      <header className="planner__painel-topo">
        <button type="button" className="botao botao--fantasma planner__voltar" onClick={fecharDia}>Voltar</button>
        <div>
          <h2 className="planner__painel-titulo">{comMaiuscula(porExtenso(juntarDiaEHora(dia, '12:00'), { weekday: 'long', day: 'numeric', month: 'long' }))}</h2>
          <p className="planner__painel-sub">{doDiaAberto.length === 0 ? 'Nada planejado ainda.' : `${doDiaAberto.length} ${doDiaAberto.length === 1 ? 'post planejado' : 'posts planejados'}.`}</p>
        </div>
        {!planejando && <button type="button" className="botao botao--destaque planner__nova" onClick={() => setPlanejando(true)}>Planejar post</button>}
      </header>

      {planejando && (
        <form className="planner__form" onSubmit={(e) => { e.preventDefault(); planejar() }}>
          <div className="campo">
            <label htmlFor="planner-titulo">O que vai postar</label>
            <input id="planner-titulo" maxLength={120} value={novo.titulo} autoFocus onChange={(e) => setNovo((n) => ({ ...n, titulo: e.target.value }))} placeholder="Ex.: promoção do combo de sexta" />
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
                <span className="planner__tag">{peca && ehAnimado(peca.modelo) ? 'Animado' : item.formato === 'story' ? 'Story' : 'Post'}</span>
                <span className="mono planner__cartao-hora">{horaDe(quando)}</span>
                {item.postado_em && <span className="planner__tag planner__tag--ok">Postada</span>}
              </div>
              <h3 className="planner__cartao-titulo">{item.titulo}</h3>
              {peca ? <p className="planner__cartao-texto">{legendaDe(peca).split('\n')[0]}</p> : <p className="planner__cartao-texto">O post ainda não foi criado. Crie quando quiser; ele já entra neste dia.</p>}
              {!item.postado_em && (
                <div className="planner__cartao-lembrete">
                  <label htmlFor={`lembrete-${item.id}`}>Avisar</label>
                  <select id={`lembrete-${item.id}`} className="planner__select" value={item.lembrete_minutos} onChange={(e) => tentar(() => mudarAgenda(item.id, { lembrete_minutos: Number(e.target.value), avisado_em: null }))}>
                    {LEMBRETES.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                  </select>
                  <span className="planner__cartao-nota">{push ? 'Na hora, o aviso chega no celular mesmo com o app fechado.' : avisos ? 'Na hora, com o app aberto, o aviso abre o compartilhar.' : 'Ative os avisos para receber o lembrete.'}</span>
                </div>
              )}
              {confirmando?.id === item.id && !item.postado_em && (
                <div className="planner__confirmar" role="group" aria-label="Postou?">
                  <strong>{avisoDoResultado(confirmando.resultado).titulo}</strong>
                  <span>
                    {avisoDoResultado(confirmando.resultado).texto.replace('use o botão Copiar legenda', 'abra o post e toque em Copiar legenda')}
                    {!confirmando.resultado.startsWith('falhou') && ' Se já foi para a rede, marca como postada.'}
                  </span>
                  <div className="planner__confirmar-acoes">
                    <button type="button" className="botao botao--primario" onClick={async () => { if (await tentar(() => mudarAgenda(item.id, { postado_em: new Date().toISOString() }))) setConfirmando(null) }}>Sim, postei</button>
                    <button type="button" className="botao botao--fantasma" onClick={() => setConfirmando(null)}>Ainda não</button>
                    {confirmando.resultado.startsWith('falhou') && prontos[item.id]?.arquivo && <button type="button" className="botao botao--fantasma" onClick={() => baixarArquivo(prontos[item.id].arquivo)}>Baixar o arquivo</button>}
                  </div>
                </div>
              )}
              {celular?.id === item.id && celular.estado === 'enviado' && <p className="planner__ok">Mandado. No celular, toque no aviso e poste de lá.</p>}
              {celular?.id === item.id && celular.estado === 'nenhum' && <p className="planner__cartao-nota">Nenhum celular com avisos ligados. No celular, abra o Neonposts, vá em Redes e toque em Ativar avisos.</p>}
              <div className="planner__cartao-acoes">
                {peca ? (
                  <>
                    {!item.postado_em && (() => {
                      const pronto = prontos[item.id]
                      const rotulo = pronto?.progresso != null ? `Preparando o vídeo... ${Math.round(pronto.progresso * 100)}%`
                        : pronto?.erro ? 'Não deu para preparar'
                        : !pronto?.arquivo ? 'Preparando...'
                        : podeCompartilhar() ? 'Postar' : 'Baixar para postar'
                      return (
                        <span className="planner__postar">
                          <button type="button" className="botao botao--destaque" disabled={!pronto?.arquivo} onClick={() => postar(item)}>{rotulo}</button>
                          {pronto?.progresso != null && <span className="planner__barra" aria-hidden="true"><span style={{ transform: `scaleX(${pronto.progresso})` }} /></span>}
                        </span>
                      )
                    })()}
                    {!item.postado_em && !podeCompartilhar() && onMandarParaCelular && (
                      <button type="button" className="botao botao--fantasma" disabled={celular?.id === item.id && celular.estado === 'enviando'} onClick={() => mandarParaCelular(item)}>
                        {celular?.id === item.id && celular.estado === 'enviando' ? 'Mandando...' : 'Mandar para o celular'}
                      </button>
                    )}
                    <button type="button" className="botao botao--fantasma" onClick={() => onAbrirPeca(peca, quando)}>Abrir o post</button>
                  </>
                ) : (
                  <button type="button" className="botao botao--destaque" onClick={() => onCriar({ agendaId: item.id, titulo: item.titulo, formato: item.formato, quando })}>Criar o post</button>
                )}
                <button type="button" className="botao botao--fantasma" aria-expanded={editando?.id === item.id} onClick={() => setEditando(editando?.id === item.id ? null : { id: item.id, titulo: item.titulo, formato: item.formato, dia: chaveDoDia(quando), hora: horaDe(quando) })}>Editar</button>
                {excluindo === item.id
                  ? <button type="button" className="botao botao--perigo" onClick={() => { setExcluindo(null); tentar(() => tirarDaAgenda(item.id)) }}>Confirmar exclusão</button>
                  : <button type="button" className="botao botao--perigo" onClick={() => setExcluindo(item.id)}>Excluir</button>}
              </div>
              {editando?.id === item.id && (
                <form className="planner__editar" onSubmit={(e) => { e.preventDefault(); salvarEdicao(item) }}>
                  <div className="campo">
                    <label htmlFor={`editar-titulo-${item.id}`}>Título</label>
                    <input id={`editar-titulo-${item.id}`} value={editando.titulo} maxLength={120} onChange={(e) => setEditando((v) => ({ ...v, titulo: e.target.value }))} />
                  </div>
                  <div className="planner__form-linha">
                    {!peca && (
                      <div className="campo">
                        <span className="campo__rotulo">Formato</span>
                        <div className="fichas">
                          {[['post', 'Post'], ['story', 'Story']].map(([v, r]) => (
                            <button key={v} type="button" className="ficha" aria-pressed={editando.formato === v} onClick={() => setEditando((x) => ({ ...x, formato: v }))}>{r}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="campo campo--curto">
                      <label htmlFor={`editar-dia-${item.id}`}>Dia</label>
                      <input id={`editar-dia-${item.id}`} type="date" value={editando.dia} onChange={(e) => setEditando((v) => ({ ...v, dia: e.target.value }))} />
                    </div>
                    <div className="campo campo--curto">
                      <label htmlFor={`editar-hora-${item.id}`}>Hora</label>
                      <input id={`editar-hora-${item.id}`} type="time" value={editando.hora} onChange={(e) => setEditando((v) => ({ ...v, hora: e.target.value }))} />
                    </div>
                  </div>
                  <div className="planner__acoes-linha">
                    <button type="button" className="botao botao--fantasma" onClick={() => setEditando(null)}>Cancelar</button>
                    <button type="submit" className="botao botao--primario" disabled={!editando.titulo.trim() || !editando.dia || !editando.hora}>Salvar</button>
                  </div>
                </form>
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
    </section>
  )

  const nomeDoMes = porExtenso(mes, { month: 'long' })
  const ficam = sugestao ? sugestao.lista.filter((g) => !fora.includes(g.id)) : []
  const semanasDaGrade = sugestao ? Object.entries(sugestao.lista.reduce((acc, g) => { const k = chaveDoDia(inicioDaSemana(juntarDiaEHora(g.dia, '12:00'))); (acc[k] ??= []).push(g); return acc }, {})) : []
  const painelPreencher = sugestao && (
    <section className="planner__preencher-painel" aria-label={`Preencher ${nomeDoMes}`}>
      <header className="planner__painel-topo">
        <div>
          <h2 className="planner__painel-titulo">Preencher {nomeDoMes}</h2>
          <p className="planner__painel-sub">
            {sugestao.lista.length
              ? `Pelo seu padrão (${padrao.posts} no feed e ${padrao.stories} stories por semana) e pelo que sobra no seu plano (${sugestao.cabe} ${sugestao.cabe === 1 ? 'post' : 'posts'}), a gente sugere esta grade. Desmarque o que não quiser.`
              : sugestao.cabe <= 0
                ? 'Seu plano não tem mais posts livres este mês. Os que já estão marcados ocupam o que sobrou.'
                : padrao.posts + padrao.stories === 0
                  ? 'Conte na sua marca quantos posts você faz por semana para a gente montar a grade.'
                  : 'O mês já está cheio pelo seu padrão de postagem.'}
          </p>
        </div>
      </header>
      {semanasDaGrade.map(([inicio, lista]) => (
        <div key={inicio} className="planner__grade-semana">
          <p className="planner__grade-semana-titulo mono">Semana de {porExtenso(juntarDiaEHora(inicio, '12:00'), { day: 'numeric', month: 'short' })}</p>
          <ul className="planner__grade-lista">
            {lista.map((g) => {
              const tirado = fora.includes(g.id)
              const data = juntarDiaEHora(g.dia, g.hora)
              return (
                <li key={g.id} className={`planner__grade-item${tirado ? ' planner__grade-item--fora' : ''}`}>
                  <span className="planner__grade-dia"><span className="mono">{data.getDate()}</span>{DIAS[(data.getDay() + 6) % 7]}</span>
                  <Forma formato={g.formato} />
                  <span className="planner__grade-texto">
                    <strong>{g.titulo}</strong>
                    <span className="mono">{g.formato === 'story' ? 'Story' : 'Post'} · {g.hora}</span>
                  </span>
                  <input type="checkbox" className="planner__grade-marca" checked={!tirado} aria-label={`Manter: ${g.titulo}, dia ${data.getDate()}`} onChange={() => setFora((f) => (tirado ? f.filter((x) => x !== g.id) : [...f, g.id]))} />
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      {sugestao.cabe <= 0 && onPlanos && <button type="button" className="botao botao--destaque" onClick={onPlanos}>Ver os planos</button>}
      <p className="planner__dica">Cada dia vira um lembrete no planner. Na hora de criar, o tema já vem escrito no pedido.</p>
      <div className="planner__acoes-linha">
        <button type="button" className="botao botao--fantasma" onClick={() => setSugestao(null)}>Cancelar</button>
        {sugestao.lista.length > 0 && (
          <button type="button" className="botao botao--primario" disabled={!ficam.length || marcando} onClick={marcarGrade}>
            {marcando ? 'Marcando...' : `Marcar ${ficam.length} no planner`}
          </button>
        )}
      </div>
    </section>
  )

  // Ideia de hoje: só quando hoje ainda não tem nada marcado. Criar já marca o post para hoje.
  const ideia = !dia && !sugestao && !(porDia[chaveDoDia(hoje)] || []).length ? ideiaDoDia(perfil, hoje) : null
  const ideiaDeHoje = ideia && (
    <div className="planner__ideia">
      <p><span className="mono planner__ideia-rotulo">Ideia para hoje</span>{ideia.titulo}</p>
      <button type="button" className="botao botao--fantasma" onClick={() => {
        const agora = new Date()
        const hora = agora.getHours() < 11 ? '12:00' : `${String(Math.min(agora.getHours() + 1, 23)).padStart(2, '0')}:00`
        onCriar({ titulo: ideia.titulo, formato: 'post', quando: juntarDiaEHora(chaveDoDia(hoje), hora) })
      }}>Criar agora</button>
    </div>
  )

  return (
    <div className={`planner${dia ? ' planner--dia' : ''}`}>
      {cabecalho}
      {erro && <p className="campo__erro" role="alert">{erro}</p>}
      {avisoDeLembrete}
      {ideiaDeHoje}
      {sugestao && !dia ? painelPreencher : dia ? (
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

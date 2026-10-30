import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { carregarPerfil, enderecoDaImagem, parteFeita, PERFIL_VAZIO } from '../lib/perfil.js'
import { listarPecas, pecasDoMes } from '../lib/pecas.js'
import { agendar, listarAgenda, mudarAgenda } from '../lib/agenda.js'
import { avisosPermitidos, pedirAvisos, vigiarAgenda } from '../lib/avisos.js'
import PerfilMarca, { PARTES } from './PerfilMarca.jsx'
import Comecar from './Comecar.jsx'
import Criar from './Criar.jsx'
import Entrevista from './Entrevista.jsx'
import Planos from './Planos.jsx'
import Planner from './Planner.jsx'
import Redes from './Redes.jsx'
import Menu from '../components/Menu.jsx'
import PainelMarca from '../components/PainelMarca.jsx'
import DicasMarca from '../components/DicasMarca.jsx'
import { dicasDaMarca } from '../lib/dicas.js'
import { PLANOS, voltouDoPagamento } from '../lib/planos.js'
import './Area.css'

const NEGOCIO_DE_TESTE = { id: 'teste', nome: null, limite_pecas: 5, plano: 'gratis' }
const COLUNAS = 'id, nome, limite_pecas, plano, assinatura_status, renova_em, cancela_no_fim, stripe_cliente'
// Lido uma vez, ao abrir: ?pago=pro quando a pessoa volta da Stripe.
const pagou = voltouDoPagamento()

function Miniatura({ peca, onAbrir }) {
  const [src, setSrc] = useState(null)
  useEffect(() => { enderecoDaImagem(peca.imagem).then(setSrc) }, [peca.imagem])
  return (
    <div className="area__item">
      <button type="button" className={`area__peca area__peca--${peca.formato}`} onClick={onAbrir} aria-label={`Abrir: ${peca.roteiro.titulo}`}>
        {src ? <img src={src} alt="" /> : <span>{peca.roteiro.titulo}</span>}
      </button>
    </div>
  )
}

export default function Area({ sessao, teste = false }) {
  const [negocio, setNegocio] = useState(teste ? NEGOCIO_DE_TESTE : null)
  const [perfil, setPerfil] = useState(null)
  const [versao, setVersao] = useState(0)
  const [editando, setEditando] = useState(null) // índice da parte aberta
  const [entrevista, setEntrevista] = useState(null) // null, 'nova' ou 'revisar'
  const [dica, setDica] = useState(null) // dica que abriu a edição: o campo dela já vem em foco
  const [erro, setErro] = useState('')
  const [comecando, setComecando] = useState(null) // null = ainda não sabe; true = entrada mínima aberta; false = já passou
  const [videoInicial, setVideoInicial] = useState(false)
  const [criando, setCriando] = useState(null) // null, 'nova' ou a peça aberta do histórico
  const [pecas, setPecas] = useState([])
  const [usadas, setUsadas] = useState(0)
  const [vendoPlanos, setVendoPlanos] = useState(false)
  const [aviso, setAviso] = useState(pagou ? `Pagamento recebido. Liberando o plano ${PLANOS[pagou].nome}...` : '')
  const [aba, setAba] = useState(null) // null = a aba padrão: planner com a marca pronta, senão marca
  const [agenda, setAgenda] = useState([])
  const [faixa, setFaixa] = useState(() => { const h = new Date(); return { de: new Date(h.getFullYear(), h.getMonth() - 1, 1), ate: new Date(h.getFullYear(), h.getMonth() + 2, 1) } })
  const [avisos, setAvisos] = useState(avisosPermitidos())
  const [abrirItem, setAbrirItem] = useState(null) // marcação que veio pelo aviso
  const [criarCom, setCriarCom] = useState(null) // { agendaId, titulo, formato, quando } quando a peça nasce no planner
  const [voltarPara, setVoltarPara] = useState(null) // dia do planner para reabrir ao sair de Criar
  const agendaAtual = useRef([])
  const usuario = sessao.user
  const primeiroNome = (usuario.user_metadata?.full_name || usuario.user_metadata?.name || '').split(' ')[0]

  useEffect(() => {
    if (teste || !supabase) return
    supabase.from('negocios').select(COLUNAS).maybeSingle()
      .then(({ data }) => setNegocio(data))
  }, [teste])

  // A Stripe avisa o servidor alguns segundos depois do pagamento; até lá, pergunta de novo.
  useEffect(() => {
    if (!pagou || teste || !supabase) return
    let tentativas = 0
    const id = setInterval(async () => {
      tentativas += 1
      const { data } = await supabase.from('negocios').select(COLUNAS).maybeSingle()
      if (data?.plano === pagou) {
        setNegocio(data)
        setAviso(`Pronto, você está no plano ${PLANOS[pagou].nome}: ${data.limite_pecas} posts por mês.`)
        clearInterval(id)
      } else if (tentativas >= 15) {
        setAviso('O pagamento foi feito, mas o plano ainda não apareceu. Atualize a página em um minuto.')
        clearInterval(id)
      }
    }, 2000)
    return () => clearInterval(id)
  }, [teste])

  const recarregar = useCallback(() => {
    if (!negocio) return
    carregarPerfil(negocio.id)
      .then(({ versao: v, perfil: p }) => { setVersao(v); setPerfil(p) })
      .catch(() => { setErro('Não deu para carregar a sua marca. Atualize a página.'); setPerfil(PERFIL_VAZIO) })
  }, [negocio])

  useEffect(recarregar, [recarregar])

  // Primeira vez (nenhuma versão salva): a entrada mínima abre uma vez e fica até a pessoa sair dela.
  useEffect(() => {
    if (perfil && comecando === null) setComecando(versao === 0)
  }, [perfil, versao, comecando])

  const recarregarPecas = useCallback(() => {
    if (!negocio) return
    listarPecas(negocio.id).then(setPecas).catch(() => {})
    pecasDoMes(negocio.id).then(setUsadas).catch(() => {})
  }, [negocio])

  useEffect(recarregarPecas, [recarregarPecas])

  const recarregarAgenda = useCallback(() => {
    if (!negocio) return
    listarAgenda(negocio.id, faixa.de, faixa.ate).then(setAgenda).catch(() => {})
  }, [negocio, faixa])

  useEffect(recarregarAgenda, [recarregarAgenda])
  useEffect(() => { agendaAtual.current = agenda }, [agenda])

  // O planner pede o mês que está mostrando; a faixa só cresce.
  const pedirFaixa = useCallback((de, ate) => {
    setFaixa((f) => (de >= f.de && ate <= f.ate ? f : { de: de < f.de ? de : f.de, ate: ate > f.ate ? ate : f.ate }))
  }, [])

  // Com os avisos liberados, olha a agenda e avisa na hora de postar.
  useEffect(() => {
    if (!avisos) return
    return vigiarAgenda(
      () => agendaAtual.current,
      (item) => { setCriando(null); setVendoPlanos(false); setAba('planner'); setAbrirItem(item) },
      recarregarAgenda,
    )
  }, [avisos, recarregarAgenda])

  async function ativarAvisos() {
    setAvisos(await pedirAvisos())
  }

  // Peça criada a partir do planner: entra no dia marcado (ou preenche a marcação que já existia).
  async function ligarAoPlanner(peca) {
    if (!criarCom) return
    try {
      if (criarCom.agendaId) await mudarAgenda(criarCom.agendaId, { peca: peca.id })
      else await agendar(negocio.id, { titulo: peca.roteiro?.titulo || criarCom.titulo || peca.pedido, rede: 'instagram', formato: peca.formato, quando: criarCom.quando, peca: peca.id })
      setCriarCom(null)
      recarregarAgenda()
    } catch { /* a peça existe; a pessoa marca no planner depois */ }
  }

  if (vendoPlanos) {
    return (
      <Planos
        negocio={negocio}
        usadas={usadas}
        onSair={() => { setVendoPlanos(false); window.scrollTo({ top: 0 }) }}
        onTrocou={(plano) => {
          setNegocio((n) => ({ ...n, plano, limite_pecas: PLANOS[plano].pecas, cancela_no_fim: false }))
          setAviso(negocio?.cancela_no_fim
            ? `Pronto, sua assinatura voltou no plano ${PLANOS[plano].nome}: ${PLANOS[plano].pecas} posts por mês.`
            : `Pronto, você está no plano ${PLANOS[plano].nome}: ${PLANOS[plano].pecas} posts por mês.`)
          setVendoPlanos(false)
          window.scrollTo({ top: 0 })
        }}
      />
    )
  }


  if (entrevista && perfil) {
    return (
      <Entrevista
        negocioId={negocio.id}
        perfil={perfil}
        revisar={entrevista === 'revisar'}
        onSair={(salvo) => {
          if (salvo) { setPerfil(salvo); recarregar() }
          setEntrevista(null)
          window.scrollTo({ top: 0 })
        }}
      />
    )
  }

  if (editando !== null && perfil) {
    return (
      <PerfilMarca
        negocioId={negocio.id}
        perfilInicial={perfil}
        parteInicial={editando}
        dica={dica}
        onSair={(salvo) => {
          if (salvo) { setPerfil(salvo); recarregar() }
          setEditando(null)
          setDica(null)
          window.scrollTo({ top: 0 })
        }}
      />
    )
  }

  // Primeira vez (nenhuma versão salva): nome, ramo e cor, e a primeira peça já sai.
  if (perfil && comecando) {
    return (
      <Comecar
        negocioId={negocio.id}
        perfil={perfil}
        onSalvo={(novo) => { setPerfil(novo); recarregar() }}
        onDepois={() => { setComecando(false); window.scrollTo({ top: 0 }) }}
        onPeca={(peca, video) => { setComecando(false); setCriarCom(null); setVideoInicial(video); setCriando(peca); recarregarPecas(); window.scrollTo({ top: 0 }) }}
      />
    )
  }

  const limite = negocio?.limite_pecas ?? 30
  const feitas = perfil ? PARTES.map((p) => parteFeita(perfil, p.chave)) : [false, false, false, false]
  const total = feitas.filter(Boolean).length
  const proxima = feitas.indexOf(false)
  // Com a identidade feita já dá para criar; o resto da marca deixa as peças mais com a cara dela.
  const podeCriar = feitas[0]
  const nomeMarca = perfil?.identidade.nome || negocio?.nome
  const { dicas, forca } = perfil && total === 4 ? dicasDaMarca(perfil) : { dicas: [], forca: 0 }

  const abaAtual = aba ?? (total === 4 ? 'planner' : 'marca')
  function ir(destino) {
    // Trocar de aba pelo menu fecha a tela Criar, se estiver aberta.
    if (destino !== 'criar') { setCriando(null); setCriarCom(null); setVoltarPara(null) }
    if (destino === 'plano') { setVendoPlanos(true); return }
    if (destino === 'criar') {
      if (podeCriar && usadas < limite) { setCriando('nova'); return }
      setAba(podeCriar ? 'plano' : 'marca')
      if (podeCriar) setVendoPlanos(true)
      return
    }
    setAba(destino)
    window.scrollTo({ top: 0 })
  }
  const abrirPeca = (p) => { if (p) { setCriarCom(null); setCriando(p) } }

  const marca = (
    <>
      <p className="mono area__ola">{primeiroNome ? `Olá, ${primeiroNome}` : 'Olá'}</p>
      {total === 4 ? (
        <>
          <h1 className="area__titulo">{nomeMarca ? `${nomeMarca} está pronta.` : 'Sua marca está pronta.'}</h1>
          <p className="area__texto">É daqui que sai cada post. Toque num cartão para mudar; cada mudança vira uma versão nova, sem perder a anterior.</p>
        </>
      ) : (
        podeCriar ? (
          <>
            <h1 className="area__titulo">{nomeMarca ? `Marca: ${nomeMarca}` : 'Sua marca'}</h1>
            <div className="area__progresso" role="img" aria-label={`${total} de 4 partes da marca feitas`}>
              <span className="area__barra"><span style={{ transform: `scaleX(${total / 4})` }} /></span>
              <span className="mono area__progresso-num">{total} de 4</span>
            </div>
            <p className="area__texto">Você já pode criar. Cada parte que completar deixa os posts mais com a sua cara.</p>
          </>
        ) : (
          <>
            <h1 className="area__titulo">Primeiro, conte a sua marca.</h1>
            <p className="area__texto">
              Com isso, cada post já sai com as suas cores, o seu jeito de falar e os seus dados certos.
              Você configura uma vez e fica guardado.
            </p>
          </>
        )
      )}

      {total < 4 && (
      <ol className="area__passos">
        {PARTES.map((p, i) => (
          <li key={p.chave}>
            <button type="button" className={`area__passo${i === proxima && podeCriar ? ' area__passo--proximo' : ''}`} onClick={() => setEditando(i)} disabled={!perfil}>
              <span className="mono area__num">{p.numero}</span>
              <span className="area__passo-texto">
                <strong>{p.titulo}</strong>
                <span>{p.resumo}</span>
              </span>
              <span className={`mono area__estado${feitas[i] ? ' area__estado--feito' : i === proxima ? ' area__estado--proximo' : ''}`}>{feitas[i] ? 'Feita' : i === proxima ? 'Próxima' : 'Depois'}</span>
            </button>
          </li>
        ))}
      </ol>
      )}

      {erro && <p className="campo__erro" role="alert">{erro}</p>}

      {podeCriar ? (
        usadas >= limite ? (
          <div className="area__limite">
            <p>Você usou os {limite} posts deste mês. Suba de plano para continuar criando agora, ou espere o contador zerar no dia 1.</p>
            <button type="button" className="botao botao--destaque" onClick={() => setVendoPlanos(true)}>Ver planos</button>
          </div>
        ) : (
          <button type="button" className="botao botao--primario area__cta" onClick={() => setCriando('nova')}>Criar post</button>
        )
      ) : (
        <button type="button" className="botao botao--primario area__cta" onClick={() => setComecando(true)} disabled={!perfil}>Começar</button>
      )}
      {podeCriar && total < 4 && (
        <button type="button" className="botao botao--destaque area__cta" onClick={() => setEditando(proxima)}>Continuar a marca: {PARTES[proxima].titulo}</button>
      )}
      {total === 4 && <DicasMarca dicas={dicas} forca={forca} onAbrir={(d) => { if (d.id === 'entrevista') return setEntrevista('nova'); setDica(d); setEditando(d.parte) }} />}
      {total === 4 && <PainelMarca perfil={perfil} versao={versao} dicas={dicas} onEditar={setEditando} onGuia={() => setEntrevista(perfil.voz.guia?.regras?.length ? 'revisar' : 'nova')} />}
      <p className="area__email mono">
        {usuario.email}{versao > 0 && ` · marca na versão ${versao}`}
      </p>
    </>
  )

  const minhasPecas = (
    <section className="area__historico" aria-labelledby="historico">
      <h2 id="historico" className="area__subtitulo">Seus posts</h2>
      {pecas.length === 0 ? (
        <p className="area__texto">Nenhum post ainda. O primeiro sai em segundos.</p>
      ) : (
        <div className="area__grade-pecas">
          {pecas.map((p) => <Miniatura key={p.id} peca={p} onAbrir={() => abrirPeca(p)} />)}
        </div>
      )}
      {podeCriar && usadas < limite && <button type="button" className="botao botao--primario area__cta" onClick={() => setCriando('nova')}>Criar post</button>}
    </section>
  )

  return (
    <div className="area">
      <Menu aba={abaAtual} onIr={ir} nomeMarca={nomeMarca} usadas={usadas} limite={limite} onSair={() => supabase?.auth.signOut()} />
      <div className={`area__corpo${criando && perfil ? ' area__corpo--criar' : ''}`}>
        <header className="area__topo">
          <p className="marca area__marca">Neon<span>posts</span></p>
          <div className="area__direita">
            <button type="button" className="mono area__contador" title="Posts usados neste mês. Toque para ver os planos." onClick={() => setVendoPlanos(true)}>{usadas}/{limite} posts</button>
            <button type="button" className="botao botao--fantasma" onClick={() => supabase?.auth.signOut()}>Sair</button>
          </div>
        </header>

        {criando && perfil ? (
          <Criar
            negocioId={negocio.id}
            perfil={perfil}
            pecaInicial={criando === 'nova' ? null : criando}
            formatoInicial={criarCom?.formato}
            videoInicial={videoInicial}
            marca={{ feitas: total, proxima: proxima >= 0 ? PARTES[proxima] : null }}
            onCompletar={() => { setCriando(null); setVideoInicial(false); setEditando(proxima); window.scrollTo({ top: 0 }) }}
            onCriou={ligarAoPlanner}
            noPlanner={Boolean(criarCom)}
            onAgendar={async (peca, quando) => {
              await agendar(negocio.id, { titulo: peca.roteiro?.titulo || peca.pedido, rede: 'instagram', formato: peca.formato === 'story' ? 'story' : 'post', quando, peca: peca.id })
              recarregarAgenda()
            }}
            onPerfil={(novo) => { setPerfil(novo); recarregar() }}
            onSair={(mudou) => {
              if (mudou) recarregarPecas()
              // Quem veio do planner volta para o mesmo dia.
              if (voltarPara) { setAbrirItem({ id: `volta-${Date.now()}`, quando: voltarPara }); setAba('planner') }
              setVoltarPara(null)
              setCriando(null)
              setVideoInicial(false)
              setCriarCom(null)
              window.scrollTo({ top: 0 })
            }}
          />
        ) : (
        <main className={`area__conteudo area__conteudo--${abaAtual}${total === 4 ? ' area__conteudo--painel' : ''}`}>
          {aviso && <p className="area__aviso" role="status">{aviso}</p>}
          {negocio?.cancela_no_fim && negocio.renova_em && (
            <div className="area__aviso area__aviso--fim" role="status">
              <p>
                Sua assinatura do {PLANOS[negocio.plano]?.nome} foi cancelada. Você continua com {negocio.limite_pecas} posts por mês
                até {new Date(negocio.renova_em).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}. Depois, a conta volta para o Grátis ({PLANOS.gratis.pecas} posts).
              </p>
              <button type="button" className="botao botao--fantasma" onClick={() => setVendoPlanos(true)}>Ver planos</button>
            </div>
          )}
          {abaAtual === 'marca' && marca}
          {abaAtual === 'pecas' && minhasPecas}
          {abaAtual === 'redes' && <Redes avisos={avisos} onAtivarAvisos={ativarAvisos} />}
          {abaAtual === 'planner' && negocio && (
            <Planner
              negocioId={negocio.id} perfil={perfil} itens={agenda} pecas={pecas}
              avisos={avisos} onAtivarAvisos={ativarAvisos}
              onMudou={recarregarAgenda} onFaixa={pedirFaixa} abrir={abrirItem}
              onCriar={(com) => { if (usadas >= limite) { setVendoPlanos(true); return } setCriarCom(com); setVoltarPara(com.quando); setCriando('nova') }}
              onAbrirPeca={(p, quando) => { if (p) { setCriarCom(null); setVoltarPara(quando || null); setCriando(p) } }}
            />
          )}
        </main>
        )}
      </div>
    </div>
  )
}

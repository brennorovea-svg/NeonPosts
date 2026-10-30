import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { carregarPerfil, enderecoDaImagem, parteFeita, PERFIL_VAZIO } from '../lib/perfil.js'
import { listarPecas, pecasDoMes } from '../lib/pecas.js'
import PerfilMarca, { PARTES } from './PerfilMarca.jsx'
import ApresentacaoMarca from './ApresentacaoMarca.jsx'
import Criar from './Criar.jsx'
import Entrevista from './Entrevista.jsx'
import Planos from './Planos.jsx'
import PainelMarca from '../components/PainelMarca.jsx'
import DicasMarca from '../components/DicasMarca.jsx'
import { dicasDaMarca } from '../lib/dicas.js'
import Carrossel from '../components/Carrossel.jsx'
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
  const [apresentou, setApresentou] = useState(false)
  const [criando, setCriando] = useState(null) // null, 'nova' ou a peça aberta do histórico
  const [pecas, setPecas] = useState([])
  const [usadas, setUsadas] = useState(0)
  const [vendoPlanos, setVendoPlanos] = useState(false)
  const [aviso, setAviso] = useState(pagou ? `Pagamento recebido. Liberando o plano ${PLANOS[pagou].nome}...` : '')
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
        setAviso(`Pronto, você está no plano ${PLANOS[pagou].nome}: ${data.limite_pecas} peças por mês.`)
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

  const recarregarPecas = useCallback(() => {
    if (!negocio) return
    listarPecas(negocio.id).then(setPecas).catch(() => {})
    pecasDoMes(negocio.id).then(setUsadas).catch(() => {})
  }, [negocio])

  useEffect(recarregarPecas, [recarregarPecas])

  if (vendoPlanos) {
    return (
      <Planos
        negocio={negocio}
        usadas={usadas}
        onSair={() => { setVendoPlanos(false); window.scrollTo({ top: 0 }) }}
        onTrocou={(plano) => {
          setNegocio((n) => ({ ...n, plano, limite_pecas: PLANOS[plano].pecas, cancela_no_fim: false }))
          setAviso(negocio?.cancela_no_fim
            ? `Pronto, sua assinatura voltou no plano ${PLANOS[plano].nome}: ${PLANOS[plano].pecas} peças por mês.`
            : `Pronto, você está no plano ${PLANOS[plano].nome}: ${PLANOS[plano].pecas} peças por mês.`)
          setVendoPlanos(false)
          window.scrollTo({ top: 0 })
        }}
      />
    )
  }

  if (criando && perfil) {
    return (
      <Criar
        negocioId={negocio.id}
        perfil={perfil}
        pecaInicial={criando === 'nova' ? null : criando}
        onPerfil={(novo) => { setPerfil(novo); recarregar() }}
        onSair={(mudou) => { if (mudou) recarregarPecas(); setCriando(null); window.scrollTo({ top: 0 }) }}
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

  // Primeira vez (nenhuma versão salva): explica para que serve antes de tudo.
  if (perfil && versao === 0 && !apresentou) {
    return (
      <ApresentacaoMarca
        onComecar={() => { setApresentou(true); setEditando(0) }}
        onDepois={() => setApresentou(true)}
      />
    )
  }

  const limite = negocio?.limite_pecas ?? 30
  const feitas = perfil ? PARTES.map((p) => parteFeita(perfil, p.chave)) : [false, false, false, false]
  const total = feitas.filter(Boolean).length
  const proxima = feitas.indexOf(false)
  const nomeMarca = perfil?.identidade.nome || negocio?.nome
  const { dicas, forca } = perfil && total === 4 ? dicasDaMarca(perfil) : { dicas: [], forca: 0 }

  return (
    <div className="area">
      <header className="area__topo">
        <p className="marca area__marca">Neon<span>posts</span></p>
        <div className="area__direita">
          <button type="button" className="mono area__contador" title="Peças usadas neste mês. Toque para ver os planos." onClick={() => setVendoPlanos(true)}>{usadas}/{limite} peças</button>
          <button type="button" className="botao botao--fantasma" onClick={() => supabase?.auth.signOut()}>Sair</button>
        </div>
      </header>

      <main className={`area__conteudo${total === 4 ? ' area__conteudo--painel' : ''}`}>
        {aviso && <p className="area__aviso" role="status">{aviso}</p>}
        {negocio?.cancela_no_fim && negocio.renova_em && (
          <div className="area__aviso area__aviso--fim" role="status">
            <p>
              Sua assinatura do {PLANOS[negocio.plano]?.nome} foi cancelada. Você continua com {negocio.limite_pecas} peças por mês
              até {new Date(negocio.renova_em).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}. Depois, a conta volta para o Grátis ({PLANOS.gratis.pecas} peças).
            </p>
            <button type="button" className="botao botao--fantasma" onClick={() => setVendoPlanos(true)}>Ver planos</button>
          </div>
        )}
        <p className="mono area__ola">{primeiroNome ? `Olá, ${primeiroNome}` : 'Olá'}</p>
        {total === 4 ? (
          <>
            <h1 className="area__titulo">{nomeMarca ? `${nomeMarca} está pronta.` : 'Sua marca está pronta.'}</h1>
            <p className="area__texto">É daqui que sai cada post. Toque num cartão para mudar; cada mudança vira uma versão nova, sem perder a anterior.</p>
          </>
        ) : (
          <>
            <h1 className="area__titulo">Primeiro, conte a sua marca.</h1>
            <p className="area__texto">
              Com isso, cada post já sai com as suas cores, o seu jeito de falar e os seus dados certos.
              Você configura uma vez e fica guardado.
            </p>
          </>
        )}

        {total < 4 && (
        <ol className="area__passos">
          {PARTES.map((p, i) => (
            <li key={p.chave}>
              <button type="button" className="area__passo" onClick={() => setEditando(i)} disabled={!perfil}>
                <span className="mono area__num">{p.numero}</span>
                <span className="area__passo-texto">
                  <strong>{p.titulo}</strong>
                  <span>{p.resumo}</span>
                </span>
                <span className={`mono area__estado${feitas[i] ? ' area__estado--feito' : ''}`}>{feitas[i] ? 'Feito' : 'Falta'}</span>
              </button>
            </li>
          ))}
        </ol>
        )}

        {erro && <p className="campo__erro" role="alert">{erro}</p>}

        {total === 4 ? (
          usadas >= limite ? (
            <div className="area__limite">
              <p>Você usou as {limite} peças deste mês. Suba de plano para continuar criando agora, ou espere o contador zerar no dia 1.</p>
              <button type="button" className="botao botao--destaque" onClick={() => setVendoPlanos(true)}>Ver planos</button>
            </div>
          ) : (
            <button type="button" className="botao botao--primario area__cta" onClick={() => setCriando('nova')}>Criar post</button>
          )
        ) : (
          <button type="button" className="botao botao--primario area__cta" onClick={() => setEditando(proxima)} disabled={!perfil}>
            {total === 0 ? 'Começar' : `Continuar: ${PARTES[proxima].titulo}`}
          </button>
        )}
        {total === 4 && <DicasMarca dicas={dicas} forca={forca} onAbrir={(d) => { if (d.id === 'entrevista') return setEntrevista('nova'); setDica(d); setEditando(d.parte) }} />}
        {total === 4 && <PainelMarca perfil={perfil} versao={versao} dicas={dicas} onEditar={setEditando} onGuia={() => setEntrevista(perfil.voz.guia?.regras?.length ? 'revisar' : 'nova')} />}
        {pecas.length > 0 && (
          <section className="area__historico" aria-labelledby="historico">
            <h2 id="historico" className="area__subtitulo">Suas peças</h2>
            <Carrossel rotulo="Suas peças" className="area__pecas">
              {pecas.map((p) => <Miniatura key={p.id} peca={p} onAbrir={() => setCriando(p)} />)}
            </Carrossel>
          </section>
        )}
        <p className="area__email mono">
          {usuario.email}{versao > 0 && ` · marca na versão ${versao}`}
        </p>
      </main>
    </div>
  )
}

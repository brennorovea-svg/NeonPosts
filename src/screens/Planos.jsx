import { useState } from 'react'
import { assinar, gerenciar, PAGOS, PLANOS } from '../lib/planos.js'
import './Planos.css'

const data = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })

export default function Planos({ negocio, usadas, onSair, onTrocou }) {
  const [esperando, setEsperando] = useState(null) // plano clicado ou 'portal'
  const [confirmar, setConfirmar] = useState(null) // troca de plano pede um segundo toque
  const [erro, setErro] = useState('')
  const atual = negocio?.plano || 'gratis'
  const assinante = PAGOS.includes(atual)

  async function escolher(plano) {
    if (assinante && confirmar !== plano) { setConfirmar(plano); return }
    setErro(''); setEsperando(plano)
    try {
      const resposta = await assinar(plano)
      if (resposta.url) { window.location.assign(resposta.url); return }
      setConfirmar(null)
      onTrocou(plano)
    } catch (falha) {
      setErro(falha.message)
    }
    setEsperando(null)
  }

  async function abrirPortal() {
    setErro(''); setEsperando('portal')
    try {
      window.location.assign((await gerenciar()).url)
    } catch (falha) {
      setErro(falha.message)
      setEsperando(null)
    }
  }

  return (
    <div className="planos">
      <header className="planos__topo">
        <button type="button" className="botao botao--fantasma" onClick={onSair}>Voltar</button>
        <p className="marca planos__marca">Neon<span>posts</span></p>
      </header>

      <main className="planos__conteudo">
        <p className="mono planos__sobre">Seu plano</p>
        <h1 className="planos__titulo">{assinante ? `Você está no ${PLANOS[atual].nome}.` : 'Escolha quantas peças por mês.'}</h1>
        <p className="planos__texto">
          Você usou {usadas} de {negocio?.limite_pecas ?? PLANOS[atual].pecas} peças este mês. O contador zera todo dia 1.
          {assinante && negocio?.renova_em && (negocio.cancela_no_fim
            ? ` A assinatura termina em ${data(negocio.renova_em)} e volta para o Grátis.`
            : ` Renova em ${data(negocio.renova_em)}.`)}
        </p>
        {negocio?.assinatura_status === 'past_due' && (
          <p className="planos__alerta" role="alert">Não conseguimos cobrar o seu cartão. Atualize em "Gerenciar pagamento" para não perder o plano.</p>
        )}

        <ul className="planos__lista">
          {Object.entries(PLANOS).map(([chave, p]) => {
            const eAtual = chave === atual
            return (
              <li key={chave} className={`planos__cartao${eAtual ? ' planos__cartao--atual' : ''}`}>
                <div className="planos__cabeca">
                  <strong>{p.nome}</strong>
                  {eAtual && <span className="mono planos__selo">Seu plano</span>}
                </div>
                <p className="planos__preco"><span>{p.preco}</span> por mês</p>
                <p className="planos__pecas mono">{p.pecas} peças por mês</p>
                {p.resumo && <p className="planos__resumo">{p.resumo}</p>}
                {PAGOS.includes(chave) && !eAtual && (
                  <button
                    type="button" className={`botao ${chave === 'pro' ? 'botao--destaque' : 'botao--primario'} planos__botao`}
                    onClick={() => escolher(chave)} disabled={esperando !== null}
                  >
                    {esperando === chave ? 'Abrindo...' : confirmar === chave
                      ? `Confirmar troca para o ${p.nome}`
                      : assinante ? `Trocar para o ${p.nome}` : `Assinar o ${p.nome}`}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        {confirmar && (
          <p className="planos__nota">A troca vale na hora. A diferença entra na próxima fatura.</p>
        )}

        {erro && <p className="campo__erro" role="alert">{erro}</p>}

        {negocio?.stripe_cliente && (
          <button type="button" className="botao botao--fantasma" onClick={abrirPortal} disabled={esperando !== null}>
            {esperando === 'portal' ? 'Abrindo...' : 'Gerenciar pagamento'}
          </button>
        )}
        <p className="planos__nota">O pagamento é feito pela Stripe. A gente não guarda o seu cartão. Dá para cancelar quando quiser em "Gerenciar pagamento".</p>
      </main>
    </div>
  )
}

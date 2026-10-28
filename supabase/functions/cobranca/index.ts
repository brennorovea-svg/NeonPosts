// Cobrança pela Stripe. Tudo que fala com a Stripe fica aqui, para trocar por outra (Asaas) sem mexer no resto.
// Duas portas na mesma função:
// - o app (com o login): assinar um plano, trocar de plano ou abrir o portal da Stripe (cartão e cancelamento);
// - a Stripe (com a assinatura `stripe-signature`): avisa quando o pagamento entra, falha ou a assinatura acaba.
// Chaves: STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET, só aqui.
import Stripe from 'npm:stripe@22.6.2'
import { createClient } from 'npm:@supabase/supabase-js@2.117.3'
import { PAGOS, PLANOS, type Plano } from './planos.ts'

const CABECALHOS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}
// Só volta para endereços do próprio app depois do pagamento.
const ORIGENS = ['https://neonposts.com.br', 'https://brennorovea-svg.github.io', 'http://localhost:5173']

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CABECALHOS, 'Content-Type': 'application/json' } })
}
const erro = (mensagem: string, status: number) => resposta({ erro: mensagem }, status)

function chaveDeServico() {
  const antiga = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (antiga) return antiga
  try { return Object.values(JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'))[0] as string } catch { return '' }
}

const banco = createClient(Deno.env.get('SUPABASE_URL')!, chaveDeServico(), { auth: { persistSession: false } })
const chaveStripe = Deno.env.get('STRIPE_SECRET_KEY') || ''
const stripe = chaveStripe ? new Stripe(chaveStripe, { httpClient: Stripe.createFetchHttpClient() }) : null

const precoDo = (plano: Plano) => ({
  currency: 'brl',
  unit_amount: PLANOS[plano].centavos,
  recurring: { interval: 'month' as const },
  product_data: { name: `Neonposts ${PLANOS[plano].nome} · ${PLANOS[plano].pecas} peças por mês` },
})

// Desfaz um cancelamento marcado, venha ele do portal (cancel_at) ou do jeito antigo (cancel_at_period_end).
async function desfazerCancelamento(assinatura: Stripe.Subscription) {
  let atual = assinatura
  if (atual.cancel_at_period_end) atual = await stripe!.subscriptions.update(atual.id, { cancel_at_period_end: false })
  if (atual.cancel_at) atual = await stripe!.subscriptions.update(atual.id, { cancel_at: '' })
  return atual
}

// Assinatura que libera o uso. "past_due" segura o plano enquanto a Stripe tenta cobrar de novo.
const LIBERA = ['active', 'trialing', 'past_due']

async function guardarAssinatura(assinatura: Stripe.Subscription) {
  const negocio = assinatura.metadata?.negocio
  const pedido = assinatura.metadata?.plano as Plano | undefined
  if (!negocio) return
  const ativa = LIBERA.includes(assinatura.status)
  const plano: Plano = ativa && pedido && PAGOS.includes(pedido) ? pedido : 'gratis'
  const fim = assinatura.items.data[0]?.current_period_end
  // O portal da Stripe cancela marcando a data do fim (cancel_at); versões antigas usam cancel_at_period_end.
  const cancela = assinatura.cancel_at_period_end || Boolean(assinatura.cancel_at)
  const ultimoDia = assinatura.cancel_at || fim
  await banco.from('negocios').update({
    plano,
    limite_pecas: PLANOS[plano].pecas,
    assinatura_status: assinatura.status,
    renova_em: ativa && ultimoDia ? new Date(ultimoDia * 1000).toISOString() : null,
    cancela_no_fim: ativa && cancela,
    stripe_cliente: typeof assinatura.customer === 'string' ? assinatura.customer : assinatura.customer.id,
    stripe_assinatura: ativa ? assinatura.id : null,
  }).eq('id', negocio)
}

async function avisoDaStripe(req: Request) {
  const segredo = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!stripe || !segredo) return erro('Cobrança desligada.', 503)
  let evento: Stripe.Event
  try {
    evento = await stripe.webhooks.constructEventAsync(
      await req.text(), req.headers.get('stripe-signature')!, segredo, undefined, Stripe.createSubtleCryptoProvider(),
    )
  } catch {
    return erro('Assinatura inválida.', 400)
  }
  if (evento.type.startsWith('customer.subscription.')) {
    // Os avisos da Stripe podem chegar fora de ordem: busca a assinatura como ela está agora.
    const recebida = evento.data.object as Stripe.Subscription
    const agora = evento.type === 'customer.subscription.deleted' ? recebida : await stripe.subscriptions.retrieve(recebida.id)
    await guardarAssinatura(agora)
  }
  return resposta({ ok: true })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS })
  if (req.method !== 'POST') return erro('Método não aceito.', 405)
  if (req.headers.get('stripe-signature')) return avisoDaStripe(req)

  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  const { data: conta } = await banco.auth.getUser(token)
  if (!conta?.user) return erro('Entre de novo para continuar.', 401)
  if (!stripe) return erro('O pagamento ainda não foi ligado. Tente mais tarde.', 503)

  const { data: negocio } = await banco.from('negocios')
    .select('id, plano, cancela_no_fim, stripe_cliente, stripe_assinatura').eq('dono', conta.user.id).single()
  if (!negocio) return erro('Não achamos o seu negócio.', 404)

  let corpo: { acao?: string; plano?: string; volta?: string }
  try { corpo = await req.json() } catch { return erro('Pedido inválido.', 400) }
  const volta = ORIGENS.some((o) => String(corpo.volta || '').startsWith(o + '/')) ? String(corpo.volta) : 'https://neonposts.com.br/'

  try {
    if (corpo.acao === 'gerenciar') {
      if (!negocio.stripe_cliente) return erro('Você ainda não tem assinatura.', 409)
      const portal = await stripe.billingPortal.sessions.create({ customer: negocio.stripe_cliente, return_url: volta, locale: 'pt-BR' })
      return resposta({ url: portal.url })
    }

    const plano = corpo.plano as Plano
    if (corpo.acao !== 'assinar' || !PAGOS.includes(plano)) return erro('Escolha um plano.', 400)
    if (plano === negocio.plano && !(negocio.stripe_assinatura && negocio.cancela_no_fim)) {
      return erro(`Você já está no plano ${PLANOS[plano].nome}.`, 409)
    }

    // Já assina: reativa e, se for outro plano, troca o preço da mesma assinatura.
    // A Stripe acerta a diferença na próxima fatura.
    if (negocio.stripe_assinatura) {
      let atual = await desfazerCancelamento(await stripe.subscriptions.retrieve(negocio.stripe_assinatura))
      if (plano !== negocio.plano) {
        const novo = await stripe.prices.create(precoDo(plano))
        atual = await stripe.subscriptions.update(atual.id, {
          items: [{ id: atual.items.data[0].id, price: novo.id }],
          metadata: { negocio: negocio.id, plano },
          proration_behavior: 'create_prorations',
        })
      }
      await guardarAssinatura(atual)
      return resposta({ trocado: true })
    }

    let cliente = negocio.stripe_cliente
    if (!cliente) {
      cliente = (await stripe.customers.create({ email: conta.user.email, metadata: { negocio: negocio.id } })).id
      await banco.from('negocios').update({ stripe_cliente: cliente }).eq('id', negocio.id)
    }
    const sessao = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: cliente,
      client_reference_id: negocio.id,
      line_items: [{ price_data: precoDo(plano), quantity: 1 }],
      subscription_data: { metadata: { negocio: negocio.id, plano } },
      success_url: `${volta}${volta.includes('?') ? '&' : '?'}pago=${plano}`,
      cancel_url: volta,
      locale: 'pt-BR',
    })
    return resposta({ url: sessao.url })
  } catch (falha) {
    console.error('stripe', falha)
    return erro('Não deu para falar com a Stripe agora. Tente de novo.', 502)
  }
})

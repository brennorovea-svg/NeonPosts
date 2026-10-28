import { supabase, enderecoDeVolta } from './supabase.js'
import { modoDeTeste } from './perfil.js'

// Cópia para a tela dos planos da função cobranca (supabase/functions/cobranca/planos.ts).
// Quem decide o limite é o servidor; se mudar lá, mudar aqui.
export const PLANOS = {
  gratis: { nome: 'Grátis', pecas: 5, preco: 'R$ 0', resumo: 'Para conhecer o Neonposts.' },
  essencial: { nome: 'Essencial', pecas: 30, preco: 'R$ 39', resumo: 'Para postar quase todo dia.' },
  pro: { nome: 'Pro', pecas: 100, preco: 'R$ 79', resumo: 'Para quem posta feed e story todo dia.' },
}
export const PAGOS = ['essencial', 'pro']

async function chamar(corpo) {
  const { data, error } = await supabase.functions.invoke('cobranca', { body: { ...corpo, volta: enderecoDeVolta() } })
  if (error) {
    let mensagem = 'Não deu para abrir o pagamento agora. Tente de novo.'
    try { mensagem = (await error.context.json()).erro || mensagem } catch { /* resposta sem corpo */ }
    throw new Error(mensagem)
  }
  return data
}

// Sem assinatura: devolve o endereço do pagamento da Stripe. Com assinatura: troca o plano na hora.
export async function assinar(plano) {
  if (modoDeTeste()) {
    await new Promise((ok) => setTimeout(ok, 800))
    return { trocado: true }
  }
  return chamar({ acao: 'assinar', plano })
}

// Portal da Stripe: cartão, faturas e cancelamento.
export async function gerenciar() {
  if (modoDeTeste()) throw new Error('No modo de teste não há portal da Stripe.')
  return chamar({ acao: 'gerenciar' })
}

// Volta do pagamento: ?pago=pro. Some do endereço para não repetir o aviso.
export function voltouDoPagamento() {
  const parametros = new URLSearchParams(location.search)
  const plano = parametros.get('pago')
  if (!plano) return null
  parametros.delete('pago')
  const resto = parametros.toString()
  history.replaceState(null, '', location.pathname + (resto ? `?${resto}` : ''))
  return PLANOS[plano] ? plano : null
}

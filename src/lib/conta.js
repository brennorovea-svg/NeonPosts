import { supabase } from './supabase.js'
import { modoDeTeste } from './perfil.js'

// Fala com a função "conta" (supabase/functions/conta): baixar os dados e excluir a conta.
async function chamar(acao, padrao) {
  const { data, error } = await supabase.functions.invoke('conta', { body: { acao } })
  if (error) {
    let mensagem = padrao
    try { mensagem = (await error.context.json()).erro || mensagem } catch { /* resposta sem corpo */ }
    throw new Error(mensagem)
  }
  return data
}

// Baixa um arquivo JSON com tudo que a conta guarda (LGPD: acesso e portabilidade).
export async function baixarMeusDados() {
  const dados = modoDeTeste()
    ? { gerado_em: new Date().toISOString(), conta: { email: 'brenno@exemplo.com.br' }, marca: [], posts: [], agenda: [], arquivos: [] }
    : await chamar('baixar', 'Não deu para montar o arquivo agora. Tente de novo.')
  const arquivo = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(arquivo)
  const a = document.createElement('a')
  a.href = url
  a.download = `neonposts-meus-dados-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// Apaga tudo: assinatura, fotos, posts, marca e login. Não tem volta.
export async function excluirConta() {
  if (modoDeTeste()) { await new Promise((ok) => setTimeout(ok, 800)); return }
  await chamar('excluir', 'Não deu para excluir a conta agora. Tente de novo ou escreva para neonposts@neonscripts.com.br.')
  try { sessionStorage.setItem('neonposts-conta-excluida', '1') } catch { /* sem aviso na tela de entrada */ }
  await supabase.auth.signOut()
}

// A tela de entrada mostra o aviso uma vez depois da exclusão.
export function contaFoiExcluida() {
  try {
    const foi = sessionStorage.getItem('neonposts-conta-excluida') === '1'
    if (foi) sessionStorage.removeItem('neonposts-conta-excluida')
    return foi
  } catch { return false }
}

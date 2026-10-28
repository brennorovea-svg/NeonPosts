import { supabase } from './supabase.js'
import { modoDeTeste } from './perfil.js'
import { SUPABASE_URL } from '../config.js'

// Peças geradas. A IA roda na função gerar-peca do Supabase; aqui só chamamos,
// listamos e guardamos a imagem que o aparelho desenhou.

const ROTEIRO_DE_TESTE = {
  modelo: 'promo',
  titulo: 'Seu site novo em 7 dias',
  apoio: 'Site rápido, bonito e pronto para receber cliente pelo WhatsApp.',
  itens: [{ nome: 'Sites', preco: 'R$ 1.000' }],
  chamada: 'Chama no WhatsApp',
  legenda: 'Chegou a hora do seu negócio aparecer direito no Google. A gente faz o seu site em 7 dias, do jeito da sua marca, com botão de WhatsApp e tudo. Bora junto? Chama no WhatsApp.',
  hashtags: ['#NeonScripts', '#Empreendedorismo', '#Tech', '#SiteProfissional'],
  avisos: [],
}
let pecasDeTeste = []

export function inicioDoMes() {
  const agora = new Date()
  return new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()
}

// Um GET vazio acorda a função (responde 405 sem chamar a IA) para o clique não pagar a partida a frio.
export function acordarIA() {
  if (modoDeTeste() || !SUPABASE_URL) return
  fetch(`${SUPABASE_URL}/functions/v1/gerar-peca`).catch(() => {})
}

export async function gerarPeca({ pedido, formato, fotos = [], refazer, ajuste, modelo }) {
  if (modoDeTeste()) {
    await new Promise((ok) => setTimeout(ok, 6000))
    const antiga = refazer && pecasDeTeste.find((p) => p.id === refazer)
    const peca = {
      id: antiga?.id || `teste-${Date.now()}`,
      formato, modelo: modelo || antiga?.modelo || ROTEIRO_DE_TESTE.modelo, pedido: pedido || antiga?.pedido, fotos: antiga?.fotos || fotos,
      roteiro: { ...ROTEIRO_DE_TESTE, titulo: antiga ? `${ROTEIRO_DE_TESTE.titulo} (v${antiga.refeitas + 2})` : ROTEIRO_DE_TESTE.titulo, cores: /verde/i.test(ajuste || '') ? { titulo: '#2ECC71', texto: '#2ECC71' } : {} },
      imagem: null, refeitas: (antiga?.refeitas ?? -1) + 1, criado_em: new Date().toISOString(),
      versoes: antiga ? [...antiga.versoes, { pedido: antiga.pedido, roteiro: antiga.roteiro }] : [], escolhida: null,
    }
    pecasDeTeste = [peca, ...pecasDeTeste.filter((p) => p.id !== peca.id)]
    return { peca, refeitasRestantes: 3 - peca.refeitas }
  }
  const { data, error } = await supabase.functions.invoke('gerar-peca', { body: { pedido, formato, fotos, refazer, ajuste, modelo } })
  if (error) {
    let mensagem = 'Não deu para criar agora. Tente de novo.'
    try { mensagem = (await error.context.json()).erro || mensagem } catch { /* resposta sem corpo */ }
    throw new Error(mensagem)
  }
  return data
}

export async function listarPecas(negocioId, quantas = 12) {
  if (modoDeTeste()) return pecasDeTeste.slice(0, quantas)
  const { data, error } = await supabase.from('pecas')
    .select('id, formato, modelo, pedido, roteiro, versoes, escolhida, fotos, imagem, refeitas, criado_em')
    .eq('negocio', negocioId).order('criado_em', { ascending: false }).limit(quantas)
  if (error) throw error
  return data
}

export async function pecasDoMes(negocioId) {
  if (modoDeTeste()) return pecasDeTeste.length
  const { count } = await supabase.from('pecas').select('id', { count: 'exact', head: true })
    .eq('negocio', negocioId).gte('criado_em', inicioDoMes())
  return count ?? 0
}

// Guarda a imagem desenhada (uma por modelo) para o histórico mostrar a miniatura.
export async function guardarImagem(peca, negocioId, arquivo) {
  if (modoDeTeste()) return
  const caminho = `${negocioId}/peca-${peca.id}-${peca.formato}-${peca.modelo}-${peca.refeitas}-${peca.escolhida ?? 'n'}.png`
  const { error } = await supabase.storage.from('marcas').upload(caminho, arquivo, { contentType: 'image/png' })
  if (error && !/exists/i.test(error.message)) return
  await supabase.from('pecas').update({ modelo: peca.modelo, formato: peca.formato, imagem: caminho }).eq('id', peca.id)
  return caminho
}

// Qual versão vai para o post. Vazio é a mais nova.
export async function escolherVersao(pecaId, indice) {
  if (modoDeTeste()) return
  await supabase.from('pecas').update({ escolhida: indice }).eq('id', pecaId)
}

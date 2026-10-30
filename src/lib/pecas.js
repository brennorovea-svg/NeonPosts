import { supabase } from './supabase.js'
import { modoDeTeste, perfilDeTeste } from './perfil.js'
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

export async function gerarPeca({ pedido, formato, video = false, fotos = [], refazer, ajuste, modelo, boas_vindas = false }) {
  if (modoDeTeste()) {
    await new Promise((ok) => setTimeout(ok, 6000))
    const antiga = refazer && pecasDeTeste.find((p) => p.id === refazer)
    if (boas_vindas) {
      const peca = {
        id: `teste-${Date.now()}`, formato, modelo: modelo || 'manchete', pedido: 'Post de apresentação da marca', fotos: [], cortesia: true,
        roteiro: { ...ROTEIRO_DE_TESTE, modelo: modelo || 'manchete', titulo: `Prazer, a gente é a ${perfilDeTeste()?.identidade?.nome || 'Naruá'}`, apoio: 'Comida boa, feita na hora. A partir de agora, por aqui também.', chamada: 'Segue a gente', itens: [], legenda: 'Chegamos no Instagram. Por aqui vai ter cardápio, bastidor e aviso de onde o truck está. Segue a gente e chama no WhatsApp.' },
        imagem: null, refeitas: 0, criado_em: new Date().toISOString(), versoes: [], escolhida: null,
      }
      pecasDeTeste = [peca, ...pecasDeTeste]
      return { peca, refeitasRestantes: 3 }
    }
    const peca = {
      id: antiga?.id || `teste-${Date.now()}`,
      formato, modelo: modelo || antiga?.modelo || ROTEIRO_DE_TESTE.modelo, pedido: pedido || antiga?.pedido, fotos: antiga?.fotos || fotos,
      roteiro: { ...ROTEIRO_DE_TESTE, titulo: antiga ? `${ROTEIRO_DE_TESTE.titulo} (v${antiga.refeitas + 2})` : ROTEIRO_DE_TESTE.titulo, cores: /verde/i.test(ajuste || '') ? { titulo: '#2ECC71', texto: '#2ECC71' } : {} },
      // Pedido com sábado: simula a IA sem o horário, para testar o campo que pede o dado.
      // Pedido com "direita": simula alinhamento à direita em vermelho e verde claro, para ver o ajuste de contraste.
      ...(/direita/i.test(pedido || '') ? { roteiro: { ...ROTEIRO_DE_TESTE, titulo: 'Hora de vender muito', apoio: 'Prepare a loja para este fim de semana.', chamada: 'Chama no WhatsApp', arte: { alinhamento: 'direita', fundo: 'claro', tamanho_titulo: 'normal', destaque: '' }, cores: { titulo: '#E53935', texto: '#2ECC71' } } } : {}),
      ...(modelo === 'cenas' ? { roteiro: { ...ROTEIRO_DE_TESTE, modelo: 'cenas', titulo: 'Cardápio da semana', apoio: 'Feito na hora, do jeito que você gosta.', itens: [], pontos: ['Massa fininha feita aqui', 'Recheio que derrete', 'Sai quentinho do truck'], chamada: 'Vem pro Narua', ordem_fotos: [2, 1] } } : {}),
      ...(/sábado/i.test(pedido || '') ? { roteiro: { ...ROTEIRO_DE_TESTE, titulo: 'Agora também aos sábados', apoio: 'Atendimento no sábado: [HORÁRIO].', legenda: 'Agora a gente atende também aos sábados, [HORÁRIO]. Chama no WhatsApp.', avisos: ['Falta o horário: troque [HORÁRIO] antes de postar.'] } } : {}),
      imagem: null, refeitas: (antiga?.refeitas ?? -1) + 1, criado_em: new Date().toISOString(),
      versoes: antiga ? [...antiga.versoes, { pedido: antiga.pedido, roteiro: antiga.roteiro }] : [], escolhida: null,
    }
    pecasDeTeste = [peca, ...pecasDeTeste.filter((p) => p.id !== peca.id)]
    return { peca, refeitasRestantes: 3 - peca.refeitas }
  }
  const { data, error } = await supabase.functions.invoke('gerar-peca', { body: { pedido, formato, video, fotos, refazer, ajuste, modelo, boas_vindas } })
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
    .select('id, formato, modelo, pedido, roteiro, versoes, escolhida, fotos, imagem, refeitas, cortesia, criado_em')
    .eq('negocio', negocioId).order('criado_em', { ascending: false }).limit(quantas)
  if (error) throw error
  return data
}

export async function pecasDoMes(negocioId) {
  if (modoDeTeste()) return pecasDeTeste.filter((p) => !p.cortesia).length
  const { count } = await supabase.from('pecas').select('id', { count: 'exact', head: true })
    .eq('negocio', negocioId).eq('cortesia', false).gte('criado_em', inicioDoMes())
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

// O dono mexeu no texto da peça pronta: o roteiro (e as versões antigas) ficam como ele deixou.
export async function salvarTexto(pecaId, { roteiro, versoes }) {
  if (modoDeTeste()) return
  await supabase.from('pecas').update({ roteiro, versoes }).eq('id', pecaId)
}

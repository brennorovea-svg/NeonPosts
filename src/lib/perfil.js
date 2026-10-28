import { supabase } from './supabase.js'

// Perfil da marca: cada "salvar" cria uma versão nova no banco (perfis_marca).
// No modo de teste local (?tela=area) tudo fica só na memória.

export const PERFIL_VAZIO = {
  identidade: { nome: '', ramo: '', cores: ['#7B5CFF'], logo: null, fotos: [] },
  voz: { tom: [], tratamento: 'você', usa: '', evita: '', exemplos: '', emoji: 'pouco' },
  padrao: { tipos: [], feedPorSemana: 3, storiesPorSemana: 5, hashtags: '', chamada: '' },
  dados: { endereco: '', horario: '', whatsapp: '', instagram: '', site: '', itens: [] },
}

const PARTES = ['identidade', 'voz', 'padrao', 'dados']

let memoriaDeTeste = null
export function usarModoDeTeste(perfil = null) { memoriaDeTeste = { versao: perfil ? 1 : 0, perfil } }
export const modoDeTeste = () => Boolean(memoriaDeTeste)

// Junta o que veio do banco com os campos vazios, para nenhum campo faltar.
function completar(perfil) {
  const final = {}
  for (const p of PARTES) final[p] = { ...PERFIL_VAZIO[p], ...(perfil?.[p] || {}) }
  return final
}

export function parteFeita(perfil, parte) {
  const { identidade: i, voz: v, padrao: p, dados: d } = perfil
  if (parte === 'identidade') return Boolean(i.nome.trim() && i.ramo.trim() && i.cores.length)
  if (parte === 'voz') return v.tom.length > 0
  if (parte === 'padrao') return p.tipos.length > 0
  if (parte === 'dados') return Boolean(d.endereco || d.whatsapp || d.instagram || d.site || d.itens.length)
  return false
}

export async function carregarPerfil(negocioId) {
  if (memoriaDeTeste) return { versao: memoriaDeTeste.versao, perfil: completar(memoriaDeTeste.perfil) }
  const { data, error } = await supabase
    .from('perfis_marca')
    .select('versao, identidade, voz, padrao, dados')
    .eq('negocio', negocioId)
    .order('versao', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return { versao: data?.versao ?? 0, perfil: completar(data) }
}

export async function salvarPerfil(negocioId, perfil) {
  if (memoriaDeTeste) {
    memoriaDeTeste = { versao: memoriaDeTeste.versao + 1, perfil }
    return memoriaDeTeste.versao
  }
  const { data, error } = await supabase
    .from('perfis_marca')
    .insert({ negocio: negocioId, versao: 0, ...perfil })
    .select('versao')
    .single()
  if (error) throw error
  // O nome do negócio também aparece no cabeçalho.
  if (perfil.identidade.nome) {
    await supabase.from('negocios').update({ nome: perfil.identidade.nome }).eq('id', negocioId)
  }
  return data.versao
}

// Logo e fotos ficam no storage privado, numa pasta com o id do negócio.
export async function enviarImagem(negocioId, arquivo, tipo) {
  if (memoriaDeTeste) return URL.createObjectURL(arquivo)
  const extensao = arquivo.name.split('.').pop().toLowerCase()
  const caminho = `${negocioId}/${tipo}-${Date.now()}.${extensao}`
  const { error } = await supabase.storage.from('marcas').upload(caminho, arquivo, { contentType: arquivo.type })
  if (error) throw error
  return caminho
}

export async function enderecoDaImagem(caminho) {
  if (!caminho) return null
  if (memoriaDeTeste || caminho.startsWith('blob:')) return caminho
  const { data } = await supabase.storage.from('marcas').createSignedUrl(caminho, 60 * 60)
  return data?.signedUrl ?? null
}

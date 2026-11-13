import { supabase } from './supabase.js'
import { modoDeTeste } from './perfil.js'

// Planner: postagens marcadas num dia. A peça pode entrar depois.
// Sem rede definida (Brenno, 02/11): sem API oficial, quem posta é a pessoa. O app avisa
// na hora e abre o compartilhar com a legenda copiada; a pessoa escolhe o app ali.
// A coluna `rede` fica no banco, opcional (migração 0019), para quando as redes forem conectadas.
export const LEMBRETES = [[0, 'Na hora'], [10, '10 min antes'], [30, '30 min antes'], [60, '1 h antes'], [1440, 'Um dia antes']]
const BASICAS = 'id, peca, titulo, formato, quando, lembrete_minutos, avisado_em, postado_em'
// Publicar sozinho no Instagram (migração 0020). Antes da migração o banco recusa essas colunas
// e a lista volta só com as básicas, sem quebrar o Planner.
const DIRETO = 'publicar, midia, publicacao_estado, publicacao_erro, permalink'
// Carrossel (migração 0021): os slides que sobem para publicar sozinho.
const OPCOES = [`${BASICAS}, ${DIRETO}, midias`, `${BASICAS}, ${DIRETO}`, BASICAS]
let COLUNAS = OPCOES[0]
async function comColunas(consulta) {
  let r = await consulta(COLUNAS)
  while (r.error && COLUNAS !== BASICAS && /column|coluna/i.test(r.error.message)) {
    COLUNAS = OPCOES[OPCOES.indexOf(COLUNAS) + 1]
    r = await consulta(COLUNAS)
  }
  return r
}

// Datas no fuso da pessoa: a chave do dia é "2026-11-05".
export const chaveDoDia = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const horaDe = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
export function juntarDiaEHora(dia, hora) {
  const [a, m, d] = dia.split('-').map(Number)
  const [h, min] = (hora || '12:00').split(':').map(Number)
  return new Date(a, m - 1, d, h, min)
}

let agendaDeTeste = null
function exemploDeTeste() {
  const hoje = new Date()
  const em = (dias, hora, resto) => ({ id: `agenda-${dias}-${hora}`, peca: null, lembrete_minutos: 10, avisado_em: null, postado_em: null, quando: juntarDiaEHora(chaveDoDia(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + dias)), hora).toISOString(), ...resto })
  return [
    em(-2, '12:00', { titulo: 'Yakissoba da semana', formato: 'post', postado_em: new Date().toISOString() }),
    em(1, '12:00', { titulo: 'Promoção do Big Poke', formato: 'post' }),
    em(3, '09:00', { titulo: 'Onde a gente está hoje', formato: 'story' }),
    em(3, '10:30', { titulo: 'Cardápio do dia', formato: 'story' }),
    em(5, '18:00', { titulo: 'Bastidores da cozinha', formato: 'post' }),
    em(8, '12:00', { titulo: 'Prato da semana', formato: 'post' }),
    em(12, '17:00', { titulo: 'Evento de sábado', formato: 'post' }),
    em(12, '17:00', { titulo: 'Evento de sábado', formato: 'story' }),
    em(19, '08:30', { titulo: 'Encomendas abertas', formato: 'story' }),
  ]
}

export async function listarAgenda(negocioId, de, ate) {
  if (modoDeTeste()) {
    agendaDeTeste ??= exemploDeTeste()
    return agendaDeTeste.filter((i) => i.quando >= de.toISOString() && i.quando < ate.toISOString()).sort((a, b) => a.quando.localeCompare(b.quando))
  }
  const { data, error } = await comColunas((c) => supabase.from('agenda').select(c)
    .eq('negocio', negocioId).gte('quando', de.toISOString()).lt('quando', ate.toISOString()).order('quando'))
  if (error) throw error
  return data
}

// `postado_em` entra quando a pessoa já postou pelo Criar: o mês passa a contar o que saiu.
export async function agendar(negocioId, { titulo, formato, quando, peca = null, lembrete_minutos = 10, postado_em = null }) {
  const linha = { titulo: titulo.trim().slice(0, 120), formato, quando: quando.toISOString(), peca, lembrete_minutos, ...(postado_em ? { postado_em } : {}) }
  if (modoDeTeste()) {
    const item = { id: `agenda-${Date.now()}`, avisado_em: null, postado_em: null, ...linha }
    agendaDeTeste = [...(agendaDeTeste ?? exemploDeTeste()), item]
    return item
  }
  const { data, error } = await comColunas((c) => supabase.from('agenda').insert({ negocio: negocioId, ...linha }).select(c).single())
  if (error) throw error
  return data
}

// Uma marcação pelo id (o aviso do celular traz só o id).
export async function agendaPorId(id) {
  if (modoDeTeste()) return (agendaDeTeste ?? exemploDeTeste()).find((i) => i.id === id) || null
  const { data } = await comColunas((c) => supabase.from('agenda').select(c).eq('id', id).maybeSingle())
  return data || null
}

export async function mudarAgenda(id, campos) {
  const mudanca = { ...campos }
  if (mudanca.quando instanceof Date) mudanca.quando = mudanca.quando.toISOString()
  if (modoDeTeste()) {
    agendaDeTeste = (agendaDeTeste ?? exemploDeTeste()).map((i) => (i.id === id ? { ...i, ...mudanca } : i))
    return agendaDeTeste.find((i) => i.id === id)
  }
  const { data, error } = await comColunas((c) => supabase.from('agenda').update(mudanca).eq('id', id).select(c).single())
  if (error) throw error
  return data
}

export async function tirarDaAgenda(id) {
  if (modoDeTeste()) { agendaDeTeste = (agendaDeTeste ?? []).filter((i) => i.id !== id); return }
  const { error } = await supabase.from('agenda').delete().eq('id', id)
  if (error) throw error
}

// Quantas peças a marca costuma postar por semana, para o planner sugerir o que falta.
export function padraoDaSemana(perfil) {
  return { posts: Number(perfil?.padrao?.feedPorSemana) || 0, stories: Number(perfil?.padrao?.storiesPorSemana) || 0 }
}

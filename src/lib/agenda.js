import { supabase } from './supabase.js'
import { modoDeTeste } from './perfil.js'

// Planner: postagens marcadas num dia e numa rede. A peça pode entrar depois.
// Até as redes estarem conectadas (Bloco 10), quem posta é a pessoa: o app avisa
// na hora e abre o compartilhar com a legenda copiada.

export const REDES = {
  instagram: { nome: 'Instagram', cor: '#A28BFF' },
  facebook: { nome: 'Facebook', cor: '#4FA3FF' },
  whatsapp: { nome: 'WhatsApp status', cor: '#FFC857' },
}
export const LEMBRETES = [[0, 'Na hora'], [10, '10 min antes'], [30, '30 min antes'], [60, '1 h antes'], [1440, 'Um dia antes']]
const COLUNAS = 'id, peca, titulo, rede, formato, quando, lembrete_minutos, avisado_em, postado_em'

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
    em(-2, '12:00', { titulo: 'Yakissoba da semana', rede: 'instagram', formato: 'post', postado_em: new Date().toISOString() }),
    em(1, '12:00', { titulo: 'Promoção do Big Poke', rede: 'instagram', formato: 'post' }),
    em(3, '09:00', { titulo: 'Onde a gente está hoje', rede: 'instagram', formato: 'story' }),
    em(3, '10:30', { titulo: 'Cardápio do dia', rede: 'whatsapp', formato: 'story' }),
    em(5, '18:00', { titulo: 'Bastidores da cozinha', rede: 'facebook', formato: 'post' }),
    em(8, '12:00', { titulo: 'Prato da semana', rede: 'instagram', formato: 'post' }),
    em(12, '17:00', { titulo: 'Evento de sábado', rede: 'instagram', formato: 'post' }),
    em(12, '17:00', { titulo: 'Evento de sábado', rede: 'facebook', formato: 'post' }),
    em(19, '08:30', { titulo: 'Encomendas abertas', rede: 'whatsapp', formato: 'story' }),
  ]
}

export async function listarAgenda(negocioId, de, ate) {
  if (modoDeTeste()) {
    agendaDeTeste ??= exemploDeTeste()
    return agendaDeTeste.filter((i) => i.quando >= de.toISOString() && i.quando < ate.toISOString()).sort((a, b) => a.quando.localeCompare(b.quando))
  }
  const { data, error } = await supabase.from('agenda').select(COLUNAS)
    .eq('negocio', negocioId).gte('quando', de.toISOString()).lt('quando', ate.toISOString()).order('quando')
  if (error) throw error
  return data
}

export async function agendar(negocioId, { titulo, rede, formato, quando, peca = null, lembrete_minutos = 10 }) {
  const linha = { titulo: titulo.trim().slice(0, 120), rede, formato, quando: quando.toISOString(), peca, lembrete_minutos }
  if (modoDeTeste()) {
    const item = { id: `agenda-${Date.now()}`, avisado_em: null, postado_em: null, ...linha }
    agendaDeTeste = [...(agendaDeTeste ?? exemploDeTeste()), item]
    return item
  }
  const { data, error } = await supabase.from('agenda').insert({ negocio: negocioId, ...linha }).select(COLUNAS).single()
  if (error) throw error
  return data
}

export async function mudarAgenda(id, campos) {
  const mudanca = { ...campos }
  if (mudanca.quando instanceof Date) mudanca.quando = mudanca.quando.toISOString()
  if (modoDeTeste()) {
    agendaDeTeste = (agendaDeTeste ?? exemploDeTeste()).map((i) => (i.id === id ? { ...i, ...mudanca } : i))
    return agendaDeTeste.find((i) => i.id === id)
  }
  const { data, error } = await supabase.from('agenda').update(mudanca).eq('id', id).select(COLUNAS).single()
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

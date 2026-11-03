import { chaveDoDia, juntarDiaEHora } from './agenda.js'

// Preencher o mês: distribui pelo calendário os posts que ainda cabem no plano,
// seguindo o padrão de postagem da marca (ex.: 3 no feed e 5 stories por semana).
// Tudo no aparelho, sem IA: o tema de cada dia vem dos tipos que a marca posta e dos itens dela.

// Dias da semana com segunda = 0. Feed em dias espaçados; story nos outros primeiro.
const ORDEM_POST = [1, 3, 5, 0, 2, 4, 6]
const ORDEM_STORY = [0, 2, 4, 1, 3, 5, 6]
const HORA = { post: '12:00', story: '09:00' }

const TEMAS = {
  Promoção: (item) => (item ? `Promoção de ${item}` : 'Promoção da semana'),
  Novidade: () => 'Novidade da semana',
  Bastidores: () => 'Bastidores do dia a dia',
  Dica: () => 'Dica útil para os clientes',
  'Cardápio ou catálogo': (item) => (item ? `Destaque: ${item}` : 'Destaques do cardápio'),
  Depoimento: () => 'Depoimento de um cliente',
  'Antes e depois': () => 'Antes e depois de um trabalho',
}
// Aviso de horário só entra quando muda alguma coisa; não vai para a grade automática.
const PADRAO_DE_TIPOS = ['Novidade', 'Dica', 'Bastidores', 'Promoção']

const diaDaSemana = (d) => (d.getDay() + 6) % 7
const somarDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

export function gerarGrade({ perfil, itens, mes, saldo, hoje = new Date() }) {
  const porSemana = { post: Number(perfil?.padrao?.feedPorSemana) || 0, story: Number(perfil?.padrao?.storiesPorSemana) || 0 }
  const fimDoMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0)
  const amanha = somarDias(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()), 1)
  const inicio = mes > amanha ? mes : amanha
  if (inicio > fimDoMes || saldo <= 0) return []

  const ocupados = {} // { '2026-11-05': { post: 1, story: 0 } }
  for (const i of itens) {
    const c = (ocupados[chaveDoDia(new Date(i.quando))] ??= { post: 0, story: 0 })
    c[i.formato === 'story' ? 'story' : 'post'] += 1
  }

  const vagas = []
  // Semana a semana (segunda a domingo), só com os dias que ainda dá para postar neste mês.
  for (let seg = somarDias(inicio, -diaDaSemana(inicio)); seg <= fimDoMes; seg = somarDias(seg, 7)) {
    const dias = Array.from({ length: 7 }, (_, k) => somarDias(seg, k))
    const livres = dias.filter((d) => d >= inicio && d <= fimDoMes)
    for (const formato of ['post', 'story']) {
      const jaTem = dias.reduce((s, d) => s + (ocupados[chaveDoDia(d)]?.[formato] || 0), 0)
      // Semana cortada (começo ou fim do mês) pede menos, na proporção dos dias que sobram.
      const meta = Math.round(porSemana[formato] * (livres.length / 7))
      let falta = Math.max(0, meta - jaTem)
      for (const k of formato === 'post' ? ORDEM_POST : ORDEM_STORY) {
        if (!falta) break
        const d = dias[k]
        if (!livres.includes(d) || ocupados[chaveDoDia(d)]?.[formato]) continue
        vagas.push({ dia: chaveDoDia(d), formato, prioridade: formato === 'post' ? 0 : 1 })
        falta -= 1
      }
    }
  }

  // O plano manda: se não cabe tudo, o feed vem antes dos stories, e os primeiros dias antes dos últimos.
  const escolhidas = vagas
    .sort((a, b) => a.prioridade - b.prioridade || a.dia.localeCompare(b.dia))
    .slice(0, saldo)
    .sort((a, b) => a.dia.localeCompare(b.dia) || a.prioridade - b.prioridade)

  const tipos = (perfil?.padrao?.tipos || []).filter((t) => TEMAS[t])
  const rodizio = tipos.length ? tipos : PADRAO_DE_TIPOS
  const nomes = (perfil?.dados?.itens || []).map((i) => i?.nome).filter(Boolean)
  let n = 0
  return escolhidas.map((v, i) => {
    const tipo = rodizio[i % rodizio.length]
    const usaItem = tipo === 'Promoção' || tipo === 'Cardápio ou catálogo'
    const item = usaItem && nomes.length ? nomes[n++ % nomes.length] : null
    return { id: `${v.dia}-${v.formato}`, dia: v.dia, formato: v.formato, hora: HORA[v.formato], tipo, titulo: TEMAS[tipo](item), quando: juntarDiaEHora(v.dia, HORA[v.formato]) }
  })
}

// Ideia do dia: um tema por dia, do mesmo rodízio do Preencher o mês, sem IA.
// Muda todo dia e é igual o dia inteiro (conta os dias desde 1/1/2026).
const DIAS_DE_1_JAN = (d) => Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(2026, 0, 1)) / 86400000)
export function ideiaDoDia(perfil, hoje = new Date()) {
  const tipos = (perfil?.padrao?.tipos || []).filter((t) => TEMAS[t])
  const rodizio = tipos.length ? tipos : PADRAO_DE_TIPOS
  const nomes = (perfil?.dados?.itens || []).map((i) => i?.nome).filter(Boolean)
  const n = Math.abs(DIAS_DE_1_JAN(hoje))
  const tipo = rodizio[n % rodizio.length]
  const usaItem = tipo === 'Promoção' || tipo === 'Cardápio ou catálogo'
  const item = usaItem && nomes.length ? nomes[Math.floor(n / rodizio.length) % nomes.length] : null
  return { tipo, titulo: TEMAS[tipo](item) }
}

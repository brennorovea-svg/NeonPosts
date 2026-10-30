import { mudarAgenda, REDES } from './agenda.js'

// Lembrete de postar: aviso do navegador na hora marcada (menos os minutos do lembrete).
// Funciona com o app aberto numa aba ou instalado na tela inicial. Sem servidor de
// push por enquanto: com tudo fechado, não avisa.

export const avisosDisponiveis = () => typeof Notification !== 'undefined'
export const avisosPermitidos = () => avisosDisponiveis() && Notification.permission === 'granted'
export const avisosNegados = () => avisosDisponiveis() && Notification.permission === 'denied'

export async function pedirAvisos() {
  if (!avisosDisponiveis()) return false
  if (Notification.permission === 'granted') return true
  const r = await Notification.requestPermission()
  return r === 'granted'
}

const CHECAR_A_CADA = 30 * 1000
const UM_DIA = 24 * 60 * 60 * 1000

// Marcação sem peça avisada na véspera: fica no aparelho, sem coluna nova no banco.
const CHAVE_VESPERA = 'neonposts-avisou-criar'
const lidos = () => { try { return new Set(JSON.parse(localStorage.getItem(CHAVE_VESPERA) || '[]')) } catch { return new Set() } }
const marcarLido = (id) => { try { localStorage.setItem(CHAVE_VESPERA, JSON.stringify([...lidos(), id].slice(-200))) } catch { /* sem espaço, avisa de novo amanhã */ } }

// Olha a agenda a cada 30 s e dispara o aviso de quem chegou na hora.
// `onAbrir(item)` roda quando a pessoa toca no aviso. Devolve a função que para.
export function vigiarAgenda(obterItens, onAbrir, onAvisou) {
  if (!avisosPermitidos()) return () => {}
  const checar = () => {
    const agora = Date.now()
    const vespera = lidos()
    for (const item of obterItens()) {
      if (item.postado_em) continue
      const quando = new Date(item.quando).getTime()
      // Marcação sem peça: um dia antes, lembra de criar a arte.
      if (!item.peca && !vespera.has(item.id) && quando - UM_DIA <= agora && quando - UM_DIA > agora - 60 * 60 * 1000) {
        try {
          const n = new Notification(`Amanhã tem ${item.titulo}`, {
            body: 'A arte ainda não existe. Toque para criar a peça agora.',
            icon: '/neonposts-icone-192.png',
            tag: `criar-${item.id}`,
          })
          n.onclick = () => { window.focus(); onAbrir(item); n.close() }
        } catch { /* sem aviso, segue */ }
        marcarLido(item.id)
      }
      if (item.avisado_em) continue
      const hora = quando - item.lembrete_minutos * 60 * 1000
      // Avisa só do que chegou na hora até 1 h atrás; mais velho que isso, ficou para trás.
      if (hora > agora || hora < agora - 60 * 60 * 1000) continue
      try {
        const n = new Notification(`Hora de postar: ${item.titulo}`, {
          body: `${REDES[item.rede]?.nome || item.rede} · ${item.formato === 'story' ? 'story' : 'post'} às ${new Date(item.quando).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Toque para abrir e postar.`,
          icon: '/neonposts-icone-192.png',
          tag: `agenda-${item.id}`,
        })
        n.onclick = () => { window.focus(); onAbrir(item); n.close() }
      } catch { /* alguns navegadores só avisam pelo service worker; sem ele, segue sem aviso */ }
      mudarAgenda(item.id, { avisado_em: new Date().toISOString() }).then(onAvisou).catch(() => {})
    }
  }
  checar()
  const id = setInterval(checar, CHECAR_A_CADA)
  return () => clearInterval(id)
}

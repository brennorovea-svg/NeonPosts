// Preços do lançamento (Bloco 12, 03/11/2026). A tela mostra a cópia em src/lib/planos.js; se mudar aqui, mudar lá.
// "fundador" é o preço de quem assina enquanto FUNDADOR_ABERTO for true: fica travado por FUNDADOR_MESES.
export const PLANOS = {
  gratis: { nome: 'Grátis', pecas: 5, centavos: 0, fundador: 0 },
  essencial: { nome: 'Essencial', pecas: 30, centavos: 4900, fundador: 3900 },
  pro: { nome: 'Pro', pecas: 100, centavos: 9900, fundador: 7900 },
} as const

// Fecha o preço de fundador para quem assinar daqui em diante. Quem já é fundador continua.
export const FUNDADOR_ABERTO = true
export const FUNDADOR_MESES = 12

// Anual: paga 10 meses e leva 12 (2 meses grátis). O limite de posts continua por mês.
export const MESES_PAGOS_NO_ANO = 10
export type Periodo = 'mes' | 'ano'

export type Plano = keyof typeof PLANOS
export const PAGOS: Plano[] = ['essencial', 'pro']

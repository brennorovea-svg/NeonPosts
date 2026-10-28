// Planos provisórios (Bloco 5, modo teste). Os preços de verdade saem no Bloco 7.
// A tela mostra a cópia em src/lib/planos.js; se mudar aqui, mudar lá.
export const PLANOS = {
  gratis: { nome: 'Grátis', pecas: 5, centavos: 0 },
  essencial: { nome: 'Essencial', pecas: 30, centavos: 3900 },
  pro: { nome: 'Pro', pecas: 100, centavos: 7900 },
} as const

export type Plano = keyof typeof PLANOS
export const PAGOS: Plano[] = ['essencial', 'pro']

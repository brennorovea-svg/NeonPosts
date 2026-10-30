// Fonte dos títulos da arte, escolhida no perfil da marca. O resto do texto fica na fonte do app.
// Todas do Google Fonts, com acentos do português. Titan One e Anton só têm um peso.
export const FONTES = {
  moderna: { nome: 'Moderna', familia: '"Instrument Sans"', peso: 700, escala: 1 },
  marcante: { nome: 'Marcante', familia: '"Bricolage Grotesque"', peso: 800, escala: 1 },
  elegante: { nome: 'Elegante', familia: '"Fraunces"', peso: 700, escala: 1 },
  divertida: { nome: 'Divertida', familia: '"Titan One"', peso: 400, escala: 0.94 },
  impacto: { nome: 'Impacto', familia: '"Anton"', peso: 400, escala: 1.06 },
  escrita: { nome: 'Escrita à mão', familia: '"Caveat"', peso: 700, escala: 1.18 },
}
export const FONTE_PADRAO = 'moderna'
export const fonteDa = (chave) => FONTES[chave] || FONTES[FONTE_PADRAO]

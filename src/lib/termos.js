import { supabase } from './supabase.js'

// Versão vigente dos Termos de uso e da Política de privacidade (a data da última mudança).
// Mudou o texto em public/termos/ ou public/privacidade/? Troque a data aqui e lá:
// quem já aceitou vê a tela de aceite de novo no próximo login.
export const TERMOS_VERSAO = '2026-11-02'

// Caminhos relativos: funcionam na raiz do domínio e no endereço provisório do GitHub Pages.
export const LINK_TERMOS = 'termos/'
export const LINK_PRIVACIDADE = 'privacidade/'

export const aceitouTermos = (negocio) => Boolean(negocio?.aceitou_termos_em) && negocio.termos_versao === TERMOS_VERSAO

export async function aceitarTermos(negocioId) {
  const { error } = await supabase.from('negocios')
    .update({ aceitou_termos_em: new Date().toISOString(), termos_versao: TERMOS_VERSAO })
    .eq('id', negocioId)
  if (error) throw new Error('Não deu para guardar o aceite agora. Tente de novo.')
}

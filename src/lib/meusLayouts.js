// Meus layouts (Bloco 11): o dono marca na Marca os layouts que têm a cara dele ("Gosto") e os que não quer ver ("Não usar").
// Fica no perfil da marca, em padrao.layouts, com versão como o resto. Os que ele gosta vêm na frente das sugestões e
// a IA escolhe só entre eles; os escondidos somem de tudo. Sem nada marcado, o app funciona como antes.
import { layoutsDoGrupo } from './desenhar.js'

export function preferencias(perfil) {
  const l = perfil?.padrao?.layouts || {}
  return { gosto: Array.isArray(l.gosto) ? l.gosto : [], nao: Array.isArray(l.nao) ? l.nao : [] }
}

export const temPreferencias = (perfil) => {
  const { gosto, nao } = preferencias(perfil)
  return gosto.length + nao.length > 0
}

// Os layouts do grupo que o dono não escondeu.
export function layoutsVisiveis(temFoto, animado, perfil) {
  const { nao } = preferencias(perfil)
  return layoutsDoGrupo(temFoto, animado).filter((m) => !nao.includes(m))
}

// Os 3 da frente: primeiro os que ele gosta (do grupo), depois os sugeridos pelo tipo, sem os escondidos.
export function sugeridosDaMarca(sugeridos, temFoto, animado, perfil) {
  const { gosto, nao } = preferencias(perfil)
  const grupo = layoutsVisiveis(temFoto, animado, perfil)
  const favoritos = gosto.filter((m) => grupo.includes(m))
  const lista = [...favoritos, ...sugeridos.filter((m) => !favoritos.includes(m) && !nao.includes(m))]
  return (lista.length ? lista : grupo).slice(0, 3)
}

// Perfil novo com a escolha. Um layout não fica nas duas listas ao mesmo tempo.
export function comPreferencias(perfil, gosto, nao) {
  const limpo = { gosto: [...new Set(gosto)], nao: [...new Set(nao)].filter((m) => !gosto.includes(m)) }
  return { ...perfil, padrao: { ...perfil.padrao, layouts: limpo } }
}

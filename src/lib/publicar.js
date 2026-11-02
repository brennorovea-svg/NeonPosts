// Publicar: levar o post pronto do app para a rede, em um toque.
// O arquivo (PNG ou vídeo) fica pronto ANTES do toque. No toque, a legenda é copiada
// e o compartilhar do aparelho abre na mesma hora, sem espera no meio: o Safari do
// iPhone só aceita copiar e compartilhar logo depois do toque da pessoa.
import { carregarImagem, desenhar, paraArquivo, SO_NO_VIDEO } from './desenhar.js'
import { enderecoDaImagem } from './perfil.js'
import { gravar } from './video.js'

// Modelo animado: sai em vídeo, nunca em imagem parada.
export const ehAnimado = (modelo) => SO_NO_VIDEO.includes(modelo)

// Legenda da versão escolhida da peça (a mesma regra da tela Criar).
export function roteiroDaPeca(peca) {
  if (!peca) return null
  const versoes = [...(peca.versoes || []), { roteiro: peca.roteiro }]
  return versoes[Math.min(peca.escolhida ?? versoes.length - 1, versoes.length - 1)]?.roteiro || null
}
export const textoDaLegenda = (r) => (r ? `${r.legenda || ''}\n\n${(r.hashtags || []).join(' ')}`.trim() : '')
export const legendaDe = (peca) => textoDaLegenda(roteiroDaPeca(peca))

export const nomeDoArquivo = (nome, peca, video) => `${nome || 'post'}-${video ? 'video' : peca.formato}`.replace(/\s+/g, '-').toLowerCase()

// Logo e fotos ficam guardadas por caminho: carregam uma vez e servem a todas as telas.
const imagensGuardadas = new Map()
export function imagemDe(caminho) {
  if (!caminho) return Promise.resolve(null)
  if (!imagensGuardadas.has(caminho)) imagensGuardadas.set(caminho, enderecoDaImagem(caminho).then(carregarImagem))
  return imagensGuardadas.get(caminho)
}

// Fotos na ordem que a IA devolveu (1, 2, 3...).
function emOrdem(lista, ordem) {
  const escolhidas = [...new Set((ordem || []).map((n) => lista[n - 1]).filter(Boolean))]
  return [...escolhidas, ...lista.filter((c) => !escolhidas.includes(c))]
}

// Monta as opções do desenhar() a partir da peça e do perfil, com logo e fotos carregados.
export async function opcoesDaPeca(peca, perfil, rede = null) {
  const roteiro = roteiroDaPeca(peca)
  const caminhos = emOrdem(peca.fotos || [], roteiro?.ordem_fotos)
  if (!caminhos.length && peca.modelo === 'bastidores' && perfil.identidade.fotos?.[0]) caminhos.push(perfil.identidade.fotos[0])
  const [logo, fotos] = await Promise.all([imagemDe(perfil.identidade.logo), Promise.all(caminhos.map(imagemDe))])
  return {
    formato: peca.formato, modelo: peca.modelo, roteiro, cores: perfil.identidade.cores, nome: perfil.identidade.nome,
    fonte: perfil.identidade.fonte, logo, fotos: fotos.filter(Boolean),
    rede: rede === 'tiktok' && peca.formato === 'story' ? 'tiktok' : null,
  }
}

// Gera o arquivo do post fora da tela: PNG para o parado, vídeo para o animado.
// `aoAvancar` recebe de 0 a 1 enquanto grava; `sinal` cancela a gravação.
export async function prepararArquivo(opcoes, { video, nome, aoAvancar, sinal } = {}) {
  if (video) {
    const r = await gravar(opcoes, nome, aoAvancar, sinal)
    return { arquivo: r.arquivo, extensao: r.extensao }
  }
  const quadro = document.createElement('canvas')
  desenhar(quadro, opcoes)
  return { arquivo: await paraArquivo(quadro, `${nome}.png`), extensao: 'png' }
}

// O aparelho compartilha arquivos? (celular sim; computador quase nunca)
let podeCompartilharGuardado = null
export function podeCompartilhar() {
  if (podeCompartilharGuardado === null) {
    try { podeCompartilharGuardado = Boolean(navigator.canShare?.({ files: [new File([''], 'x.png', { type: 'image/png' })] })) } catch { podeCompartilharGuardado = false }
  }
  return podeCompartilharGuardado
}

// Copia a legenda e abre o compartilhar com o arquivo. Chamar DIRETO no toque, com o
// arquivo já pronto. Devolve um destes resultados (com "-sem-copiar" quando a legenda não copiou):
// 'compartilhou'; 'baixou' (aparelho sem compartilhar, o computador); 'tipo' (o celular compartilha,
// mas não esse tipo de arquivo, então baixa); 'falhou' (o compartilhar recusou; nada baixa sozinho,
// a pessoa toca de novo); 'cancelou'. O motivo da última falha fica em ultimaFalha().
let falha = ''
let tentarSemTexto = false
export const ultimaFalha = () => falha
export async function entregar(arquivo, legenda) {
  // A cópia começa antes do compartilhar e não espera: os dois saem no mesmo toque.
  let copiou = true
  const copia = navigator.clipboard?.writeText(legenda).catch(() => { copiou = false }) || Promise.resolve((copiou = false))
  const fim = async (r) => { await copia; return copiou ? r : `${r}-sem-copiar` }
  falha = ''
  if (!podeCompartilhar()) { baixarArquivo(arquivo); return fim('baixou') }
  if (!navigator.canShare({ files: [arquivo] })) {
    falha = `tipo ${arquivo.type || 'desconhecido'}`
    baixarArquivo(arquivo)
    return fim('tipo')
  }
  // Depois de uma recusa, tenta só com o arquivo: a legenda já vai copiada e algumas redes recusam texto junto.
  const dados = tentarSemTexto ? { files: [arquivo] } : { files: [arquivo], text: legenda }
  try {
    await navigator.share(dados)
    tentarSemTexto = false
    return fim('compartilhou')
  } catch (e) {
    if (e.name === 'AbortError') return 'cancelou'
    falha = e.name || 'erro'
    tentarSemTexto = true
    return fim('falhou')
  }
}

// Título e texto do cartão "Postou?" para cada resultado do entregar().
export function avisoDoResultado(resultado, rede) {
  const semCopiar = resultado.endsWith('-sem-copiar')
  const base = resultado.replace('-sem-copiar', '')
  const copiar = semCopiar ? ' A legenda não copiou sozinha: use o botão Copiar legenda.' : ''
  if (base === 'compartilhou') return { titulo: semCopiar ? 'Arquivo enviado.' : 'Legenda copiada.', texto: passoNaRede(rede) + copiar }
  if (base === 'baixou') return { titulo: semCopiar ? 'Arquivo baixado.' : 'Arquivo baixado e legenda copiada.', texto: `Mande o arquivo para o celular e poste de lá. ${passoNaRede(rede)}${copiar}` }
  if (base === 'tipo') return { titulo: 'O arquivo foi baixado.', texto: `Este celular não compartilha esse arquivo pelo navegador. Abra a rede, escolha o arquivo na galeria e cole a legenda.${copiar}` }
  return { titulo: 'O compartilhar não abriu.', texto: `Toque em Postar de novo. Se não abrir, use Baixar o arquivo e escolha ele na galeria dentro da rede. (motivo: ${falha || 'desconhecido'})${copiar}` }
}

export function baixarArquivo(arquivo) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(arquivo)
  link.download = arquivo.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 4000)
}

// A legenda num arquivo de texto, para quem posta pelo computador.
export function baixarLegenda(legenda, nome) {
  baixarArquivo(new File([legenda], `${nome}-legenda.txt`, { type: 'text/plain' }))
}

// O que fazer na rede depois do compartilhar: o Instagram e os outros ignoram o texto
// que vai junto, então a pessoa cola a legenda copiada.
export const PASSO_NA_REDE = {
  instagram: 'No Instagram, toque em Avançar e cole a legenda no campo de texto.',
  facebook: 'No Facebook, cole a legenda no texto da publicação.',
  whatsapp: 'No WhatsApp, escolha Status. A legenda copiada pode ir no texto, se quiser.',
  tiktok: 'No TikTok, toque em Avançar e cole o texto na descrição.',
  linkedin: 'No LinkedIn, cole o texto do post. Ele já está copiado.',
}
export const passoNaRede = (rede) => PASSO_NA_REDE[rede] || 'Na rede, cole a legenda copiada no texto do post.'

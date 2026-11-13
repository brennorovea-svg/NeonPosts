// Publicar: levar o post pronto do app para a rede, em um toque.
// O arquivo (PNG ou vídeo) fica pronto ANTES do toque. No toque, a legenda é copiada
// e o compartilhar do aparelho abre na mesma hora, sem espera no meio: o Safari do
// iPhone só aceita copiar e compartilhar logo depois do toque da pessoa.
import { carregarImagem, desenhar, paraArquivo, SO_NO_VIDEO } from './desenhar.js'
import { enderecoDaImagem } from './perfil.js'
import { gravar } from './video.js'
import { arquivosDoCarrossel } from './carrossel.js'

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

// Nome do arquivo só com letras sem acento, números e hífen. O Chrome do Android recusa o
// compartilhar (NotAllowedError) quando o nome traz vírgula, reticências ou acento, como nos
// títulos do planner ("Necessário, mas super chato...").
const limparNome = (texto) => (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '')
export const nomeDoArquivo = (nome, peca, video) => `${limparNome(nome) || 'post'}-${video ? 'video' : peca.formato}`

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
export async function opcoesDaPeca(peca, perfil) {
  const roteiro = roteiroDaPeca(peca)
  const caminhos = emOrdem(peca.fotos || [], roteiro?.ordem_fotos)
  if (!caminhos.length && peca.modelo === 'bastidores' && perfil.identidade.fotos?.[0]) caminhos.push(perfil.identidade.fotos[0])
  const [logo, fotos] = await Promise.all([imagemDe(perfil.identidade.logo), Promise.all(caminhos.map(imagemDe))])
  return {
    formato: peca.formato, modelo: peca.modelo, roteiro, cores: perfil.identidade.cores, nome: perfil.identidade.nome,
    fonte: perfil.identidade.fonte, logo, fotos: fotos.filter(Boolean),
  }
}

// Gera o arquivo do post fora da tela: PNG para o parado, vídeo para o animado.
// `aoAvancar` recebe de 0 a 1 enquanto grava; `sinal` cancela a gravação.
// Carrossel: `arquivos` traz um arquivo por slide, na ordem; `arquivo` é o primeiro.
export async function prepararArquivo(opcoes, { video, nome, aoAvancar, sinal } = {}) {
  if (opcoes.modelo === 'carrossel') {
    const arquivos = await arquivosDoCarrossel(opcoes, { video, nome, aoAvancar, sinal })
    return { arquivo: arquivos[0], arquivos, extensao: video ? arquivos[0].name.split('.').pop() : 'png' }
  }
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
// Aceita um arquivo ou a lista do carrossel (o compartilhar leva todos de uma vez).
export async function entregar(arquivoOuLista, legenda) {
  const arquivos = Array.isArray(arquivoOuLista) ? arquivoOuLista : [arquivoOuLista]
  const arquivo = arquivos[0]
  // A cópia começa antes do compartilhar e não espera: os dois saem no mesmo toque.
  let copiou = true
  const copia = navigator.clipboard?.writeText(legenda).catch(() => { copiou = false }) || Promise.resolve((copiou = false))
  const fim = async (r) => { await copia; return copiou ? r : `${r}-sem-copiar` }
  falha = ''
  if (!podeCompartilhar()) { baixarArquivos(arquivos); return fim('baixou') }
  if (!navigator.canShare({ files: arquivos })) {
    falha = `tipo ${arquivo.type || 'desconhecido'}${arquivos.length > 1 ? ` x${arquivos.length}` : ''}`
    baixarArquivos(arquivos)
    return fim('tipo')
  }
  // Depois de uma recusa, tenta só com o arquivo: a legenda já vai copiada e algumas redes recusam texto junto.
  const dados = tentarSemTexto ? { files: arquivos } : { files: arquivos, text: legenda }
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
export function avisoDoResultado(resultado) {
  const semCopiar = resultado.endsWith('-sem-copiar')
  const base = resultado.replace('-sem-copiar', '')
  const copiar = semCopiar ? ' A legenda não copiou sozinha: use o botão Copiar legenda.' : ''
  if (base === 'compartilhou') return { titulo: semCopiar ? 'Arquivo enviado.' : 'Legenda copiada.', texto: PASSO_NA_REDE + copiar }
  if (base === 'baixou') return { titulo: semCopiar ? 'Arquivo baixado.' : 'Arquivo baixado e legenda copiada.', texto: `Mande o arquivo para o celular e poste de lá. ${PASSO_NA_REDE}${copiar}` }
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

// Vários arquivos (carrossel): um por vez, com folga, para o navegador não barrar os downloads seguidos.
export function baixarArquivos(arquivos) {
  arquivos.forEach((a, i) => setTimeout(() => baixarArquivo(a), i * 350))
}

// A legenda num arquivo de texto, para quem posta pelo computador.
export function baixarLegenda(legenda, nome) {
  baixarArquivo(new File([legenda], `${nome}-legenda.txt`, { type: 'text/plain' }))
}

// O que fazer depois do compartilhar: a pessoa escolhe o app ali. O Instagram e os outros
// ignoram o texto que vai junto, então ela cola a legenda copiada.
export const PASSO_NA_REDE = 'Escolha o app onde vai postar e cole a legenda no texto do post.'

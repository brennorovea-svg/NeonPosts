// Desenha a peça no próprio aparelho, num canvas de 1080 de largura.
// Post 4:5 (1080x1350) e story 9:16 (1080x1920). Vinte modelos para post e story, mais o vídeo em cenas e os vinte
// stories com movimento (historias.js), que só aparecem no vídeo. A IA escolhe o modelo e o jeito da arte
// (palavra em destaque, tamanho do título, alinhamento e fundo).
import { criarHistorias, NOMES_DAS_HISTORIAS } from './historias.js'

export const TAMANHOS = { post: [1080, 1350], story: [1080, 1920] }
export const NOMES_DOS_MODELOS = {
  promo: 'Promoção', aviso: 'Aviso', bastidores: 'Bastidores', manchete: 'Manchete', lista: 'Lista',
  citacao: 'Citação', dividido: 'Dividido', foto: 'Foto inteira', cartao: 'Cartão',
  numero: 'Número', cupom: 'Cupom', agenda: 'Agenda', conversa: 'Conversa', mosaico: 'Mosaico', faixas: 'Faixas',
  capa: 'Capa de revista', comparar: 'Antes e depois', tabela: 'Tabela', enquete: 'Enquete',
  cenas: 'Vídeo em cenas',
  ...NOMES_DAS_HISTORIAS,
}
// Só aparece quando o formato é vídeo.
export const SO_NO_VIDEO = ['cenas', ...Object.keys(NOMES_DAS_HISTORIAS)]
import { fonteDa } from './fontes.js'

const FONTE = '"Instrument Sans", system-ui, sans-serif'
// Fonte dos títulos da marca (perfil > identidade > fonte). Vale para texto em 700 a partir de 64 px.
let fonteTitulo = fonteDa()
function fonteDoBloco(peso, t, tamanho) {
  if (peso < 700 || tamanho < 64) return `${peso} ${t}px ${FONTE}`
  return `${fonteTitulo.peso} ${Math.round(t * fonteTitulo.escala)}px ${fonteTitulo.familia}, ${FONTE}`
}

// Vídeo: quando há relógio, cada elemento entra na ordem em que é desenhado.
// Só opacidade, deslocamento e escala, no easing da marca. Sem relógio, a arte sai parada.
let relogio = null
const suave = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 4)
function proximaEntrada() {
  const inicio = 0.35 + relogio.ordem * 0.32
  relogio.ordem += 1
  return inicio
}
// Abre a entrada de um elemento: some, desce um pouco e sobe até o lugar.
function entrar(ctx, inicio, { dur = 0.6, desloca = 36, escala = 0 } = {}, cx = 0, cy = 0) {
  if (!relogio) return 1
  const p = suave((relogio.t - inicio) / dur)
  ctx.globalAlpha = p
  ctx.translate(0, (1 - p) * desloca)
  if (escala) {
    const e = 1 - escala * (1 - p)
    ctx.translate(cx, cy)
    ctx.scale(e, e)
    ctx.translate(-cx, -cy)
  }
  return p
}
// Desenha um elemento solto (chamada em texto, número, aspas) com a sua entrada no vídeo.
function animado(ctx, desenho, opcoes) {
  ctx.save()
  if (relogio) entrar(ctx, proximaEntrada(), opcoes)
  desenho()
  ctx.restore()
}
// Piscada de neon da palavra em destaque: apaga e acende rápido duas vezes, depois fica acesa.
function piscada(inicio) {
  if (!relogio) return 1
  const t = relogio.t - inicio
  if (t < 0) return 1
  return [[0.0, 0.08], [0.16, 0.22], [2.6, 2.66]].some(([a, b]) => t >= a && t < b) ? 0.25 : 1
}

// Quando o próximo elemento vai entrar, sem gastar a vez dele.
const espiar = () => 0.35 + relogio.ordem * 0.32
// Acende como neon: apaga e acende rápido algumas vezes nos primeiros 0,25 s e fica aceso.
function acender(inicio, dur = 0.7) {
  if (!relogio) return 1
  const p = (relogio.t - inicio) / dur
  if (p < 0) return 0
  const passos = [[0, 0.08], [0.1, 1], [0.14, 0.2], [0.22, 1], [0.27, 0.35], [0.36, 1]]
  let o = 0.08
  for (const [k, v] of passos) if (p >= k) o = v
  return o
}
// Número pseudoaleatório estável (o mesmo quadro desenha sempre igual, na prévia e na gravação).
const sorteio = (a, b = 0) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return x - Math.floor(x)
}
// Peso no botão: afunda, estica um pouco e assenta (0,52 s).
function apertao(e) {
  if (e < 0 || e > 0.52) return 1
  const k = [[0, 1], [0.25, 0.92], [0.6, 1.07], [0.8, 0.98], [1, 1]]
  const p = e / 0.52
  for (let i = 1; i < k.length; i++) {
    if (p <= k[i][0]) {
      const q = (p - k[i - 1][0]) / (k[i][0] - k[i - 1][0])
      return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * (0.5 - Math.cos(q * Math.PI) / 2)
    }
  }
  return 1
}
// Confete nas cores da marca, saindo de (cx, cy) no instante `inicio`. Some em 1 s.
function confete(ctx, cx, cy, inicio, cores) {
  if (!relogio) return
  const tau = relogio.t - inicio
  if (tau < 0 || tau > 1) return
  ctx.save()
  ctx.globalAlpha = 1 - tau
  for (let i = 0; i < 30; i++) {
    const ang = -Math.PI / 2 + (sorteio(i, 1) - 0.5) * Math.PI * 1.3
    const vel = 700 + sorteio(i, 2) * 900
    const lado = 12 + sorteio(i, 3) * 12
    ctx.fillStyle = cores[i % cores.length]
    ctx.fillRect(cx + Math.cos(ang) * vel * tau - lado / 2, cy + Math.sin(ang) * vel * tau + 2600 * tau * tau - lado / 2, lado, lado)
  }
  ctx.restore()
}

export async function prepararFontes(chave) {
  const titulo = fonteDa(chave)
  await Promise.all([
    ...['400', '600', '700'].map((p) => document.fonts.load(`${p} 40px "Instrument Sans"`)),
    document.fonts.load(`${titulo.peso} 40px ${titulo.familia}`),
    document.fonts.load('600 40px "JetBrains Mono"'),
  ])
}

export function carregarImagem(src) {
  if (!src) return Promise.resolve(null)
  return new Promise((ok) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => ok(img)
    img.onerror = () => ok(null)
    img.src = src
  })
}

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function luz(hex) {
  const [r, g, b] = rgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const textoSobre = (hex) => (luz(hex) > 0.45 ? '#111114' : '#FFFFFF')
const comAlfa = (hex, a) => `rgba(${rgb(hex).join(',')},${a})`
function misturar(a, b, t) {
  const x = rgb(a), y = rgb(b)
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

function quebrar(ctx, texto, largura) {
  const linhas = []
  let atual = ''
  for (const palavra of String(texto).split(/\s+/).filter(Boolean)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra
    if (ctx.measureText(tentativa).width > largura && atual) { linhas.push(atual); atual = palavra } else atual = tentativa
  }
  if (atual) linhas.push(atual)
  return linhas
}

// Mesma quantidade de linhas, mas com larguras parecidas: evita palavra sozinha na última.
function equilibrar(ctx, texto, largura) {
  const n = quebrar(ctx, texto, largura).length
  if (n < 2) return quebrar(ctx, texto, largura)
  let min = largura * 0.5, max = largura
  while (max - min > 4) {
    const meio = (min + max) / 2
    if (quebrar(ctx, texto, meio).length > n) min = meio; else max = meio
  }
  return quebrar(ctx, texto, max)
}

// Índices das palavras do texto que fazem parte do trecho a destacar (ex.: "sábados").
function marcadas(texto, trecho) {
  const limpo = (p) => p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]/gu, '')
  const palavras = String(texto).split(/\s+/).filter(Boolean).map(limpo)
  const alvo = String(trecho || '').split(/\s+/).filter(Boolean).map(limpo).filter(Boolean)
  const set = new Set()
  if (!alvo.length) return set
  for (let i = 0; i + alvo.length <= palavras.length; i++) {
    if (alvo.every((a, j) => palavras[i + j] === a)) for (let j = 0; j < alvo.length; j++) set.add(i + j)
  }
  return set
}

// Escreve um bloco de texto, diminuindo a fonte até caber no número de linhas.
// Se nem no mínimo couber, desenha todas as linhas: texto nunca some da arte.
// `marcar` pinta um trecho com `corMarca` (a palavra que a IA escolheu destacar).
function bloco(ctx, texto, { x, y, largura, tamanho, minimo = 36, peso = 700, maxLinhas = 4, cor, alinhar = 'left', entre = 1.04, baseEmBaixo = false, marcar = '', corMarca }) {
  if (!texto) return y
  let t = tamanho, linhas
  do {
    ctx.font = fonteDoBloco(peso, t, tamanho)
    linhas = peso >= 600 ? equilibrar(ctx, texto, largura) : quebrar(ctx, texto, largura)
    t -= 4
  } while (linhas.length > maxLinhas && t >= Math.min(minimo, tamanho * 0.7))
  t += 4
  const n = linhas.length
  const altura = t * entre
  ctx.textBaseline = 'alphabetic'
  const topo = baseEmBaixo ? y - altura * n : y
  const pintar = corMarca ? marcadas(texto, marcar) : new Set()
  const inicio = relogio ? proximaEntrada() : 0
  // No vídeo, título grande entra palavra por palavra, com um leve exagero (cresce a 1,08 e assenta).
  if (relogio && peso >= 700 && tamanho >= 64) {
    ctx.textAlign = 'left'
    const espaco = ctx.measureText(' ').width
    const total = linhas.reduce((n, l) => n + l.split(' ').length, 0)
    const passo = total > 12 ? 0.05 : 0.08
    // Os próximos elementos esperam a frase terminar de entrar.
    relogio.ordem += Math.floor((total * passo) / 0.32)
    const fimDasPalavras = inicio + total * passo + 0.48
    let k = 0
    linhas.forEach((l, i) => {
      const w = ctx.measureText(l).width
      let px = alinhar === 'center' ? x + (largura - w) / 2 : alinhar === 'right' ? x + largura - w : x
      const yb = topo + t * 0.9 + altura * i
      const palavras = l.split(' ')
      palavras.forEach((palavra, j) => {
        const marcada = pintar.has(k)
        const pw = ctx.measureText(palavra).width
        const p = (relogio.t - (inicio + k * passo)) / 0.48
        k++
        if (p > 0) {
          const a = Math.min(1, p / 0.6)
          const e = p < 0.6 ? 0.55 + 0.53 * suave(p / 0.6) : 1.08 - 0.08 * suave((p - 0.6) / 0.4)
          ctx.save()
          ctx.globalAlpha *= a
          ctx.translate(px + pw / 2, yb - t * 0.35 + (1 - a) * t * 0.14)
          ctx.scale(e, e)
          ctx.translate(-(px + pw / 2), -(yb - t * 0.35))
          ctx.fillStyle = marcada ? corMarca : cor
          ctx.fillText(palavra, px, yb)
          ctx.restore()
          // Sublinhado que se desenha sob o trecho destacado, depois que a frase toda entrou.
          if (marcada) {
            const q = suave((relogio.t - fimDasPalavras - 0.1) / 0.4)
            const continua = j < palavras.length - 1 && pintar.has(k)
            const sw = (pw + (continua ? espaco : 0)) * q
            if (sw > 0) {
              ctx.fillStyle = corMarca
              ctx.fillRect(px, yb + t * 0.12, sw, Math.max(6, t * 0.06))
            }
          }
        }
        px += pw + espaco
      })
    })
    return baseEmBaixo ? topo : topo + altura * n
  }
  // No vídeo, cada linha entra um pouco depois da anterior.
  const linha = (i, desenho) => {
    ctx.save()
    entrar(ctx, inicio + i * 0.12)
    desenho()
    ctx.restore()
  }
  if (!pintar.size) {
    ctx.fillStyle = cor
    ctx.textAlign = alinhar
    const ax = ancora(alinhar, x, largura)
    linhas.forEach((l, i) => linha(i, () => ctx.fillText(l, ax, topo + t * 0.9 + altura * i)))
  } else {
    // Palavra por palavra, para trocar a cor só no trecho destacado.
    ctx.textAlign = 'left'
    const espaco = ctx.measureText(' ').width
    let n = 0
    const brilhoMarca = piscada(inicio + 0.3 + linhas.length * 0.12 + 0.5)
    linhas.forEach((l, i) => linha(i, () => {
      const w = ctx.measureText(l).width
      let px = alinhar === 'center' ? x + (largura - w) / 2 : alinhar === 'right' ? x + largura - w : x
      for (const palavra of l.split(' ')) {
        const marcada = pintar.has(n++)
        ctx.fillStyle = marcada ? corMarca : cor
        if (marcada && brilhoMarca < 1) ctx.globalAlpha *= brilhoMarca
        ctx.fillText(palavra, px, topo + t * 0.9 + altura * i)
        if (marcada && brilhoMarca < 1) ctx.globalAlpha /= brilhoMarca
        px += ctx.measureText(palavra).width + espaco
      }
    }))
  }
  return baseEmBaixo ? topo : topo + altura * n
}

// Altura que um bloco ocupa, sem desenhar.
function medir(ctx, texto, opcoes) {
  const guardado = relogio
  relogio = null
  ctx.save()
  ctx.fillStyle = 'transparent'
  const fim = bloco(ctx, texto, { ...opcoes, y: 0, cor: 'rgba(0,0,0,0)' })
  ctx.restore()
  relogio = guardado
  return fim
}

function arredondado(ctx, x, y, l, a, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, l, a, r)
}

function cobrir(ctx, img, x, y, l, a) {
  // No vídeo, a foto começa um pouco mais perto e se afasta devagar.
  const zoom = relogio ? 1.12 - 0.12 * suave(relogio.t / relogio.total) : 1
  const escala = Math.max(l / img.width, a / img.height) * zoom
  const w = img.width * escala, h = img.height * escala
  ctx.drawImage(img, x + (l - w) / 2, y + (a - h) / 2, w, h)
}

// Logo num selo claro, para funcionar sobre qualquer fundo; sem logo, o nome.
function selo(ctx, { logo, nome, x, y, altura = 96, alinhar = 'left', claro = true }) {
  ctx.save()
  if (relogio) entrar(ctx, 0.1, { desloca: -20 })
  if (logo) {
    const l = Math.min(altura * (logo.width / logo.height), 360)
    const pad = 18
    const w = l + pad * 2, h = altura + pad * 2
    const sx = alinhar === 'center' ? x - w / 2 : alinhar === 'right' ? x - w : x
    arredondado(ctx, sx, y, w, h, 24)
    ctx.fillStyle = claro ? 'rgba(255,255,255,.92)' : 'rgba(16,16,20,.72)'
    ctx.fill()
    ctx.drawImage(logo, sx + pad, y + pad, l, altura)
  } else if (nome) {
    ctx.font = `700 40px ${FONTE}`
    ctx.fillStyle = claro ? '#FFFFFF' : '#111114'
    ctx.textAlign = alinhar
    ctx.textBaseline = 'top'
    ctx.fillText(nome, x, y + 8)
  }
  ctx.restore()
}

function pilula(ctx, texto, { x, y, largura, altura = 112, fundo, cor, tamanho = 42, festa = null }) {
  ctx.save()
  if (relogio) {
    const ini = proximaEntrada() + 0.2
    entrar(ctx, ini, { dur: 0.5, desloca: 0, escala: 0.12 }, x + largura / 2, y + altura / 2)
    // Um segundo depois de aparecer, o botão é "apertado", como um convite a tocar.
    const e = apertao(relogio.t - (ini + 1.0))
    ctx.translate(x + largura / 2, y + altura / 2)
    ctx.scale(e, e)
    ctx.translate(-(x + largura / 2), -(y + altura / 2))
    if (festa) {
      ctx.restore()
      ctx.save()
      confete(ctx, x + largura / 2, y + altura / 2, ini + 1.15, festa)
      ctx.restore()
      ctx.save()
      entrar(ctx, ini, { dur: 0.5, desloca: 0, escala: 0.12 }, x + largura / 2, y + altura / 2)
      ctx.translate(x + largura / 2, y + altura / 2)
      ctx.scale(e, e)
      ctx.translate(-(x + largura / 2), -(y + altura / 2))
    }
  }
  arredondado(ctx, x, y, largura, altura, altura / 2)
  ctx.fillStyle = fundo
  ctx.fill()
  ctx.font = `700 ${tamanho}px ${FONTE}`
  ctx.fillStyle = cor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(texto, x + largura / 2, y + altura / 2 + 2)
  ctx.restore()
}

function brilho(ctx, cx, cy, raio, cor, forca = 0.55) {
  // No vídeo, as luzes do fundo andam devagar, para a arte não ficar parada depois das entradas.
  if (relogio) {
    const fase = (cx + cy) * 0.003
    cx += Math.sin(relogio.t * 0.6 + fase) * raio * 0.08
    cy += Math.cos(relogio.t * 0.5 + fase) * raio * 0.06
  }
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, raio)
  g.addColorStop(0, comAlfa(cor, forca))
  g.addColorStop(1, comAlfa(cor, 0))
  ctx.fillStyle = g
  ctx.fillRect(cx - raio, cy - raio, raio * 2, raio * 2)
}

// Luz de uma cor em hex ou rgba(), para saber se o texto padrão é claro ou escuro.
function luzDe(cor) {
  if (cor.startsWith('#')) return luz(cor)
  const [r, g, b] = cor.match(/[\d.]+/g).map(Number)
  return luz('#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''))
}
const contraste = (a, b) => (Math.max(luz(a), luz(b)) + 0.05) / (Math.min(luz(a), luz(b)) + 0.05)
// Cor de fundo atrás do texto que está sendo escrito. Cada modelo avisa ao pintar o fundo ou o cartão.
let fundoAtual = '#101014'
const sobre = (cor) => { fundoAtual = cor }
// A cor que o dono pediu, escurecida ou clareada só o necessário para ler sobre o fundo.
// A meta é a leitura do texto padrão do modelo, até o mínimo de 4,5:1.
function legivel(cor, padrao) {
  const claro = luzDe(padrao) > 0.4
  const tinta = claro ? '#FFFFFF' : '#111114'
  const meta = Math.min(4.5, contraste(tinta, fundoAtual) * 0.9)
  // Tenta escurecer e clarear; fica com o que chega na meta mexendo menos na cor (empate: lado do texto padrão).
  const rumos = claro ? ['#FFFFFF', '#000000'] : ['#000000', '#FFFFFF']
  for (let t = 0; t <= 0.91; t += 0.1) {
    for (const rumo of rumos) {
      const final = misturar(cor, rumo, t)
      if (contraste(final, fundoAtual) >= meta) return final.toUpperCase()
    }
  }
  return tinta
}
// Cor pedida no ajuste (ex.: "título em verde") ou a padrão do modelo. Para texto, sempre legível.
const corPedida = (r, chave, padrao) => (/^#[0-9a-f]{6}$/i.test(r.cores?.[chave] || '') ? legivel(r.cores[chave], padrao) : padrao)
// Cor pedida para preencher (botão, faixa), sem ajuste: o texto por cima já se adapta.
const fundoPedido = (r, padrao) => (/^#[0-9a-f]{6}$/i.test(r.cores?.destaque || '') ? r.cores.destaque : padrao)
// Trecho do título que a IA quer em destaque, na cor de destaque (ou na cor pedida).
const marca = (r, cor) => ({ marcar: r.arte?.destaque || '', corMarca: corPedida(r, 'destaque', cor) })
const TAMANHO_TITULO = { normal: 1, grande: 1.18, gigante: 1.4 }
const escala = (r) => TAMANHO_TITULO[r.arte?.tamanho_titulo] || 1
const LADOS = { esquerda: 'left', centro: 'center', direita: 'right' }
// Alinhamento que a IA escolheu (ou que o dono pediu) no jeito do canvas.
const lado = (r, padrao = 'left') => LADOS[r.arte?.alinhamento] || padrao
// Onde ancorar o texto numa faixa de x até x + largura.
const ancora = (alinhar, x, largura) => (alinhar === 'center' ? x + largura / 2 : alinhar === 'right' ? x + largura : x)

// Fundo escolhido pela IA. Devolve a cor do texto que funciona por cima.
function pintarFundo(ctx, { L, A, c, foto, r, padrao = 'marca' }) {
  let fundo = r.arte?.fundo || padrao
  if (fundo === 'foto' && !foto) fundo = 'marca'
  if (fundo === 'foto') {
    cobrir(ctx, foto, 0, 0, L, A)
    const g = ctx.createLinearGradient(0, 0, 0, A)
    g.addColorStop(0, 'rgba(8,8,12,.35)')
    g.addColorStop(1, 'rgba(8,8,12,.85)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, L, A)
    sobre('#1A1A20')
    return '#FFFFFF'
  }
  if (fundo === 'claro') {
    ctx.fillStyle = '#F6F4F9'
    ctx.fillRect(0, 0, L, A)
    brilho(ctx, L, 0, L * 0.9, c[0], 0.18)
    brilho(ctx, 0, A, L * 0.8, c[1], 0.16)
    sobre('#F6F4F9')
    return '#111114'
  }
  if (fundo === 'escuro') {
    ctx.fillStyle = '#0D0D12'
    ctx.fillRect(0, 0, L, A)
    brilho(ctx, L * 0.85, A * 0.15, L * 0.8, c[0], 0.45)
    brilho(ctx, L * 0.1, A * 0.95, L * 0.7, c[1], 0.3)
    sobre('#0D0D12')
    return '#FFFFFF'
  }
  const g = ctx.createLinearGradient(0, 0, L, A)
  g.addColorStop(0, c[0])
  g.addColorStop(1, c[2])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, L, A)
  brilho(ctx, L * 0.85, A * 0.2, L * 0.7, c[1], 0.45)
  sobre(misturar(c[0], c[2], 0.5))
  return textoSobre(c[0])
}
const apagado = (tinta, a = 0.84) => comAlfa(tinta === '#FFFFFF' ? '#FFFFFF' : '#111114', a)
// Cor de destaque que aparece bem sobre o fundo: no claro, o tom mais escuro da marca.
const destaqueSobre = (tinta, c) => (tinta === '#FFFFFF' ? c[1] : (luz(c[0]) < 0.35 ? c[0] : misturar(c[0], '#000000', 0.4)))

function promo(ctx, { L, A, story, c, r, logo, foto, nome }) {
  const tinta = textoSobre(c[0])
  ctx.fillStyle = c[0]
  ctx.fillRect(0, 0, L, A)
  brilho(ctx, L * 0.95, A * 0.85, L * 0.9, c[1], 0.7)
  brilho(ctx, 0, 0, L * 0.6, c[2], 0.35)
  sobre(c[0])

  const m = 80, topo = story ? 230 : 80, base = story ? 330 : 80
  const al = lado(r)
  selo(ctx, { logo, nome, x: ancora(al, m, L - m * 2), y: topo, altura: 96, alinhar: al, claro: tinta === '#FFFFFF' })

  const itens = r.itens.slice(0, 3)
  const chamadaY = A - base - 112
  const tituloOp = { x: m, largura: L - m * 2, tamanho: foto ? 96 : 140, maxLinhas: foto ? 3 : 4, entre: 1.0, alinhar: al }
  const apoioOp = { x: m, largura: L - m * 2, tamanho: 44, peso: 400, maxLinhas: 3, entre: 1.3, alinhar: al }
  let y = topo + 170
  if (!foto) {
    // Sem foto, o texto fica no meio do espaço livre entre o selo e os itens.
    const livre = chamadaY - 40 - itens.length * 124 - y
    const altura = medir(ctx, r.titulo, tituloOp) + 22 + medir(ctx, r.apoio, apoioOp)
    y += Math.max(0, (livre - altura) / 2.4)
  }
  if (foto) {
    const h = story ? 640 : 380
    ctx.save()
    arredondado(ctx, m, y, L - m * 2, h, 36)
    ctx.clip()
    cobrir(ctx, foto, m, y, L - m * 2, h)
    ctx.restore()
    y += h + 50
  }
  y = bloco(ctx, r.titulo, { ...tituloOp, y, cor: corPedida(r, 'titulo', tinta), ...marca(r, tinta === '#FFFFFF' ? c[1] : misturar(c[0], '#000000', 0.55)) })
  y = bloco(ctx, r.apoio, { ...apoioOp, y: y + 22, cor: corPedida(r, 'texto', comAlfa(tinta === '#FFFFFF' ? '#FFFFFF' : '#111114', 0.86)) })

  let iy = Math.max(y + 40, chamadaY - 40 - itens.length * 124)
  for (const item of itens) {
    ctx.save()
    if (relogio) entrar(ctx, proximaEntrada(), { desloca: 0, escala: 0.06 }, L / 2, iy + 54)
    arredondado(ctx, m, iy, L - m * 2, 108, 28)
    ctx.fillStyle = 'rgba(255,255,255,.94)'
    ctx.fill()
    ctx.font = `600 40px ${FONTE}`
    ctx.fillStyle = '#111114'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(item.nome, m + 36, iy + 56)
    ctx.font = `700 40px ${FONTE}`
    const pw = ctx.measureText(item.preco).width + 48
    arredondado(ctx, L - m - 16 - pw, iy + 16, pw, 76, 38)
    ctx.fillStyle = c[0]
    ctx.fill()
    ctx.fillStyle = textoSobre(c[0])
    ctx.textAlign = 'center'
    ctx.fillText(item.preco, L - m - 16 - pw / 2, iy + 56)
    ctx.restore()
    iy += 124
  }
  if (r.chamada) pilula(ctx, r.chamada, { x: m, y: chamadaY, largura: L - m * 2, fundo: tinta, cor: tinta === '#FFFFFF' ? c[0] : '#FFFFFF', festa: [c[1], c[2], tinta, '#FFFFFF'] })
}

function aviso(ctx, { L, A, story, c, r, logo, foto, nome }) {
  const claro = r.arte?.fundo === 'claro'
  const tinta = claro ? '#111114' : '#FFFFFF'
  ctx.fillStyle = claro ? '#F6F4F9' : misturar(c[0], '#0B0B10', 0.86)
  ctx.fillRect(0, 0, L, A)
  sobre(claro ? '#F6F4F9' : misturar(c[0], '#0B0B10', 0.7))
  if (foto) {
    ctx.globalAlpha = claro ? 0.12 : 0.32
    cobrir(ctx, foto, 0, 0, L, A)
    ctx.globalAlpha = 1
  }
  brilho(ctx, L / 2, A * 0.42, L * 0.75, c[0], claro ? 0.18 : 0.5)
  brilho(ctx, L * 0.1, A, L * 0.6, c[1], claro ? 0.14 : 0.35)

  const m = 90, topo = story ? 250 : 90, base = story ? 340 : 90
  // Moldura fina na cor da marca.
  arredondado(ctx, 36, 36, L - 72, A - 72, 40)
  ctx.lineWidth = 4
  ctx.strokeStyle = comAlfa(c[0], 0.8)
  ctx.stroke()

  const meio = A * (story ? 0.44 : 0.42)
  ctx.fillStyle = c[1]
  arredondado(ctx, L / 2 - 60, meio - 260 - (escala(r) - 1) * 300, 120, 12, 6)
  ctx.fill()
  // Título maior começa mais alto; o apoio desce junto e nunca encosta no botão.
  const tOp = { x: m, largura: L - m * 2, tamanho: Math.round(120 * escala(r)), maxLinhas: 4, alinhar: 'center', entre: 1.0 }
  const aOp = { x: m + 20, largura: L - (m + 20) * 2, tamanho: 44, peso: 400, maxLinhas: 3, alinhar: 'center', entre: 1.3 }
  const limite = A - base - 260 - 40
  const inicio = meio - 210 - (escala(r) - 1) * 300
  while (inicio + medir(ctx, r.titulo, tOp) + 28 + medir(ctx, r.apoio, aOp) > limite && tOp.tamanho > 72) tOp.tamanho -= 6
  const fimTitulo = bloco(ctx, r.titulo, { ...tOp, y: inicio, cor: corPedida(r, 'titulo', tinta), ...marca(r, destaqueSobre(tinta, c)) })
  bloco(ctx, r.apoio, { ...aOp, y: fimTitulo + 28, cor: corPedida(r, 'texto', apagado(tinta, 0.82)) })

  if (r.chamada) {
    ctx.font = `700 42px ${FONTE}`
    const w = Math.min(ctx.measureText(r.chamada).width + 120, L - m * 2)
    pilula(ctx, r.chamada, { x: (L - w) / 2, y: A - base - 260, largura: w, fundo: c[0], cor: textoSobre(c[0]) })
  }
  selo(ctx, { logo, nome, x: L / 2, y: A - base - 130, altura: 88, alinhar: 'center' })
  void topo
}

function bastidores(ctx, { L, A, story, c, r, logo, foto, nome }) {
  if (foto) cobrir(ctx, foto, 0, 0, L, A)
  else {
    const g = ctx.createLinearGradient(0, 0, L, A)
    g.addColorStop(0, c[0])
    g.addColorStop(1, c[2])
    ctx.fillStyle = g
    ctx.fillRect(0, 0, L, A)
    brilho(ctx, L * 0.8, A * 0.2, L * 0.7, c[1], 0.5)
  }
  // Fundo claro: a foto some num degradê claro embaixo e o texto fica escuro.
  const claro = r.arte?.fundo === 'claro'
  const tinta = claro ? '#111114' : '#FFFFFF'
  const sombra = ctx.createLinearGradient(0, A * (claro ? 0.2 : 0.35), 0, A)
  sombra.addColorStop(0, claro ? 'rgba(246,244,249,0)' : 'rgba(8,8,12,0)')
  sombra.addColorStop(claro ? 0.45 : 1, claro ? 'rgba(246,244,249,.96)' : 'rgba(8,8,12,.9)')
  if (claro) sombra.addColorStop(1, 'rgba(246,244,249,1)')
  ctx.fillStyle = sombra
  ctx.fillRect(0, 0, L, A)
  sobre(claro ? '#F6F4F9' : '#16161C')

  const m = 80, topo = story ? 230 : 80, base = story ? 330 : 90
  const al = lado(r)
  selo(ctx, { logo, nome, x: ancora(al, m, L - m * 2), y: topo, altura: 88, alinhar: al })

  let y = A - base
  if (r.chamada) {
    const yc = y
    animado(ctx, () => {
      ctx.font = `700 40px ${FONTE}`
      ctx.fillStyle = corPedida(r, 'destaque', destaqueSobre(tinta, c))
      ctx.textAlign = al
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(`${r.chamada}  →`, ancora(al, m, L - m * 2), yc)
    })
    y -= 80
  }
  const alinhar = al
  y = bloco(ctx, r.apoio, { x: m, y, largura: L - m * 2, tamanho: 42, peso: 400, maxLinhas: 3, cor: corPedida(r, 'texto', apagado(tinta, 0.86)), entre: 1.3, baseEmBaixo: true, alinhar })
  bloco(ctx, r.titulo, { x: m, y: y - 24, largura: L - m * 2, tamanho: Math.round(104 * escala(r)), maxLinhas: 3, cor: corPedida(r, 'titulo', tinta), entre: 1.0, baseEmBaixo: true, alinhar, ...marca(r, destaqueSobre(tinta, c)) })
}

// Título gigante ocupando a arte; o resto pequeno. Bom para novidade e frase de impacto.
function manchete(ctx, { L, A, story, c, r, logo, foto, nome }) {
  const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'escuro' })
  const m = 80, topo = story ? 230 : 80, base = story ? 330 : 90
  const al = lado(r)
  selo(ctx, { logo, nome, x: ancora(al, m, L - m * 2), y: topo, altura: 72, alinhar: al, claro: tinta === '#FFFFFF' })
  const op = { x: m, largura: L - m * 2, tamanho: Math.round(150 * escala(r)), maxLinhas: story ? 6 : 5, entre: 0.98, alinhar: al }
  const apoioOp = { x: m, largura: L - m * 2, tamanho: 40, peso: 400, maxLinhas: 3, entre: 1.3, alinhar: al }
  const fimChamada = A - base
  // Título gigante pode não caber na altura: diminui até caber entre o selo e a chamada.
  const livre = fimChamada - 110 - (topo + 140)
  let altura = medir(ctx, r.titulo, op) + 30 + medir(ctx, r.apoio, apoioOp)
  while (altura > livre && op.tamanho > 72) {
    op.tamanho -= 8
    altura = medir(ctx, r.titulo, op) + 30 + medir(ctx, r.apoio, apoioOp)
  }
  let y = topo + 140 + Math.max(0, (livre - altura) / 2)
  y = bloco(ctx, r.titulo, { ...op, y, cor: corPedida(r, 'titulo', tinta), ...marca(r, destaqueSobre(tinta, c)) })
  bloco(ctx, r.apoio, { ...apoioOp, y: y + 30, cor: corPedida(r, 'texto', apagado(tinta)) })
  if (r.chamada) {
    animado(ctx, () => {
      ctx.font = `700 42px ${FONTE}`
      ctx.fillStyle = corPedida(r, 'destaque', destaqueSobre(tinta, c))
      ctx.textAlign = al
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(`${r.chamada}  →`, ancora(al, m, L - m * 2), fimChamada)
    })
  }
}

// Título e até 4 pontos numerados. Bom para dica, passo a passo e o que está incluso.
function lista(ctx, { L, A, story, c, r, logo, foto, nome }) {
  const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'claro' })
  const m = 80, topo = story ? 230 : 80, base = story ? 330 : 80
  const al = lado(r)
  selo(ctx, { logo, nome, x: ancora(al, m, L - m * 2), y: topo, altura: 72, alinhar: al, claro: tinta === '#FFFFFF' })
  const destaque = destaqueSobre(tinta, c)
  // Os pontos numerados ficam sempre à esquerda; o título segue o alinhamento.
  let y = bloco(ctx, r.titulo, { x: m, y: topo + 150, largura: L - m * 2, tamanho: Math.round(100 * escala(r)), maxLinhas: 3, entre: 1.0, alinhar: al, cor: corPedida(r, 'titulo', tinta), ...marca(r, destaque) })
  const pontos = (r.pontos?.length ? r.pontos : [r.apoio]).filter(Boolean).slice(0, 4)
  // Os pontos se espalham no espaço entre o título e a chamada, com uma linha fina entre eles.
  y += 50
  const passo = Math.min(story ? 230 : 190, (A - base - 160 - y) / Math.max(pontos.length, 1))
  // Pontos que quebram em duas linhas diminuem até todos caberem acima do botão.
  const pOp = { x: m + 130, largura: L - m * 2 - 130, tamanho: 50, peso: 600, maxLinhas: 2, entre: 1.15 }
  const ocupa = () => pontos.reduce((t, p) => t + Math.max(passo, medir(ctx, p, pOp) + 44), 0)
  while (ocupa() > A - base - 150 - y && pOp.tamanho > 36) pOp.tamanho -= 2
  pontos.forEach((ponto, i) => {
    if (i) {
      ctx.fillStyle = apagado(tinta, 0.14)
      ctx.fillRect(m, y - 22, L - m * 2, 2)
    }
    const yn = y
    const acende = relogio ? espiar() : 0
    animado(ctx, () => {
      if (relogio) ctx.globalAlpha *= acender(acende)
      ctx.font = `700 64px ${FONTE}`
      ctx.fillStyle = corPedida(r, 'destaque', destaque)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(String(i + 1).padStart(2, '0'), m, yn + 62)
    }, { desloca: 0 })
    const fim = bloco(ctx, ponto, { ...pOp, y: y + 6, cor: corPedida(r, 'texto', tinta) })
    y = Math.max(y + passo, fim + 44)
  })
  if (r.chamada) pilula(ctx, r.chamada, { x: m, y: A - base - 112, largura: L - m * 2, fundo: fundoPedido(r, c[0]), cor: textoSobre(fundoPedido(r, c[0])) })
}

// Aspas grandes com a fala do cliente. Bom para depoimento.
function citacao(ctx, { L, A, story, c, r, logo, foto, nome }) {
  const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'marca' })
  const m = 90, topo = story ? 250 : 90, base = story ? 340 : 100
  const al = lado(r)
  const destaque = destaqueSobre(tinta, c)
  const fala = { x: m, largura: L - m * 2, tamanho: Math.round(84 * escala(r)), peso: 600, maxLinhas: story ? 7 : 5, entre: 1.15, alinhar: al }
  const altura = 190 + medir(ctx, r.titulo, fala) + (r.autor ? 70 : 0) + 120
  const y0 = topo + Math.max(0, (A - base - 160 - topo - altura) / 2)
  animado(ctx, () => {
    ctx.font = `700 300px ${FONTE}`
    ctx.fillStyle = corPedida(r, 'destaque', destaque)
    ctx.textAlign = al
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('“', al === 'left' ? m - 10 : ancora(al, m, L - m * 2), y0 + 270)
  }, { escala: 0.3, desloca: 0 }, al === 'left' ? m + 60 : ancora(al, m, L - m * 2), y0 + 200)
  let y = bloco(ctx, r.titulo, { ...fala, y: y0 + 190, cor: corPedida(r, 'titulo', tinta), ...marca(r, destaque) })
  if (r.autor) {
    const ya = y
    animado(ctx, () => {
      ctx.font = `700 40px ${FONTE}`
      ctx.fillStyle = corPedida(r, 'texto', tinta)
      ctx.textAlign = al
      ctx.fillText(`— ${r.autor}`, ancora(al, m, L - m * 2), ya + 70)
    })
    y += 70
  }
  bloco(ctx, r.apoio, { x: m, y: y + 40, largura: L - m * 2, tamanho: 36, peso: 400, maxLinhas: 2, entre: 1.3, alinhar: al, cor: apagado(tinta, 0.72) })
  selo(ctx, { logo, nome, x: ancora(al, m, L - m * 2), y: A - base - 100, altura: 72, alinhar: al, claro: tinta === '#FFFFFF' })
}

// Metade de cima com a foto (ou a cor da marca), metade de baixo com o texto.
function dividido(ctx, { L, A, story, c, r, logo, foto, nome }) {
  // Título maior pede mais espaço: a foto encolhe para o texto crescer.
  const corte = Math.round(A * ((story ? 0.42 : 0.46) - (escala(r) - 1) * 0.3))
  const claro = r.arte?.fundo === 'claro'
  const tinta = claro ? '#111114' : '#FFFFFF'
  ctx.fillStyle = claro ? '#F6F4F9' : '#0D0D12'
  ctx.fillRect(0, 0, L, A)
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, L, corte)
  ctx.clip()
  if (foto) cobrir(ctx, foto, 0, 0, L, corte)
  else pintarFundo(ctx, { L, A: corte, c, foto: null, r: { arte: { fundo: 'marca' } } })
  ctx.restore()
  ctx.fillStyle = fundoPedido(r, c[0])
  ctx.fillRect(0, corte - 8, L, 16)
  const m = 80, topo = story ? 230 : 70, base = story ? 330 : 80
  sobre(claro ? '#F6F4F9' : '#0D0D12')
  const al = lado(r)
  selo(ctx, { logo, nome, x: ancora(al, m, L - m * 2), y: topo, altura: 72, alinhar: al })
  const destaque = destaqueSobre(tinta, c)
  const tOp = { x: m, largura: L - m * 2, tamanho: Math.round(96 * escala(r)), maxLinhas: 3, entre: 1.0, alinhar: al }
  const aOp = { x: m, largura: L - m * 2, tamanho: 40, peso: 400, maxLinhas: 3, entre: 1.3, alinhar: al }
  // Título e apoio diminuem até caber entre a foto e o botão; o botão nunca fica por cima do texto.
  const pilulaY = A - base - 104
  const livre = pilulaY - 44 - (corte + 70)
  const altura = () => medir(ctx, r.titulo, tOp) + 22 + medir(ctx, r.apoio, aOp)
  while (altura() > livre && tOp.tamanho > 56) {
    tOp.tamanho -= 6
    aOp.tamanho = Math.max(30, aOp.tamanho - 1)
  }
  let y = bloco(ctx, r.titulo, { ...tOp, y: corte + 70, cor: corPedida(r, 'titulo', tinta), ...marca(r, destaque) })
  y = bloco(ctx, r.apoio, { ...aOp, y: y + 22, cor: corPedida(r, 'texto', apagado(tinta)) })
  if (r.chamada) {
    ctx.font = `700 40px ${FONTE}`
    const w = Math.min(ctx.measureText(r.chamada).width + 110, L - m * 2)
    pilula(ctx, r.chamada, { x: al === 'left' ? m : ancora(al, m, L - m * 2) - (al === 'center' ? w / 2 : w), y: Math.max(y + 44, pilulaY), largura: w, altura: 104, tamanho: 40, fundo: fundoPedido(r, c[0]), cor: textoSobre(fundoPedido(r, c[0])) })
  }
}

// Foto ocupando tudo e um cartão embaixo com o texto. Precisa de foto; sem ela, usa a cor da marca.
function fotoInteira(ctx, { L, A, story, c, r, logo, foto, nome }) {
  if (foto) cobrir(ctx, foto, 0, 0, L, A)
  else pintarFundo(ctx, { L, A, c, foto: null, r: { arte: { fundo: 'marca' } } })
  const m = 60, topo = story ? 230 : 60, base = story ? 330 : 60
  const al = lado(r)
  selo(ctx, { logo, nome, x: ancora(al, m, L - m * 2), y: topo, altura: 72, alinhar: al })
  const claro = r.arte?.fundo !== 'escuro'
  const tinta = claro ? '#111114' : '#FFFFFF'
  const destaque = destaqueSobre(tinta, c)
  const dentro = L - m * 2 - 100
  const tOp = { x: m + 50, largura: dentro, tamanho: Math.round(76 * escala(r)), maxLinhas: 3, entre: 1.02, alinhar: al }
  const aOp = { x: m + 50, largura: dentro, tamanho: 36, peso: 400, maxLinhas: 3, entre: 1.3, alinhar: al }
  const h = 60 + medir(ctx, r.titulo, tOp) + 18 + medir(ctx, r.apoio, aOp) + (r.chamada ? 90 : 0) + 50
  const y0 = A - base - h
  animado(ctx, () => {
    arredondado(ctx, m, y0, L - m * 2, h, 36)
    ctx.fillStyle = claro ? 'rgba(255,255,255,.95)' : 'rgba(13,13,18,.9)'
    ctx.fill()
  }, { desloca: 60 })
  sobre(claro ? '#FFFFFF' : '#0D0D12')
  let y = bloco(ctx, r.titulo, { ...tOp, y: y0 + 60, cor: corPedida(r, 'titulo', tinta), ...marca(r, destaque) })
  y = bloco(ctx, r.apoio, { ...aOp, y: y + 18, cor: corPedida(r, 'texto', apagado(tinta, 0.75)) })
  if (r.chamada) {
    animado(ctx, () => {
      ctx.font = `700 38px ${FONTE}`
      ctx.fillStyle = corPedida(r, 'destaque', destaque)
      ctx.textAlign = al
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(`${r.chamada}  →`, ancora(al, m + 50, dentro), y + 70)
    })
  }
}

// Cartão claro centralizado sobre a cor da marca (ou a foto). Bom para comunicado e convite.
function cartao(ctx, { L, A, story, c, r, logo, foto, nome }) {
  pintarFundo(ctx, { L, A, c, foto, r, padrao: foto ? 'foto' : 'marca' })
  const m = 90, larg = L - m * 2
  const tOp = { x: m + 60, largura: larg - 120, tamanho: Math.round(92 * escala(r)), maxLinhas: 4, entre: 1.0, alinhar: 'center' }
  const aOp = { x: m + 60, largura: larg - 120, tamanho: 38, peso: 400, maxLinhas: 3, entre: 1.3, alinhar: 'center' }
  const h = 150 + medir(ctx, r.titulo, tOp) + 24 + medir(ctx, r.apoio, aOp) + (r.chamada ? 150 : 40) + 60
  const y0 = (A - h) / 2
  animado(ctx, () => {
    ctx.shadowColor = 'rgba(0,0,0,.35)'
    ctx.shadowBlur = 60
    arredondado(ctx, m, y0, larg, h, 44)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
  }, { desloca: 0, escala: 0.06 }, L / 2, y0 + h / 2)
  selo(ctx, { logo, nome, x: L / 2, y: y0 - 50, altura: 64, alinhar: 'center', claro: false })
  sobre('#FFFFFF')
  const destaque = destaqueSobre('#111114', c)
  let y = bloco(ctx, r.titulo, { ...tOp, y: y0 + 130, cor: corPedida(r, 'titulo', '#111114'), ...marca(r, destaque) })
  y = bloco(ctx, r.apoio, { ...aOp, y: y + 24, cor: corPedida(r, 'texto', 'rgba(17,17,20,.72)') })
  if (r.chamada) {
    ctx.font = `700 40px ${FONTE}`
    const w = Math.min(ctx.measureText(r.chamada).width + 110, larg - 120)
    const fundo = fundoPedido(r, c[0])
    pilula(ctx, r.chamada, { x: (L - w) / 2, y: y + 46, largura: w, altura: 104, tamanho: 40, fundo, cor: textoSobre(fundo) })
  }
  void story
}

// ---- Layouts novos (30/10) ----

// Espaço entre letras, onde o navegador suporta.
function espacar(ctx, px) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`
}

// Rótulo curto em caixa alta (ENQUETE, QUANDO, ANTES).
// No vídeo, as letras embaralham e travam uma a uma, da esquerda para a direita.
const EMBARALHO = '!<>-_/[]{}=+*^?#'
function rotulo(ctx, texto, { x, y, tamanho = 30, cor, alinhar = 'left', espaco = 6 }) {
  const final = String(texto).toUpperCase()
  const ini = relogio ? espiar() : 0
  animado(ctx, () => {
    let mostrar = final
    if (relogio) {
      const quadro = Math.floor(relogio.t * 25)
      mostrar = [...final].map((ch, i) => (ch === ' ' || relogio.t >= ini + 0.15 + i * 0.04 ? ch : EMBARALHO[Math.floor(sorteio(i, quadro) * EMBARALHO.length)])).join('')
    }
    ctx.font = `700 ${tamanho}px ${FONTE}`
    espacar(ctx, espaco)
    ctx.fillStyle = cor
    ctx.textAlign = alinhar
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(mostrar, x, y)
  }, { desloca: 16 })
}

// Chamada em texto com seta, como no manchete.
function chamadaEmTexto(ctx, r, { x, y, largura, alinhar, cor, tamanho = 40 }) {
  if (!r.chamada) return
  animado(ctx, () => {
    ctx.font = `700 ${tamanho}px ${FONTE}`
    ctx.fillStyle = cor
    ctx.textAlign = alinhar
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(`${r.chamada}  →`, ancora(alinhar, x, largura), y)
  })
}

// Pílula da chamada com a largura do texto.
function pilulaCurta(ctx, r, { x, y, largura, alinhar = 'left', fundo, cor, altura = 104, tamanho = 40 }) {
  if (!r.chamada) return
  ctx.font = `700 ${tamanho}px ${FONTE}`
  const w = Math.min(ctx.measureText(r.chamada).width + 110, largura)
  const px = alinhar === 'center' ? x + (largura - w) / 2 : alinhar === 'right' ? x + largura - w : x
  pilula(ctx, r.chamada, { x: px, y, largura: w, altura, tamanho, fundo, cor })
}

// Um pedaço da foto: amplia e centraliza num ponto (fx, fy de 0 a 1), sem sair da imagem.
function recorte(ctx, img, x, y, l, a, zoom = 1, fx = 0.5, fy = 0.5) {
  const z = (relogio ? 1.08 - 0.08 * suave(relogio.t / relogio.total) : 1) * zoom
  const e = Math.max(l / img.width, a / img.height) * z
  const w = img.width * e, h = img.height * e
  const px = Math.min(x, Math.max(x + l - w, x + l / 2 - w * fx))
  const py = Math.min(y, Math.max(y + a - h, y + a / 2 - h * fy))
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, l, a)
  ctx.clip()
  ctx.drawImage(img, px, py, w, h)
  ctx.restore()
}

// Degradê da marca num retângulo, para quando falta foto.
function placaDaMarca(ctx, x, y, l, a, de, para, luzCor) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, l, a)
  ctx.clip()
  const g = ctx.createLinearGradient(x, y, x + l, y + a)
  g.addColorStop(0, de)
  g.addColorStop(1, para)
  ctx.fillStyle = g
  ctx.fillRect(x, y, l, a)
  brilho(ctx, x + l * 0.8, y + a * 0.2, Math.max(l, a) * 0.7, luzCor, 0.45)
  ctx.restore()
}

// Número grande como protagonista (50%, 7 dias, 3x). Sem número, vira manchete.
function numero(ctx, args) {
  const { L, A, story, c, r, logo, nome } = args
  const valor = String(r.numero || '').trim()
  if (!valor) return manchete(ctx, args)
  const tinta = pintarFundo(ctx, { L, A, c, foto: args.foto, r, padrao: 'escuro' })
  const m = 80, topo = story ? 230 : 80, base = story ? 330 : 90
  const al = lado(r)
  selo(ctx, { logo, nome, x: ancora(al, m, L - m * 2), y: topo, altura: 64, alinhar: al, claro: tinta === '#FFFFFF' })
  const [, corpo, sufixo] = valor.match(/^(.*\d)(\D*)$/) || [null, valor, '']
  const corNumero = r.cores?.destaque ? corPedida(r, 'destaque', tinta) : legivel(c[0], tinta)
  const tOp = { x: m, largura: L - m * 2, tamanho: Math.round(96 * escala(r)), maxLinhas: 3, entre: 1.0, alinhar: al }
  const aOp = { x: m, largura: L - m * 2, tamanho: 42, peso: 400, maxLinhas: 3, entre: 1.3, alinhar: al }
  const fim = A - base - (r.chamada ? 100 : 0)
  const resto = medir(ctx, r.titulo, tOp) + 30 + medir(ctx, r.apoio, aOp)
  // O número cresce até a largura e até a altura que sobra.
  let t = story ? 600 : 520
  const largura = () => {
    ctx.font = `700 ${t}px ${FONTE}`
    espacar(ctx, -t * 0.05)
    const w1 = ctx.measureText(corpo).width
    ctx.font = `700 ${Math.round(t * 0.46)}px ${FONTE}`
    espacar(ctx, 0)
    return w1 + ctx.measureText(sufixo).width
  }
  while ((largura() > L - m * 2 || t * 0.78 + 60 + resto > fim - (topo + 130)) && t > 120) t -= 10
  const alturaNumero = t * 0.74
  const y0 = topo + 130 + Math.max(0, (fim - (topo + 130) - (alturaNumero + 60 + resto)) / 2)
  const baseNumero = y0 + alturaNumero
  const w = largura()
  const x0 = al === 'center' ? (L - w) / 2 : al === 'right' ? L - m - w : m
  // No vídeo, número inteiro conta do zero até o valor em 1,2 s, sem passar dele.
  const conta = corpo.match(/^(\D*?)(\d{1,4})$/)
  const iniConta = relogio ? espiar() : 0
  animado(ctx, () => {
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    ctx.font = `700 ${t}px ${FONTE}`
    espacar(ctx, -t * 0.05)
    ctx.fillStyle = corNumero
    const agora = relogio && conta ? conta[1] + Math.round(Number(conta[2]) * suave((relogio.t - iniConta) / 1.2)) : corpo
    ctx.fillText(agora, x0, baseNumero)
    const w1 = ctx.measureText(corpo).width
    ctx.font = `700 ${Math.round(t * 0.46)}px ${FONTE}`
    espacar(ctx, 0)
    ctx.fillStyle = corPedida(r, 'titulo', tinta)
    ctx.fillText(sufixo, x0 + w1 + t * 0.02, baseNumero)
  }, { escala: 0.12, desloca: 0 }, x0 + w / 2, baseNumero - alturaNumero / 2)
  let y = bloco(ctx, r.titulo, { ...tOp, y: baseNumero + 60, cor: corPedida(r, 'titulo', tinta), ...marca(r, destaqueSobre(tinta, c)) })
  bloco(ctx, r.apoio, { ...aOp, y: y + 30, cor: corPedida(r, 'texto', apagado(tinta)) })
  chamadaEmTexto(ctx, r, { x: m, y: A - base, largura: L - m * 2, alinhar: al, cor: corPedida(r, 'destaque', destaqueSobre(tinta, c)) })
}

// Cupom recortado: oferta em cima, código e validade embaixo da linha picotada.
function cupom(ctx, { L, A, story, c, r, logo, foto, nome }) {
  const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'marca' })
  const m = 90, larg = L - m * 2, dentro = larg - 140
  const codigo = String(r.cupom || '').trim() || '[CUPOM]'
  const tOp = { x: m + 70, largura: dentro, tamanho: Math.round(140 * escala(r)), maxLinhas: 2, entre: 0.95 }
  const aOp = { x: m + 70, largura: dentro, tamanho: 40, peso: 400, maxLinhas: 3, entre: 1.3 }
  const cima = 80 + 34 + 30 + medir(ctx, r.titulo, tOp) + 26 + medir(ctx, r.apoio, aOp) + 60
  const h = cima + 60 + 130 + 70
  const y0 = Math.max(story ? 360 : 200, (A - h) / 2 - (r.chamada ? 40 : 0))
  const corte = y0 + cima
  selo(ctx, { logo, nome, x: L / 2, y: y0 - 130, altura: 64, alinhar: 'center', claro: tinta === '#FFFFFF' })
  animado(ctx, () => {
    ctx.save()
    // Os dois semicírculos do picote são furos no cartão.
    ctx.beginPath()
    ctx.rect(0, 0, L, A)
    ctx.moveTo(m + 46, corte)
    ctx.arc(m, corte, 46, 0, Math.PI * 2)
    ctx.moveTo(L - m + 46, corte)
    ctx.arc(L - m, corte, 46, 0, Math.PI * 2)
    ctx.clip('evenodd')
    ctx.shadowColor = 'rgba(0,0,0,.28)'
    ctx.shadowBlur = 50
    arredondado(ctx, m, y0, larg, h, 40)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    ctx.restore()
    ctx.setLineDash([22, 16])
    ctx.lineWidth = 5
    ctx.strokeStyle = 'rgba(17,17,20,.18)'
    ctx.beginPath()
    ctx.moveTo(m + 70, corte)
    ctx.lineTo(L - m - 70, corte)
    ctx.stroke()
    ctx.setLineDash([])
  }, { desloca: 0, escala: 0.06 }, L / 2, y0 + h / 2)
  sobre('#FFFFFF')
  const destaque = destaqueSobre('#111114', c)
  rotulo(ctx, 'Cupom', { x: m + 70, y: y0 + 80 + 26, tamanho: 30, cor: corPedida(r, 'destaque', destaque), espaco: 8 })
  let y = bloco(ctx, r.titulo, { ...tOp, y: y0 + 80 + 34 + 30, cor: corPedida(r, 'titulo', '#111114'), ...marca(r, destaque) })
  bloco(ctx, r.apoio, { ...aOp, y: y + 26, cor: corPedida(r, 'texto', 'rgba(17,17,20,.72)') })
  const yc = corte + 60
  const iniCodigo = relogio ? espiar() : 0
  confete(ctx, L / 2, yc + 60, iniCodigo + 0.5, [c[0], c[1], c[2], '#111114'])
  animado(ctx, () => {
    ctx.font = `700 52px ${FONTE}`
    espacar(ctx, 6)
    const w = Math.min(ctx.measureText(codigo).width + 70, dentro * (r.data ? 0.62 : 1))
    arredondado(ctx, m + 70, yc, w, 120, 22)
    ctx.lineWidth = 5
    ctx.strokeStyle = '#111114'
    ctx.stroke()
    ctx.fillStyle = '#111114'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(codigo, m + 105, yc + 62, w - 70)
    espacar(ctx, 0)
    if (r.data) {
      ctx.textAlign = 'right'
      ctx.font = `400 30px ${FONTE}`
      ctx.fillStyle = 'rgba(17,17,20,.6)'
      ctx.fillText('Válido até', L - m - 70, yc + 38)
      ctx.font = `700 40px ${FONTE}`
      ctx.fillStyle = '#111114'
      ctx.fillText(r.data, L - m - 70, yc + 88, dentro * 0.36)
    }
  }, { desloca: 20 })
  sobre(c[0])
  if (r.chamada) {
    animado(ctx, () => {
      ctx.font = `700 42px ${FONTE}`
      ctx.fillStyle = tinta
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(r.chamada, L / 2, y0 + h + 110, L - m * 2)
    })
  }
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
// "29/11", "29 de novembro" ou "29 nov" viram dia, mês e dia da semana (na próxima vez que a data cair).
function lerData(texto) {
  const t = String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const achado = t.match(/(\d{1,2})\s*(?:\/|de\s+|\s)\s*(\d{1,2}|[a-z]{3,})/)
  if (!achado) return null
  const dia = Number(achado[1])
  const mes = /^\d+$/.test(achado[2]) ? Number(achado[2]) - 1 : MESES.findIndex((m) => achado[2].startsWith(m))
  if (mes < 0 || mes > 11 || dia < 1 || dia > 31) return null
  const hoje = new Date()
  let data = new Date(hoje.getFullYear(), mes, dia)
  if (data < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) data = new Date(hoje.getFullYear() + 1, mes, dia)
  return { dia: String(dia), mes: MESES[mes], semana: DIAS[data.getDay()], quando: data }
}

// Folha de calendário com o dia, horário ao lado, título embaixo. Bom para evento e aviso com data.
function agenda(ctx, { L, A, story, c, r, logo, foto, nome }) {
  const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'claro' })
  const m = 80, topo = story ? 230 : 80, base = story ? 330 : 90
  const destaque = destaqueSobre(tinta, c)
  const lida = lerData(r.data)
  const lf = story ? 340 : 300, af = story ? 380 : 340
  const yf = topo + (story ? 60 : 50)
  // Folha do calendário.
  animado(ctx, () => {
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,.18)'
    ctx.shadowBlur = 40
    arredondado(ctx, m, yf, lf, af, 32)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    ctx.restore()
    ctx.save()
    arredondado(ctx, m, yf, lf, af, 32)
    ctx.clip()
    ctx.fillStyle = fundoPedido(r, c[0])
    ctx.fillRect(m, yf, lf, 90)
    ctx.restore()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 34px ${FONTE}`
    espacar(ctx, 8)
    ctx.fillStyle = textoSobre(fundoPedido(r, c[0]))
    ctx.fillText(lida ? lida.mes.toUpperCase() : 'DATA', m + lf / 2, yf + 47)
    espacar(ctx, 0)
    ctx.fillStyle = '#111114'
    if (lida) {
      ctx.font = `700 ${story ? 190 : 170}px ${FONTE}`
      espacar(ctx, -8)
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(lida.dia, m + lf / 2, yf + 90 + (af - 90) * 0.66)
      espacar(ctx, 0)
      ctx.font = `400 34px ${FONTE}`
      ctx.fillStyle = 'rgba(17,17,20,.6)'
      ctx.fillText(lida.semana, m + lf / 2, yf + af - 34)
    } else {
      // Sem data legível (ou com o marcador), escreve o que veio.
      ctx.font = `700 44px ${FONTE}`
      quebrar(ctx, r.data || '[DATA]', lf - 40).slice(0, 3).forEach((l, i, ls) => ctx.fillText(l, m + lf / 2, yf + 90 + (af - 90) / 2 + (i - (ls.length - 1) / 2) * 52))
    }
  }, { desloca: 0, escala: 0.08 }, m + lf / 2, yf + af / 2)
  // Ao lado: QUANDO e o horário.
  const xl = m + lf + 50, ll = L - m - xl
  rotulo(ctx, 'Quando', { x: xl, y: yf + 60, tamanho: 28, cor: corPedida(r, 'destaque', destaque) })
  let yl = yf + 84
  if (r.horario) yl = bloco(ctx, r.horario, { x: xl, y: yl, largura: ll, tamanho: 72, minimo: 44, maxLinhas: 2, entre: 1.0, cor: corPedida(r, 'titulo', tinta) })
  if (lida && !r.horario) yl = bloco(ctx, `${lida.semana}, ${lida.dia} de ${lida.mes}`, { x: xl, y: yl, largura: ll, tamanho: 56, maxLinhas: 2, entre: 1.05, cor: corPedida(r, 'titulo', tinta) })
  // Título e apoio embaixo da folha; a chamada e o selo no pé.
  const fimTexto = A - base - (r.chamada ? 150 : 40)
  const tOp = { x: m, largura: L - m * 2, tamanho: Math.round(100 * escala(r)), maxLinhas: 4, entre: 1.0 }
  const aOp = { x: m, largura: L - m * 2, tamanho: 40, peso: 400, maxLinhas: 3, entre: 1.3 }
  const comeco = yf + af + 80
  while (comeco + medir(ctx, r.titulo, tOp) + 26 + medir(ctx, r.apoio, aOp) > fimTexto && tOp.tamanho > 60) tOp.tamanho -= 6
  let y = bloco(ctx, r.titulo, { ...tOp, y: comeco, cor: corPedida(r, 'titulo', tinta), ...marca(r, destaque) })
  bloco(ctx, r.apoio, { ...aOp, y: y + 26, cor: corPedida(r, 'texto', apagado(tinta, 0.72)) })
  const fundo = tinta === '#FFFFFF' ? '#FFFFFF' : '#111114'
  pilulaCurta(ctx, r, { x: m, y: A - base - 104, largura: L - m * 2 - 260, fundo, cor: textoSobre(fundo) })
  selo(ctx, { logo, nome, x: L - m, y: A - base - 96, altura: 60, alinhar: 'right', claro: tinta === '#FFFFFF' })
  void yl
}

// Balão de conversa; devolve a altura.
function balao(ctx, texto, { x, y, largura, tamanho, peso = 500, fundo, cor, direita = false }) {
  ctx.font = `${peso} ${tamanho}px ${FONTE}`
  const linhas = quebrar(ctx, texto, largura - 72).slice(0, 4)
  const w = Math.min(largura, Math.max(...linhas.map((l) => ctx.measureText(l).width)) + 72)
  const h = linhas.length * tamanho * 1.25 + 56
  const bx = direita ? x + largura - w : x
  // No vídeo, cada balão chega do seu lado, passa um pouco e volta, como mensagem chegando.
  const ini = relogio ? espiar() : 0
  animado(ctx, () => {
    if (relogio) {
      const p = (relogio.t - ini) / 0.52
      const de = (direita ? 1 : -1) * (w + 80)
      const passa = (direita ? -1 : 1) * 10
      const dx = p < 0.7 ? de + (passa - de) * suave(p / 0.7) : passa * (1 - suave((p - 0.7) / 0.3))
      ctx.translate(dx, -24 * (1 - Math.min(1, Math.max(0, p))))
    }
    arredondado(ctx, bx, y, w, h, 34)
    ctx.fillStyle = fundo
    ctx.fill()
    ctx.font = `${peso} ${tamanho}px ${FONTE}`
    ctx.fillStyle = cor
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    linhas.forEach((l, i) => ctx.fillText(l, bx + 36, y + 28 + tamanho * 0.95 + i * tamanho * 1.25))
  }, { desloca: 24 })
  return h
}

// Perguntas do cliente em balões e a resposta da marca. Bom para dúvida frequente.
function conversa(ctx, { L, A, story, c, r, logo, foto, nome }) {
  const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'escuro' })
  const m = 80, topo = story ? 230 : 80, base = story ? 330 : 90
  selo(ctx, { logo, nome, x: m, y: topo, altura: 64, claro: tinta === '#FFFFFF' })
  const perguntas = (r.pontos || []).filter(Boolean).slice(0, 3)
  const larg = L - m * 2
  const fundoPergunta = tinta === '#FFFFFF' ? 'rgba(255,255,255,.12)' : 'rgba(17,17,20,.07)'
  const fundoResposta = fundoPedido(r, c[0])
  // Mede tudo antes para centralizar a conversa no espaço livre.
  const guardado = relogio
  relogio = null
  const medida = (texto, tamanho, peso) => {
    ctx.font = `${peso} ${tamanho}px ${FONTE}`
    return quebrar(ctx, texto, larg * 0.78 - 72).slice(0, 4).length * tamanho * 1.25 + 56
  }
  const tamResposta = Math.round(52 * escala(r))
  let total = perguntas.reduce((t, p) => t + medida(p, 40, 500) + 22, 0) + 30 + medida(r.titulo, tamResposta, 700)
  relogio = guardado
  const aOp = { x: m, largura: larg * 0.8, tamanho: 34, peso: 400, maxLinhas: 3, entre: 1.3, alinhar: 'right' }
  if (r.apoio) total += 40 + medir(ctx, r.apoio, aOp)
  const livreTopo = topo + 150, livreFim = A - base - (r.chamada ? 110 : 20)
  let y = livreTopo + Math.max(0, (livreFim - livreTopo - total) / 2)
  for (const p of perguntas) {
    y += balao(ctx, p, { x: m, y, largura: larg * 0.78, tamanho: 40, fundo: fundoPergunta, cor: apagado(tinta, 0.92) }) + 22
  }
  y += 30
  y += balao(ctx, r.titulo, { x: m, y, largura: larg * 0.78, tamanho: tamResposta, peso: 700, fundo: fundoResposta, cor: textoSobre(fundoResposta), direita: true }) + 40
  if (r.apoio) bloco(ctx, r.apoio, { ...aOp, x: L - m - larg * 0.8, y, cor: corPedida(r, 'texto', apagado(tinta, 0.72)) })
  chamadaEmTexto(ctx, r, { x: m, y: A - base, largura: larg, alinhar: 'right', cor: corPedida(r, 'destaque', destaqueSobre(tinta, c)) })
}

// Três quadros em cima (foto, outro pedaço da foto e um bloco de cor com o número), texto embaixo.
function mosaico(ctx, { L, A, story, c, r, logo, foto, nome }) {
  const claro = r.arte?.fundo === 'claro'
  const tinta = claro ? '#111114' : '#FFFFFF'
  const fundo = claro ? '#F6F4F9' : '#0D0D12'
  ctx.fillStyle = fundo
  ctx.fillRect(0, 0, L, A)
  const vao = 10
  const alto = Math.round(A * (story ? 0.62 : 0.6) - (escala(r) - 1) * A * 0.2)
  const le = Math.round(L * 0.56)
  const ld = L - le - vao
  const ad = Math.round((alto - vao) / 2)
  if (foto) {
    recorte(ctx, foto, 0, 0, le, alto, 1.05, 0.4, 0.5)
    recorte(ctx, foto, le + vao, 0, ld, ad, 2.2, 0.8, 0.3)
  } else {
    placaDaMarca(ctx, 0, 0, le, alto, c[0], c[2], c[1])
    placaDaMarca(ctx, le + vao, 0, ld, ad, c[2], misturar(c[2], '#000000', 0.4), c[1])
  }
  const corBloco = fundoPedido(r, c[0])
  ctx.fillStyle = corBloco
  ctx.fillRect(le + vao, ad + vao, ld, alto - ad - vao)
  const textoBloco = String(r.numero || r.arte?.destaque || '').trim()
  if (textoBloco) {
    animado(ctx, () => {
      let t = 110
      ctx.font = `700 ${t}px ${FONTE}`
      while (ctx.measureText(textoBloco).width > ld - 80 && t > 40) ctx.font = `700 ${(t -= 4)}px ${FONTE}`
      ctx.fillStyle = textoSobre(corBloco)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(textoBloco, le + vao + ld / 2, ad + vao + (alto - ad - vao) / 2)
    }, { escala: 0.1, desloca: 0 }, le + vao + ld / 2, ad + vao + (alto - ad - vao) / 2)
  }
  ctx.fillStyle = fundo
  ctx.fillRect(0, alto, L, vao)
  sobre(fundo)
  const m = 80, base = story ? 330 : 80
  const al = lado(r)
  const destaque = destaqueSobre(tinta, c)
  const tOp = { x: m, largura: L - m * 2, tamanho: Math.round(88 * escala(r)), maxLinhas: 3, entre: 1.0, alinhar: al }
  const aOp = { x: m, largura: L - m * 2 - (al === 'left' ? 160 : 0), tamanho: 36, peso: 400, maxLinhas: 2, entre: 1.3, alinhar: al }
  const livre = A - base - 20 - (alto + 70)
  while (medir(ctx, r.titulo, tOp) + 22 + medir(ctx, r.apoio, aOp) > livre && tOp.tamanho > 52) tOp.tamanho -= 6
  let y = bloco(ctx, r.titulo, { ...tOp, y: alto + 70, cor: corPedida(r, 'titulo', tinta), ...marca(r, destaque) })
  bloco(ctx, r.apoio, { ...aOp, y: y + 22, cor: corPedida(r, 'texto', apagado(tinta, 0.75)) })
  selo(ctx, { logo, nome, x: al === 'right' ? m : L - m, y: A - base - 76, altura: 52, alinhar: al === 'right' ? 'left' : 'right', claro: tinta === '#FFFFFF' })
}

// Duas fitas inclinadas com palavras da marca, título no meio. Bom para lançamento e chamada geral.
function faixas(ctx, { L, A, story, c, r, logo, foto, nome }) {
  const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'marca' })
  const m = 90, topo = story ? 250 : 70, base = story ? 330 : 70
  const palavras = (r.pontos || []).filter(Boolean)
  const fita = (texto, y, angulo, cor, corTexto, sentido) => {
    ctx.save()
    if (relogio) entrar(ctx, 0.15, { desloca: 0 })
    ctx.translate(L / 2, y)
    ctx.rotate(angulo)
    ctx.fillStyle = cor
    ctx.fillRect(-L, -58, L * 2, 116)
    ctx.font = `700 58px ${FONTE}`
    espacar(ctx, -1)
    ctx.fillStyle = corTexto
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    const trecho = `${texto.toUpperCase()} · `
    const w = ctx.measureText(trecho).width
    // No vídeo a fita corre devagar para o lado.
    const corre = relogio ? (relogio.t * 60 * sentido) % w : 0
    for (let x = -L - w + corre; x < L; x += w) ctx.fillText(trecho, x, 4)
    ctx.restore()
  }
  const corA = fundoPedido(r, c[0])
  fita(palavras.length ? palavras.join(' · ') : nome || '', topo + 60, -0.07, corA, textoSobre(corA), 1)
  fita(nome || palavras.join(' · '), A - base - 60, 0.06, c[1], textoSobre(c[1]), -1)
  const tOp = { x: m, largura: L - m * 2, tamanho: Math.round(118 * escala(r)), maxLinhas: 4, entre: 0.98, alinhar: 'center' }
  const aOp = { x: m + 30, largura: L - (m + 30) * 2, tamanho: 40, peso: 400, maxLinhas: 3, entre: 1.3, alinhar: 'center' }
  const livreTopo = topo + 190, livreFim = A - base - 170
  const pil = r.chamada ? 150 : 0
  while (medir(ctx, r.titulo, tOp) + 30 + medir(ctx, r.apoio, aOp) + pil > livreFim - livreTopo && tOp.tamanho > 64) tOp.tamanho -= 6
  const altura = medir(ctx, r.titulo, tOp) + 30 + medir(ctx, r.apoio, aOp) + pil
  let y = livreTopo + Math.max(0, (livreFim - livreTopo - altura) / 2)
  y = bloco(ctx, r.titulo, { ...tOp, y, cor: corPedida(r, 'titulo', tinta), ...marca(r, tinta === '#FFFFFF' ? '#FFFFFF' : '#111114') })
  y = bloco(ctx, r.apoio, { ...aOp, y: y + 30, cor: corPedida(r, 'texto', apagado(tinta, 0.86)) })
  const fundo = tinta === '#FFFFFF' ? '#FFFFFF' : '#111114'
  pilulaCurta(ctx, r, { x: m, y: y + 46, largura: L - m * 2, alinhar: 'center', fundo, cor: fundo === '#FFFFFF' ? legivel(c[2], '#111114') : '#FFFFFF' })
  void logo
}

// Capa de revista: nome da marca no alto, chamada da matéria e título grande sobre a foto.
function capa(ctx, { L, A, story, c, r, logo, foto, nome }) {
  if (foto) cobrir(ctx, foto, 0, 0, L, A)
  else placaDaMarca(ctx, 0, 0, L, A, c[2], misturar(c[0], '#000000', 0.5), c[0])
  const g = ctx.createLinearGradient(0, 0, 0, A)
  g.addColorStop(0, 'rgba(8,8,12,.55)')
  g.addColorStop(0.35, 'rgba(8,8,12,.1)')
  g.addColorStop(0.6, 'rgba(8,8,12,.25)')
  g.addColorStop(1, 'rgba(8,8,12,.9)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, L, A)
  sobre('#1A1A20')
  const m = 60, topo = story ? 220 : 40, base = story ? 330 : 70
  // Nome da marca como título da revista, do tamanho da largura.
  animado(ctx, () => {
    let t = 180
    ctx.font = `700 ${t}px ${FONTE}`
    espacar(ctx, -t * 0.045)
    while (ctx.measureText(nome || '').width > L - m * 2 && t > 60) {
      t -= 6
      ctx.font = `700 ${t}px ${FONTE}`
      espacar(ctx, -t * 0.045)
    }
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(nome || '', L / 2, topo + t * 0.82)
    espacar(ctx, 0)
    ctx.fillStyle = 'rgba(255,255,255,.7)'
    ctx.fillRect(m, topo + t * 0.82 + 30, L - m * 2, 3)
  }, { desloca: -20 })
  // Chamada da matéria à esquerda.
  if (r.apoio) {
    const ya = topo + 290
    rotulo(ctx, 'Nesta edição', { x: m, y: ya, tamanho: 28, cor: legivel(c[1], '#FFFFFF') })
    bloco(ctx, r.apoio, { x: m, y: ya + 22, largura: L * 0.48, tamanho: 40, minimo: 32, peso: 600, maxLinhas: 4, entre: 1.15, cor: corPedida(r, 'texto', '#FFFFFF') })
  }
  const tOp = { x: m, largura: L - m * 2 - (r.chamada ? 120 : 0), tamanho: Math.round(116 * escala(r)), maxLinhas: 3, entre: 0.98, baseEmBaixo: true }
  bloco(ctx, r.titulo, { ...tOp, y: A - base, cor: corPedida(r, 'titulo', '#FFFFFF'), ...marca(r, legivel(c[0], '#FFFFFF')) })
  // Selo redondo com a chamada.
  if (r.chamada) {
    const raio = 110, cx = L - m - raio + 20, cy = A - base - raio - 10
    animado(ctx, () => {
      ctx.beginPath()
      ctx.arc(cx, cy, raio, 0, Math.PI * 2)
      const fundo = fundoPedido(r, c[0])
      ctx.fillStyle = fundo
      ctx.fill()
      ctx.font = `700 34px ${FONTE}`
      ctx.fillStyle = textoSobre(fundo)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const linhas = equilibrar(ctx, r.chamada, raio * 1.5).slice(0, 3)
      linhas.forEach((l, i) => ctx.fillText(l, cx, cy + (i - (linhas.length - 1) / 2) * 38, raio * 1.6))
    }, { escala: 0.2, desloca: 0 }, cx, cy)
  }
  void logo
}

// Antes e depois lado a lado, em texto (a foto, quando há, entra do lado do depois).
function comparar(ctx, { L, A, story, c, r, logo, foto, nome }) {
  const claro = r.arte?.fundo === 'claro'
  const tinta = claro ? '#111114' : '#FFFFFF'
  const fundo = claro ? '#F6F4F9' : '#0D0D12'
  ctx.fillStyle = fundo
  ctx.fillRect(0, 0, L, A)
  const alto = Math.round(A * (story ? 0.6 : 0.64) - (escala(r) - 1) * A * 0.2)
  const meio = L / 2
  const [antes, depois] = [(r.pontos || [])[0] || '', (r.pontos || [])[1] || '']
  // Antes: cinza e apagado.
  ctx.fillStyle = claro ? '#DCD9E0' : '#24242B'
  ctx.fillRect(0, 0, meio - 4, alto)
  // Depois: a foto (escurecida embaixo) ou a cor da marca.
  if (foto) {
    recorte(ctx, foto, meio + 4, 0, meio - 4, alto)
    ctx.fillStyle = 'rgba(8,8,12,.45)'
    ctx.fillRect(meio + 4, 0, meio - 4, alto)
  } else placaDaMarca(ctx, meio + 4, 0, meio - 4, alto, c[0], c[2], c[1])
  const topo = story ? 230 : 50
  const etiqueta = (texto, x, cor, corTexto) => animado(ctx, () => {
    ctx.font = `700 28px ${FONTE}`
    espacar(ctx, 6)
    const w = ctx.measureText(texto).width + 50
    arredondado(ctx, x, topo, w, 60, 30)
    ctx.fillStyle = cor
    ctx.fill()
    ctx.fillStyle = corTexto
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(texto, x + 25, topo + 32)
    espacar(ctx, 0)
  }, { desloca: -12 })
  etiqueta('ANTES', 40, claro ? '#FFFFFF' : '#111114', claro ? '#111114' : '#FFFFFF')
  etiqueta('DEPOIS', meio + 44, fundoPedido(r, c[0]), textoSobre(fundoPedido(r, c[0])))
  const lado2 = { largura: meio - 120, tamanho: 58, minimo: 38, peso: 700, maxLinhas: 5, entre: 1.08 }
  const yMeio = topo + 60 + (alto - topo - 60) / 2
  if (antes) {
    sobre(claro ? '#DCD9E0' : '#24242B')
    const h = medir(ctx, antes, { ...lado2, x: 60 })
    bloco(ctx, antes, { ...lado2, x: 60, y: yMeio - h / 2, cor: claro ? 'rgba(17,17,20,.55)' : 'rgba(255,255,255,.55)' })
  }
  if (depois) {
    sobre('#1A1A20')
    const h = medir(ctx, depois, { ...lado2, x: meio + 60 })
    bloco(ctx, depois, { ...lado2, x: meio + 60, y: yMeio - h / 2, cor: '#FFFFFF' })
  }
  // Seta no meio da divisa.
  animado(ctx, () => {
    ctx.beginPath()
    ctx.arc(meio, yMeio, 54, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    ctx.font = `700 50px ${FONTE}`
    ctx.fillStyle = '#111114'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('→', meio, yMeio + 2)
  }, { escala: 0.3, desloca: 0 }, meio, yMeio)
  sobre(fundo)
  const m = 80, base = story ? 330 : 80
  const al = lado(r)
  const destaque = destaqueSobre(tinta, c)
  const tOp = { x: m, largura: L - m * 2, tamanho: Math.round(84 * escala(r)), maxLinhas: 3, entre: 1.0, alinhar: al }
  const aOp = { x: m, largura: L - m * 2 - (al === 'left' ? 160 : 0), tamanho: 36, peso: 400, maxLinhas: 2, entre: 1.3, alinhar: al }
  while (medir(ctx, r.titulo, tOp) + 22 + medir(ctx, r.apoio, aOp) > A - base - 20 - (alto + 60) && tOp.tamanho > 50) tOp.tamanho -= 6
  let y = bloco(ctx, r.titulo, { ...tOp, y: alto + 60, cor: corPedida(r, 'titulo', tinta), ...marca(r, destaque) })
  bloco(ctx, r.apoio, { ...aOp, y: y + 22, cor: corPedida(r, 'texto', apagado(tinta, 0.75)) })
  selo(ctx, { logo, nome, x: al === 'right' ? m : L - m, y: A - base - 76, altura: 52, alinhar: al === 'right' ? 'left' : 'right', claro: tinta === '#FFFFFF' })
}

// Tabela de preços com pontilhado entre o nome e o preço. Usa os itens da marca.
function tabela(ctx, { L, A, story, c, r, logo, foto, nome }) {
  const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'escuro' })
  const m = 50, topo = story ? 220 : 50, base = story ? 320 : 50
  animado(ctx, () => {
    arredondado(ctx, m, topo, L - m * 2, A - topo - base, 40)
    ctx.lineWidth = 3
    ctx.strokeStyle = apagado(tinta, 0.18)
    ctx.stroke()
  }, { desloca: 0 })
  const dentro = m + 70, larg = L - dentro * 2
  const destaque = destaqueSobre(tinta, c)
  let y = bloco(ctx, r.titulo, { x: dentro, y: topo + 90, largura: larg, tamanho: Math.round(100 * escala(r)), maxLinhas: 2, entre: 1.0, alinhar: 'center', cor: corPedida(r, 'titulo', tinta), ...marca(r, destaque) })
  y = bloco(ctx, r.apoio, { x: dentro, y: y + 20, largura: larg, tamanho: 36, peso: 400, maxLinhas: 2, entre: 1.3, alinhar: 'center', cor: corPedida(r, 'texto', apagado(tinta, 0.72)) })
  const linhas = r.itens?.length ? r.itens.slice(0, 6) : (r.pontos || []).filter(Boolean).slice(0, 6).map((p) => ({ nome: p, preco: '' }))
  const fim = A - base - (r.chamada ? 230 : 150)
  const passo = Math.min(story ? 170 : 130, (fim - y - 60) / Math.max(linhas.length, 1))
  let yl = y + 60 + Math.max(0, (fim - y - 60 - passo * linhas.length) / 2)
  const corPreco = corPedida(r, 'destaque', destaque)
  for (const item of linhas) {
    const yi = yl
    animado(ctx, () => {
      ctx.textBaseline = 'alphabetic'
      ctx.font = `700 ${story ? 52 : 46}px ${FONTE}`
      ctx.fillStyle = corPreco
      ctx.textAlign = 'right'
      const wp = item.preco ? ctx.measureText(item.preco).width : 0
      if (item.preco) ctx.fillText(item.preco, dentro + larg, yi + passo * 0.55)
      ctx.font = `600 ${story ? 50 : 44}px ${FONTE}`
      ctx.fillStyle = corPedida(r, 'texto', tinta)
      ctx.textAlign = 'left'
      const espacoNome = larg - wp - 60
      let n = item.nome
      while (ctx.measureText(n).width > espacoNome && n.length > 4) n = n.slice(0, -2).trimEnd() + '…'
      ctx.fillText(n, dentro, yi + passo * 0.55)
      // Pontilhado entre o nome e o preço.
      const de = dentro + ctx.measureText(n).width + 24, ate = dentro + larg - wp - 24
      if (item.preco && ate > de) {
        ctx.setLineDash([3, 10])
        ctx.lineWidth = 3
        ctx.strokeStyle = apagado(tinta, 0.35)
        ctx.beginPath()
        ctx.moveTo(de, yi + passo * 0.55 - 6)
        ctx.lineTo(ate, yi + passo * 0.55 - 6)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }, { desloca: 16 })
    yl += passo
  }
  const fundo = fundoPedido(r, c[0])
  pilulaCurta(ctx, r, { x: dentro, y: A - base - 230, largura: larg, alinhar: 'center', fundo, cor: textoSobre(fundo), altura: 96, tamanho: 38 })
  selo(ctx, { logo, nome, x: L / 2, y: A - base - 116, altura: 52, alinhar: 'center', claro: tinta === '#FFFFFF' })
}

// Pergunta grande e opções A, B, C. Bom para enquete nos stories.
function enquete(ctx, { L, A, story, c, r, logo, foto, nome }) {
  let tinta
  if (r.arte?.fundo && r.arte.fundo !== 'marca') tinta = pintarFundo(ctx, { L, A, c, foto, r })
  else {
    ctx.fillStyle = c[1]
    ctx.fillRect(0, 0, L, A)
    brilho(ctx, L, 0, L * 0.9, c[0], 0.18)
    sobre(c[1])
    tinta = textoSobre(c[1])
  }
  const m = 80, topo = story ? 230 : 80, base = story ? 330 : 90
  // Interrogação gigante no fundo.
  animado(ctx, () => {
    ctx.font = `700 ${Math.round(A * 0.62)}px ${FONTE}`
    ctx.fillStyle = apagado(tinta, 0.07)
    ctx.textAlign = 'right'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('?', L + 20, A * 0.62)
  }, { desloca: 0, escala: 0.06 }, L * 0.8, A * 0.35)
  selo(ctx, { logo, nome, x: m, y: topo, altura: 60, claro: tinta === '#FFFFFF' })
  const opcoes = (r.pontos || []).filter(Boolean).slice(0, 4)
  const altOpcao = story ? 120 : 104, entreOpcoes = 22
  const blocoOpcoes = opcoes.length * (altOpcao + entreOpcoes)
  const fim = A - base - (r.chamada ? 90 : 0)
  const tOp = { x: m, largura: L - m * 2, tamanho: Math.round(104 * escala(r)), maxLinhas: 4, entre: 1.0 }
  const comeco = topo + 190
  while (comeco + medir(ctx, r.titulo, tOp) + 60 + blocoOpcoes > fim - 40 && tOp.tamanho > 60) tOp.tamanho -= 6
  rotulo(ctx, 'Enquete', { x: m, y: comeco - 24, tamanho: 30, cor: corPedida(r, 'destaque', apagado(tinta, 0.7)) })
  let y = bloco(ctx, r.titulo, { ...tOp, y: comeco, cor: corPedida(r, 'titulo', tinta), ...marca(r, tinta === '#FFFFFF' ? legivel(c[0], tinta) : misturar(c[0], '#000000', 0.35)) })
  y = Math.max(y + 60, fim - 40 - blocoOpcoes)
  opcoes.forEach((op, i) => {
    // Opções alternadas: clara e marcada. Em fundo escuro, a marcada vai na cor da marca.
    const escuro = i % 2 === 1
    const forte = tinta === '#FFFFFF' ? fundoPedido(r, c[0]) : '#111114'
    const yo = y
    animado(ctx, () => {
      arredondado(ctx, m, yo, L - m * 2, altOpcao, 24)
      ctx.fillStyle = escuro ? forte : 'rgba(255,255,255,.88)'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(m + 60, yo + altOpcao / 2, 26, 0, Math.PI * 2)
      ctx.fillStyle = escuro ? (forte === '#111114' ? fundoPedido(r, c[0]) : '#FFFFFF') : '#111114'
      ctx.fill()
      ctx.font = `700 28px ${FONTE}`
      ctx.fillStyle = escuro ? (forte === '#111114' ? textoSobre(fundoPedido(r, c[0])) : '#111114') : '#FFFFFF'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('ABCD'[i], m + 60, yo + altOpcao / 2 + 1)
      ctx.font = `600 ${story ? 44 : 40}px ${FONTE}`
      ctx.fillStyle = escuro ? textoSobre(forte) : '#111114'
      ctx.textAlign = 'left'
      ctx.fillText(op, m + 112, yo + altOpcao / 2 + 2, L - m * 2 - 150)
    }, { desloca: 20 })
    y += altOpcao + entreOpcoes
  })
  chamadaEmTexto(ctx, r, { x: m, y: A - base, largura: L - m * 2, alinhar: 'left', cor: corPedida(r, 'texto', tinta), tamanho: 36 })
}

// Vídeo em cenas: abertura com o título, um item ou ponto por cena e o fechamento com o logo.
// Cada cena tem o seu próprio relógio (as entradas recomeçam), e a próxima entra deslizando da direita.
// Parado (miniatura, histórico, menos movimento), vira uma capa de story com o título e a chamada.
const CENA = { abertura: 3.2, item: 2.8, fim: 3.4 }
const TROCA = 0.5
function listaDeCenas(r) {
  const meio = r.itens?.length
    ? r.itens.slice(0, 4).map((i) => ({ texto: i.nome, preco: i.preco }))
    : (r.pontos || []).filter(Boolean).slice(0, 4).map((p) => ({ texto: p }))
  if (!meio.length && r.apoio) meio.push({ texto: r.apoio, sozinho: true })
  return [
    { tipo: 'abertura', dur: CENA.abertura },
    ...meio.map((m, i) => ({ ...m, tipo: 'item', dur: CENA.item, i, n: meio.length })),
    { tipo: 'fim', dur: CENA.fim },
  ]
}
export const duracaoDasCenas = (r) => listaDeCenas(r || {}).reduce((t, c) => t + c.dur, 0)

const fundoSemFoto = (r) => (['claro', 'escuro'].includes(r.arte?.fundo) ? r.arte.fundo : 'marca')

function escurecerFoto(ctx, L, A, de = 0.3, ate = 0.88) {
  const g = ctx.createLinearGradient(0, 0, 0, A)
  g.addColorStop(0, `rgba(8,8,12,${de})`)
  g.addColorStop(1, `rgba(8,8,12,${ate})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, L, A)
  sobre('#1A1A20')
}

function aberturaDasCenas(ctx, { L, A, story, c, r, logo, fotos, nome }, parado) {
  const foto = fotos[0]
  let tinta = '#FFFFFF'
  if (foto) { cobrir(ctx, foto, 0, 0, L, A); escurecerFoto(ctx, L, A, 0.25, 0.9) } else tinta = pintarFundo(ctx, { L, A, c, foto: null, r: { arte: { fundo: fundoSemFoto(r) } } })
  const m = 70, topo = story ? 240 : 70, base = story ? 360 : 90
  selo(ctx, { logo, nome, x: L / 2, y: topo, altura: 84, alinhar: 'center' })
  const tOp = { x: m, largura: L - m * 2, tamanho: Math.round(120 * escala(r)), maxLinhas: 4, entre: 1.0, alinhar: 'center' }
  const aOp = { x: m + 30, largura: L - m * 2 - 60, tamanho: 44, peso: 500, maxLinhas: 3, entre: 1.25, alinhar: 'center' }
  const pil = parado && r.chamada ? 170 : 0
  const altura = medir(ctx, r.titulo, tOp) + 34 + medir(ctx, r.apoio, aOp) + pil
  let y = Math.max(topo + 220, A - base - altura)
  y = bloco(ctx, r.titulo, { ...tOp, y, cor: corPedida(r, 'titulo', tinta), ...marca(r, tinta === '#FFFFFF' ? legivel(c[1], '#FFFFFF') : destaqueSobre(tinta, c)) })
  y = bloco(ctx, r.apoio, { ...aOp, y: y + 34, cor: corPedida(r, 'texto', apagado(tinta, 0.86)) })
  if (pil) {
    const fundo = fundoPedido(r, tinta === '#FFFFFF' ? '#FFFFFF' : c[0])
    pilulaCurta(ctx, r, { x: m, y: y + 60, largura: L - m * 2, alinhar: 'center', fundo, cor: textoSobre(fundo) })
  }
}

function itemDasCenas(ctx, { L, A, story, c, r, fotos }, cena) {
  const m = 60, base = story ? 330 : 70
  const com = fotos.length > 0
  if (com) {
    // Com várias fotos, cada cena usa a seguinte (a primeira abriu o vídeo); com uma só, um pedaço diferente dela.
    if (fotos.length > 1) cobrir(ctx, fotos[(cena.i + 1) % fotos.length], 0, 0, L, A)
    else recorte(ctx, fotos[0], 0, 0, L, A, 1.35, cena.i % 2 ? 0.7 : 0.3, cena.i % 2 ? 0.35 : 0.65)
    escurecerFoto(ctx, L, A, 0.05, 0.55)
  } else {
    const cor = c[cena.i % 3]
    placaDaMarca(ctx, 0, 0, L, A, cor, misturar(cor, '#000000', 0.45), c[(cena.i + 1) % 3])
    sobre(misturar(cor, '#000000', 0.2))
    // Número da cena enorme e apagado ao fundo, na fonte dos títulos.
    if (!cena.sozinho) {
      ctx.save()
      ctx.font = fonteDoBloco(700, 560, 560)
      ctx.fillStyle = comAlfa(textoSobre(cor), 0.12)
      ctx.textAlign = 'right'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(String(cena.i + 1).padStart(2, '0'), L - 30, (story ? 760 : 560))
      ctx.restore()
    }
  }
  const claro = com
  const tinta = claro ? '#111114' : textoSobre(c[cena.i % 3])
  const dentro = L - m * 2 - 100
  const tOp = { x: m + 50, largura: dentro, tamanho: cena.sozinho ? 64 : com ? 84 : 112, maxLinhas: 4, entre: 1.04 }
  const precoAlto = cena.preco ? 120 : 0
  const contador = cena.sozinho ? 0 : 70
  const h = 60 + contador + medir(ctx, cena.texto, tOp) + precoAlto + 56
  const y0 = com ? A - base - h : Math.round((A - h) / 2)
  // O cartão vem junto com a cena, que já entra deslizando.
  if (claro) {
    arredondado(ctx, m, y0, L - m * 2, h, 36)
    ctx.fillStyle = 'rgba(255,255,255,.95)'
    ctx.fill()
    sobre('#FFFFFF')
  }
  const destaque = claro ? destaqueSobre('#111114', c) : legivel(c[(cena.i + 1) % 3], tinta)
  let y = y0 + 60
  if (contador) {
    rotulo(ctx, `${String(cena.i + 1).padStart(2, '0')} / ${String(cena.n).padStart(2, '0')}`, { x: m + 50, y: y + 30, tamanho: 30, cor: destaque, espaco: 4 })
    y += contador
  }
  y = bloco(ctx, cena.texto, { ...tOp, y, cor: corPedida(r, 'titulo', tinta) })
  if (cena.preco) {
    const fundo = fundoPedido(r, claro ? c[0] : '#FFFFFF')
    ctx.font = `700 46px ${FONTE}`
    const w = ctx.measureText(cena.preco).width + 90
    pilula(ctx, cena.preco, { x: m + 50, y: y + 24, largura: w, altura: 92, tamanho: 46, fundo, cor: textoSobre(fundo) })
  }
}

function fimDasCenas(ctx, { L, A, story, c, r, logo, nome }) {
  const tinta = pintarFundo(ctx, { L, A, c, foto: null, r: { arte: { fundo: fundoSemFoto(r) } } })
  const m = 70
  let y = A * (story ? 0.3 : 0.2)
  if (logo) {
    selo(ctx, { logo, nome, x: L / 2, y, altura: 260, alinhar: 'center' })
    y += 260 + 36 + 70
  }
  // Nome da marca na fonte dos títulos.
  y = bloco(ctx, nome, { x: m, y, largura: L - m * 2, tamanho: 104, maxLinhas: 2, entre: 1.0, alinhar: 'center', cor: corPedida(r, 'titulo', tinta) })
  if (r.chamada) {
    const fundo = fundoPedido(r, tinta === '#FFFFFF' ? legivel(c[0], '#FFFFFF') : c[0])
    pilulaCurta(ctx, r, { x: m, y: y + 70, largura: L - m * 2, alinhar: 'center', fundo, cor: textoSobre(fundo), altura: 120, tamanho: 46 })
  }
}

function desenharCena(ctx, args, cena, parado) {
  if (cena.tipo === 'abertura') aberturaDasCenas(ctx, args, parado)
  else if (cena.tipo === 'item') itemDasCenas(ctx, args, cena)
  else fimDasCenas(ctx, args)
}

function cenas(ctx, args) {
  const lista = listaDeCenas(args.r)
  if (!relogio) { desenharCena(ctx, args, lista[0], true); return }
  const geral = relogio
  let inicio = 0, k = 0
  while (k < lista.length - 1 && geral.t >= inicio + lista[k].dur) { inicio += lista[k].dur; k++ }
  const local = geral.t - inicio
  const cena = (i, t, dx) => {
    ctx.save()
    ctx.translate(dx, 0)
    // Começa em -1: dentro da cena as entradas são mais cedo, para dar tempo de ler.
    relogio = { t, total: lista[i].dur, ordem: -1 }
    desenharCena(ctx, args, lista[i], false)
    ctx.restore()
  }
  try {
    if (k > 0 && local < TROCA) {
      const p = suave(local / TROCA)
      cena(k - 1, lista[k - 1].dur, -p * args.L * 0.35)
      cena(k, local, (1 - p) * args.L)
    } else cena(k, local, 0)
  } finally {
    relogio = geral
  }
}

// Os stories com movimento usam as mesmas peças (texto, botão, selo, cores) e marcam a hora de cada entrada.
const HISTORIAS = criarHistorias({
  relogio: () => relogio,
  // O próximo elemento entra em `s` segundos.
  aos: (s) => { if (relogio) relogio.ordem = (s - 0.35) / 0.32 },
  // Desenha parado, mesmo no vídeo (quando o movimento é do grupo todo).
  semRelogio: (desenho) => {
    const guardado = relogio
    relogio = null
    try { return desenho() } finally { relogio = guardado }
  },
  modelos: () => MODELOS,
  bloco, medir, selo, rotulo, balao, quebrar, espacar, arredondado, pilulaCurta, chamadaEmTexto, placaDaMarca, brilho, lerData,
  pintarFundo, corPedida, fundoPedido, destaqueSobre, apagado, textoSobre, comAlfa, misturar, legivel, luz, contraste,
  marca, escala, lado, sobre, fonteDoBloco, FONTE, EMBARALHO, suave, sorteio, acender, confete,
})

const MODELOS = {
  promo, aviso, bastidores, manchete, lista, citacao, dividido, foto: fotoInteira, cartao,
  numero, cupom, agenda, conversa, mosaico, faixas, capa, comparar, tabela, enquete, cenas,
  ...HISTORIAS,
}

export function desenhar(canvas, { formato, modelo, roteiro, cores, logo, foto, fotos, nome, fonte, tempo = null, total = 8 }) {
  const [L, A] = TAMANHOS[formato] || TAMANHOS.post
  canvas.width = L
  canvas.height = A
  const ctx = canvas.getContext('2d')
  const base = [cores[0] || '#7B5CFF', cores[1] || cores[0] || '#A28BFF', cores[2] || cores[1] || cores[0] || '#5B3FE0']
  const c = [fundoPedido(roteiro, base[0]), base[1], base[2]]
  ctx.clearRect(0, 0, L, A)
  relogio = tempo === null ? null : { t: tempo, total, ordem: 0 }
  fonteTitulo = fonteDa(fonte)
  const todas = fotos?.length ? fotos : foto ? [foto] : []
  try {
    ;(MODELOS[modelo] || aviso)(ctx, { L, A, story: formato === 'story', c, r: roteiro, logo, foto: todas[0] || null, fotos: todas, nome })
  } finally {
    relogio = null
    fonteTitulo = fonteDa()
  }
}

export function paraArquivo(canvas, nome) {
  return new Promise((ok) => canvas.toBlob((blob) => ok(new File([blob], nome, { type: 'image/png' })), 'image/png'))
}

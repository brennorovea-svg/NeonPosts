// Desenha a peça no próprio aparelho, num canvas de 1080 de largura.
// Post 4:5 (1080x1350) e story 9:16 (1080x1920). Três modelos: promo, aviso, bastidores.

export const TAMANHOS = { post: [1080, 1350], story: [1080, 1920] }
export const NOMES_DOS_MODELOS = { promo: 'Promoção', aviso: 'Aviso', bastidores: 'Bastidores' }
const FONTE = '"Instrument Sans", system-ui, sans-serif'

export async function prepararFontes() {
  await Promise.all(['400', '600', '700'].map((p) => document.fonts.load(`${p} 40px "Instrument Sans"`)))
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

// Escreve um bloco de texto, diminuindo a fonte até caber no número de linhas.
function bloco(ctx, texto, { x, y, largura, tamanho, minimo = 36, peso = 700, maxLinhas = 4, cor, alinhar = 'left', entre = 1.04, baseEmBaixo = false }) {
  if (!texto) return y
  let t = tamanho, linhas
  do {
    ctx.font = `${peso} ${t}px ${FONTE}`
    linhas = peso >= 600 ? equilibrar(ctx, texto, largura) : quebrar(ctx, texto, largura)
    t -= 4
  } while (linhas.length > maxLinhas && t >= minimo)
  t += 4
  const altura = t * entre
  ctx.fillStyle = cor
  ctx.textAlign = alinhar
  ctx.textBaseline = 'alphabetic'
  const ax = alinhar === 'center' ? x + largura / 2 : x
  let topo = baseEmBaixo ? y - altura * linhas.length : y
  linhas.slice(0, maxLinhas).forEach((l, i) => ctx.fillText(l, ax, topo + t * 0.9 + altura * i))
  return baseEmBaixo ? topo : topo + altura * Math.min(linhas.length, maxLinhas)
}

// Altura que um bloco ocupa, sem desenhar.
function medir(ctx, texto, opcoes) {
  ctx.save()
  ctx.fillStyle = 'transparent'
  const fim = bloco(ctx, texto, { ...opcoes, y: 0, cor: 'rgba(0,0,0,0)' })
  ctx.restore()
  return fim
}

function arredondado(ctx, x, y, l, a, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, l, a, r)
}

function cobrir(ctx, img, x, y, l, a) {
  const escala = Math.max(l / img.width, a / img.height)
  const w = img.width * escala, h = img.height * escala
  ctx.drawImage(img, x + (l - w) / 2, y + (a - h) / 2, w, h)
}

// Logo num selo claro, para funcionar sobre qualquer fundo; sem logo, o nome.
function selo(ctx, { logo, nome, x, y, altura = 96, alinhar = 'left', claro = true }) {
  ctx.save()
  if (logo) {
    const l = Math.min(altura * (logo.width / logo.height), 360)
    const pad = 18
    const w = l + pad * 2, h = altura + pad * 2
    const sx = alinhar === 'center' ? x - w / 2 : x
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

function pilula(ctx, texto, { x, y, largura, altura = 112, fundo, cor, tamanho = 42 }) {
  arredondado(ctx, x, y, largura, altura, altura / 2)
  ctx.fillStyle = fundo
  ctx.fill()
  ctx.font = `700 ${tamanho}px ${FONTE}`
  ctx.fillStyle = cor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(texto, x + largura / 2, y + altura / 2 + 2)
}

function brilho(ctx, cx, cy, raio, cor, forca = 0.55) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, raio)
  g.addColorStop(0, comAlfa(cor, forca))
  g.addColorStop(1, comAlfa(cor, 0))
  ctx.fillStyle = g
  ctx.fillRect(cx - raio, cy - raio, raio * 2, raio * 2)
}

function promo(ctx, { L, A, story, c, r, logo, foto, nome }) {
  const tinta = textoSobre(c[0])
  ctx.fillStyle = c[0]
  ctx.fillRect(0, 0, L, A)
  brilho(ctx, L * 0.95, A * 0.85, L * 0.9, c[1], 0.7)
  brilho(ctx, 0, 0, L * 0.6, c[2], 0.35)

  const m = 80, topo = story ? 230 : 80, base = story ? 330 : 80
  selo(ctx, { logo, nome, x: m, y: topo, altura: 96, claro: tinta === '#FFFFFF' })

  const itens = r.itens.slice(0, 3)
  const chamadaY = A - base - 112
  const tituloOp = { x: m, largura: L - m * 2, tamanho: foto ? 96 : 140, maxLinhas: foto ? 3 : 4, entre: 1.0 }
  const apoioOp = { x: m, largura: L - m * 2, tamanho: 44, peso: 400, maxLinhas: 3, entre: 1.3 }
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
  y = bloco(ctx, r.titulo, { ...tituloOp, y, cor: tinta })
  y = bloco(ctx, r.apoio, { ...apoioOp, y: y + 22, cor: comAlfa(tinta === '#FFFFFF' ? '#FFFFFF' : '#111114', 0.86) })

  let iy = Math.max(y + 40, chamadaY - 40 - itens.length * 124)
  for (const item of itens) {
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
    iy += 124
  }
  if (r.chamada) pilula(ctx, r.chamada, { x: m, y: chamadaY, largura: L - m * 2, fundo: tinta, cor: tinta === '#FFFFFF' ? c[0] : '#FFFFFF' })
}

function aviso(ctx, { L, A, story, c, r, logo, foto, nome }) {
  const fundo = misturar(c[0], '#0B0B10', 0.86)
  ctx.fillStyle = fundo
  ctx.fillRect(0, 0, L, A)
  if (foto) {
    ctx.globalAlpha = 0.32
    cobrir(ctx, foto, 0, 0, L, A)
    ctx.globalAlpha = 1
  }
  brilho(ctx, L / 2, A * 0.42, L * 0.75, c[0], 0.5)
  brilho(ctx, L * 0.1, A, L * 0.6, c[1], 0.35)

  const m = 90, topo = story ? 250 : 90, base = story ? 340 : 90
  // Moldura fina na cor da marca.
  arredondado(ctx, 36, 36, L - 72, A - 72, 40)
  ctx.lineWidth = 4
  ctx.strokeStyle = comAlfa(c[0], 0.8)
  ctx.stroke()

  const meio = A * (story ? 0.44 : 0.42)
  ctx.fillStyle = c[1]
  arredondado(ctx, L / 2 - 60, meio - 260, 120, 12, 6)
  ctx.fill()
  const fimTitulo = bloco(ctx, r.titulo, { x: m, y: meio - 210, largura: L - m * 2, tamanho: 120, maxLinhas: 3, cor: '#FFFFFF', alinhar: 'center', entre: 1.0 })
  bloco(ctx, r.apoio, { x: m + 20, y: fimTitulo + 28, largura: L - (m + 20) * 2, tamanho: 44, peso: 400, maxLinhas: 3, cor: 'rgba(255,255,255,.82)', alinhar: 'center', entre: 1.3 })

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
  const sombra = ctx.createLinearGradient(0, A * 0.35, 0, A)
  sombra.addColorStop(0, 'rgba(8,8,12,0)')
  sombra.addColorStop(1, 'rgba(8,8,12,.9)')
  ctx.fillStyle = sombra
  ctx.fillRect(0, 0, L, A)

  const m = 80, topo = story ? 230 : 80, base = story ? 330 : 90
  selo(ctx, { logo, nome, x: m, y: topo, altura: 88 })

  let y = A - base
  if (r.chamada) {
    ctx.font = `700 40px ${FONTE}`
    ctx.fillStyle = c[1]
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(`${r.chamada}  →`, m, y)
    y -= 80
  }
  y = bloco(ctx, r.apoio, { x: m, y, largura: L - m * 2, tamanho: 42, peso: 400, maxLinhas: 3, cor: 'rgba(255,255,255,.86)', entre: 1.3, baseEmBaixo: true })
  bloco(ctx, r.titulo, { x: m, y: y - 24, largura: L - m * 2, tamanho: 104, maxLinhas: 3, cor: '#FFFFFF', entre: 1.0, baseEmBaixo: true })
}

const MODELOS = { promo, aviso, bastidores }

export function desenhar(canvas, { formato, modelo, roteiro, cores, logo, foto, nome }) {
  const [L, A] = TAMANHOS[formato] || TAMANHOS.post
  canvas.width = L
  canvas.height = A
  const ctx = canvas.getContext('2d')
  const c = [cores[0] || '#7B5CFF', cores[1] || cores[0] || '#A28BFF', cores[2] || cores[1] || cores[0] || '#5B3FE0']
  ctx.clearRect(0, 0, L, A)
  ;(MODELOS[modelo] || aviso)(ctx, { L, A, story: formato === 'story', c, r: roteiro, logo, foto, nome })
}

export function paraArquivo(canvas, nome) {
  return new Promise((ok) => canvas.toBlob((blob) => ok(new File([blob], nome, { type: 'image/png' })), 'image/png'))
}

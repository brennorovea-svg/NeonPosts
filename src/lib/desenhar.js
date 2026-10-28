// Desenha a peça no próprio aparelho, num canvas de 1080 de largura.
// Post 4:5 (1080x1350) e story 9:16 (1080x1920). Nove modelos; a IA escolhe o modelo e o
// jeito da arte (palavra em destaque, tamanho do título, alinhamento e fundo).

export const TAMANHOS = { post: [1080, 1350], story: [1080, 1920] }
export const NOMES_DOS_MODELOS = {
  promo: 'Promoção', aviso: 'Aviso', bastidores: 'Bastidores', manchete: 'Manchete', lista: 'Lista',
  citacao: 'Citação', dividido: 'Dividido', foto: 'Foto inteira', cartao: 'Cartão',
}
const FONTE = '"Instrument Sans", system-ui, sans-serif'

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
    ctx.font = `${peso} ${t}px ${FONTE}`
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
    const ax = alinhar === 'center' ? x + largura / 2 : x
    linhas.forEach((l, i) => linha(i, () => ctx.fillText(l, ax, topo + t * 0.9 + altura * i)))
  } else {
    // Palavra por palavra, para trocar a cor só no trecho destacado.
    ctx.textAlign = 'left'
    const espaco = ctx.measureText(' ').width
    let n = 0
    const brilhoMarca = piscada(inicio + 0.3 + linhas.length * 0.12 + 0.5)
    linhas.forEach((l, i) => linha(i, () => {
      const w = ctx.measureText(l).width
      let px = alinhar === 'center' ? x + (largura - w) / 2 : x
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
  ctx.save()
  if (relogio) entrar(ctx, proximaEntrada() + 0.2, { dur: 0.5, desloca: 0, escala: 0.12 }, x + largura / 2, y + altura / 2)
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

// Cor pedida no ajuste (ex.: "título em verde") ou a padrão do modelo.
const corPedida = (r, chave, padrao) => (/^#[0-9a-f]{6}$/i.test(r.cores?.[chave] || '') ? r.cores[chave] : padrao)
// Trecho do título que a IA quer em destaque, na cor de destaque (ou na cor pedida).
const marca = (r, cor) => ({ marcar: r.arte?.destaque || '', corMarca: corPedida(r, 'destaque', cor) })
const TAMANHO_TITULO = { normal: 1, grande: 1.18, gigante: 1.4 }
const escala = (r) => TAMANHO_TITULO[r.arte?.tamanho_titulo] || 1
const centro = (r, padrao) => (r.arte?.alinhamento ? r.arte.alinhamento === 'centro' : padrao)

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
    return '#FFFFFF'
  }
  if (fundo === 'claro') {
    ctx.fillStyle = '#F6F4F9'
    ctx.fillRect(0, 0, L, A)
    brilho(ctx, L, 0, L * 0.9, c[0], 0.18)
    brilho(ctx, 0, A, L * 0.8, c[1], 0.16)
    return '#111114'
  }
  if (fundo === 'escuro') {
    ctx.fillStyle = '#0D0D12'
    ctx.fillRect(0, 0, L, A)
    brilho(ctx, L * 0.85, A * 0.15, L * 0.8, c[0], 0.45)
    brilho(ctx, L * 0.1, A * 0.95, L * 0.7, c[1], 0.3)
    return '#FFFFFF'
  }
  const g = ctx.createLinearGradient(0, 0, L, A)
  g.addColorStop(0, c[0])
  g.addColorStop(1, c[2])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, L, A)
  brilho(ctx, L * 0.85, A * 0.2, L * 0.7, c[1], 0.45)
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
  if (r.chamada) pilula(ctx, r.chamada, { x: m, y: chamadaY, largura: L - m * 2, fundo: tinta, cor: tinta === '#FFFFFF' ? c[0] : '#FFFFFF' })
}

function aviso(ctx, { L, A, story, c, r, logo, foto, nome }) {
  const claro = r.arte?.fundo === 'claro'
  const tinta = claro ? '#111114' : '#FFFFFF'
  ctx.fillStyle = claro ? '#F6F4F9' : misturar(c[0], '#0B0B10', 0.86)
  ctx.fillRect(0, 0, L, A)
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

  const m = 80, topo = story ? 230 : 80, base = story ? 330 : 90
  const meio = centro(r, false)
  selo(ctx, { logo, nome, x: meio ? L / 2 : m, y: topo, altura: 88, alinhar: meio ? 'center' : 'left' })

  let y = A - base
  if (r.chamada) {
    const yc = y
    animado(ctx, () => {
      ctx.font = `700 40px ${FONTE}`
      ctx.fillStyle = corPedida(r, 'destaque', destaqueSobre(tinta, c))
      ctx.textAlign = meio ? 'center' : 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(`${r.chamada}  →`, meio ? L / 2 : m, yc)
    })
    y -= 80
  }
  const alinhar = meio ? 'center' : 'left'
  y = bloco(ctx, r.apoio, { x: m, y, largura: L - m * 2, tamanho: 42, peso: 400, maxLinhas: 3, cor: corPedida(r, 'texto', apagado(tinta, 0.86)), entre: 1.3, baseEmBaixo: true, alinhar })
  bloco(ctx, r.titulo, { x: m, y: y - 24, largura: L - m * 2, tamanho: Math.round(104 * escala(r)), maxLinhas: 3, cor: corPedida(r, 'titulo', tinta), entre: 1.0, baseEmBaixo: true, alinhar, ...marca(r, destaqueSobre(tinta, c)) })
}

// Título gigante ocupando a arte; o resto pequeno. Bom para novidade e frase de impacto.
function manchete(ctx, { L, A, story, c, r, logo, foto, nome }) {
  const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'escuro' })
  const m = 80, topo = story ? 230 : 80, base = story ? 330 : 90
  const meio = centro(r, false)
  selo(ctx, { logo, nome, x: meio ? L / 2 : m, y: topo, altura: 72, alinhar: meio ? 'center' : 'left', claro: tinta === '#FFFFFF' })
  const op = { x: m, largura: L - m * 2, tamanho: Math.round(150 * escala(r)), maxLinhas: story ? 6 : 5, entre: 0.98, alinhar: meio ? 'center' : 'left' }
  const apoioOp = { x: m, largura: L - m * 2, tamanho: 40, peso: 400, maxLinhas: 3, entre: 1.3, alinhar: meio ? 'center' : 'left' }
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
      ctx.textAlign = meio ? 'center' : 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(`${r.chamada}  →`, meio ? L / 2 : m, fimChamada)
    })
  }
}

// Título e até 4 pontos numerados. Bom para dica, passo a passo e o que está incluso.
function lista(ctx, { L, A, story, c, r, logo, foto, nome }) {
  const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'claro' })
  const m = 80, topo = story ? 230 : 80, base = story ? 330 : 80
  selo(ctx, { logo, nome, x: m, y: topo, altura: 72, claro: tinta === '#FFFFFF' })
  const destaque = destaqueSobre(tinta, c)
  let y = bloco(ctx, r.titulo, { x: m, y: topo + 150, largura: L - m * 2, tamanho: Math.round(100 * escala(r)), maxLinhas: 3, entre: 1.0, cor: corPedida(r, 'titulo', tinta), ...marca(r, destaque) })
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
    animado(ctx, () => {
      ctx.font = `700 64px ${FONTE}`
      ctx.fillStyle = corPedida(r, 'destaque', destaque)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(String(i + 1).padStart(2, '0'), m, yn + 62)
    }, { desloca: 0 })
    const fim = bloco(ctx, ponto, { ...pOp, y: y + 6, cor: corPedida(r, 'texto', tinta) })
    y = Math.max(y + passo, fim + 44)
  })
  if (r.chamada) pilula(ctx, r.chamada, { x: m, y: A - base - 112, largura: L - m * 2, fundo: corPedida(r, 'destaque', c[0]), cor: textoSobre(corPedida(r, 'destaque', c[0])) })
}

// Aspas grandes com a fala do cliente. Bom para depoimento.
function citacao(ctx, { L, A, story, c, r, logo, foto, nome }) {
  const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'marca' })
  const m = 90, topo = story ? 250 : 90, base = story ? 340 : 100
  const meio = centro(r, false)
  const destaque = destaqueSobre(tinta, c)
  const fala = { x: m, largura: L - m * 2, tamanho: Math.round(84 * escala(r)), peso: 600, maxLinhas: story ? 7 : 5, entre: 1.15, alinhar: meio ? 'center' : 'left' }
  const altura = 190 + medir(ctx, r.titulo, fala) + (r.autor ? 70 : 0) + 120
  const y0 = topo + Math.max(0, (A - base - 160 - topo - altura) / 2)
  animado(ctx, () => {
    ctx.font = `700 300px ${FONTE}`
    ctx.fillStyle = corPedida(r, 'destaque', destaque)
    ctx.textAlign = meio ? 'center' : 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('“', meio ? L / 2 : m - 10, y0 + 270)
  }, { escala: 0.3, desloca: 0 }, meio ? L / 2 : m + 60, y0 + 200)
  let y = bloco(ctx, r.titulo, { ...fala, y: y0 + 190, cor: corPedida(r, 'titulo', tinta), ...marca(r, destaque) })
  if (r.autor) {
    const ya = y
    animado(ctx, () => {
      ctx.font = `700 40px ${FONTE}`
      ctx.fillStyle = corPedida(r, 'texto', tinta)
      ctx.textAlign = meio ? 'center' : 'left'
      ctx.fillText(`— ${r.autor}`, meio ? L / 2 : m, ya + 70)
    })
    y += 70
  }
  bloco(ctx, r.apoio, { x: m, y: y + 40, largura: L - m * 2, tamanho: 36, peso: 400, maxLinhas: 2, entre: 1.3, alinhar: meio ? 'center' : 'left', cor: apagado(tinta, 0.72) })
  selo(ctx, { logo, nome, x: meio ? L / 2 : m, y: A - base - 100, altura: 72, alinhar: meio ? 'center' : 'left', claro: tinta === '#FFFFFF' })
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
  ctx.fillStyle = corPedida(r, 'destaque', c[0])
  ctx.fillRect(0, corte - 8, L, 16)
  const m = 80, topo = story ? 230 : 70, base = story ? 330 : 80
  selo(ctx, { logo, nome, x: m, y: topo, altura: 72 })
  const destaque = destaqueSobre(tinta, c)
  const tOp = { x: m, largura: L - m * 2, tamanho: Math.round(96 * escala(r)), maxLinhas: 3, entre: 1.0 }
  const aOp = { x: m, largura: L - m * 2, tamanho: 40, peso: 400, maxLinhas: 3, entre: 1.3 }
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
    pilula(ctx, r.chamada, { x: m, y: Math.max(y + 44, pilulaY), largura: w, altura: 104, tamanho: 40, fundo: corPedida(r, 'destaque', c[0]), cor: textoSobre(corPedida(r, 'destaque', c[0])) })
  }
}

// Foto ocupando tudo e um cartão embaixo com o texto. Precisa de foto; sem ela, usa a cor da marca.
function fotoInteira(ctx, { L, A, story, c, r, logo, foto, nome }) {
  if (foto) cobrir(ctx, foto, 0, 0, L, A)
  else pintarFundo(ctx, { L, A, c, foto: null, r: { arte: { fundo: 'marca' } } })
  const m = 60, topo = story ? 230 : 60, base = story ? 330 : 60
  selo(ctx, { logo, nome, x: m, y: topo, altura: 72 })
  const claro = r.arte?.fundo !== 'escuro'
  const tinta = claro ? '#111114' : '#FFFFFF'
  const destaque = destaqueSobre(tinta, c)
  const dentro = L - m * 2 - 100
  const tOp = { x: m + 50, largura: dentro, tamanho: Math.round(76 * escala(r)), maxLinhas: 3, entre: 1.02 }
  const aOp = { x: m + 50, largura: dentro, tamanho: 36, peso: 400, maxLinhas: 3, entre: 1.3 }
  const h = 60 + medir(ctx, r.titulo, tOp) + 18 + medir(ctx, r.apoio, aOp) + (r.chamada ? 90 : 0) + 50
  const y0 = A - base - h
  animado(ctx, () => {
    arredondado(ctx, m, y0, L - m * 2, h, 36)
    ctx.fillStyle = claro ? 'rgba(255,255,255,.95)' : 'rgba(13,13,18,.9)'
    ctx.fill()
  }, { desloca: 60 })
  let y = bloco(ctx, r.titulo, { ...tOp, y: y0 + 60, cor: corPedida(r, 'titulo', tinta), ...marca(r, destaque) })
  y = bloco(ctx, r.apoio, { ...aOp, y: y + 18, cor: corPedida(r, 'texto', apagado(tinta, 0.75)) })
  if (r.chamada) {
    animado(ctx, () => {
      ctx.font = `700 38px ${FONTE}`
      ctx.fillStyle = corPedida(r, 'destaque', destaque)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(`${r.chamada}  →`, m + 50, y + 70)
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
  const destaque = destaqueSobre('#111114', c)
  let y = bloco(ctx, r.titulo, { ...tOp, y: y0 + 130, cor: corPedida(r, 'titulo', '#111114'), ...marca(r, destaque) })
  y = bloco(ctx, r.apoio, { ...aOp, y: y + 24, cor: corPedida(r, 'texto', 'rgba(17,17,20,.72)') })
  if (r.chamada) {
    ctx.font = `700 40px ${FONTE}`
    const w = Math.min(ctx.measureText(r.chamada).width + 110, larg - 120)
    const fundo = corPedida(r, 'destaque', c[0])
    pilula(ctx, r.chamada, { x: (L - w) / 2, y: y + 46, largura: w, altura: 104, tamanho: 40, fundo, cor: textoSobre(fundo) })
  }
  void story
}

const MODELOS = { promo, aviso, bastidores, manchete, lista, citacao, dividido, foto: fotoInteira, cartao }

export function desenhar(canvas, { formato, modelo, roteiro, cores, logo, foto, nome, tempo = null, total = 8 }) {
  const [L, A] = TAMANHOS[formato] || TAMANHOS.post
  canvas.width = L
  canvas.height = A
  const ctx = canvas.getContext('2d')
  const base = [cores[0] || '#7B5CFF', cores[1] || cores[0] || '#A28BFF', cores[2] || cores[1] || cores[0] || '#5B3FE0']
  const c = [corPedida(roteiro, 'destaque', base[0]), base[1], base[2]]
  ctx.clearRect(0, 0, L, A)
  relogio = tempo === null ? null : { t: tempo, total, ordem: 0 }
  try {
    ;(MODELOS[modelo] || aviso)(ctx, { L, A, story: formato === 'story', c, r: roteiro, logo, foto, nome })
  } finally {
    relogio = null
  }
}

export function paraArquivo(canvas, nome) {
  return new Promise((ok) => canvas.toBlob((blob) => ok(new File([blob], nome, { type: 'image/png' })), 'image/png'))
}

// Catorze layouts novos (Brenno, 04/11), nascidos de estilos da biblioteca Lemo e feitos em código como os outros:
// seis parados com a foto no centro, quatro animados com foto e quatro só com as cores da marca.
// Cada um lê o relógio do desenhar(); sem relógio (miniatura, histórico, menos movimento) sai o último quadro.
// Só opacidade, deslocamento e escala, mais traços que se desenham e textos que se digitam. Nada gira.
// Sem foto, os que pedem foto desenham a placa da marca no lugar dela.

export const NOMES_DOS_ESTILOS = {
  dossie: 'Dossiê', suica: 'Grade suíça', lupa: 'Lupa', caderno: 'Caderno', deco: 'Art déco', popup: 'Pop-up',
  tarja: 'Legenda que bate', mira: 'Mira', maquete: 'Maquete', lancamento: 'Lançamento',
  lousa: 'Lousa', terminal: 'Terminal', pictograma: 'Pictograma', memphis: 'Memphis',
}
export const PARADOS_DA_FOTO_NOVOS = ['dossie', 'suica', 'lupa', 'caderno', 'deco', 'popup']
export const ANIMADOS_DA_FOTO_NOVOS = ['tarja', 'mira', 'maquete', 'lancamento']
// Sem foto: Lousa e Memphis são parados; Terminal e Pictograma só fazem sentido andando.
export const PARADOS_DA_MARCA_NOVOS = ['lousa', 'memphis']
export const ANIMADOS_DA_MARCA_NOVOS = ['terminal', 'pictograma']

const MONO = '"JetBrains Mono", ui-monospace, monospace'
const MAO = 'Caveat, "Comic Sans MS", cursive'
const limitar = (x) => Math.min(1, Math.max(0, x))

export function criarEstilos(k) {
  const {
    bloco, medir, selo, rotulo, arredondado, pilulaCurta, chamadaEmTexto, placaDaMarca, brilho, quebrar, espacar,
    corPedida, fundoPedido, apagado, textoSobre, comAlfa, misturar, legivel, luz, marca, escala, sobre,
    fonteDoBloco, FONTE, suave, sorteio, recorte, fotoEmZoom, escuroEmbaixo, textoNoPe, semRelogio,
  } = k

  const agora = () => (k.relogio() ? k.relogio().t : 1e3)
  const parado = () => !k.relogio()
  const ir = (ini, dur) => suave((agora() - ini) / dur)
  const reto = (ini, dur) => limitar((agora() - ini) / dur)
  const aos = (s) => k.aos(s)
  const medidas = ({ L, story }) => ({ m: 80, topo: story ? 230 : 70, base: story ? 330 : 80, larg: L - 160 })
  const brilhante = (cor) => (luz(cor) < 0.25 ? misturar(cor, '#FFFFFF', 0.45) : cor)

  function com(ctx, { a = 1, dx = 0, dy = 0, s = 1, sx = s, sy = s, cx = 0, cy = 0 }, desenho) {
    if (a <= 0.001) return
    ctx.save()
    ctx.globalAlpha *= Math.min(1, a)
    ctx.translate(dx, dy)
    if (sx !== 1 || sy !== 1) {
      ctx.translate(cx, cy)
      ctx.scale(sx, sy)
      ctx.translate(-cx, -cy)
    }
    desenho()
    ctx.restore()
  }
  // Estala: cresce até passar um pouco do tamanho e assenta (de `de` a 1).
  function estalo(ini, dur = 0.48, de = 1.3) {
    const p = (agora() - ini) / dur
    if (p <= 0) return { a: 0, s: de }
    if (p >= 1) return { a: 1, s: 1 }
    return { a: limitar(p / 0.5), s: de + (1 - de) * suave(p) }
  }
  // Logo que entra numa hora escolhida.
  // Altura que um bloco de texto vai ocupar, sem desenhar.
  const alturaDe = (ctx, texto, op) => (texto ? medir(ctx, texto, op) : 0)
  const entre2 = (v, min, max) => Math.max(min, Math.min(max, v))
  function seloDepois(ctx, ini, opcoes) {
    if (parado()) return selo(ctx, opcoes)
    const p = ir(ini, 0.6)
    com(ctx, { a: p, dy: (1 - p) * 14 }, () => semRelogio(() => selo(ctx, opcoes)))
  }
  // A foto num retângulo; sem foto, a placa da marca com o nome.
  function quadro(ctx, a, x, y, l, h, zoom = 1, fx = 0.5, fy = 0.5) {
    if (a.foto) return recorte(ctx, a.foto, x, y, l, h, zoom, fx, fy)
    placaDaMarca(ctx, x, y, l, h, a.c[0], a.c[2], a.c[1])
  }
  function caixaComSombra(ctx, x, y, l, h, { cor = '#FFFFFF', sombra = 'rgba(40,30,10,.25)', blur = 30, dy = 18, raio = 0 } = {}) {
    ctx.save()
    ctx.shadowColor = sombra
    ctx.shadowBlur = blur
    ctx.shadowOffsetY = dy
    ctx.fillStyle = cor
    if (raio) { arredondado(ctx, x, y, l, h, raio); ctx.fill() } else ctx.fillRect(x, y, l, h)
    ctx.restore()
  }
  // Texto numa linha só, diminuindo até caber.
  function linhaQueCabe(ctx, texto, { x, y, largura, tamanho, minimo = 24, fonte, cor, alinhar = 'left', espaco = 0 }) {
    let t = tamanho
    espacar(ctx, espaco)
    ctx.font = fonte(t)
    while (t > minimo && ctx.measureText(texto).width > largura) ctx.font = fonte((t -= 2))
    ctx.fillStyle = cor
    ctx.textAlign = alinhar
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(texto, x, y, largura)
    espacar(ctx, 0)
    return t
  }
  const curto = (texto, n) => String(texto || '').split(/\s+/).filter(Boolean).slice(0, n).join(' ')
  // Pontos curtos que o layout usa como bilhete, carimbo ou rótulo; sem pontos, os nomes dos itens.
  const notas = (r) => (r.pontos?.length ? r.pontos : (r.itens || []).map((i) => i.nome)).map((p) => String(p || '').trim()).filter(Boolean)

  // ---------- Parados com foto ----------

  // Dossiê: a foto presa num papel de arquivo, um carimbo e a manchete pesada com sombra deslocada.
  function dossie(ctx, a) {
    const { L, A, story, c, r, logo, nome } = a
    const { m, topo, base } = medidas(a)
    const papel = misturar('#EEE5D2', c[0], 0.05)
    ctx.fillStyle = papel
    ctx.fillRect(0, 0, L, A)
    sobre(papel)
    const tinta = '#2A2118', tinta2 = '#5B4A35'
    const vermelho = legivel(c[0], '#111114')
    rotulo(ctx, `Ficha · ${nome || 'registro'}`, { x: m, y: topo + 26, tamanho: 26, cor: tinta2 })
    ctx.fillStyle = tinta
    ctx.fillRect(m, topo + 46, L - m * 2, 4)
    // Pontos em retícula no canto, na cor da marca.
    ctx.fillStyle = comAlfa(c[0], 0.85)
    for (let y = topo + 90; y < topo + 620; y += 22) {
      for (let x = L - 380; x < L; x += 22) {
        const f = limitar(1 - Math.hypot(L - x, y - topo - 90) / 520)
        if (f > 0.02) { ctx.beginPath(); ctx.arc(x, y, 9 * f, 0, Math.PI * 2); ctx.fill() }
      }
    }
    const tOp = { x: m, largura: L - m * 2, tamanho: Math.round(100 * escala(r)), maxLinhas: 3, entre: 0.98 }
    const aOp = { x: m, largura: L - m * 2 - 260, tamanho: 34, peso: 400, maxLinhas: 2, entre: 1.3 }
    const fx = m, fy = topo + 86, fl = Math.round(L * 0.56)
    const textos = 50 + alturaDe(ctx, r.titulo, tOp) + (r.apoio ? 18 + alturaDe(ctx, r.apoio, aOp) : 0) + (r.chamada ? 64 : 0)
    const fh = Math.round(entre2(A - base - fy - textos - 10, 460, story ? 980 : 700))
    const pf = ir(0.2, 0.7)
    com(ctx, { a: pf, dy: (1 - pf) * 40 }, () => {
      caixaComSombra(ctx, fx, fy, fl, fh)
      quadro(ctx, a, fx + 22, fy + 22, fl - 44, fh - 92)
      ctx.font = `600 26px ${MONO}`
      ctx.fillStyle = tinta2
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText('registro 01', fx + 24, fy + fh - 26)
      // Clipe de papel.
      ctx.strokeStyle = '#8A8F96'
      ctx.lineWidth = 7
      arredondado(ctx, fx + 80, fy - 32, 46, 110, 23)
      ctx.stroke()
    })
    // Carimbo.
    const texto = curto(notas(r)[0] || r.arte?.destaque || 'novo', 3).toUpperCase()
    const cx0 = fx + fl + 30, cw = L - m + 20 - cx0, cy0 = fy + (story ? 380 : 220)
    const e = estalo(1.1, 0.42, 1.6)
    com(ctx, { a: e.a * 0.9, s: e.s, cx: cx0 + cw / 2, cy: cy0 + 70 }, () => {
      ctx.strokeStyle = vermelho
      ctx.lineWidth = 6
      ctx.strokeRect(cx0, cy0, cw, 150)
      ctx.lineWidth = 2
      ctx.strokeRect(cx0 + 12, cy0 + 12, cw - 24, 126)
      const linhas = (() => { ctx.font = fonteDoBloco(700, 64, 64); return quebrar(ctx, texto, cw - 50).slice(0, 2) })()
      const t = linhas.length > 1 ? 46 : 60
      linhas.forEach((l, i) => linhaQueCabe(ctx, l, { x: cx0 + cw / 2, y: cy0 + 75 + (i - (linhas.length - 1) / 2) * t * 1.05 + t * 0.35, largura: cw - 50, tamanho: t, fonte: (s) => fonteDoBloco(700, s, 64), cor: vermelho, alinhar: 'center' }))
    })
    // Manchete com a sombra deslocada na cor da marca.
    aos(0.9)
    ctx.save()
    ctx.shadowColor = comAlfa(c[0], 0.55)
    ctx.shadowOffsetX = 6
    ctx.shadowOffsetY = 5
    let y = bloco(ctx, r.titulo, { ...tOp, y: fy + fh + 50, cor: corPedida(r, 'titulo', tinta), ...marca(r, vermelho) })
    ctx.restore()
    y = bloco(ctx, r.apoio, { ...aOp, y: y + 18, cor: corPedida(r, 'texto', tinta2) })
    chamadaEmTexto(ctx, r, { x: m, y: Math.min(A - base, y + 64), largura: L - m * 2 - 260, alinhar: 'left', cor: vermelho, tamanho: 36 })
    seloDepois(ctx, 2.2, { logo, nome, x: L - m, y: A - base - 70, altura: 52, alinhar: 'right', claro: false })
  }

  // Grade suíça: colunas finas, a foto num módulo, um bloco na cor de sinal e tipografia única.
  function suica(ctx, a) {
    const { L, A, story, c, r, logo, nome } = a
    const { base } = medidas(a)
    const fundo = '#F6F6F2'
    ctx.fillStyle = fundo
    ctx.fillRect(0, 0, L, A)
    sobre(fundo)
    ctx.fillStyle = 'rgba(0,0,0,.08)'
    for (let x = L / 6; x < L; x += L / 6) ctx.fillRect(Math.round(x) - 1, 0, 1, A)
    const tinta = '#111114'
    const sinal = fundoPedido(r, c[0])
    const fh = story ? Math.round(A * 0.5) : 900, fl = Math.round(L * 2 / 3)
    const pf = ir(0.15, 0.7)
    com(ctx, { a: pf, dx: -(1 - pf) * 60 }, () => quadro(ctx, a, 0, 0, fl, fh))
    const sh = Math.round(fh * 0.6)
    const ps = ir(0.5, 0.6)
    com(ctx, { a: ps, dy: -(1 - ps) * 60 }, () => {
      ctx.fillStyle = sinal
      ctx.fillRect(fl, 0, L - fl, sh)
      const tSinal = textoSobre(sinal)
      ctx.font = `600 24px ${MONO}`
      espacar(ctx, 3)
      ctx.fillStyle = tSinal
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(String(nome || '').toUpperCase().slice(0, 18), fl + 36, 64, L - fl - 60)
      espacar(ctx, 0)
      const grande = String(r.numero || curto(r.arte?.destaque, 1) || 'Nº1').trim()
      linhaQueCabe(ctx, grande, { x: fl + 28, y: sh - 40, largura: L - fl - 56, tamanho: 200, minimo: 60, fonte: (s) => `700 ${s}px ${FONTE}`, cor: tSinal, espaco: -4 })
    })
    sobre(fundo)
    aos(0.9)
    bloco(ctx, r.apoio, { x: fl + 24, y: sh + 40, largura: L - fl - 56, tamanho: 26, peso: 400, maxLinhas: 7, entre: 1.35, cor: corPedida(r, 'texto', '#222228') })
    aos(1.3)
    const y = bloco(ctx, r.titulo, { x: 40, y: fh + 44, largura: L - 80, tamanho: Math.round(108 * escala(r)), maxLinhas: 3, entre: 0.95, cor: corPedida(r, 'titulo', tinta), ...marca(r, legivel(sinal, tinta)) })
    if (r.chamada && story) pilulaCurta(ctx, r, { x: 40, y: Math.min(y + 40, A - base - 200), largura: L - 80, fundo: tinta, cor: '#FFFFFF' })
    // Rodapé: régua e três rótulos.
    const yr = A - (story ? base : 40) - 52
    const pr = ir(2.0, 0.7)
    ctx.fillStyle = tinta
    ctx.fillRect(40, yr, (L - 80) * pr, 3)
    if (pr > 0.3) {
      com(ctx, { a: (pr - 0.3) / 0.7 }, () => {
        ctx.font = `600 24px ${MONO}`
        espacar(ctx, 2)
        ctx.textBaseline = 'alphabetic'
        ctx.fillStyle = tinta
        ctx.textAlign = 'left'
        ctx.fillText(String(nome || '').toUpperCase().slice(0, 20), 40, yr + 40)
        ctx.textAlign = 'right'
        ctx.fillText(String((story ? '' : r.chamada) || '').toUpperCase().slice(0, 26), L - 40, yr + 40)
        espacar(ctx, 0)
      })
    }
    seloDepois(ctx, 2.4, { logo, nome, x: 40, y: 40, altura: 52, claro: true })
  }

  // Lupa: a foto como um slide na mesa de luz e uma lupa ampliando o detalhe.
  function lupa(ctx, a) {
    const { L, A, story, c, r, logo, nome } = a
    const { m, topo, base } = medidas(a)
    const g = ctx.createRadialGradient(L / 2, A * 0.4, 0, L / 2, A * 0.4, A * 0.8)
    g.addColorStop(0, '#FCFBF7')
    g.addColorStop(1, '#D6D9DE')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, L, A)
    sobre('#EEEFF0')
    const tinta = '#1E222A'
    const tOp = { x: m - 10, largura: L - m * 2 - 120, tamanho: Math.round(68 * escala(r)), maxLinhas: 3, entre: 1.02 }
    const aOp = { x: m - 10, largura: L - m * 2, tamanho: 36, peso: 400, maxLinhas: 2, entre: 1.3 }
    const sx = 150, sy = topo + 50, sl = 780
    const textos = 44 + alturaDe(ctx, r.titulo, tOp) + (story && r.apoio ? 18 + alturaDe(ctx, r.apoio, aOp) : 0) + (r.chamada ? 70 : 20)
    const sh = Math.round(entre2(A - base - sy - textos, 560, story ? 1120 : 860))
    const fx = sx + 34, fy = sy + 34, fl = sl - 68, fh = sh - 130
    const pf = ir(0.15, 0.7)
    com(ctx, { a: pf, dy: (1 - pf) * 30 }, () => {
      caixaComSombra(ctx, sx, sy, sl, sh, { cor: '#F7F4EC', sombra: 'rgba(30,40,60,.24)', blur: 40, dy: 22 })
      quadro(ctx, a, fx, fy, fl, fh)
      ctx.font = `600 26px ${MONO}`
      ctx.fillStyle = '#556'
      ctx.textBaseline = 'alphabetic'
      ctx.textAlign = 'left'
      ctx.fillText('Nº 01', sx + 36, sy + sh - 34)
      ctx.textAlign = 'right'
      ctx.fillText(curto(notas(r)[0] || nome, 3).toLowerCase(), sx + sl - 36, sy + sh - 34, sl - 200)
    })
    // A lupa chega de fora e amplia o ponto embaixo dela.
    const pl = ir(1.0, 0.9)
    const raio = 210
    const lx = fx + fl * 0.72 + (1 - pl) * 260, ly = fy + fh * 0.7 + (1 - pl) * 120
    com(ctx, { a: pl }, () => {
      ctx.save()
      ctx.strokeStyle = '#1F2228'
      ctx.lineCap = 'round'
      ctx.lineWidth = 52
      ctx.beginPath()
      ctx.moveTo(lx + raio * 0.72, ly + raio * 0.72)
      ctx.lineTo(lx + raio * 1.45, ly + raio * 1.45)
      ctx.stroke()
      ctx.shadowColor = 'rgba(0,0,0,.35)'
      ctx.shadowBlur = 50
      ctx.shadowOffsetY = 30
      ctx.fillStyle = '#1F2228'
      ctx.beginPath()
      ctx.arc(lx, ly, raio + 22, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      ctx.save()
      ctx.beginPath()
      ctx.arc(lx, ly, raio, 0, Math.PI * 2)
      ctx.clip()
      ctx.fillStyle = '#F7F4EC'
      ctx.fillRect(lx - raio, ly - raio, raio * 2, raio * 2)
      const z = 2.3
      ctx.translate(lx, ly)
      ctx.scale(z, z)
      ctx.translate(-lx, -ly)
      semRelogio(() => quadro(ctx, a, fx, fy, fl, fh))
      ctx.restore()
      const b = ctx.createRadialGradient(lx - raio * 0.35, ly - raio * 0.4, 0, lx - raio * 0.35, ly - raio * 0.4, raio)
      b.addColorStop(0, 'rgba(255,255,255,.42)')
      b.addColorStop(0.5, 'rgba(255,255,255,0)')
      ctx.fillStyle = b
      ctx.beginPath()
      ctx.arc(lx, ly, raio, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#4A4F58'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(lx, ly, raio + 20, 0, Math.PI * 2)
      ctx.stroke()
    })
    aos(1.6)
    const y = bloco(ctx, r.titulo, { ...tOp, y: sy + sh + 44, cor: corPedida(r, 'titulo', tinta), ...marca(r, legivel(c[0], tinta)) })
    if (story) bloco(ctx, r.apoio, { ...aOp, y: y + 18, cor: corPedida(r, 'texto', apagado(tinta)) })
    chamadaEmTexto(ctx, r, { x: m - 10, y: A - base + (story ? 0 : 10), largura: L - m * 2 - 260, alinhar: 'left', cor: legivel(c[0], tinta), tamanho: 34 })
    seloDepois(ctx, 2.4, { logo, nome, x: L - m, y: A - base - 60, altura: 48, alinhar: 'right', claro: false })
  }

  // Caderno: página de caderno com mancha de aquarela, a foto de borda solta e um bilhete à mão.
  function caderno(ctx, a) {
    const { L, A, story, c, r, logo, nome } = a
    const { m, topo, base } = medidas(a)
    const fundo = '#F7F2E7'
    ctx.fillStyle = fundo
    ctx.fillRect(0, 0, L, A)
    sobre(fundo)
    const tinta = '#2B211B'
    const tOp = { x: 110, largura: L - 220, tamanho: Math.round(90 * escala(r)), maxLinhas: 3, entre: 0.98 }
    const fx = 90, fy = topo + 90, fl = 720
    const fh = Math.round(entre2(A - base - fy - 64 - alturaDe(ctx, r.titulo, tOp) - ((r.chamada || r.apoio) ? 60 : 0), 520, story ? 1000 : 760))
    // Aquarela: duas manchas que se espalham no começo.
    const pa = ir(0.1, 1.2)
    com(ctx, { a: pa, s: 0.8 + 0.2 * pa, cx: fx + fl / 2, cy: fy + fh / 2 }, () => {
      brilho(ctx, fx + fl * 0.45, fy + fh * 0.5, fl * 0.75, c[1], 0.5)
      brilho(ctx, fx + fl * 0.95, fy + fh * 0.78, fl * 0.45, c[0], 0.32)
    })
    // Borda solta: um contorno que ondula de leve.
    const borda = () => {
      ctx.beginPath()
      const pts = []
      const n = 10
      for (let i = 0; i < n; i++) pts.push([fx + (fl * i) / n, fy + (sorteio(i, 1) - 0.5) * 26])
      for (let i = 0; i < n; i++) pts.push([fx + fl + (sorteio(i, 2) - 0.5) * 22, fy + (fh * i) / n])
      for (let i = 0; i < n; i++) pts.push([fx + fl - (fl * i) / n, fy + fh + (sorteio(i, 3) - 0.5) * 26])
      for (let i = 0; i < n; i++) pts.push([fx + (sorteio(i, 4) - 0.5) * 22, fy + fh - (fh * i) / n])
      ctx.moveTo(pts[0][0], pts[0][1])
      pts.forEach(([x, y], i) => {
        const [nx, ny] = pts[(i + 1) % pts.length]
        ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2)
      })
      ctx.closePath()
    }
    const pf = ir(0.3, 0.8)
    com(ctx, { a: pf, dy: (1 - pf) * 26 }, () => {
      ctx.save()
      borda()
      ctx.clip()
      quadro(ctx, a, fx - 20, fy - 20, fl + 40, fh + 40)
      ctx.restore()
    })
    // Bilhete à mão e a seta que aponta a foto.
    const bilhete = curto(notas(r)[0], 4)
    if (bilhete) {
      const pb = ir(1.2, 0.6)
      com(ctx, { a: pb }, () => {
        ctx.font = `700 64px ${MAO}`
        ctx.fillStyle = tinta
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
        const linhas = quebrar(ctx, bilhete, L - fx - fl - 24).slice(0, 3)
        linhas.forEach((l, i) => linhaQueCabe(ctx, l, { x: fx + fl + 26, y: fy + 140 + i * 60, largura: L - fx - fl - 50, tamanho: 64, minimo: 34, fonte: (s) => `700 ${s}px ${MAO}`, cor: tinta }))
      })
      const ps = reto(1.6, 0.6)
      if (ps > 0) {
        ctx.save()
        ctx.strokeStyle = tinta
        ctx.lineWidth = 7
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        const comp = 320
        ctx.setLineDash([comp, comp])
        ctx.lineDashOffset = comp * (1 - ps)
        const ax = fx + fl + 120, ay = fy + 140 + 60 * 2 + 20
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.bezierCurveTo(ax + 20, ay + 100, ax - 30, ay + 160, fx + fl - 10, ay + 200)
        ctx.stroke()
        ctx.setLineDash([])
        if (ps > 0.9) {
          ctx.beginPath()
          ctx.moveTo(fx + fl + 18, ay + 168)
          ctx.lineTo(fx + fl - 12, ay + 202)
          ctx.lineTo(fx + fl + 32, ay + 212)
          ctx.stroke()
        }
        ctx.restore()
      }
    }
    aos(1.0)
    const y = bloco(ctx, r.titulo, { ...tOp, y: fy + fh + 64, cor: corPedida(r, 'titulo', tinta), ...marca(r, legivel(c[0], tinta)) })
    // O apoio vem escrito à mão, na cor da marca.
    const apoio = r.chamada || r.apoio
    if (apoio) {
      const pa2 = ir(2.2, 0.6)
      com(ctx, { a: pa2, dy: (1 - pa2) * 14 }, () => linhaQueCabe(ctx, apoio, { x: fx + 22, y: Math.min(A - base + 10, y + 70), largura: L - fx * 2 - 300, tamanho: 48, fonte: (s) => `700 ${s}px ${MAO}`, cor: legivel(c[0], tinta) }))
    }
    seloDepois(ctx, 2.4, { logo, nome, x: L - m, y: A - base - 60, altura: 48, alinhar: 'right', claro: false })
  }

  // Art déco: a foto num arco com fios dourados, tudo simétrico num eixo central, sobre o preto.
  function deco(ctx, a) {
    const { L, A, story, c, r, logo, nome } = a
    const { m, topo, base } = medidas(a)
    const fundo = '#0D0B09'
    ctx.fillStyle = fundo
    ctx.fillRect(0, 0, L, A)
    sobre(fundo)
    const ouro = brilhante(legivel(c[1], '#FFFFFF'))
    const ouroClaro = misturar(ouro, '#FFFFFF', 0.35)
    const tOp = { x: m, largura: L - m * 2, tamanho: Math.round(84 * escala(r)), maxLinhas: 2, entre: 1.05, alinhar: 'center' }
    espacar(ctx, 10)
    const tH = alturaDe(ctx, String(r.titulo || '').toUpperCase(), tOp)
    espacar(ctx, 0)
    const al = 600, ax = (L - al) / 2, ay = topo + 80
    // Embaixo do arco: ornamento, título, apoio, chamada (só no story) e o selo.
    const pe = 60 + 56 + tH + (r.apoio ? 54 : 0) + (story && r.chamada ? 80 : 0) + 50 + 80
    const ah = Math.round(entre2(A - base - ay - pe, 520, story ? 1060 : 760))
    const arco = (folga) => {
      ctx.beginPath()
      ctx.moveTo(ax - folga, ay + ah + folga)
      ctx.lineTo(ax - folga, ay + al / 2)
      ctx.arc(L / 2, ay + al / 2, al / 2 + folga, Math.PI, 0)
      ctx.lineTo(ax + al + folga, ay + ah + folga)
      ctx.closePath()
    }
    // Raios saindo do pé do arco.
    const pr = ir(0.1, 1.4)
    if (pr > 0) {
      ctx.save()
      const ox = L / 2, oy = ay + ah
      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, 1000)
      g.addColorStop(0, comAlfa(ouro, 0.28 * pr))
      g.addColorStop(1, comAlfa(ouro, 0))
      ctx.strokeStyle = g
      ctx.lineWidth = 3
      for (let i = 0; i <= 28; i++) {
        const ang = Math.PI + (Math.PI * i) / 28
        ctx.beginPath()
        ctx.moveTo(ox, oy)
        ctx.lineTo(ox + Math.cos(ang) * 1100 * pr, oy + Math.sin(ang) * 1100 * pr)
        ctx.stroke()
      }
      ctx.restore()
    }
    ctx.fillStyle = ouro
    ctx.fillRect(L / 2 - 1, topo - 30, 2, 80 * ir(0.4, 0.6))
    const pf = ir(0.3, 0.9)
    com(ctx, { a: pf, s: 1.04 - 0.04 * pf, cx: L / 2, cy: ay + ah / 2 }, () => {
      ctx.save()
      arco(0)
      ctx.clip()
      quadro(ctx, a, ax, ay, al, ah)
      ctx.restore()
      ctx.strokeStyle = ouro
      ctx.lineWidth = 4
      arco(12)
      ctx.stroke()
      ctx.strokeStyle = comAlfa(ouro, 0.6)
      ctx.lineWidth = 2
      arco(28)
      ctx.stroke()
    })
    // Ornamento: dois fios e um losango no eixo.
    const yo = ay + ah + 60
    const po = ir(1.0, 0.7)
    ctx.save()
    const fio = (x0, x1) => {
      const g = ctx.createLinearGradient(x0, 0, x1, 0)
      g.addColorStop(0, comAlfa(ouro, 0))
      g.addColorStop(1, ouro)
      ctx.fillStyle = g
      ctx.fillRect(Math.min(x0, x1), yo - 1, Math.abs(x1 - x0), 2)
    }
    fio(L / 2 - 40 - 330 * po, L / 2 - 40)
    fio(L / 2 + 40 + 330 * po, L / 2 + 40)
    ctx.globalAlpha *= po
    ctx.strokeStyle = ouro
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(L / 2, yo - 22); ctx.lineTo(L / 2 + 22, yo); ctx.lineTo(L / 2, yo + 22); ctx.lineTo(L / 2 - 22, yo); ctx.closePath()
    ctx.stroke()
    ctx.restore()
    aos(1.3)
    espacar(ctx, 10)
    const y = bloco(ctx, String(r.titulo || '').toUpperCase(), { ...tOp, y: yo + 56, cor: corPedida(r, 'titulo', ouroClaro), ...marca(r, ouro) })
    espacar(ctx, 0)
    if (r.apoio) {
      const pa = ir(2.1, 0.6)
      com(ctx, { a: pa }, () => linhaQueCabe(ctx, String(r.apoio).toUpperCase(), { x: L / 2, y: y + 54, largura: L - m * 2, tamanho: 28, minimo: 18, fonte: (s) => `600 ${s}px ${FONTE}`, cor: comAlfa(ouro, 0.9), alinhar: 'center', espaco: 8 }))
    }
    const yFim = (r.apoio ? y + 54 : y)
    if (story) chamadaEmTexto(ctx, r, { x: m, y: yFim + 80, largura: L - m * 2, alinhar: 'center', cor: ouro, tamanho: 36 })
    seloDepois(ctx, 2.4, { logo, nome, x: L / 2, y: A - base - 80, altura: 44, alinhar: 'center', claro: true })
  }

  // Pop-up: a foto recortada com borda branca salta de um livro de papel aberto.
  function popup(ctx, a) {
    const { L, A, story, c, r, logo, nome } = a
    const { m, topo, base } = medidas(a)
    const papel = misturar('#FFFFFF', c[1], 0.16)
    ctx.fillStyle = papel
    ctx.fillRect(0, 0, L, A)
    const chaoY = story ? A * 0.56 : A * 0.6
    ctx.fillStyle = misturar(papel, c[1], 0.14)
    ctx.fillRect(0, chaoY, L, A - chaoY)
    ctx.fillStyle = misturar(papel, '#000000', 0.1)
    ctx.fillRect(L / 2 - 4, 0, 8, chaoY)
    sobre(misturar(papel, c[1], 0.14))
    const tinta = luz(misturar(c[0], '#000000', 0.55)) < 0.12 ? misturar(c[0], '#000000', 0.55) : '#181818'
    // Recortes de papel: duas nuvens e duas estrelas, com borda branca.
    const nuvem = (x, y, l, h, cor, ini) => {
      const e = estalo(ini, 0.45, 0.4)
      com(ctx, { a: e.a, s: e.s, cx: x + l / 2, cy: y + h }, () => {
        arredondado(ctx, x, y, l, h, h / 2)
        ctx.fillStyle = '#FFFFFF'
        ctx.fill()
        arredondado(ctx, x + 12, y + 12, l - 24, h - 24, (h - 24) / 2)
        ctx.fillStyle = cor
        ctx.fill()
      })
    }
    const estrela = (cx, cy, raio, ini) => {
      const e = estalo(ini, 0.45, 0.3)
      com(ctx, { a: e.a, s: e.s, cx, cy }, () => {
        ctx.beginPath()
        for (let i = 0; i < 10; i++) {
          const rr = i % 2 ? raio * 0.42 : raio
          const ang = -Math.PI / 2 + (i * Math.PI) / 5
          ctx.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr)
        }
        ctx.closePath()
        ctx.fillStyle = c[1]
        ctx.fill()
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 8
        ctx.stroke()
      })
    }
    nuvem(40, topo, 230, 110, c[0], 1.2)
    nuvem(L - 230, topo + 30, 180, 90, c[1], 1.35)
    // A foto sobe da dobra, como num livro que abre.
    const fx = 150, fl = L - 300, fh = story ? 760 : 600, fy = chaoY - fh - 10
    const p = parado() ? 1 : (() => {
      const q = (agora() - 0.3) / 0.7
      if (q <= 0) return 0
      if (q >= 1) return 1
      return q < 0.7 ? 1.06 * suave(q / 0.7) : 1.06 - 0.06 * suave((q - 0.7) / 0.3)
    })()
    com(ctx, { a: limitar(p * 3), sy: Math.max(0.02, p), cx: L / 2, cy: chaoY }, () => {
      caixaComSombra(ctx, fx - 20, fy - 20, fl + 40, fh + 40, { sombra: 'rgba(90,50,20,.28)', blur: 50, dy: 30 })
      quadro(ctx, a, fx, fy, fl, fh)
      ctx.fillStyle = misturar('#FFFFFF', c[1], 0.1)
      ctx.beginPath()
      ctx.moveTo(L / 2 - 70, chaoY - 10); ctx.lineTo(L / 2 + 70, chaoY - 10); ctx.lineTo(L / 2 + 44, chaoY + 50); ctx.lineTo(L / 2 - 44, chaoY + 50); ctx.closePath()
      ctx.fill()
    })
    estrela(110, chaoY - 40, 50, 1.5)
    estrela(L - 130, chaoY - 110, 38, 1.6)
    aos(1.1)
    const y = bloco(ctx, r.titulo, { x: m, y: chaoY + 90, largura: L - m * 2, tamanho: Math.round(88 * escala(r)), maxLinhas: 3, entre: 1.02, alinhar: 'center', cor: corPedida(r, 'titulo', tinta), ...marca(r, legivel(c[0], tinta)) })
    const y2 = bloco(ctx, r.apoio, { x: m, y: y + 18, largura: L - m * 2, tamanho: 34, peso: 600, maxLinhas: 2, entre: 1.3, alinhar: 'center', cor: corPedida(r, 'texto', apagado(tinta, 0.8)) })
    if (story) pilulaCurta(ctx, r, { x: m, y: Math.min(y2 + 50, A - base - 220), largura: L - m * 2, alinhar: 'center', fundo: fundoPedido(r, c[0]), cor: textoSobre(fundoPedido(r, c[0])) })
    seloDepois(ctx, 2.4, { logo, nome, x: L / 2, y: A - base - 50, altura: 48, alinhar: 'center', claro: false })
  }

  // ---------- Animados com foto ----------

  // Legenda que bate: o título em tarjas gigantes que entram uma a uma sobre a foto, como vídeo de notícia sem som.
  function tarja(ctx, a) {
    const { L, A, story, c, r, logo, foto, nome } = a
    const { m, topo, base } = medidas(a)
    if (foto) fotoEmZoom(ctx, foto, 0, 0, L, A, 1.04, 1.12)
    else placaDaMarca(ctx, 0, 0, L, A, c[0], c[2], c[1])
    ctx.fillStyle = 'rgba(8,8,12,.38)'
    ctx.fillRect(0, 0, L, A)
    escuroEmbaixo(ctx, L, A, 0.55)
    // Rótulo do topo com a bolinha piscando.
    const vermelho = fundoPedido(r, c[0])
    ctx.font = `600 28px ${MONO}`
    espacar(ctx, 3)
    const rot = String(nome || 'agora').toUpperCase().slice(0, 22)
    const rw = ctx.measureText(rot).width + 76
    espacar(ctx, 0)
    const pr = ir(0.2, 0.5)
    com(ctx, { a: pr, dx: -(1 - pr) * 30 }, () => {
      ctx.fillStyle = vermelho
      ctx.fillRect(m - 20, topo, rw, 58)
      const pisca = parado() || Math.floor(agora() * 1.6) % 2 === 0
      ctx.fillStyle = textoSobre(vermelho)
      if (pisca) { ctx.beginPath(); ctx.arc(m + 6, topo + 29, 8, 0, Math.PI * 2); ctx.fill() }
      espacar(ctx, 3)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(rot, m + 30, topo + 31)
      espacar(ctx, 0)
    })
    seloDepois(ctx, 0.4, { logo, nome, x: L - m, y: topo - 6, altura: 52, alinhar: 'right', claro: true })
    // As tarjas.
    const palavras = String(r.titulo || '').toUpperCase()
    let t = Math.round((story ? 150 : 140) * escala(r)), linhas
    do {
      ctx.font = fonteDoBloco(700, t, 120)
      linhas = quebrar(ctx, palavras, L - m * 2 - 44)
      t -= 6
    } while (linhas.length > 4 && t > 70)
    t += 6
    const cores = [c[1], '#FFFFFF', c[0], c[2]]
    const passo = t * 1.24
    const fimTexto = A - base - (r.apoio ? 110 : 30) - (r.chamada ? 130 : 0)
    const y0 = fimTexto - passo * linhas.length
    linhas.forEach((l, i) => {
      const e = estalo(0.7 + i * 0.42, 0.36, 1.28)
      const fundo = cores[i % cores.length]
      com(ctx, { a: e.a, s: e.s, cx: m - 20, cy: y0 + i * passo + t * 0.55 }, () => {
        ctx.font = fonteDoBloco(700, t, 120)
        const w = ctx.measureText(l).width
        ctx.fillStyle = fundo
        ctx.fillRect(m - 20, y0 + i * passo, w + 44, t * 1.12)
        ctx.fillStyle = textoSobre(fundo)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(l, m + 2, y0 + i * passo + t * 0.93)
      })
    })
    sobre('#16161B')
    aos(0.7 + linhas.length * 0.42 + 0.3)
    const y = bloco(ctx, r.apoio, { x: m - 18, y: fimTexto + 30, largura: L - m * 2, tamanho: 36, peso: 600, maxLinhas: 2, entre: 1.25, cor: corPedida(r, 'texto', 'rgba(255,255,255,.9)') })
    pilulaCurta(ctx, r, { x: m - 18, y: Math.min(y + 30, A - base - 104), largura: L - m * 2, fundo: '#FFFFFF', cor: '#111114' })
  }

  // Mira: miras travam em partes do produto e cada uma abre um rótulo, como uma análise.
  function mira(ctx, a) {
    const { L, A, story, c, r, logo, foto, nome } = a
    const { m, topo } = medidas(a)
    if (foto) fotoEmZoom(ctx, foto, 0, 0, L, A, 1.1, 1)
    else placaDaMarca(ctx, 0, 0, L, A, c[0], c[2], c[1])
    const g = ctx.createLinearGradient(0, 0, 0, A)
    g.addColorStop(0, 'rgba(10,11,15,.3)')
    g.addColorStop(1, 'rgba(10,11,15,.72)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, L, A)
    const hud = brilhante(legivel(c[1], '#FFFFFF'))
    // Linha de varredura (só no vídeo).
    if (!parado()) {
      const yv = ((agora() % 4) / 4) * A
      ctx.save()
      ctx.shadowColor = hud
      ctx.shadowBlur = 24
      ctx.fillStyle = comAlfa(hud, 0.65)
      ctx.fillRect(0, yv, L, 5)
      ctx.restore()
    }
    ctx.font = `600 26px ${MONO}`
    espacar(ctx, 3)
    ctx.fillStyle = hud
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    ctx.fillText(String(nome || '').toUpperCase().slice(0, 24), m - 20, topo + 30)
    ctx.textAlign = 'right'
    if (parado() || Math.floor(agora() * 1.4) % 2 === 0) ctx.fillText('● REC', L - m + 20, topo + 30)
    espacar(ctx, 0)
    // Até três miras, cada uma com o seu rótulo.
    const rotulos = notas(r).slice(0, 3)
    const alto = story ? 0.42 : 0.4
    const pontos = [[0.3, alto], [0.55, alto + (story ? 0.12 : 0.13)], [0.43, alto - (story ? 0.12 : 0.13)]]
    rotulos.forEach((texto, i) => {
      const [px, py] = pontos[i]
      const x = L * px, y = A * py, lado = 160
      const ini = 0.6 + i * 1.0
      const e = estalo(ini, 0.42, 1.6)
      com(ctx, { a: e.a, s: e.s, cx: x + lado / 2, cy: y + lado / 2 }, () => {
        ctx.strokeStyle = hud
        ctx.lineWidth = 5
        for (const [cx, cy, dx, dy] of [[x, y, 1, 1], [x + lado, y, -1, 1], [x, y + lado, 1, -1], [x + lado, y + lado, -1, -1]]) {
          ctx.beginPath()
          ctx.moveTo(cx, cy + dy * 38)
          ctx.lineTo(cx, cy)
          ctx.lineTo(cx + dx * 38, cy)
          ctx.stroke()
        }
        ctx.fillStyle = hud
        ctx.fillRect(x + lado / 2 - 10, y + lado / 2 - 1, 20, 2)
        ctx.fillRect(x + lado / 2 - 1, y + lado / 2 - 10, 2, 20)
      })
      const pf = ir(ini + 0.4, 0.4)
      if (pf > 0) {
        ctx.fillStyle = hud
        ctx.fillRect(x + lado, y + lado / 2, 110 * pf, 3)
        com(ctx, { a: ir(ini + 0.6, 0.4) }, () => {
          linhaQueCabe(ctx, texto.toUpperCase(), { x: x + lado + 122, y: y + lado / 2 + 11, largura: L - (x + lado + 122) - 24, tamanho: 30, minimo: 18, fonte: (s) => `600 ${s}px ${MONO}`, cor: hud })
        })
      }
    })
    sobre('#16161B')
    seloDepois(ctx, 0.3, { logo, nome, x: L - m, y: A - (story ? 330 : 80) - 60, altura: 44, alinhar: 'right', claro: true })
    textoNoPe(ctx, a, { de: 0.8 + Math.max(1, rotulos.length) * 1.0, fim: A - (story ? 330 : 80) - (r.chamada ? 140 : 90) })
  }

  // Maquete: desfoque em cima e embaixo deixa a foto com cara de miniatura enquanto ela desliza devagar.
  const borradas = new WeakMap()
  function borrada(img) {
    if (borradas.has(img)) return borradas.get(img)
    const cv = document.createElement('canvas')
    cv.width = 64
    cv.height = Math.max(8, Math.round((64 * img.height) / img.width))
    const g = cv.getContext('2d')
    g.imageSmoothingEnabled = true
    g.drawImage(img, 0, 0, cv.width, cv.height)
    borradas.set(img, cv)
    return cv
  }
  function maquete(ctx, a) {
    const { L, A, story, c, r, logo, foto, nome } = a
    const { m, topo, base } = medidas(a)
    if (!foto) return k.modelos().lancamento(ctx, a)
    // A foto cobre a arte com folga de 160 px para andar na horizontal.
    const larg = L + 160
    const e = Math.max(larg / foto.width, A / foto.height)
    const w = foto.width * e, h = foto.height * e
    const p = parado() ? 0.5 : 0.5 - 0.5 * Math.cos(Math.PI * limitar(agora() / k.relogio().total))
    const x0 = (L - w) / 2 + 80 - 160 * p, y0 = (A - h) / 2
    ctx.save()
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(borrada(foto), x0, y0, w, h)
    ctx.restore()
    // Faixa nítida no meio, com bordas que passam do borrado ao nítido em degraus.
    const meio = story ? A * 0.52 : A * 0.5, faixa = A * 0.12
    for (let i = 5; i >= 0; i--) {
      const folga = faixa + i * A * 0.025
      ctx.save()
      ctx.globalAlpha = i === 0 ? 1 : 0.28
      ctx.beginPath()
      ctx.rect(0, meio - folga, L, folga * 2)
      ctx.clip()
      ctx.drawImage(foto, x0, y0, w, h)
      ctx.restore()
    }
    const g = ctx.createLinearGradient(0, 0, 0, A * 0.4)
    g.addColorStop(0, 'rgba(8,8,12,.55)')
    g.addColorStop(1, 'rgba(8,8,12,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, L, A * 0.4)
    sobre('#2A2A30')
    aos(0.6)
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,.5)'
    ctx.shadowBlur = 30
    const y = bloco(ctx, r.titulo, { x: m - 20, y: topo, largura: L - m * 2 + 40, tamanho: Math.round(96 * escala(r)), maxLinhas: 3, entre: 0.98, cor: corPedida(r, 'titulo', '#FFFFFF'), ...marca(r, legivel(c[1], '#FFFFFF')) })
    ctx.restore()
    pilulaCurta(ctx, r, { x: m - 20, y: y + 30, largura: L - m * 2, fundo: fundoPedido(r, c[0]), cor: textoSobre(fundoPedido(r, c[0])), altura: 92, tamanho: 34 })
    // Pino com o apoio no pé.
    if (r.apoio) {
      const pp = ir(2.0, 0.5)
      com(ctx, { a: pp, dy: (1 - pp) * 20 }, () => {
        ctx.font = `700 34px ${FONTE}`
        const texto = curto(r.apoio, 8)
        const tw = Math.min(ctx.measureText(texto).width, L - m * 2 - 340)
        const ph = 84, py = A - base - ph + (story ? 0 : 10)
        arredondado(ctx, m - 20, py, tw + 110, ph, ph / 2)
        ctx.fillStyle = '#FFFFFF'
        ctx.fill()
        const pc = legivel(c[0], '#111114')
        ctx.fillStyle = pc
        ctx.beginPath()
        ctx.arc(m + 30, py + ph / 2 - 6, 14, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(m + 18, py + ph / 2); ctx.lineTo(m + 42, py + ph / 2); ctx.lineTo(m + 30, py + ph / 2 + 20); ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#181818'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(texto, m + 62, py + ph / 2 + 2, tw)
      })
    }
    seloDepois(ctx, 2.3, { logo, nome, x: L - m + 20, y: A - base - 68 + (story ? 0 : 10), altura: 44, alinhar: 'right', claro: true })
  }

  // Lançamento: a foto sobe num cartão de vidro, um brilho passa por ela e o texto encaixa.
  function lancamento(ctx, a) {
    const { L, A, story, c, r, logo, nome } = a
    const { m, topo, base } = medidas(a)
    const fundo = '#0B0A09'
    const g = ctx.createRadialGradient(L / 2, A * 0.3, 0, L / 2, A * 0.3, A * 0.75)
    g.addColorStop(0, misturar(c[0], '#0B0A09', 0.78))
    g.addColorStop(1, fundo)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, L, A)
    ctx.fillStyle = 'rgba(255,255,255,.05)'
    for (let x = 0; x < L; x += 90) ctx.fillRect(x, 0, 1, A)
    for (let y = 0; y < A; y += 90) ctx.fillRect(0, y, L, 1)
    sobre('#141210')
    const luzMarca = brilhante(legivel(c[1], '#FFFFFF'))
    seloDepois(ctx, 0.1, { logo, nome, x: L / 2, y: topo - 20, altura: 52, alinhar: 'center', claro: true })
    const tOp = { x: m, largura: L - m * 2, tamanho: Math.round(76 * escala(r)), maxLinhas: 2, entre: 1.02, alinhar: 'center' }
    const aOp = { x: m, largura: L - m * 2, tamanho: 36, peso: 400, maxLinhas: 2, entre: 1.3, alinhar: 'center' }
    const pe = 60 + alturaDe(ctx, r.titulo, tOp) + (story && r.apoio ? 16 + alturaDe(ctx, r.apoio, aOp) : 0) + (r.chamada ? 36 + 96 : 0) + 10
    const cl = story ? 820 : 740, cx = (L - cl) / 2, cy = topo + 90
    const ch = Math.round(entre2(A - base - cy - pe, 480, story ? 980 : 740))
    const pc = ir(0.35, 0.8)
    com(ctx, { a: pc, dy: (1 - pc) * 80, s: 0.96 + 0.04 * pc, cx: L / 2, cy: cy + ch / 2 }, () => {
      ctx.save()
      ctx.shadowColor = comAlfa(luzMarca, 0.3)
      ctx.shadowBlur = 90
      ctx.shadowOffsetY = 40
      arredondado(ctx, cx, cy, cl, ch, 44)
      ctx.fillStyle = '#000'
      ctx.fill()
      ctx.restore()
      ctx.save()
      arredondado(ctx, cx, cy, cl, ch, 44)
      ctx.clip()
      quadro(ctx, a, cx, cy, cl, ch)
      // O brilho que varre o cartão.
      const pv = reto(1.2, 1.1)
      if (pv > 0 && pv < 1) {
        const bx = cx - 220 + (cl + 440) * suave(pv)
        const b = ctx.createLinearGradient(bx - 110, 0, bx + 110, 0)
        b.addColorStop(0, 'rgba(255,255,255,0)')
        b.addColorStop(0.5, 'rgba(255,255,255,.42)')
        b.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = b
        ctx.fillRect(bx - 110, cy, 220, ch)
      }
      ctx.restore()
      ctx.strokeStyle = 'rgba(255,255,255,.2)'
      ctx.lineWidth = 2
      arredondado(ctx, cx, cy, cl, ch, 44)
      ctx.stroke()
    })
    aos(1.6)
    const y = bloco(ctx, r.titulo, { ...tOp, y: cy + ch + 60, cor: corPedida(r, 'titulo', '#F6EFE3'), ...marca(r, luzMarca) })
    const y2 = story ? bloco(ctx, r.apoio, { ...aOp, y: y + 16, cor: corPedida(r, 'texto', 'rgba(246,239,227,.8)') }) : y
    pilulaCurta(ctx, r, { x: m, y: y2 + 36, largura: L - m * 2, alinhar: 'center', fundo: '#F6EFE3', cor: '#1B1712', altura: 96, tamanho: 36 })
  }

  // ---------- Só com as cores da marca ----------

  // Lousa: o cardápio do dia escrito a giz, uma linha por vez.
  function lousa(ctx, a) {
    const { L, A, story, c, r, logo, nome } = a
    const { m, topo, base } = medidas(a)
    const quadroCor = misturar('#18201B', c[0], 0.1)
    ctx.fillStyle = quadroCor
    ctx.fillRect(0, 0, L, A)
    sobre(quadroCor)
    // Pó de giz, sempre no mesmo lugar.
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.02 + sorteio(i, 5) * 0.05})`
      ctx.fillRect(sorteio(i, 6) * L, sorteio(i, 7) * A, 2 + sorteio(i, 8) * 5, 2 + sorteio(i, 9) * 3)
    }
    brilho(ctx, L * 0.35, A * 0.25, L * 0.8, '#FFFFFF', 0.06)
    ctx.strokeStyle = '#7A5230'
    ctx.lineWidth = 34
    ctx.strokeRect(17, 17, L - 34, A - 34)
    ctx.strokeStyle = '#5B3A20'
    ctx.lineWidth = 6
    ctx.strokeRect(37, 37, L - 74, A - 74)
    const giz = '#F2EFE6'
    const destaque = brilhante(legivel(c[1], '#FFFFFF'))
    const escrever = (texto, x, y, t, cor, alinhar, largura) => linhaQueCabe(ctx, texto, { x, y, largura, tamanho: t, minimo: Math.round(t * 0.6), fonte: (s) => `700 ${s}px ${MAO}`, cor, alinhar })
    // Cada linha aparece da esquerda para a direita, como giz escrevendo.
    const giza = (ini, x, y, l, h, desenho) => {
      const p = reto(ini, 0.6)
      if (p <= 0) return
      ctx.save()
      ctx.beginPath()
      ctx.rect(x, y, l * p, h)
      ctx.clip()
      desenho()
      ctx.restore()
    }
    const yT = topo + 80
    giza(0.3, m, yT - 120, L - m * 2, 150, () => escrever(r.titulo || '', L / 2, yT, Math.round((story ? 130 : 112) * escala(r)), giz, 'center', L - m * 2 - 40))
    if (r.apoio) giza(0.9, m, yT + 10, L - m * 2, 80, () => escrever(curto(r.apoio, 9), L / 2, yT + 72, 46, destaque, 'center', L - m * 2 - 60))
    const linhas = (r.itens?.length ? r.itens : (r.pontos || []).map((p) => ({ nome: p, preco: '' }))).slice(0, story ? 7 : 5)
    const yb0 = A - base - (story ? 20 : 30)
    const y0 = yT + (story ? 220 : 180)
    const livre = yb0 - 150 - y0
    const passo = Math.round(entre2(livre / Math.max(1, linhas.length), story ? 150 : 118, story ? 210 : 190))
    let y = y0 + Math.max(0, livre - passo * linhas.length) * 0.4
    linhas.forEach((item, i) => {
      const ini = 1.4 + i * 0.6
      giza(ini, m, y - 70, L - m * 2, 100, () => {
        ctx.font = `700 46px ${MAO}`
        const pw = item.preco ? ctx.measureText(item.preco).width + 30 : 0
        escrever(item.nome, m + 20, y, 62, giz, 'left', L - m * 2 - 40 - pw - 20)
        if (item.preco) escrever(item.preco, L - m - 20, y, 58, destaque, 'right', pw + 40)
        ctx.fillStyle = 'rgba(242,239,230,.22)'
        for (let x = m + 20; x < L - m - 20; x += 22) ctx.fillRect(x, y + 22, 12, 3)
      })
      y += passo
    })
    const yb = A - base - (story ? 20 : 30)
    if (r.chamada) giza(1.4 + linhas.length * 0.6, m, yb - 70, L / 2, 100, () => escrever(r.chamada, m + 20, yb, 48, giz, 'left', L - m * 2 - 360))
    seloDepois(ctx, 1.6 + linhas.length * 0.6, { logo, nome, x: L - m - 10, y: yb - 64, altura: 48, alinhar: 'right', claro: true })
  }

  // Terminal: o texto digitado num monitor antigo, com brilho de fósforo e cursor piscando.
  function terminal(ctx, a) {
    const { L, A, story, c, r, logo, nome } = a
    const { base } = medidas(a)
    ctx.fillStyle = '#0A0806'
    ctx.fillRect(0, 0, L, A)
    const fos = brilhante(legivel(c[1], '#FFFFFF'))
    const tela = misturar(fos, '#000000', 0.9)
    const g = ctx.createRadialGradient(L / 2, A * 0.45, 0, L / 2, A * 0.45, A * 0.7)
    g.addColorStop(0, tela)
    g.addColorStop(1, '#0A0806')
    arredondado(ctx, 40, 40, L - 80, A - 80, 60)
    ctx.fillStyle = g
    ctx.fill()
    sobre('#100C08')
    // As linhas: o nome, o título em letra grande, o apoio, os itens e a chamada.
    const x0 = 90, largura = L - 180
    const linhas = []
    ctx.font = `600 52px ${MONO}`
    linhas.push({ t: `> ${String(nome || 'olá').toLowerCase()}`, s: 52 })
    linhas.push({ t: '> ...........', s: 52 })
    let tg = Math.round((story ? 120 : 108) * escala(r)), grandes
    do {
      ctx.font = `600 ${tg}px ${MONO}`
      grandes = quebrar(ctx, String(r.titulo || '').toUpperCase(), largura)
      tg -= 6
    } while (grandes.length > (story ? 5 : 4) && tg > 56)
    tg += 6
    grandes.forEach((t) => linhas.push({ t, s: tg, grande: true }))
    const pequenas = (texto) => {
      ctx.font = `600 44px ${MONO}`
      return quebrar(ctx, `> ${texto}`, largura)
    }
    if (r.apoio) pequenas(r.apoio).slice(0, 3).forEach((t) => linhas.push({ t, s: 44 }))
    ;(r.itens?.length ? r.itens.map((i) => `${i.nome}${i.preco ? ` ${i.preco}` : ''}`) : r.pontos || []).slice(0, story ? 4 : 2)
      .forEach((p) => pequenas(p).slice(0, 1).forEach((t) => linhas.push({ t, s: 44 })))
    if (r.chamada) pequenas(r.chamada).slice(0, 2).forEach((t) => linhas.push({ t, s: 44 }))
    // Digitação: 30 letras por segundo a partir de 0,4 s.
    let resta = parado() ? Infinity : Math.max(0, (agora() - 0.4) * 30)
    const teto = story ? 200 : 120, chao = A - base - 40
    const total = linhas.reduce((t, l) => t + l.s * (l.grande ? 1.0 : 1.18), 0)
    let y = teto + Math.max(0, chao - teto - total) * 0.42
    let fimX = x0, fimY = y
    ctx.save()
    ctx.shadowColor = comAlfa(fos, 0.65)
    ctx.shadowBlur = 14
    for (const l of linhas) {
      const alto = l.s * (l.grande ? 1.0 : 1.18)
      if (y + alto > A - base - 40) break
      y += alto
      if (resta <= 0) break
      const mostra = l.t.slice(0, Math.floor(resta))
      resta -= l.t.length
      ctx.font = `600 ${l.s}px ${MONO}`
      ctx.fillStyle = l.grande ? misturar(fos, '#FFFFFF', 0.3) : fos
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(mostra, x0, y)
      fimX = x0 + ctx.measureText(mostra).width + 8
      fimY = y
    }
    if (parado() || Math.floor(agora() * 2) % 2 === 0) {
      ctx.fillStyle = fos
      ctx.fillRect(fimX, fimY - 40, 26, 46)
    }
    ctx.restore()
    // Linhas de varredura.
    ctx.fillStyle = 'rgba(0,0,0,.28)'
    for (let yy = 40; yy < A - 40; yy += 6) ctx.fillRect(40, yy, L - 80, 3)
    seloDepois(ctx, 0.6, { logo, nome, x: L - 90, y: A - base - 40, altura: 48, alinhar: 'right', claro: true })
  }

  // Pictograma: faixas de círculos, meias-luas e quadrados nas cores da marca deslizam no ritmo.
  function pictograma(ctx, a) {
    const { L, A, story, c, r, logo, nome } = a
    const { m, topo, base } = medidas(a)
    const fundo = misturar('#F7F3EA', c[0], 0.03)
    ctx.fillStyle = fundo
    ctx.fillRect(0, 0, L, A)
    sobre(fundo)
    const corA = fundoPedido(r, c[0])
    const corB = luz(c[2]) < 0.3 && Math.abs(luz(c[2]) - luz(corA)) > 0.05 ? c[2] : misturar(c[0], '#000000', 0.7)
    const lado = L / 6
    const padroes = [['c', 'q', 'hd', 'pt', 'c', 'v', 'ln', 'hb'], ['pt', 'hb', 'c', 'q', 'ln', 'c', 'hd', 'v'], ['hd', 'ln', 'q', 'c', 'pt', 'hb', 'q', 'c'], ['v', 'c', 'pt', 'hd', 'q', 'ln', 'c', 'hb']]
    const tOp = { x: m, largura: L - m * 2, tamanho: Math.round(120 * escala(r)), maxLinhas: 3, entre: 0.94 }
    const aOp = { x: m, largura: L * 0.68, tamanho: 36, peso: 400, maxLinhas: 3, entre: 1.3 }
    const pe = (story ? 110 : 70) + alturaDe(ctx, r.titulo, tOp) + (r.apoio ? 26 + alturaDe(ctx, r.apoio, aOp) : 0) + (story && r.chamada ? 50 + 104 : 0) + 100
    let filas = story ? 4 : 3
    while (filas > 1 && topo + filas * lado + pe > A - base) filas--
    const fase = parado() ? 0 : (agora() % 4) / 4
    const anda = fase < 0.5 ? suave(fase * 2) : 1 - suave((fase - 0.5) * 2)
    const celula = (tipo, x, y) => {
      ctx.fillStyle = tipo === 'q' || tipo === 'hd' || tipo === 'pt' ? corB : corA
      ctx.beginPath()
      if (tipo === 'c') { ctx.arc(x + lado / 2, y + lado / 2, lado / 2, 0, Math.PI * 2); ctx.fill() }
      else if (tipo === 'q') ctx.fillRect(x, y, lado, lado)
      else if (tipo === 'hd') { ctx.arc(x + lado / 2, y + lado, lado / 2, Math.PI, 0); ctx.fill() }
      else if (tipo === 'hb') { ctx.arc(x + lado / 2, y, lado / 2, 0, Math.PI); ctx.fill() }
      else if (tipo === 'pt') { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(x + 22 + i * 45, y + 22 + j * 45, 7, 0, Math.PI * 2); ctx.fill() } }
      else if (tipo === 'ln') for (let i = 0; i < 4; i++) ctx.fillRect(x + i * 45, y, 22, lado)
    }
    for (let f = 0; f < filas; f++) {
      const dx = (f % 2 ? -1 : 1) * lado * anda
      const pf = ir(0.2 + f * 0.25, 0.6)
      com(ctx, { a: pf, dx: dx - (1 - pf) * 80 * (f % 2 ? -1 : 1) }, () => {
        padroes[f % padroes.length].forEach((tipo, i) => celula(tipo, -lado + i * lado, topo + f * lado))
      })
    }
    aos(1.1)
    const y = bloco(ctx, r.titulo, { ...tOp, y: topo + filas * lado + (story ? 110 : 70), cor: corPedida(r, 'titulo', corB), ...marca(r, legivel(corA, corB)) })
    const y2 = bloco(ctx, r.apoio, { ...aOp, y: y + 26, cor: corPedida(r, 'texto', corB) })
    if (story) pilulaCurta(ctx, r, { x: m, y: y2 + 50, largura: L - m * 2, fundo: corA, cor: textoSobre(corA) })
    seloDepois(ctx, 2.4, { logo, nome, x: m, y: A - base - 60, altura: 48, claro: false })
  }

  // Memphis: formas coloridas com contorno grosso e sombra chapada em volta de um cartão.
  function memphis(ctx, a) {
    const { L, A, story, c, r, logo, nome } = a
    const { m, topo, base } = medidas(a)
    const fundo = '#FFF7EE'
    ctx.fillStyle = fundo
    ctx.fillRect(0, 0, L, A)
    const tinta = '#1A1A1A'
    const forma = (ini, cx, cy, desenho) => {
      const e = estalo(ini, 0.45, 0.3)
      com(ctx, { a: e.a, s: e.s, cx, cy }, desenho)
    }
    const contorno = (cor, sombra = true) => {
      if (sombra) {
        ctx.save()
        ctx.translate(12, 12)
        ctx.fillStyle = tinta
        ctx.fill()
        ctx.restore()
      }
      ctx.fillStyle = cor
      ctx.fill()
      ctx.lineWidth = 7
      ctx.strokeStyle = tinta
      ctx.stroke()
    }
    forma(0.2, 180, topo + 120, () => { ctx.beginPath(); ctx.arc(180, topo + 120, 100, 0, Math.PI * 2); contorno(c[0]) })
    forma(0.35, 500, topo + 100, () => {
      ctx.fillStyle = tinta
      for (let i = 0; i < 10; i++) for (let j = 0; j < 6; j++) { ctx.beginPath(); ctx.arc(340 + i * 34, topo + 10 + j * 34, 8, 0, Math.PI * 2); ctx.fill() }
    })
    forma(0.5, 880, topo + 110, () => { ctx.beginPath(); ctx.moveTo(880, topo + 10); ctx.lineTo(990, topo + 200); ctx.lineTo(770, topo + 200); ctx.closePath(); contorno(c[1]) })
    // O cartão com o título e o apoio.
    const cx = m, cl = L - m * 2, pad = 60
    const tOp = { x: cx + pad, largura: cl - pad * 2, tamanho: Math.round(100 * escala(r)), maxLinhas: 3, entre: 0.94 }
    const aOp = { x: cx + pad, largura: cl - pad * 2, tamanho: 36, peso: 400, maxLinhas: 3, entre: 1.3 }
    const ch = pad * 2 + medir(ctx, r.titulo, tOp) + (r.apoio ? 28 + medir(ctx, r.apoio, aOp) : 0)
    const cy = topo + (story ? 420 : 320)
    const pc = ir(0.6, 0.6)
    com(ctx, { a: pc, dy: (1 - pc) * 40 }, () => {
      ctx.fillStyle = c[0]
      ctx.fillRect(cx + 18, cy + 18, cl, ch)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(cx, cy, cl, ch)
      ctx.lineWidth = 7
      ctx.strokeStyle = tinta
      ctx.strokeRect(cx, cy, cl, ch)
    })
    sobre('#FFFFFF')
    aos(0.9)
    const y = bloco(ctx, r.titulo, { ...tOp, y: cy + pad, cor: corPedida(r, 'titulo', tinta), ...marca(r, legivel(c[0], tinta)) })
    bloco(ctx, r.apoio, { ...aOp, y: y + 28, cor: corPedida(r, 'texto', '#333338') })
    sobre(fundo)
    const yf = cy + ch + 70
    forma(1.6, 840, yf + 75, () => { ctx.beginPath(); ctx.arc(840, yf + 150, 150, Math.PI, 0); ctx.closePath(); contorno(c[2] === c[0] ? c[1] : c[2]) })
    forma(1.75, 300, yf + 60, () => {
      ctx.fillStyle = tinta
      ctx.beginPath()
      for (let i = 0; i < 9; i++) { ctx.moveTo(m + i * 56, yf + 40); ctx.lineTo(m + i * 56 + 28, yf + 80); ctx.lineTo(m + i * 56 + 56, yf + 40) }
      ctx.lineWidth = 8
      ctx.strokeStyle = tinta
      ctx.stroke()
    })
    if (r.chamada) pilulaCurta(ctx, r, { x: m, y: A - base - 100, largura: L - m * 2 - 320, fundo: tinta, cor: '#FFFFFF', altura: 92, tamanho: 34 })
    seloDepois(ctx, 2.2, { logo, nome, x: L - m, y: A - base - 70, altura: 48, alinhar: 'right', claro: false })
  }

  return { dossie, suica, lupa, caderno, deco, popup, tarja, mira, maquete, lancamento, lousa, terminal, pictograma, memphis }
}

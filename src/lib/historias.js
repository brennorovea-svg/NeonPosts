// Stories em vídeo com movimento (30/10): vinte modelos só para o vídeo, nas cores, no logo e na fonte de cada marca.
// Cada um é uma linha do tempo de uns 10 s, lida no relógio do desenhar(). Sem relógio (miniatura, histórico,
// menos movimento), sai o último quadro, com tudo no lugar.
// Só opacidade, deslocamento e escala, mais traços que se desenham e textos que se digitam. Nada gira.

export const NOMES_DAS_HISTORIAS = {
  direct: 'Direct', busca: 'Busca', contador: 'Contador', painel: 'Painel', semana: 'Semana',
  impacto: 'Frase de impacto', acende: 'Acende', revelacao: 'Revelação', glitch: 'Glitch', pergunta: 'Pergunta e resposta',
  inclui: 'O que vem', comemoracao: 'Comemoração', pronto: 'Pronto', movimento: 'Movimento do dia', estrelas: 'Estrelas',
  aovivo: 'Ao vivo', contagem: 'Contagem regressiva', escolha: 'Isso ou aquilo', vitrine: 'Vitrine', local: 'Onde estamos',
}

const MONO = '"JetBrains Mono", ui-monospace, monospace'
const limitar = (x) => Math.min(1, Math.max(0, x))
const DIAS_CURTOS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const semAcento = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '')

// "1.200", "50%", "3x", "7 dias": o que vem antes, o número e o que vem depois.
function lerNumero(valor) {
  const achado = String(valor || '').trim().match(/^(\D*?)(\d[\d.]*)(.*)$/)
  if (!achado) return null
  const n = Number(achado[2].replace(/\./g, ''))
  if (!Number.isFinite(n)) return null
  // "1,5 mil" não conta: aparece pronto.
  return { antes: achado[1], n, depois: achado[3], milhar: achado[2].includes('.'), conta: !/^,\d/.test(achado[3]) }
}
const escreverNumero = (q, v) => q.antes + (q.milhar ? v.toLocaleString('pt-BR') : String(v)) + q.depois

// Quanto tempo um título grande leva para entrar palavra por palavra (o mesmo passo do bloco()).
function tempoDoTitulo(texto) {
  const n = String(texto || '').split(/\s+/).filter(Boolean).length
  return n * (n > 12 ? 0.05 : 0.08) + 0.48
}

export function criarHistorias(k) {
  const {
    bloco, medir, selo, rotulo, balao, quebrar, espacar, arredondado, pilulaCurta, chamadaEmTexto, placaDaMarca, brilho,
    pintarFundo: pintarFundoBase, corPedida, fundoPedido, destaqueSobre, apagado, textoSobre, comAlfa, misturar, legivel, luz, contraste,
    marca, escala, lado, sobre, fonteDoBloco, FONTE, EMBARALHO, suave, sorteio, acender, confete, semRelogio,
  } = k

  // Com foto, ela é o fundo de todo story com movimento (Brenno, 30/10: a foto mandada tem de aparecer).
  // Nos de letreiro em fundo escuro, a foto fica mais apagada para o texto continuar aceso.
  function pintarFundo(ctx, o) {
    if (!o.foto) return pintarFundoBase(ctx, o)
    const pedido = o.r.arte?.fundo || o.padrao || 'marca'
    const tinta = pintarFundoBase(ctx, { ...o, r: { ...o.r, arte: { ...o.r.arte, fundo: 'foto' } } })
    if (pedido === 'escuro') {
      ctx.fillStyle = 'rgba(8,8,12,.45)'
      ctx.fillRect(0, 0, o.L, o.A)
    }
    return tinta
  }

  const parado = () => !k.relogio()
  const agora = () => (k.relogio() ? k.relogio().t : 1e3)
  // De 0 a 1 a partir de `ini`, no easing da marca (ir) ou reto.
  const ir = (ini, dur) => suave((agora() - ini) / dur)
  const reto = (ini, dur) => limitar((agora() - ini) / dur)
  // Marca a hora em que o próximo elemento do desenhar() entra.
  const aos = (s) => k.aos(s)

  function com(ctx, { a = 1, dx = 0, dy = 0, s = 1, cx = 0, cy = 0 }, desenho) {
    if (a <= 0.001) return
    ctx.save()
    ctx.globalAlpha *= Math.min(1, a)
    ctx.translate(dx, dy)
    if (s !== 1) {
      ctx.translate(cx, cy)
      ctx.scale(s, s)
      ctx.translate(-cx, -cy)
    }
    desenho()
    ctx.restore()
  }
  const surgir = (ctx, ini, desenho, { dur = 0.6, desloca = 24 } = {}) => {
    const p = ir(ini, dur)
    com(ctx, { a: p, dy: (1 - p) * desloca }, desenho)
  }
  // Chega de longe (de px), passa um pouco do lugar e volta, como mensagem chegando.
  function chegar(ini, de, dur = 0.52) {
    const p = (agora() - ini) / dur
    if (p <= 0) return de
    if (p >= 1) return 0
    const passa = -Math.sign(de) * 10
    return p < 0.7 ? de + (passa - de) * suave(p / 0.7) : passa * (1 - suave((p - 0.7) / 0.3))
  }
  // Estala: cresce de .4 a 1.12 e assenta em 1.
  function estalo(ini, dur = 0.48, de = 0.4) {
    const p = (agora() - ini) / dur
    if (p <= 0) return { a: 0, s: de }
    if (p >= 1) return { a: 1, s: 1 }
    return p < 0.6 ? { a: p / 0.6, s: de + (1.12 - de) * suave(p / 0.6) } : { a: 1, s: 1.12 - 0.12 * suave((p - 0.6) / 0.4) }
  }
  // Pulso de 1 a `ate` e de volta, em `dur`.
  function pulso(ini, dur = 0.42, ate = 1.1) {
    const p = (agora() - ini) / dur
    return p <= 0 || p >= 1 ? 1 : 1 + (ate - 1) * Math.sin(Math.PI * p)
  }

  const medidas = ({ L, story }) => ({ m: 80, topo: story ? 230 : 80, base: story ? 330 : 90, larg: L - 160 })
  const brilhante = (cor) => (luz(cor) < 0.25 ? misturar(cor, '#FFFFFF', 0.4) : cor)
  const fundoEscuro = (r) => ({ ...r, arte: { ...r.arte, fundo: 'escuro' } })

  function escrever(ctx, texto, x, y, { fonte, cor, alinhar = 'left', base = 'alphabetic', espaco = 0, max }) {
    ctx.font = fonte
    ctx.fillStyle = cor
    ctx.textAlign = alinhar
    ctx.textBaseline = base
    espacar(ctx, espaco)
    if (max) ctx.fillText(texto, x, y, max)
    else ctx.fillText(texto, x, y)
    espacar(ctx, 0)
  }
  // Maior tamanho (de `tamanho` para baixo) em que o texto cabe na largura, numa linha.
  function caber(ctx, texto, largura, tamanho, minimo, fonte) {
    let t = tamanho
    ctx.font = fonte(t)
    while (t > minimo && ctx.measureText(texto).width > largura) ctx.font = fonte((t -= 6))
    return t
  }
  const fonteGrande = (t) => fonteDoBloco(700, t, Math.max(t, 64))

  // Logo que entra numa hora escolhida (o selo() sozinho entra sempre no começo).
  function seloDepois(ctx, ini, opcoes) {
    if (parado()) return selo(ctx, opcoes)
    com(ctx, { a: ir(ini, 0.6), dy: (1 - ir(ini, 0.6)) * 14 }, () => semRelogio(() => selo(ctx, opcoes)))
  }
  const seloNoTopo = (ctx, { L, logo, nome }, topo, tinta, alinhar = 'center', m = 80) =>
    selo(ctx, { logo, nome, x: alinhar === 'center' ? L / 2 : m, y: topo, altura: 64, alinhar, claro: tinta === '#FFFFFF' })

  // Botão da chamada, centralizado, entrando em `ini` (e apertado 1 s depois).
  function botao(ctx, r, ini, y, { m, larg, fundo, cor, alinhar = 'center' }) {
    if (!r.chamada) return 0
    aos(ini - 0.2)
    pilulaCurta(ctx, r, { x: m, y, largura: larg, alinhar, fundo, cor })
    return 104
  }
  const corDoBotao = (r, tinta, c) => {
    const fundo = fundoPedido(r, tinta === '#FFFFFF' ? '#FFFFFF' : c[0])
    return { fundo, cor: textoSobre(fundo) }
  }

  // Texto que se digita letra a letra (com cursor), quebrado em linhas. Devolve a altura e quando termina.
  function digitado(ctx, texto, { x, y, largura, fonte, tamanho, cor, alinhar = 'left', ini, passo = 0.055, entre = 1.3, cursor = true }) {
    ctx.font = fonte
    const linhas = quebrar(ctx, texto, largura).slice(0, 4)
    const total = linhas.reduce((n, l) => n + l.length, 0)
    const fim = ini + total * passo
    let resta = parado() ? total : Math.max(0, Math.floor((agora() - ini) / passo))
    if (!parado() && agora() < ini) return { altura: linhas.length * tamanho * entre, fim }
    let ultimo = null
    linhas.forEach((l, i) => {
      if (resta <= 0 && i > 0) return
      const parte = l.slice(0, Math.max(0, resta))
      resta -= l.length
      const yb = y + tamanho * 0.95 + i * tamanho * entre
      ctx.font = fonte
      const w = ctx.measureText(l).width
      const x0 = alinhar === 'center' ? x + (largura - w) / 2 : x
      escrever(ctx, parte, x0, yb, { fonte, cor })
      ultimo = { x: x0 + ctx.measureText(parte).width, y: yb }
    })
    // Cursor piscando enquanto digita e um pouco depois.
    if (cursor && ultimo && !parado() && agora() < fim + 1.2 && Math.floor(agora() * 2.5) % 2 === 0) {
      ctx.fillStyle = cor
      ctx.fillRect(ultimo.x + 6, ultimo.y - tamanho * 0.8, Math.max(4, tamanho * 0.12), tamanho * 0.95)
    }
    return { altura: linhas.length * tamanho * entre, fim }
  }

  // Um "check" que se desenha (de 0 a 1) num círculo.
  function check(ctx, cx, cy, raio, progresso, cor) {
    const pontos = [[-0.42, 0.04], [-0.12, 0.34], [0.46, -0.28]].map(([px, py]) => [cx + px * raio, cy + py * raio])
    const l1 = Math.hypot(pontos[1][0] - pontos[0][0], pontos[1][1] - pontos[0][1])
    const l2 = Math.hypot(pontos[2][0] - pontos[1][0], pontos[2][1] - pontos[1][1])
    let falta = (l1 + l2) * progresso
    if (falta <= 0) return
    ctx.save()
    ctx.strokeStyle = cor
    ctx.lineWidth = Math.max(6, raio * 0.2)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(...pontos[0])
    const q1 = Math.min(1, falta / l1)
    ctx.lineTo(pontos[0][0] + (pontos[1][0] - pontos[0][0]) * q1, pontos[0][1] + (pontos[1][1] - pontos[0][1]) * q1)
    falta -= l1
    if (falta > 0) {
      const q2 = Math.min(1, falta / l2)
      ctx.lineTo(pontos[1][0] + (pontos[2][0] - pontos[1][0]) * q2, pontos[1][1] + (pontos[2][1] - pontos[1][1]) * q2)
    }
    ctx.stroke()
    ctx.restore()
  }

  function estrela(ctx, cx, cy, raio) {
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 5
      const rr = i % 2 ? raio * 0.45 : raio
      ctx.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr)
    }
    ctx.closePath()
  }

  // Centraliza um grupo de altura `h` no espaço livre entre o topo e o pé.
  const centralizar = (de, ate, h) => de + Math.max(0, (ate - de - h) / 2)

  // ---------------------------------------------------------------- T01 Direct
  // Perguntas de cliente chegando como mensagem, "digitando..." e a resposta da marca. Botão no pé.
  function direct(ctx, a) {
    const { L, A, c, r, logo, foto, nome } = a
    const { m, topo, base, larg } = medidas(a)
    const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'escuro' })
    const escuro = tinta === '#FFFFFF'
    // Cabeçalho de conversa: avatar com o logo (ou a inicial) e o nome.
    surgir(ctx, 0.1, () => {
      const cy = topo + 50
      ctx.beginPath()
      ctx.arc(m + 50, cy, 50, 0, Math.PI * 2)
      ctx.fillStyle = logo ? '#FFFFFF' : c[0]
      ctx.fill()
      if (logo) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(m + 50, cy, 46, 0, Math.PI * 2)
        ctx.clip()
        const e = Math.min(74 / logo.width, 74 / logo.height)
        ctx.drawImage(logo, m + 50 - (logo.width * e) / 2, cy - (logo.height * e) / 2, logo.width * e, logo.height * e)
        ctx.restore()
      } else escrever(ctx, String(nome || '?').trim().charAt(0).toUpperCase(), m + 50, cy + 2, { fonte: `700 46px ${FONTE}`, cor: textoSobre(c[0]), alinhar: 'center', base: 'middle' })
      escrever(ctx, nome || '', m + 128, cy + 2, { fonte: `700 40px ${FONTE}`, cor: tinta, base: 'middle', max: larg - 140 })
      ctx.fillStyle = escuro ? 'rgba(255,255,255,.16)' : 'rgba(17,17,20,.1)'
      ctx.fillRect(m, cy + 84, larg, 2)
    }, { desloca: -16 })

    const perguntas = (r.pontos || []).filter(Boolean).slice(0, 3)
    const fundoPergunta = escuro ? 'rgba(255,255,255,.13)' : 'rgba(17,17,20,.07)'
    const fundoResposta = fundoPedido(r, c[0])
    const tamR = Math.round(62 * escala(r))
    const largB = larg * 0.8
    const alturaDe = (t, tam, peso) => {
      ctx.font = `${peso} ${tam}px ${FONTE}`
      return quebrar(ctx, t, largB - 72).slice(0, 4).length * tam * 1.25 + 56
    }
    const hP = perguntas.map((p) => alturaDe(p, 50, 500))
    const total = hP.reduce((s, h) => s + h + 24, 0) + 30 + alturaDe(r.titulo || '', tamR, 700)
    const fimLivre = A - base - (r.chamada ? 170 : 20)
    let y = centralizar(topo + 180, fimLivre, total)
    perguntas.forEach((p, i) => {
      aos(0.5 + i * 0.55)
      y += balao(ctx, p, { x: m, y, largura: largB, tamanho: 50, fundo: fundoPergunta, cor: apagado(tinta, 0.92) }) + 24
    })
    y += 30
    const tResposta = 0.5 + perguntas.length * 0.55 + 1.1
    // "Digitando...": três pontos pulando do lado da marca, antes da resposta.
    if (!parado() && agora() > tResposta - 1.0 && agora() < tResposta) {
      const w = 180, x = m + larg - w, t = agora()
      com(ctx, { a: reto(tResposta - 1.0, 0.2) }, () => {
        arredondado(ctx, x, y, w, 96, 48)
        ctx.fillStyle = fundoResposta
        ctx.fill()
        for (let i = 0; i < 3; i++) {
          const pulo = Math.max(0, Math.sin((t - i * 0.12) * 9)) * 12
          ctx.beginPath()
          ctx.arc(x + 54 + i * 36, y + 48 - pulo, 9, 0, Math.PI * 2)
          ctx.fillStyle = textoSobre(fundoResposta)
          ctx.fill()
        }
      })
    }
    aos(tResposta)
    balao(ctx, r.titulo, { x: m, y, largura: largB, tamanho: tamR, peso: 700, fundo: fundoResposta, cor: textoSobre(fundoResposta), direita: true })
    const b = corDoBotao(r, tinta, c)
    botao(ctx, r, tResposta + 0.9, A - base - 104, { m, larg, ...b })
  }

  // ---------------------------------------------------------------- T02 Busca
  // Alguém digita a busca, aparecem resultados e a marca ganha marca-texto. Título e botão embaixo.
  function busca(ctx, a) {
    const { L, A, c, r, logo, foto, nome } = a
    const { m, topo, base, larg } = medidas(a)
    const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'claro' })
    const escuro = tinta === '#FFFFFF'
    seloNoTopo(ctx, a, topo, tinta)
    const termo = String(r.pontos?.[0] || 'perto de mim').toLowerCase()
    const yb = topo + 190, hb = 124
    surgir(ctx, 0.2, () => {
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,.16)'
      ctx.shadowBlur = 30
      arredondado(ctx, m, yb, larg, hb, hb / 2)
      ctx.fillStyle = '#FFFFFF'
      ctx.fill()
      ctx.restore()
      ctx.strokeStyle = 'rgba(17,17,20,.5)'
      ctx.lineWidth = 6
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(m + 68, yb + hb / 2 - 6, 20, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(m + 83, yb + hb / 2 + 9)
      ctx.lineTo(m + 100, yb + hb / 2 + 26)
      ctx.stroke()
    })
    const tam = caber(ctx, termo, larg - 190, 46, 30, (t) => `500 ${t}px ${FONTE}`)
    const iniDig = 0.8
    const dig = digitado(ctx, termo, { x: m + 132, y: yb + hb / 2 - tam * 0.62, largura: larg - 170, fonte: `500 ${tam}px ${FONTE}`, tamanho: tam, cor: '#111114', ini: iniDig, passo: 0.06 })
    // Resultados: dois genéricos e o da marca no meio.
    const yr = yb + hb + 48, hr = 156, vao = 22
    const tRes = dig.fim + 0.35
    for (const i of [0, 2]) {
      surgir(ctx, tRes + (i ? 0.07 : 0), () => {
        const y = yr + i * (hr + vao)
        arredondado(ctx, m, y, larg, hr, 30)
        ctx.fillStyle = escuro ? 'rgba(255,255,255,.08)' : 'rgba(17,17,20,.05)'
        ctx.fill()
        ctx.fillStyle = escuro ? 'rgba(255,255,255,.22)' : 'rgba(17,17,20,.14)'
        arredondado(ctx, m + 44, y + 46, larg * (i ? 0.5 : 0.58), 22, 11)
        ctx.fill()
        arredondado(ctx, m + 44, y + 90, larg * (i ? 0.72 : 0.8), 18, 9)
        ctx.fill()
      }, { desloca: 10 })
    }
    const tMarca = tRes + 0.7
    surgir(ctx, tMarca, () => {
      const y = yr + hr + vao
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,.18)'
      ctx.shadowBlur = 36
      arredondado(ctx, m, y, larg, hr, 30)
      ctx.fillStyle = '#FFFFFF'
      ctx.fill()
      ctx.restore()
      ctx.font = `700 46px ${FONTE}`
      const wn = Math.min(ctx.measureText(nome || '').width, larg - 100)
      // Marca-texto que passa sobre o nome.
      const p = parado() ? 1 : ir(tMarca + 0.6, 0.5)
      ctx.fillStyle = luz(c[1]) > 0.4 ? c[1] : misturar(c[1], '#FFFFFF', 0.6)
      ctx.globalAlpha *= 0.75
      ctx.fillRect(m + 38, y + 30, (wn + 16) * p, 50)
      ctx.globalAlpha /= 0.75
      escrever(ctx, nome || '', m + 46, y + 70, { fonte: `700 46px ${FONTE}`, cor: '#111114', max: larg - 100 })
      escrever(ctx, r.apoio || '', m + 46, y + 122, { fonte: `400 36px ${FONTE}`, cor: 'rgba(17,17,20,.62)', max: larg - 100 })
    }, { desloca: 10 })
    const tTitulo = tMarca + 1.3
    const y0 = yr + 3 * hr + 2 * vao + 70
    aos(tTitulo)
    bloco(ctx, r.titulo, { x: m, y: y0, largura: larg, tamanho: Math.round(88 * escala(r)), maxLinhas: 3, entre: 1.02, alinhar: lado(r, 'center'), cor: corPedida(r, 'titulo', tinta), ...marca(r, destaqueSobre(tinta, c)) })
    botao(ctx, r, tTitulo + tempoDoTitulo(r.titulo) + 0.2, A - base - 104, { m, larg, ...corDoBotao(r, tinta, c) })
  }

  // ---------------------------------------------------------------- T03 Contador
  // Um número real conta do zero; o título entra e o trecho em destaque ganha sublinhado.
  function contador(ctx, a) {
    const { L, A, c, r, foto } = a
    const q = lerNumero(r.numero)
    if (!q) return impacto(ctx, a)
    const { m, topo, base, larg } = medidas(a)
    const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'marca' })
    seloNoTopo(ctx, a, topo, tinta)
    const final = escreverNumero(q, q.n)
    const t = caber(ctx, final, larg, Math.round(320 * escala(r)), 120, fonteGrande)
    const al = 'center'
    const tOp = { x: m, largura: larg, tamanho: Math.round(84 * escala(r)), maxLinhas: 3, entre: 1.04, alinhar: al }
    const aOp = { x: m + 30, largura: larg - 60, tamanho: 42, peso: 400, maxLinhas: 3, entre: 1.3, alinhar: al }
    const hN = t * 0.82
    const h = hN + 60 + medir(ctx, r.titulo, tOp) + (r.apoio ? 30 + medir(ctx, r.apoio, aOp) : 0)
    let y = centralizar(topo + 140, A - base - (r.chamada ? 170 : 40), h)
    const v = parado() || !q.conta ? q.n : Math.round(q.n * suave((agora() - 0.4) / 1.5))
    com(ctx, { a: ir(0.3, 0.3) }, () => escrever(ctx, escreverNumero(q, v), L / 2, y + hN, { fonte: fonteGrande(t), cor: corPedida(r, 'titulo', tinta), alinhar: 'center' }))
    y += hN + 60
    aos(2.0)
    y = bloco(ctx, r.titulo, { ...tOp, y, cor: corPedida(r, 'titulo', tinta), ...marca(r, destaqueSobre(tinta, c)) })
    const tApoio = 2.0 + tempoDoTitulo(r.titulo) + 0.4
    if (r.apoio) {
      aos(tApoio)
      bloco(ctx, r.apoio, { ...aOp, y: y + 30, cor: corPedida(r, 'texto', apagado(tinta)) })
    }
    botao(ctx, r, tApoio + 0.6, A - base - 104, { m, larg, ...corDoBotao(r, tinta, c) })
  }

  // ---------------------------------------------------------------- T04 Painel
  // Gráfico de linha que se desenha com os números do pedido; o último ponto pulsa.
  function painel(ctx, a) {
    const { L, A, c, r, foto } = a
    const valores = (r.pontos || []).map((p) => Number((String(p).replace(/\./g, '').replace(',', '.').match(/-?\d+(\.\d+)?/) || [])[0])).filter(Number.isFinite)
    if (valores.length < 3) return r.numero ? contador(ctx, a) : impacto(ctx, a)
    const { m, topo, base, larg } = medidas(a)
    const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'escuro' })
    const escuro = tinta === '#FFFFFF'
    seloNoTopo(ctx, a, topo, tinta, 'left')
    const traco = corPedida(r, 'destaque', escuro ? legivel(brilhante(c[1]), '#FFFFFF') : destaqueSobre(tinta, c))
    let y = topo + 190
    if (r.apoio) {
      surgir(ctx, 0.2, () => {
        ctx.font = `500 34px ${FONTE}`
        quebrar(ctx, r.apoio, larg).slice(0, 2).forEach((l, i) => escrever(ctx, l, m, y + 34 + i * 44, { fonte: `500 34px ${FONTE}`, cor: apagado(tinta, 0.72) }))
      }, { desloca: 12 })
      ctx.font = `500 34px ${FONTE}`
      y += Math.min(2, quebrar(ctx, r.apoio, larg).length) * 44 + 20
    }
    const ultimo = valores[valores.length - 1]
    const q = lerNumero(String(r.pontos[r.pontos.length - 1]).trim()) || { antes: '', n: ultimo, depois: '', milhar: ultimo >= 1000, conta: true }
    const tN = 200
    const v = parado() ? q.n : Math.round(q.n * suave((agora() - 0.5) / 1.5))
    com(ctx, { a: ir(0.4, 0.3) }, () => escrever(ctx, escreverNumero(q, v), m - 6, y + tN * 0.8, { fonte: fonteGrande(tN), cor: tinta }))
    y += tN * 0.8 + 70
    // Área do gráfico.
    const hG = A > 1500 ? 520 : 360
    const max = Math.max(...valores), min = Math.min(0, ...valores)
    const pts = valores.map((val, i) => [m + 20 + (i * (larg - 60)) / (valores.length - 1), y + hG - ((val - min) / (max - min || 1)) * (hG - 40)])
    com(ctx, { a: ir(0.3, 0.5) }, () => {
      ctx.fillStyle = escuro ? 'rgba(255,255,255,.12)' : 'rgba(17,17,20,.08)'
      for (let i = 0; i <= 3; i++) ctx.fillRect(m, y + (i * hG) / 3, larg, 2)
    })
    const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]))
    const comp = segs.reduce((s, l) => s + l, 0)
    const pr = parado() ? 1 : (() => { const x = reto(0.5, 1.5); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2 })()
    if (pr > 0) {
      // Preenchimento suave embaixo da linha, que aparece quando ela termina.
      com(ctx, { a: parado() ? 1 : ir(2.0, 0.6) }, () => {
        const g = ctx.createLinearGradient(0, y, 0, y + hG)
        g.addColorStop(0, comAlfa(traco, 0.28))
        g.addColorStop(1, comAlfa(traco, 0))
        ctx.beginPath()
        ctx.moveTo(pts[0][0], y + hG)
        pts.forEach((p) => ctx.lineTo(...p))
        ctx.lineTo(pts[pts.length - 1][0], y + hG)
        ctx.closePath()
        ctx.fillStyle = g
        ctx.fill()
      })
      ctx.save()
      ctx.strokeStyle = traco
      ctx.lineWidth = 12
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(...pts[0])
      let falta = comp * pr
      for (let i = 0; i < segs.length && falta > 0; i++) {
        const q2 = Math.min(1, falta / segs[i])
        ctx.lineTo(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * q2, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * q2)
        falta -= segs[i]
      }
      ctx.stroke()
      ctx.restore()
    }
    // Ponto vivo no último valor: pulsa duas vezes com um anel que se abre.
    const [lx, ly] = pts[pts.length - 1]
    if (parado() || agora() >= 2.0) {
      const e = agora() - 2.0
      const ciclo = !parado() && e < 1.9 ? (e % 0.95) / 0.95 : 1
      if (ciclo < 1) {
        ctx.beginPath()
        ctx.arc(lx, ly, 18 + 40 * ciclo, 0, Math.PI * 2)
        ctx.strokeStyle = comAlfa(traco, 0.5 * (1 - ciclo))
        ctx.lineWidth = 4
        ctx.stroke()
      }
      const s = ciclo < 1 ? 1 + 0.6 * Math.sin(Math.PI * ciclo) : 1
      ctx.beginPath()
      ctx.arc(lx, ly, 18 * s, 0, Math.PI * 2)
      ctx.fillStyle = traco
      ctx.fill()
    }
    y += hG + 70
    aos(3.2)
    bloco(ctx, r.titulo, { x: m, y, largura: larg, tamanho: Math.round(80 * escala(r)), maxLinhas: 3, entre: 1.04, cor: corPedida(r, 'titulo', tinta), ...marca(r, traco) })
    botao(ctx, r, 3.2 + tempoDoTitulo(r.titulo) + 0.3, A - base - 104, { m, larg, alinhar: 'left', ...corDoBotao(r, tinta, c) })
  }

  // ---------------------------------------------------------------- T05 Semana
  // A programação da semana em cascata; o dia de hoje acende na cor da marca.
  function semana(ctx, a) {
    const { L, A, c, r, foto } = a
    const linhas = (r.pontos || []).filter(Boolean).slice(0, 7).map((p) => {
      const achado = String(p).match(/^\s*([^:–—]{2,14}?)\s*[:–—]\s*(.+)$/)
      if (!achado) return { dia: '', texto: String(p) }
      const curto = semAcento(achado[1]).toUpperCase().slice(0, 3)
      const dia = DIAS_CURTOS.find((d) => semAcento(d) === curto) || achado[1].trim().toUpperCase().slice(0, 5)
      return { dia, texto: achado[2] }
    })
    if (!linhas.length) return k.modelos().lista(ctx, a)
    const { m, topo, base, larg } = medidas(a)
    const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'claro' })
    const escuro = tinta === '#FFFFFF'
    seloNoTopo(ctx, a, topo, tinta)
    const tOp = { x: m, largura: larg, tamanho: Math.round(92 * escala(r)), maxLinhas: 2, entre: 1.02, alinhar: 'center' }
    aos(0.3)
    let y = bloco(ctx, r.titulo, { ...tOp, y: topo + 170, cor: corPedida(r, 'titulo', tinta), ...marca(r, destaqueSobre(tinta, c)) }) + 50
    const fim = A - base - (r.chamada ? 150 : 0)
    const vao = 16
    const h = Math.min(132, (fim - y) / linhas.length - vao)
    const tLinhas = 0.3 + tempoDoTitulo(r.titulo)
    const hoje = DIAS_CURTOS[new Date().getDay()]
    const tHoje = tLinhas + linhas.length * 0.09 + 0.6
    const corHoje = fundoPedido(r, c[0])
    const dest = destaqueSobre(tinta, c)
    linhas.forEach((l, i) => {
      const yl = y + i * (h + vao)
      const destaque = l.dia === hoje ? (parado() ? 1 : ir(tHoje, 0.4)) : 0
      const p = ir(tLinhas + i * 0.09, 0.52)
      com(ctx, { a: p, dy: (1 - p) * 12, s: 1 + 0.04 * destaque, cx: L / 2, cy: yl + h / 2 }, () => {
        arredondado(ctx, m, yl, larg, h, 24)
        ctx.fillStyle = escuro ? 'rgba(255,255,255,.1)' : 'rgba(17,17,20,.06)'
        ctx.fill()
        if (destaque > 0) {
          ctx.globalAlpha *= destaque
          ctx.fillStyle = corHoje
          ctx.fill()
          ctx.globalAlpha /= destaque
        }
        const tamTexto = Math.min(40, h * 0.36)
        const corDia = destaque > 0.5 ? textoSobre(corHoje) : dest
        const corTexto = destaque > 0.5 ? textoSobre(corHoje) : tinta
        escrever(ctx, l.dia, m + 40, yl + h / 2 + 2, { fonte: `700 ${Math.round(tamTexto * 0.85)}px ${MONO}`, cor: corDia, base: 'middle', espaco: 2 })
        escrever(ctx, l.texto, m + (l.dia ? 190 : 40), yl + h / 2 + 2, { fonte: `600 ${Math.round(tamTexto)}px ${FONTE}`, cor: corTexto, base: 'middle', max: larg - (l.dia ? 230 : 80) })
      })
    })
    botao(ctx, r, tHoje + 0.5, A - base - 104, { m, larg, ...corDoBotao(r, tinta, c) })
  }

  // ---------------------------------------------------------------- T06 Frase de impacto
  // A frase da marca enorme, palavra por palavra, com sublinhado no destaque; a marca assina no fim.
  function impacto(ctx, a) {
    const { L, A, c, r, logo, foto, nome } = a
    const { m, topo, base, larg } = medidas(a)
    const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'marca' })
    const al = lado(r, 'left')
    const tOp = { x: m, largura: larg, tamanho: Math.round(140 * escala(r)), minimo: 72, maxLinhas: 6, entre: 1.0, alinhar: al }
    const aOp = { x: m, largura: larg, tamanho: 44, peso: 400, maxLinhas: 3, entre: 1.3, alinhar: al }
    const h = medir(ctx, r.titulo, tOp) + (r.apoio ? 40 + medir(ctx, r.apoio, aOp) : 0)
    let y = centralizar(topo + 60, A - base - 160, h)
    aos(0.4)
    y = bloco(ctx, r.titulo, { ...tOp, y, cor: corPedida(r, 'titulo', tinta), ...marca(r, destaqueSobre(tinta, c)) })
    const fim = 0.4 + tempoDoTitulo(r.titulo) + 0.5
    if (r.apoio) {
      aos(fim)
      bloco(ctx, r.apoio, { ...aOp, y: y + 40, cor: corPedida(r, 'texto', apagado(tinta)) })
    }
    seloDepois(ctx, fim + 0.6, { logo, nome, x: ancoraDe(al, m, larg), y: A - base - 80, altura: 56, alinhar: al, claro: tinta === '#FFFFFF' })
    if (r.chamada) {
      aos(fim + 0.9)
      chamadaEmTexto(ctx, r, { x: m, y: A - base - 110, largura: larg, alinhar: al === 'right' ? 'left' : 'right', cor: corPedida(r, 'destaque', destaqueSobre(tinta, c)), tamanho: 38 })
    }
  }
  const ancoraDe = (al, x, largura) => (al === 'center' ? x + largura / 2 : al === 'right' ? x + largura : x)

  // ---------------------------------------------------------------- T07 Acende
  // Fundo escuro e o título acendendo como letreiro, com brilho na cor da marca. Pisca de novo perto do fim.
  function acende(ctx, a) {
    const { L, A, c, r, foto } = a
    const { m, topo, base, larg } = medidas(a)
    const tinta = pintarFundo(ctx, { L, A, c, foto, r: fundoEscuro(r) })
    seloNoTopo(ctx, a, topo, tinta)
    const luzCor = brilhante(c[1])
    const tubo = corPedida(r, 'titulo', misturar(luzCor, '#FFFFFF', 0.62))
    const tOp = { x: m, largura: larg, tamanho: Math.round(124 * escala(r)), maxLinhas: 4, entre: 1.04, alinhar: 'center' }
    const aOp = { x: m + 30, largura: larg - 60, tamanho: 42, peso: 400, maxLinhas: 3, entre: 1.3, alinhar: 'center' }
    const hT = medir(ctx, r.titulo, tOp)
    const h = 80 + hT + (r.apoio ? 50 + medir(ctx, r.apoio, aOp) : 0)
    let y = centralizar(topo + 120, A - base - (r.chamada ? 170 : 40), h)
    aos(0.2)
    rotulo(ctx, 'Novidade', { x: L / 2, y: y + 30, tamanho: 30, cor: luzCor, alinhar: 'center', espaco: 8 })
    y += 80
    let o = parado() ? 1 : acender(0.6, 1.1)
    const f = (agora() - 6.2) / 0.52
    if (f > 0 && f < 0.4) o = Math.min(o, f < 0.2 ? 1 - (0.8 * f) / 0.2 : 0.2 + (0.8 * (f - 0.2)) / 0.2)
    if (o > 0) {
      brilho(ctx, L / 2, y + hT / 2, L * 0.6, luzCor, 0.3 * o)
      com(ctx, { a: o }, () => {
        ctx.shadowColor = luzCor
        ctx.shadowBlur = 70
        semRelogio(() => bloco(ctx, r.titulo, { ...tOp, y, cor: tubo }))
        ctx.shadowBlur = 22
        semRelogio(() => bloco(ctx, r.titulo, { ...tOp, y, cor: tubo }))
      })
    }
    y += hT
    if (r.apoio) {
      aos(1.9)
      bloco(ctx, r.apoio, { ...aOp, y: y + 50, cor: corPedida(r, 'texto', apagado(tinta)) })
    }
    const fundo = fundoPedido(r, luzCor)
    botao(ctx, r, 2.6, A - base - 104, { m, larg, fundo, cor: textoSobre(fundo) })
  }

  // ---------------------------------------------------------------- T08 Revelação
  // Teaser: o título aparece embaralhado e as letras travam uma a uma, em fonte de terminal.
  function revelacao(ctx, a) {
    const { L, A, c, r, foto } = a
    const { m, topo, base, larg } = medidas(a)
    const tinta = pintarFundo(ctx, { L, A, c, foto, r: fundoEscuro(r) })
    seloNoTopo(ctx, a, topo, tinta)
    const luzCor = brilhante(c[1])
    const texto = String(r.titulo || '').toUpperCase()
    let t = Math.round(104 * escala(r)), linhas
    do {
      ctx.font = `600 ${t}px ${MONO}`
      linhas = quebrar(ctx, texto, larg)
      t -= 4
    } while (linhas.length > 4 && t > 44)
    t += 4
    const aOp = { x: m + 30, largura: larg - 60, tamanho: 42, peso: 400, maxLinhas: 3, entre: 1.3, alinhar: 'center' }
    const hT = linhas.length * t * 1.25
    const h = 80 + hT + (r.apoio ? 50 + medir(ctx, r.apoio, aOp) : 0)
    let y = centralizar(topo + 120, A - base - (r.chamada ? 170 : 40), h)
    aos(0.2)
    rotulo(ctx, 'Em breve', { x: L / 2, y: y + 30, tamanho: 30, cor: luzCor, alinhar: 'center', espaco: 8 })
    y += 80
    const ini = 0.7
    const quadro = Math.floor(agora() * 25)
    let n = 0
    com(ctx, { a: ir(ini, 0.2) }, () => {
      ctx.font = `600 ${t}px ${MONO}`
      const passo = ctx.measureText('M').width
      linhas.forEach((l, i) => {
        const x0 = L / 2 - (passo * l.length) / 2
        const yb = y + t * 0.95 + i * t * 1.25
        ;[...l].forEach((ch, j) => {
          const travada = parado() || ch === ' ' || agora() >= ini + 0.25 + n * 0.045
          const mostra = travada ? ch : EMBARALHO[Math.floor(sorteio(n, quadro) * EMBARALHO.length)]
          escrever(ctx, mostra, x0 + j * passo, yb, { fonte: `600 ${t}px ${MONO}`, cor: travada ? corPedida(r, 'titulo', tinta) : luzCor })
          n++
        })
      })
    })
    const fim = ini + 0.25 + texto.length * 0.045
    y += hT
    if (r.apoio) {
      aos(fim + 0.3)
      bloco(ctx, r.apoio, { ...aOp, y: y + 50, cor: corPedida(r, 'texto', apagado(tinta)) })
    }
    const fundo = fundoPedido(r, luzCor)
    botao(ctx, r, fim + 0.9, A - base - 104, { m, larg, fundo, cor: textoSobre(fundo) })
  }

  // ---------------------------------------------------------------- T09 Glitch
  // "NOVO" enorme com corte de cor duplo (duas cópias deslocadas em faixas), título e botão.
  function glitch(ctx, a) {
    const { L, A, c, r, foto } = a
    const { m, topo, base, larg } = medidas(a)
    const tinta = pintarFundo(ctx, { L, A, c, foto, r: fundoEscuro(r) })
    seloNoTopo(ctx, a, topo, tinta)
    const palavra = 'NOVO'
    const t = caber(ctx, palavra, larg * 0.92, 330, 160, fonteGrande)
    const tOp = { x: m, largura: larg, tamanho: Math.round(96 * escala(r)), maxLinhas: 3, entre: 1.04, alinhar: 'center' }
    const aOp = { x: m + 30, largura: larg - 60, tamanho: 42, peso: 400, maxLinhas: 3, entre: 1.3, alinhar: 'center' }
    const hP = t * 0.78
    const h = hP + 70 + medir(ctx, r.titulo, tOp) + (r.apoio ? 30 + medir(ctx, r.apoio, aOp) : 0)
    let y = centralizar(topo + 120, A - base - (r.chamada ? 170 : 40), h)
    const yb = y + hP
    const corA = brilhante(c[0]), corB = brilhante(c[1])
    const faixas = [[0.05, 0.38, -16], [0.55, 0.9, 16], [0.28, 0.62, -10]]
    const corte = (t0) => {
      const e = agora() - t0
      return e < 0 || e >= 0.24 ? null : faixas[Math.min(2, Math.floor(e / 0.08))]
    }
    const f = parado() ? null : corte(0.55) || corte(5.6)
    com(ctx, { a: ir(0.3, 0.25) }, () => {
      escrever(ctx, palavra, L / 2, yb, { fonte: fonteGrande(t), cor: corPedida(r, 'titulo', tinta), alinhar: 'center' })
      if (f) {
        const [de, ate, dx] = f
        for (const [cor, lado2] of [[corA, 1], [corB, -1]]) {
          ctx.save()
          ctx.beginPath()
          ctx.rect(0, yb - hP + hP * de, L, hP * (ate - de))
          ctx.clip()
          ctx.globalCompositeOperation = 'lighter'
          escrever(ctx, palavra, L / 2 + dx * lado2, yb, { fonte: fonteGrande(t), cor, alinhar: 'center' })
          ctx.restore()
        }
      }
    })
    y = yb + 70
    aos(1.1)
    y = bloco(ctx, r.titulo, { ...tOp, y, cor: corPedida(r, 'titulo', tinta), ...marca(r, legivel(corB, '#FFFFFF')) })
    const tApoio = 1.1 + tempoDoTitulo(r.titulo) + 0.2
    if (r.apoio) {
      aos(tApoio)
      bloco(ctx, r.apoio, { ...aOp, y: y + 30, cor: corPedida(r, 'texto', apagado(tinta)) })
    }
    const fundo = fundoPedido(r, corA)
    botao(ctx, r, tApoio + 0.6, A - base - 104, { m, larg, fundo, cor: textoSobre(fundo) })
  }

  // ---------------------------------------------------------------- T10 Pergunta e resposta
  // Cartão com a pergunta; a resposta sobe por baixo como cortina.
  function pergunta(ctx, a) {
    const { L, A, c, r, foto } = a
    const { m, topo, base, larg } = medidas(a)
    const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'marca' })
    seloNoTopo(ctx, a, topo, tinta)
    const pad = 60, dentro = larg - pad * 2
    const corR = fundoPedido(r, tinta === '#FFFFFF' ? c[2] : c[0])
    const qOp = { x: m + pad, largura: dentro, tamanho: Math.round(78 * escala(r)), maxLinhas: 4, entre: 1.04 }
    const rOp = { x: m + pad, largura: dentro, tamanho: 50, peso: 600, maxLinhas: 6, entre: 1.22 }
    const hQ = pad + 50 + medir(ctx, r.titulo, qOp) + pad
    const hR = pad + 50 + medir(ctx, r.apoio, rOp) + pad
    const y0 = centralizar(topo + 150, A - base - (r.chamada ? 170 : 40), hQ + hR)
    const p = ir(0.2, 0.72)
    com(ctx, { a: p, dy: (1 - p) * 16 }, () => {
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,.22)'
      ctx.shadowBlur = 50
      arredondado(ctx, m, y0, larg, hQ + hR, 40)
      ctx.fillStyle = '#FFFFFF'
      ctx.fill()
      ctx.restore()
      sobre('#FFFFFF')
      aos(0.35)
      rotulo(ctx, 'Você sabia?', { x: m + pad, y: y0 + pad + 26, tamanho: 28, cor: destaqueSobre('#111114', c) })
      aos(0.6)
      bloco(ctx, r.titulo, { ...qOp, y: y0 + pad + 50, cor: corPedida(r, 'titulo', '#111114') })
      // Painel da resposta, recortado no cartão, subindo.
      const pr = parado() ? 1 : ir(2.9, 0.62)
      if (pr > 0) {
        ctx.save()
        arredondado(ctx, m, y0, larg, hQ + hR, 40)
        ctx.clip()
        ctx.beginPath()
        ctx.rect(m, y0 + hQ, larg, hR)
        ctx.clip()
        ctx.translate(0, (1 - pr) * hR)
        ctx.fillStyle = corR
        ctx.fillRect(m, y0 + hQ, larg, hR)
        sobre(corR)
        const tr = textoSobre(corR)
        escrever(ctx, 'RESPOSTA', m + pad, y0 + hQ + pad + 26, { fonte: `700 28px ${FONTE}`, cor: apagado(tr, 0.8), espaco: 6 })
        semRelogio(() => bloco(ctx, r.apoio, { ...rOp, y: y0 + hQ + pad + 50, cor: corPedida(r, 'texto', tr) }))
        ctx.restore()
      }
    })
    sobre(tinta === '#FFFFFF' ? '#1A1A20' : '#F6F4F9')
    botao(ctx, r, 3.9, A - base - 104, { m, larg, ...corDoBotao(r, tinta, c) })
  }

  // ---------------------------------------------------------------- T11 O que vem
  // O que está incluso: cada item entra e o check se desenha, em cascata.
  function inclui(ctx, a) {
    const { L, A, c, r, foto } = a
    const itens = (r.pontos || []).filter(Boolean).slice(0, 5)
    if (!itens.length) return k.modelos().lista(ctx, a)
    const { m, topo, base, larg } = medidas(a)
    const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'claro' })
    seloNoTopo(ctx, a, topo, tinta, 'left')
    const tOp = { x: m, largura: larg, tamanho: Math.round(96 * escala(r)), maxLinhas: 3, entre: 1.02 }
    const iOp = { x: m + 124, largura: larg - 124, tamanho: 48, peso: 600, maxLinhas: 2, entre: 1.15 }
    const alturas = itens.map((t) => Math.max(92, medir(ctx, t, iOp)))
    const h = medir(ctx, r.titulo, tOp) + 60 + alturas.reduce((s, x) => s + x + 34, 0)
    let y = centralizar(topo + 150, A - base - (r.chamada ? 170 : 40), h)
    aos(0.3)
    y = bloco(ctx, r.titulo, { ...tOp, y, cor: corPedida(r, 'titulo', tinta), ...marca(r, destaqueSobre(tinta, c)) }) + 60
    const circ = fundoPedido(r, tinta === '#FFFFFF' ? brilhante(c[1]) : c[0])
    const t0 = 0.3 + tempoDoTitulo(r.titulo) + 0.2
    itens.forEach((texto, i) => {
      const ini = t0 + i * 0.38
      const yl = y
      const p = ir(ini, 0.5)
      com(ctx, { a: p, dy: (1 - p) * 10 }, () => {
        ctx.beginPath()
        ctx.arc(m + 46, yl + 46, 46, 0, Math.PI * 2)
        ctx.fillStyle = circ
        ctx.fill()
        check(ctx, m + 46, yl + 46, 46, parado() ? 1 : ir(ini + 0.22, 0.36), textoSobre(circ))
        semRelogio(() => bloco(ctx, texto, { ...iOp, y: yl + Math.max(0, (92 - alturas[i]) / 2) + 4, cor: corPedida(r, 'texto', tinta) }))
      })
      y += alturas[i] + 34
    })
    botao(ctx, r, t0 + itens.length * 0.38 + 0.4, A - base - 104, { m, larg, alinhar: 'left', ...corDoBotao(r, tinta, c) })
  }

  // ---------------------------------------------------------------- T12 Comemoração
  // O número conta, dá um pulo e solta confete nas cores da marca.
  function comemoracao(ctx, a) {
    const { L, A, c, r, foto } = a
    const q = lerNumero(r.numero)
    if (!q) return impacto(ctx, a)
    const { m, topo, base, larg } = medidas(a)
    const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'marca' })
    seloNoTopo(ctx, a, topo, tinta)
    const final = escreverNumero(q, q.n)
    const t = caber(ctx, final, larg, Math.round(440 * escala(r)), 140, fonteGrande)
    const tOp = { x: m, largura: larg, tamanho: Math.round(92 * escala(r)), maxLinhas: 3, entre: 1.04, alinhar: 'center' }
    const aOp = { x: m + 30, largura: larg - 60, tamanho: 42, peso: 400, maxLinhas: 3, entre: 1.3, alinhar: 'center' }
    const hN = t * 0.8
    const h = hN + 60 + medir(ctx, r.titulo, tOp) + (r.apoio ? 30 + medir(ctx, r.apoio, aOp) : 0)
    let y = centralizar(topo + 140, A - base - (r.chamada ? 170 : 40), h)
    const v = parado() || !q.conta ? q.n : Math.round(q.n * suave((agora() - 0.4) / 0.9))
    const s = pulso(1.3, 0.42, 1.12)
    com(ctx, { a: ir(0.3, 0.3), s, cx: L / 2, cy: y + hN / 2 }, () => escrever(ctx, escreverNumero(q, v), L / 2, y + hN, { fonte: fonteGrande(t), cor: corPedida(r, 'titulo', tinta), alinhar: 'center' }))
    const festa = [c[0], c[1], c[2], '#FFFFFF']
    y += hN + 60
    aos(1.8)
    y = bloco(ctx, r.titulo, { ...tOp, y, cor: corPedida(r, 'titulo', tinta), ...marca(r, destaqueSobre(tinta, c)) })
    const tApoio = 1.8 + tempoDoTitulo(r.titulo) + 0.3
    if (r.apoio) {
      aos(tApoio)
      bloco(ctx, r.apoio, { ...aOp, y: y + 30, cor: corPedida(r, 'texto', apagado(tinta)) })
    }
    botao(ctx, r, tApoio + 0.6, A - base - 104, { m, larg, ...corDoBotao(r, tinta, c) })
    confete(ctx, L / 2, centralizar(topo + 140, A - base - (r.chamada ? 170 : 40), h) + hN / 2, 1.3, festa)
  }

  // ---------------------------------------------------------------- T13 Pronto
  // Três pontos carregando em onda, que viram um check desenhado; a confirmação entra embaixo.
  function pronto(ctx, a) {
    const { L, A, c, r, foto } = a
    const { m, topo, base, larg } = medidas(a)
    const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'marca' })
    seloNoTopo(ctx, a, topo, tinta)
    const circ = fundoPedido(r, tinta === '#FFFFFF' ? '#FFFFFF' : c[0])
    const corCheck = circ === '#FFFFFF' ? (luz(c[0]) < 0.5 ? c[0] : misturar(c[0], '#000000', 0.4)) : textoSobre(circ)
    const R = 130
    const tOp = { x: m, largura: larg, tamanho: Math.round(92 * escala(r)), maxLinhas: 3, entre: 1.04, alinhar: 'center' }
    const aOp = { x: m + 30, largura: larg - 60, tamanho: 42, peso: 400, maxLinhas: 3, entre: 1.3, alinhar: 'center' }
    const h = R * 2 + 70 + medir(ctx, r.titulo, tOp) + (r.apoio ? 30 + medir(ctx, r.apoio, aOp) : 0)
    let y = centralizar(topo + 140, A - base - (r.chamada ? 170 : 40), h)
    const cy = y + R
    if (!parado() && agora() < 2.6) {
      const some = 1 - reto(2.3, 0.18)
      for (let i = 0; i < 3; i++) {
        const e = agora() - 0.3 - i * 0.12
        const pulo = e > 0 && e < 1.8 ? Math.sin((Math.PI * (e % 0.9)) / 0.9) * 34 : 0
        com(ctx, { a: ir(0.1, 0.3) * some, s: some, cx: L / 2 + (i - 1) * 76, cy }, () => {
          ctx.beginPath()
          ctx.arc(L / 2 + (i - 1) * 76, cy - pulo, 24, 0, Math.PI * 2)
          ctx.fillStyle = circ
          ctx.fill()
        })
      }
    }
    const p = parado() ? 1 : ir(2.45, 0.42)
    com(ctx, { a: p, s: 0.85 + 0.15 * p, cx: L / 2, cy }, () => {
      ctx.beginPath()
      ctx.arc(L / 2, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = circ
      ctx.fill()
      check(ctx, L / 2, cy, R * 0.9, parado() ? 1 : ir(2.7, 0.42), corCheck)
    })
    y += R * 2 + 70
    aos(2.7)
    y = bloco(ctx, r.titulo, { ...tOp, y, cor: corPedida(r, 'titulo', tinta), ...marca(r, destaqueSobre(tinta, c)) })
    const tApoio = 2.7 + tempoDoTitulo(r.titulo) + 0.2
    if (r.apoio) {
      aos(tApoio)
      bloco(ctx, r.apoio, { ...aOp, y: y + 30, cor: corPedida(r, 'texto', apagado(tinta)) })
    }
    botao(ctx, r, tApoio + 0.5, A - base - 104, { m, larg, ...corDoBotao(r, tinta, c) })
  }

  // ---------------------------------------------------------------- T14 Movimento do dia
  // Avisos do dia chegando um embaixo do outro, com mola. Depois o título e o botão.
  function movimento(ctx, a) {
    const { L, A, c, r, foto } = a
    let avisos = (r.pontos || []).filter(Boolean).slice(0, 4).map((p) => {
      const [titulo, ...resto] = String(p).split(/\s*[·•|]\s*|\s+[-–—]\s+/)
      return { titulo, detalhe: resto.join(' · ') }
    })
    if (!avisos.length && r.itens?.length) avisos = r.itens.slice(0, 4).map((i) => ({ titulo: 'Hoje tem', detalhe: i.nome }))
    if (!avisos.length) return impacto(ctx, a)
    const { m, topo, base, larg } = medidas(a)
    const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'escuro' })
    seloNoTopo(ctx, a, topo, tinta, 'left')
    aos(0.2)
    rotulo(ctx, 'Hoje por aqui', { x: m, y: topo + 190, tamanho: 28, cor: tinta === '#FFFFFF' ? legivel(brilhante(c[1]), '#FFFFFF') : destaqueSobre(tinta, c) })
    const hA = 180, vao = 28
    const ponto = fundoPedido(r, c[0])
    let y = topo + 240
    avisos.forEach((av, i) => {
      const ini = 0.5 + i * 0.56
      const yl = y
      const dx = chegar(ini, L)
      com(ctx, { a: dx >= L ? 0 : 1, dx }, () => {
        ctx.save()
        ctx.shadowColor = 'rgba(0,0,0,.22)'
        ctx.shadowBlur = 36
        arredondado(ctx, m, yl, larg, hA, 36)
        ctx.fillStyle = '#FFFFFF'
        ctx.fill()
        ctx.restore()
        ctx.beginPath()
        ctx.arc(m + 62, yl + hA / 2, 18, 0, Math.PI * 2)
        ctx.fillStyle = ponto
        ctx.fill()
        const comDetalhe = Boolean(av.detalhe)
        escrever(ctx, av.titulo, m + 112, yl + (comDetalhe ? 76 : hA / 2 + 16), { fonte: `700 46px ${FONTE}`, cor: '#111114', max: larg - 150 })
        if (comDetalhe) escrever(ctx, av.detalhe, m + 112, yl + 132, { fonte: `400 38px ${FONTE}`, cor: 'rgba(17,17,20,.62)', max: larg - 150 })
      })
      y += hA + vao
    })
    const tT = 0.5 + avisos.length * 0.56 + 0.4
    aos(tT)
    bloco(ctx, r.titulo, { x: m, y: y + 50, largura: larg, tamanho: Math.round(84 * escala(r)), maxLinhas: 3, entre: 1.04, cor: corPedida(r, 'titulo', tinta), ...marca(r, legivel(brilhante(c[1]), tinta)) })
    botao(ctx, r, tT + tempoDoTitulo(r.titulo) + 0.3, A - base - 104, { m, larg, alinhar: 'left', ...corDoBotao(r, tinta, c) })
  }

  // ---------------------------------------------------------------- T15 Estrelas
  // Cinco estrelas acendem uma a uma; o depoimento entra palavra por palavra e o nome assina.
  function estrelas(ctx, a) {
    const { L, A, c, r, foto } = a
    const { m, topo, base, larg } = medidas(a)
    const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'claro' })
    seloNoTopo(ctx, a, topo, tinta)
    const corEstrela = corPedida(r, 'destaque', tinta === '#FFFFFF' ? legivel(brilhante(c[1]), '#FFFFFF') : destaqueSobre(tinta, c))
    const frase = r.titulo ? `“${r.titulo}”` : ''
    const tOp = { x: m, largura: larg, tamanho: Math.round(76 * escala(r)), maxLinhas: 6, entre: 1.1, alinhar: 'center' }
    const h = 130 + 70 + medir(ctx, frase, tOp) + (r.autor ? 90 : 0)
    let y = centralizar(topo + 140, A - base - (r.chamada ? 170 : 40), h)
    for (let i = 0; i < 5; i++) {
      const o = parado() ? 1 : acender(0.4 + i * 0.16, 0.6)
      com(ctx, { a: o }, () => {
        estrela(ctx, L / 2 + (i - 2) * 150, y + 62, 62)
        ctx.fillStyle = corEstrela
        ctx.fill()
      })
    }
    y += 130 + 70
    aos(1.5)
    y = bloco(ctx, frase, { ...tOp, y, cor: corPedida(r, 'titulo', tinta), ...marca(r, corEstrela) })
    const tAutor = 1.5 + tempoDoTitulo(frase) + 0.3
    if (r.autor) surgir(ctx, tAutor, () => escrever(ctx, r.autor, L / 2, y + 70, { fonte: `600 38px ${FONTE}`, cor: apagado(tinta, 0.72), alinhar: 'center' }), { desloca: 8 })
    botao(ctx, r, tAutor + 0.6, A - base - 104, { m, larg, ...corDoBotao(r, tinta, c) })
  }

  // ---------------------------------------------------------------- T16 Ao vivo
  // A foto do negócio se aproxima devagar, o selo "ao vivo" pulsa e a legenda é digitada.
  function aovivo(ctx, a) {
    const { L, A, c, r, logo, foto, nome } = a
    const { m, topo, base, larg } = medidas(a)
    if (foto) {
      const z = 1 + 0.08 * reto(0, 9)
      const e = Math.max(L / foto.width, A / foto.height) * z
      ctx.drawImage(foto, (L - foto.width * e) / 2, (A - foto.height * e) / 2, foto.width * e, foto.height * e)
    } else placaDaMarca(ctx, 0, 0, L, A, c[0], misturar(c[2], '#000000', 0.35), c[1])
    const g = ctx.createLinearGradient(0, 0, 0, A)
    g.addColorStop(0, 'rgba(8,8,12,.35)')
    g.addColorStop(0.45, 'rgba(8,8,12,.05)')
    g.addColorStop(1, 'rgba(8,8,12,.88)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, L, A)
    sobre('#1A1A20')
    surgir(ctx, 0.2, () => {
      ctx.font = `700 30px ${FONTE}`
      espacar(ctx, 4)
      const w = ctx.measureText('AO VIVO').width + 100
      espacar(ctx, 0)
      arredondado(ctx, m, topo, w, 72, 36)
      ctx.fillStyle = 'rgba(0,0,0,.5)'
      ctx.fill()
      const pisca = parado() ? 1 : 0.25 + 0.75 * (0.5 + 0.5 * Math.cos((agora() * Math.PI * 2) / 1.2))
      ctx.beginPath()
      ctx.arc(m + 40, topo + 36, 12, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,59,48,${pisca})`
      ctx.fill()
      escrever(ctx, 'AO VIVO', m + 66, topo + 38, { fonte: `700 30px ${FONTE}`, cor: '#FFFFFF', base: 'middle', espaco: 4 })
    }, { desloca: -12 })
    selo(ctx, { logo, nome, x: L - m, y: topo - 6, altura: 60, alinhar: 'right' })
    const tOp = { x: m, largura: larg, tamanho: Math.round(100 * escala(r)), maxLinhas: 3, entre: 1.02 }
    const tamL = 40
    const fonteL = `600 ${tamL}px ${MONO}`
    ctx.font = fonteL
    const nL = r.apoio ? Math.min(4, quebrar(ctx, r.apoio, larg).length) : 0
    const hL = nL * tamL * 1.3
    const hT = medir(ctx, r.titulo, tOp)
    let y = A - base - (r.chamada ? 150 : 20) - hT - (nL ? hL + 40 : 0)
    let fim = 0.9
    if (nL) {
      const d = digitado(ctx, r.apoio, { x: m, y, largura: larg, fonte: fonteL, tamanho: tamL, cor: '#FFFFFF', ini: 0.9, passo: 0.045 })
      fim = d.fim
      y += hL + 40
    }
    aos(fim + 0.3)
    bloco(ctx, r.titulo, { ...tOp, y, cor: corPedida(r, 'titulo', '#FFFFFF'), ...marca(r, legivel(brilhante(c[1]), '#FFFFFF')) })
    const fundo = fundoPedido(r, '#FFFFFF')
    botao(ctx, r, fim + 0.3 + tempoDoTitulo(r.titulo) + 0.3, A - base - 104, { m, larg, alinhar: 'left', fundo, cor: textoSobre(fundo) })
  }

  // ---------------------------------------------------------------- T17 Contagem regressiva
  // Quantos dias faltam até a data do evento, com os dígitos rolando até o número certo.
  function contagem(ctx, a) {
    const { L, A, c, r, foto } = a
    const { m, topo, base, larg } = medidas(a)
    const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'escuro' })
    const escuro = tinta === '#FFFFFF'
    seloNoTopo(ctx, a, topo, tinta)
    const lida = k.lerData(r.data)
    const hoje = new Date()
    const dias = lida ? Math.round((lida.quando - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) / 864e5) : null
    const tOp = { x: m, largura: larg, tamanho: Math.round(92 * escala(r)), maxLinhas: 3, entre: 1.04, alinhar: 'center' }
    const aOp = { x: m + 30, largura: larg - 60, tamanho: 42, peso: 400, maxLinhas: 3, entre: 1.3, alinhar: 'center' }
    const hC = 300
    const h = 70 + hC + 90 + medir(ctx, r.titulo, tOp) + (r.apoio ? 30 + medir(ctx, r.apoio, aOp) : 0)
    let y = centralizar(topo + 130, A - base - (r.chamada ? 170 : 40), h)
    const dest = escuro ? legivel(brilhante(c[1]), '#FFFFFF') : destaqueSobre(tinta, c)
    aos(0.2)
    rotulo(ctx, dias === 0 ? 'É hoje' : 'Faltam', { x: L / 2, y: y + 30, tamanho: 30, cor: dest, alinhar: 'center', espaco: 8 })
    y += 70
    const caixa = fundoPedido(r, escuro ? comAlfa('#FFFFFF', 0.1) : c[0])
    const corDigito = /^#/.test(caixa) ? textoSobre(caixa) : tinta
    let tFim = 0.6
    if (dias !== null && dias > 0) {
      const ini = Math.min(dias + 4, Math.max(dias, 99))
      const passos = ini - dias
      const fim = String(dias).padStart(2, '0')
      const casas = Math.max(2, fim.length)
      const wC = 220, vao = 24
      const x0 = L / 2 - (casas * wC + (casas - 1) * vao) / 2
      const sAtual = parado() ? passos : Math.min(passos, Math.max(0, (agora() - 0.6) / 0.38))
      const j = Math.floor(sAtual)
      const e = j >= passos ? 1 : suave(Math.min(1, (sAtual - j) / (0.32 / 0.38)))
      const antes = String(ini - j).padStart(casas, '0')
      const depois = String(Math.max(dias, ini - j - 1)).padStart(casas, '0')
      tFim = 0.6 + passos * 0.38
      const s = pulso(tFim + 0.05, 0.42, 1.08)
      com(ctx, { a: ir(0.4, 0.4), s, cx: L / 2, cy: y + hC / 2 }, () => {
        for (let i = 0; i < casas; i++) {
          const x = x0 + i * (wC + vao)
          arredondado(ctx, x, y, wC, hC, 32)
          ctx.fillStyle = caixa
          ctx.fill()
          ctx.save()
          arredondado(ctx, x, y, wC, hC, 32)
          ctx.clip()
          const fonte = fonteGrande(200)
          const yb = y + hC / 2 + 72
          if (j < passos && antes[i] !== depois[i]) {
            escrever(ctx, antes[i], x + wC / 2, yb - hC * e, { fonte, cor: corDigito, alinhar: 'center' })
            escrever(ctx, depois[i], x + wC / 2, yb + hC * (1 - e), { fonte, cor: corDigito, alinhar: 'center' })
          } else escrever(ctx, (j < passos ? antes : fim.padStart(casas, '0'))[i], x + wC / 2, yb, { fonte, cor: corDigito, alinhar: 'center' })
          ctx.restore()
        }
      })
      y += hC
      surgir(ctx, 0.8, () => escrever(ctx, dias === 1 ? 'dia' : 'dias', L / 2, y + 66, { fonte: `600 44px ${FONTE}`, cor: apagado(tinta, 0.8), alinhar: 'center' }), { desloca: 8 })
      y += 90
    } else {
      // Sem data (ou é hoje): uma caixa larga com o que veio.
      const texto = dias === 0 ? 'Hoje' : r.data || '[DATA]'
      com(ctx, { a: ir(0.4, 0.4) }, () => {
        arredondado(ctx, m + 80, y, larg - 160, hC, 32)
        ctx.fillStyle = caixa
        ctx.fill()
        const t = caber(ctx, texto, larg - 220, 150, 60, fonteGrande)
        escrever(ctx, texto, L / 2, y + hC / 2 + t * 0.36, { fonte: fonteGrande(t), cor: corDigito, alinhar: 'center' })
      })
      y += hC + 90
    }
    aos(tFim + 0.4)
    y = bloco(ctx, r.titulo, { ...tOp, y, cor: corPedida(r, 'titulo', tinta), ...marca(r, dest) })
    const tApoio = tFim + 0.4 + tempoDoTitulo(r.titulo) + 0.2
    if (r.apoio) {
      aos(tApoio)
      bloco(ctx, r.apoio, { ...aOp, y: y + 30, cor: corPedida(r, 'texto', apagado(tinta)) })
    }
    botao(ctx, r, tApoio + 0.5, A - base - 104, { m, larg, ...corDoBotao(r, tinta, c) })
  }

  // ---------------------------------------------------------------- T18 Isso ou aquilo
  // Duas metades nas cores da marca entram dos lados; o "ou" estala no meio.
  function escolha(ctx, a) {
    const { L, A, c, r, logo, nome } = a
    const ops = (r.pontos || []).filter(Boolean).slice(0, 2)
    if (ops.length < 2) return k.modelos().enquete(ctx, a)
    const { m, topo, larg } = medidas(a)
    const corA = fundoPedido(r, c[0])
    const corB = contraste(corA, c[2]) < 1.5 ? misturar(corA, luz(corA) > 0.4 ? '#000000' : '#FFFFFF', 0.45) : c[2]
    const meio = A / 2
    const metade = (ini, de, y0, cor, texto, yTexto) => {
      const p = ir(ini, 0.62)
      com(ctx, { dx: (1 - p) * de }, () => {
        ctx.fillStyle = cor
        ctx.fillRect(0, y0, L, meio)
        const t = caber(ctx, texto, larg, 150, 64, fonteGrande)
        escrever(ctx, texto, L / 2, yTexto, { fonte: fonteGrande(t), cor: textoSobre(cor), alinhar: 'center', max: larg })
      })
    }
    metade(0.2, -L, 0, corA, ops[0], meio * 0.62)
    metade(0.32, L, meio, corB, ops[1], meio + meio * 0.5)
    // Logo e pergunta no alto da primeira metade.
    seloDepois(ctx, 0.9, { logo, nome, x: L / 2, y: topo, altura: 60, alinhar: 'center', claro: textoSobre(corA) === '#FFFFFF' })
    if (r.titulo) {
      sobre(corA)
      aos(1.4)
      bloco(ctx, r.titulo, { x: m, y: topo + 110, largura: larg, tamanho: 52, peso: 600, maxLinhas: 2, entre: 1.15, alinhar: 'center', cor: corPedida(r, 'titulo', textoSobre(corA)) })
    }
    const e = parado() ? { a: 1, s: 1 } : estalo(0.85)
    com(ctx, { a: e.a, s: e.s, cx: L / 2, cy: meio }, () => {
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,.25)'
      ctx.shadowBlur = 40
      ctx.beginPath()
      ctx.arc(L / 2, meio, 92, 0, Math.PI * 2)
      ctx.fillStyle = '#FFFFFF'
      ctx.fill()
      ctx.restore()
      escrever(ctx, 'ou', L / 2, meio + 4, { fonte: fonteGrande(72), cor: '#111114', alinhar: 'center', base: 'middle' })
    })
  }

  // ---------------------------------------------------------------- T19 Vitrine
  // Duas fitas com os itens e preços correndo em sentidos opostos.
  function vitrine(ctx, a) {
    const { L, A, c, r, foto } = a
    let chips = (r.itens || []).slice(0, 6).map((i) => ({ nome: i.nome, preco: i.preco }))
    if (!chips.length) chips = (r.pontos || []).filter(Boolean).slice(0, 6).map((p) => ({ nome: p }))
    if (!chips.length) return impacto(ctx, a)
    const { m, topo, base, larg } = medidas(a)
    const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'marca' })
    const escuro = tinta === '#FFFFFF'
    seloNoTopo(ctx, a, topo, tinta)
    const tOp = { x: m, largura: larg, tamanho: Math.round(116 * escala(r)), maxLinhas: 3, entre: 1.0, alinhar: 'center' }
    const aOp = { x: m + 30, largura: larg - 60, tamanho: 42, peso: 400, maxLinhas: 2, entre: 1.3, alinhar: 'center' }
    aos(0.3)
    let y = bloco(ctx, r.titulo, { ...tOp, y: topo + 170, cor: corPedida(r, 'titulo', tinta), ...marca(r, destaqueSobre(tinta, c)) })
    const tApoio = 0.3 + tempoDoTitulo(r.titulo) + 0.1
    if (r.apoio) {
      aos(tApoio)
      y = bloco(ctx, r.apoio, { ...aOp, y: y + 30, cor: corPedida(r, 'texto', apagado(tinta)) })
    }
    const dest = escuro ? legivel(brilhante(c[1]), '#FFFFFF') : destaqueSobre(tinta, c)
    const hC = 128, vao = 22
    ctx.font = `600 42px ${FONTE}`
    const largs = chips.map((ch) => {
      ctx.font = `600 42px ${FONTE}`
      let w = ctx.measureText(ch.nome).width + 96
      if (ch.preco) { ctx.font = `700 42px ${FONTE}`; w += ctx.measureText(ch.preco).width + 28 }
      return w
    })
    const W = largs.reduce((s, w) => s + w + vao, 0)
    const fita = (yf, desloca) => {
      let x = desloca
      while (x > 0) x -= W
      for (let volta = 0; x < L; volta++) {
        chips.forEach((ch, i) => {
          if (x + largs[i] > 0 && x < L) {
            arredondado(ctx, x, yf, largs[i], hC, hC / 2)
            ctx.fillStyle = escuro ? 'rgba(255,255,255,.14)' : 'rgba(17,17,20,.07)'
            ctx.fill()
            escrever(ctx, ch.nome, x + 48, yf + hC / 2 + 2, { fonte: `600 42px ${FONTE}`, cor: tinta, base: 'middle' })
            if (ch.preco) {
              ctx.font = `600 42px ${FONTE}`
              escrever(ctx, ch.preco, x + 48 + ctx.measureText(ch.nome).width + 28, yf + hC / 2 + 2, { fonte: `700 42px ${FONTE}`, cor: dest, base: 'middle' })
            }
          }
          x += largs[i] + vao
        })
        if (volta > 20) break
      }
    }
    const y1 = Math.max(y + 90, A * 0.56)
    const vel = W / 9
    com(ctx, { a: ir(tApoio + 0.3, 0.6) }, () => {
      fita(y1, parado() ? -W * 0.1 : -((agora() * vel) % W))
      fita(y1 + hC + 34, parado() ? -W * 0.45 : -W + ((agora() * W) / 11) % W)
    })
    botao(ctx, r, tApoio + 1.2, A - base - 104, { m, larg, ...corDoBotao(r, tinta, c) })
  }

  // ---------------------------------------------------------------- T20 Onde estamos
  // Mapa desenhado, o pino cai com quique e o endereço é digitado embaixo.
  const PINO = new Path2D('M12 0C5.4 0 0 5.2 0 11.7 0 20.5 12 32 12 32s12-11.5 12-20.3C24 5.2 18.6 0 12 0z')
  function local(ctx, a) {
    const { L, A, c, r, foto } = a
    const { m, topo, base, larg } = medidas(a)
    const tinta = pintarFundo(ctx, { L, A, c, foto, r, padrao: 'claro' })
    const escuro = tinta === '#FFFFFF'
    seloNoTopo(ctx, a, topo, tinta)
    const endereco = String(r.apoio || '').trim() || '[ENDEREÇO]'
    const xM = m, yM = topo + 150, wM = larg, hM = A > 1500 ? 720 : 470
    const chao = escuro ? 'rgba(255,255,255,.08)' : misturar(c[0], '#FFFFFF', 0.9)
    const rua = escuro ? 'rgba(255,255,255,.16)' : '#FFFFFF'
    surgir(ctx, 0.2, () => {
      ctx.save()
      arredondado(ctx, xM, yM, wM, hM, 40)
      ctx.fillStyle = chao
      ctx.fill()
      ctx.clip()
      ctx.fillStyle = rua
      for (const [l, t, w, h] of [[0, 0.3, 1, 0.035], [0, 0.66, 1, 0.035], [0.2, 0, 0.03, 1], [0.72, 0, 0.03, 1], [0.44, 0.3, 0.03, 0.36]]) {
        ctx.fillRect(xM + l * wM, yM + t * hM, w * wM, h * hM)
      }
      ctx.restore()
    })
    // Pino: cai de cima, quica duas vezes e assenta (só deslocamento).
    const px = xM + wM * 0.5, py = yM + hM * 0.52
    const e = parado() ? 1 : reto(0.6, 1.1)
    const queda = (() => {
      const pts = [[0, -700], [0.45, 0], [0.65, -70], [0.82, 0], [0.92, -18], [1, 0]]
      for (let i = 1; i < pts.length; i++) {
        if (e <= pts[i][0]) {
          const q = (e - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0])
          const sobe = pts[i][1] < pts[i - 1][1]
          const f = sobe ? 1 - (1 - q) * (1 - q) : q * q
          return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f
        }
      }
      return 0
    })()
    const sombra = parado() ? 1 : ir(1.05, 0.5)
    com(ctx, { a: sombra * 0.9, s: 0.3 + 0.7 * sombra, cx: px, cy: py }, () => {
      ctx.beginPath()
      ctx.ellipse(px, py, 46, 14, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,.22)'
      ctx.fill()
    })
    if (parado() || agora() >= 0.6) {
      ctx.save()
      // O pino só aparece dentro do mapa.
      arredondado(ctx, xM, yM, wM, hM, 40)
      ctx.clip()
      ctx.translate(px - 60, py - 160 + queda)
      ctx.scale(5, 5)
      ctx.fillStyle = fundoPedido(r, c[0])
      ctx.fill(PINO)
      ctx.beginPath()
      ctx.arc(12, 11.5, 4.4, 0, Math.PI * 2)
      ctx.fillStyle = escuro ? '#1A1A20' : '#FFFFFF'
      ctx.fill()
      ctx.restore()
    }
    let y = yM + hM + 70
    const tOp = { x: m, largura: larg, tamanho: Math.round(80 * escala(r)), maxLinhas: 2, entre: 1.04, alinhar: 'center' }
    aos(1.7)
    y = bloco(ctx, r.titulo, { ...tOp, y, cor: corPedida(r, 'titulo', tinta), ...marca(r, destaqueSobre(tinta, c)) })
    const tEnd = 1.7 + tempoDoTitulo(r.titulo) + 0.1
    const d = digitado(ctx, endereco, { x: m, y: y + 30, largura: larg, fonte: `600 46px ${FONTE}`, tamanho: 46, cor: corPedida(r, 'texto', apagado(tinta, 0.86)), alinhar: 'center', ini: tEnd, passo: 0.05 })
    botao(ctx, { ...r, chamada: r.chamada || 'Como chegar' }, d.fim + 0.4, A - base - 104, { m, larg, ...corDoBotao(r, tinta, c) })
  }

  return { direct, busca, contador, painel, semana, impacto, acende, revelacao, glitch, pergunta, inclui, comemoracao, pronto, movimento, estrelas, aovivo, contagem, escolha, vitrine, local }
}

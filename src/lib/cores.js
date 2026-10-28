// Conversão e leitura de cores para o perfil da marca.

export function hexParaRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbParaHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
}

// Aceita "#FF2E9A", "FF2E9A", "#F29", "255, 46, 154" ou "rgb(255 46 154)". Devolve HEX ou null.
export function lerCor(texto) {
  const t = texto.trim()
  const hex = t.replace('#', '')
  if (/^[0-9a-f]{6}$/i.test(hex)) return '#' + hex.toUpperCase()
  if (/^[0-9a-f]{3}$/i.test(hex)) return '#' + hex.split('').map((c) => c + c).join('').toUpperCase()
  const numeros = t.match(/\d{1,3}/g)
  if (numeros?.length === 3 && numeros.every((n) => Number(n) <= 255)) return rgbParaHex(numeros.map(Number))
  return null
}

function matiz([r, g, b]) {
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  if (!d) return 0
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}

const distancia = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

// Lê as cores que mais aparecem na imagem, ignorando fundo transparente,
// quase branco e quase preto. Devolve até 3 cores bem diferentes entre si.
export function coresDaImagem(arquivo) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(arquivo)
    img.onload = () => {
      const lado = 80
      const canvas = document.createElement('canvas')
      canvas.width = lado
      canvas.height = lado
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0, lado, lado)
      const { data } = ctx.getImageData(0, 0, lado, lado)
      URL.revokeObjectURL(url)

      // Agrupa pixels parecidos. Fundo escuro, quase branco e cinza contam à parte:
      // só entram se a imagem não tiver nenhuma cor viva.
      const grupos = new Map()
      const neutros = new Map()
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue
        const rgb = [data[i], data[i + 1], data[i + 2]]
        const max = Math.max(...rgb) / 255
        const min = Math.min(...rgb) / 255
        const luz = (max + min) / 2
        const saturacao = max === min ? 0 : (max - min) / (1 - Math.abs(2 * luz - 1))
        const viva = saturacao > 0.35 && luz > 0.25 && luz < 0.85
        // Cores vivas se agrupam pelo matiz; cada grupo é representado pelo seu tom mais puro,
        // assim um letreiro com brilho em volta vira a cor do tubo, não a do degradê.
        const destino = viva ? grupos : neutros
        const chave = viva ? String(Math.round(matiz(rgb) / 15)) : rgb.map((v) => v >> 4).join(',')
        const g = destino.get(chave) || { peso: 0, melhor: null, pureza: -1, soma: [0, 0, 0], n: 0 }
        g.peso += viva ? saturacao * saturacao : 1
        g.n += 1
        rgb.forEach((v, j) => { g.soma[j] += v })
        const pureza = saturacao - Math.abs(luz - 0.55)
        if (viva && pureza > g.pureza) { g.pureza = pureza; g.melhor = rgb }
        destino.set(chave, g)
      }

      const escolher = (mapa, lista) => {
        const ordem = [...mapa.values()].sort((a, b) => b.peso - a.peso)
        for (const g of ordem) {
          if (lista.length === 3) break
          const media = g.melhor || g.soma.map((v) => Math.round(v / g.n))
          // Cores vivas de matiz parecido (o tubo e o brilho dele) contam como uma só.
          const diferente = (c) => g.melhor
            ? Math.min(Math.abs(matiz(c) - matiz(media)), 360 - Math.abs(matiz(c) - matiz(media))) > 30
            : distancia(c, media) > 70
          if (lista.every(diferente)) lista.push(media)
        }
        return lista
      }
      const cores = escolher(grupos, [])
      if (!cores.length) escolher(neutros, cores)
      resolve(cores.map(rgbParaHex))
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve([]) }
    img.src = url
  })
}

// HSV (matiz 0-360, saturação e brilho 0-1) para o seletor de cores.
export function hexParaHsv(hex) {
  const [r, g, b] = hexParaRgb(hex).map((v) => v / 255)
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  return { h: matiz([r, g, b].map((v) => v * 255)), s: max ? d / max : 0, v: max }
}

export function hsvParaHex({ h, s, v }) {
  const f = (n) => {
    const k = (n + h / 60) % 6
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))))
  }
  return rgbParaHex([f(5), f(3), f(1)])
}

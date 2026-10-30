import { useEffect, useRef, useState } from 'react'
import Obturador from '../components/Obturador.jsx'
import Imagens from '../components/campos/Imagens.jsx'
import Layouts from '../components/Layouts.jsx'
import DeuProblema from '../components/DeuProblema.jsx'
import NaoEMinhaMarca from '../components/NaoEMinhaMarca.jsx'
import { sugerirLayouts, tipoDoPedido } from '../lib/sugerir.js'
import { DURACAO, duracaoDe, gravar, tocar } from '../lib/video.js'
import { listaDeNomes, MARCADORES, marcadoresDe, preencher } from '../lib/marcadores.js'
import { enderecoDaImagem, salvarPerfil } from '../lib/perfil.js'
import { acordarIA, escolherVersao, gerarPeca, guardarImagem } from '../lib/pecas.js'
import { carregarImagem, desenhar, NOMES_DOS_MODELOS, paraArquivo, prepararFontes, SO_NO_VIDEO } from '../lib/desenhar.js'
import './Criar.css'

const suave = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 4)

// Enquanto a IA trabalha, a lente fica fechada e respira. Quando a peça chega,
// a íris abre, dispara o flash e a faísca, e só então a peça aparece.
// Enquanto a IA escreve, as fatias da lente acendem uma a uma (a última espera a peça).
// Quando a peça chega, a última acende, a lente abre e vem o flash.
// Logo e foto ficam guardadas por caminho: carregam enquanto a pessoa escreve,
// e a peça já desenha na hora em que chega.
const imagensGuardadas = new Map()
function imagemDe(caminho) {
  if (!caminho) return Promise.resolve(null)
  if (!imagensGuardadas.has(caminho)) imagensGuardadas.set(caminho, enderecoDaImagem(caminho).then(carregarImagem))
  return imagensGuardadas.get(caminho)
}

// Roteiro da versão escolhida (ou da mais nova) e as fotos na ordem que a IA devolveu (1, 2, 3...).
function roteiroDaVersao(peca) {
  const versoes = [...(peca.versoes || []), { roteiro: peca.roteiro }]
  return versoes[Math.min(peca.escolhida ?? versoes.length - 1, versoes.length - 1)]?.roteiro
}
function emOrdem(lista, ordem) {
  const escolhidas = [...new Set((ordem || []).map((n) => lista[n - 1]).filter(Boolean))]
  return [...escolhidas, ...lista.filter((c) => !escolhidas.includes(c))]
}

const PASSO_FATIA = 1.5
function Lente({ pronta, onFim }) {
  const [q, setQ] = useState({ abertura: 0.08, flash: 0, faisca: 0, escalaFaisca: 0.5, fatias: [0, 0, 0, 0, 0, 0] })
  const acesas = useRef([0, 0, 0, 0, 0, 0])
  useEffect(() => {
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (pronta && reduzido) { onFim(); return }
    let id
    const inicio = performance.now()
    const base = [...acesas.current]
    const passo = (agora) => {
      const t = (agora - inicio) / 1000
      if (!pronta) {
        // Cinco fatias acendem no ritmo; a sexta só pulsa fraquinho até a peça chegar.
        const fatias = base.map((b, k) => {
          if (k < 5) return Math.max(b, reduzido ? 1 : suave((t - k * PASSO_FATIA) / 0.45))
          return reduzido ? 0.3 : 0.15 + 0.15 * (0.5 - 0.5 * Math.cos(Math.max(0, t - 5 * PASSO_FATIA) * 3))
        })
        acesas.current = fatias
        setQ((v) => ({ ...v, fatias }))
        if (!reduzido) id = requestAnimationFrame(passo)
        return
      }
      // Pronta: completa as fatias que faltam (0,2 s), abre a lente e dispara o flash.
      const fatias = base.map((b) => b + (1 - b) * suave(t / 0.2))
      const ta = t - 0.2
      const ft = (ta - 0.3) / 0.3
      const kt = (ta - 0.3) / 0.4
      setQ({
        fatias,
        abertura: 0.08 + suave(ta / 0.4) * 0.92,
        flash: ft < 0 || ft > 1 ? 0 : ft < 0.25 ? ft / 0.25 : 1 - suave((ft - 0.25) / 0.75),
        faisca: kt < 0 || kt > 1 ? 0 : kt < 0.3 ? kt / 0.3 : 1 - (kt - 0.3) / 0.7,
        escalaFaisca: 0.5 + 0.5 * suave(kt),
      })
      if (ta < 0.7) id = requestAnimationFrame(passo)
      else onFim()
    }
    id = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(id)
  }, [pronta])
  return <Obturador tamanho={140} {...q} />
}

const EXEMPLOS = [
  'Promoção do nosso serviço mais pedido só até sexta, para quem ainda não conhece a gente. Chamar no WhatsApp.',
  'Bastidores: mostrar a equipe preparando os pedidos de hoje, num tom leve e divertido.',
  'Aviso: no feriado vamos abrir das 10h às 16h. Lembrar que dá para pedir pelo WhatsApp.',
  'Sorteio para comemorar 1.000 seguidores: seguir o perfil, curtir e marcar dois amigos. Resultado na sexta.',
  'Post de boas-vindas para quem chegou agora no perfil: quem somos, o que fazemos e como falar com a gente.',
  'Dia das Mães chegando: sugestões de presente e lembrar que a gente embrulha para presente sem custo.',
  'Agradecer os clientes pelo mês incrível e contar uma meta que a gente bateu junto com eles.',
]
const AJUSTES = ['Mais curto', 'Mais divertido', 'Outro título', 'Outro layout', 'Título maior', 'Fundo claro', 'Fundo escuro']

const FORMATOS = [['post', 'Post', '4:5'], ['story', 'Story', '9:16']]
// O vídeo é o story animado: a IA escreve igual, o app anima e grava no aparelho.
const FORMATOS_DE_ESCOLHA = [...FORMATOS, ['video', 'Vídeo', `${DURACAO}-17s`]]

// Para cada tipo que a marca posta: como o pedido começa, o que ele precisa dizer e exemplos.
const TIPOS = {
  Promoção: {
    comeco: 'Promoção de ',
    dica: 'Diga <b>o que</b> está em promoção, <b>até quando</b>, o preço ou o desconto, e o que a pessoa faz para aproveitar.',
    exemplos: [
      'Promoção do nosso serviço mais pedido só até sexta, com 20% de desconto. Chamar no WhatsApp.',
      'Combo da semana para quem ainda não conhece a gente, preço especial até domingo. Tom animado.',
      'Promoção de aniversário da loja: 15% em tudo até domingo para quem mostrar este post no caixa.',
      'Promoção de começo de semana: segunda e terça o atendimento sai mais barato. Chamar para agendar pelo WhatsApp.',
    ],
  },
  Novidade: {
    comeco: 'Conta a novidade: ',
    dica: 'Diga <b>o que</b> é novo, <b>por que</b> isso é bom para o cliente e desde quando já está valendo.',
    exemplos: [
      'Conta a novidade: agora a gente atende também aos sábados, para quem não consegue vir durante a semana.',
      'Lançamos um produto novo no cardápio. Contar o que tem de especial e chamar para provar.',
      'Conta a novidade: chegou a coleção nova. Mostrar as peças em destaque e chamar para conhecer de perto.',
      'Conta a novidade: agora dá para agendar pelo link da bio, em um minuto, sem precisar ligar.',
    ],
  },
  Bastidores: {
    comeco: 'Mostra os bastidores de ',
    dica: 'Diga <b>que momento</b> aparece (equipe, preparo, entrega), o <b>tom</b> que você quer e, se tiver, mande a foto.',
    exemplos: [
      'Mostra os bastidores da equipe preparando os pedidos de hoje, num tom leve e divertido.',
      'Bastidores do cuidado que a gente tem em cada detalhe antes de entregar. Tom caloroso.',
      'Mostra os bastidores do nosso dia começando cedo, com a primeira fornada saindo do forno. Tom acolhedor.',
      'Mostra os bastidores de como a gente limpa e esteriliza tudo antes de cada atendimento. Passar confiança.',
    ],
  },
  Dica: {
    comeco: 'Uma dica sobre ',
    dica: 'Diga <b>qual problema</b> a dica resolve e <b>para quem</b>. Uma dica útil faz a pessoa salvar o post.',
    exemplos: [
      'Uma dica sobre como escolher o produto certo para o dia a dia, para quem está começando.',
      'Três erros comuns que nossos clientes cometiam antes de falar com a gente, e como evitar.',
      'Uma dica sobre como guardar o bolo na geladeira sem ressecar, para quem levou para o fim de semana.',
      'Uma dica sobre alongamento rápido para quem passa o dia sentado. Convidar para uma aula experimental.',
    ],
  },
  'Cardápio ou catálogo': {
    comeco: 'Post do cardápio com ',
    dica: 'Diga <b>quais itens</b> entram (os nomes iguais aos da sua lista) e para que ocasião. O preço vem dos seus dados.',
    exemplos: [
      'Post do cardápio com os três itens mais pedidos da semana, para quem vai pedir hoje à noite.',
      'Mostrar os serviços do nosso pacote básico, para quem quer começar gastando pouco.',
      'Post do cardápio com os pratos do almoço desta semana, para quem trabalha aqui perto.',
      'Mostrar os três pacotes de banho e tosa, do mais simples ao completo, para quem tem cachorro de pelo longo.',
    ],
  },
  Depoimento: {
    comeco: 'Post com o depoimento de um cliente sobre ',
    dica: 'Cole <b>o que o cliente disse</b>, o nome dele (se ele deixou) e o serviço que ele usou.',
    exemplos: [
      'Post com o depoimento da Ana: "Atendimento rápido e resultado lindo, recomendo de olhos fechados." Ela fez o serviço completo.',
      'Depoimento de um cliente que voltou pela terceira vez. Agradecer e chamar quem ainda não conhece.',
      'Post com o depoimento do Carlos: "Achei meu apartamento em duas semanas, atendimento nota dez." Agradecer a confiança.',
      'Depoimento de uma aluna que completou um ano treinando com a gente. Celebrar a constância e chamar quem quer começar.',
    ],
  },
  'Aviso de horário': {
    comeco: 'Aviso: ',
    dica: 'Diga <b>o dia</b>, <b>o horário</b> que muda e o que continua igual (entrega, WhatsApp, agendamento).',
    exemplos: [
      'Aviso: no feriado vamos abrir das 10h às 16h. Lembrar que dá para pedir pelo WhatsApp.',
      'Aviso: na próxima segunda vamos fechar para manutenção e voltamos na terça no horário normal.',
      'Aviso: em dezembro vamos abrir também aos domingos, das 9h às 14h, para as compras de fim de ano.',
      'Aviso: amanhã a gente abre mais tarde, às 11h, por causa de um treinamento da equipe.',
    ],
  },
  'Antes e depois': {
    comeco: 'Antes e depois de ',
    dica: 'Diga <b>o que mudou</b>, em quanto tempo e o que foi feito. Mande a foto do depois (ou as duas juntas).',
    exemplos: [
      'Antes e depois de um cliente que chegou com o problema e saiu com tudo resolvido em uma semana.',
      'Antes e depois da reforma que a gente fez. Mostrar o capricho nos detalhes e chamar para orçamento.',
      'Antes e depois de um sorriso que passou pelo clareamento. Destacar que foram só três sessões.',
      'Antes e depois de um quintal esquecido que virou um cantinho de convivência. Chamar para orçamento sem compromisso.',
    ],
  },
}
// Mostra 3 exemplos por vez; a cada rodada vem outra ordem (sempre a mesma para a mesma rodada).
function sortear(lista, rodada) {
  if (rodada === 0) return lista
  let semente = rodada * 9301 + lista.length
  const aleatorio = () => ((semente = (semente * 49297 + 233280) % 233280) / 233280)
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}
const GERAL = {
  dica: 'Um bom pedido diz <b>o que</b> é o post, <b>para quem</b>, o que a pessoa deve <b>fazer depois</b> e algum detalhe (preço, data, tom). Escolha um tipo acima ou toque num exemplo.',
  exemplos: EXEMPLOS,
}

export default function Criar({ negocioId, perfil, pecaInicial, onSair, onPerfil }) {
  const [pedido, setPedido] = useState('')
  const [tipo, setTipo] = useState(null)
  const [formato, setFormato] = useState('post')
  const [video, setVideo] = useState(false)
  const [gravando, setGravando] = useState(null) // null ou de 0 a 1
  const [avisoVideo, setAvisoVideo] = useState('')
  // Vídeo gravado esperando o segundo toque: o celular só abre o compartilhar logo depois de um toque.
  const [videoPronto, setVideoPronto] = useState(null)
  const [dadosFaltando, setDadosFaltando] = useState({}) // { '[HORÁRIO]': 'sábado, 9h às 13h' }
  const [fotos, setFotos] = useState([])
  const foto = fotos[0] || null
  const [estado, setEstado] = useState(pecaInicial ? 'pronta' : 'pedido') // pedido | gerando | revelando | pronta
  const [peca, setPeca] = useState(pecaInicial || null)
  const [restantes, setRestantes] = useState(pecaInicial ? 3 - pecaInicial.refeitas : 3)
  const [erro, setErro] = useState('')
  const [copiou, setCopiou] = useState(false)
  const [ajustando, setAjustando] = useState(false)
  const [pedidoNovo, setPedidoNovo] = useState('')
  const [ajuste, setAjuste] = useState('')
  const [flash, setFlash] = useState(false)
  const [imagens, setImagens] = useState({ logo: null, fotos: [], pronto: false })
  const [layout, setLayout] = useState('ia') // 'ia' ou um dos modelos
  const [rodada, setRodada] = useState(0) // muda a cada "Ver outros exemplos"
  const [miniaturas, setMiniaturas] = useState({ logo: null, foto: null, fotoDaMarca: null })
  const canvas = useRef(null)
  const area = useRef(null)
  const nome = perfil.identidade.nome

  // Adianta o que dá antes do clique: acorda a função da IA, carrega fontes, logo e foto.
  const fonte = perfil.identidade.fonte
  useEffect(() => { acordarIA(); prepararFontes(fonte); imagemDe(perfil.identidade.logo) }, [])
  useEffect(() => {
    let vivo = true
    Promise.all([imagemDe(perfil.identidade.logo), imagemDe(foto), imagemDe(perfil.identidade.fotos?.[0])])
      .then(([logo, f, daMarca]) => vivo && setMiniaturas({ logo, foto: f, fotoDaMarca: daMarca }))
    return () => { vivo = false }
  }, [foto])

  // Sugestão de layout pelo tipo (ficha ou texto do pedido) e pela foto; os sugeridos vêm na frente.
  const tipoPercebido = tipoDoPedido(tipo, pedido)
  const sugeridos = sugerirLayouts(tipoPercebido, Boolean(foto), video)

  // Logo e foto carregados uma vez por peça; fontes antes do primeiro desenho.
  useEffect(() => {
    if (!peca) return
    let vivo = true
    // A IA olhou as fotos e devolveu a ordem (a primeira abre a peça).
    const caminhos = emOrdem(peca.fotos || [], roteiroDaVersao(peca)?.ordem_fotos)
    if (!caminhos.length && peca.modelo === 'bastidores' && perfil.identidade.fotos?.[0]) caminhos.push(perfil.identidade.fotos[0])
    Promise.all([
      prepararFontes(fonte),
      imagemDe(perfil.identidade.logo),
      Promise.all(caminhos.map(imagemDe)),
    ]).then(([, logo, f]) => vivo && setImagens({ logo, fotos: f.filter(Boolean), pronto: true }))
    return () => { vivo = false }
  }, [peca?.id, peca?.refeitas, peca?.escolhida, peca?.modelo === 'bastidores'])

  // Redesenha a cada troca de modelo ou formato e guarda a imagem para o histórico.
  useEffect(() => {
    if (!peca || !canvas.current || estado !== 'pronta' || !imagens.pronto) return
    const opcoes = opcoesDoDesenho()
    // A miniatura do histórico é sempre a arte parada, desenhada fora da tela.
    const quadro = document.createElement('canvas')
    desenhar(quadro, opcoes)
    const comVideo = video && peca.formato === 'story'
    const parado = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let parar = null
    if (comVideo && !parado) parar = tocar(canvas.current, opcoes)
    // Parado, o vídeo mostra o último quadro; o vídeo em cenas mostra a capa.
    else desenhar(canvas.current, comVideo && opcoes.modelo !== 'cenas' ? { ...opcoes, tempo: duracaoDe(opcoes), total: duracaoDe(opcoes) } : opcoes)
    const t = setTimeout(async () => {
      try { await guardarImagem(peca, negocioId, await paraArquivo(quadro, 'peca.png')) } catch { /* o histórico fica sem miniatura */ }
    }, 600)
    setVideoPronto(null)
    return () => { clearTimeout(t); parar?.() }
  }, [peca, imagens, estado, video, dadosFaltando])

  function opcoesDoDesenho() {
    return { formato: peca.formato, modelo: peca.modelo, roteiro, cores: perfil.identidade.cores, nome, fonte, logo: imagens.logo, fotos: imagens.fotos }
  }

  async function criar(refazer) {
    setErro('')
    setEstado('gerando')
    window.scrollTo({ top: 0 })
    try {
      const r = await gerarPeca(refazer
        ? { refazer: peca.id, formato: peca.formato, video: video && peca.formato === 'story', pedido: pedidoNovo.trim(), ajuste: ajuste.trim() }
        : { pedido: pedido.trim(), formato, video, fotos, modelo: layout === 'ia' ? undefined : layout })
      setAjustando(false)
      setAjuste('')
      setPeca(r.peca)
      setRestantes(r.refeitasRestantes)
      setEstado('revelando')
    } catch (falha) {
      setErro(falha.message)
      setEstado(refazer ? 'pronta' : 'pedido')
    }
  }

  async function baixar() {
    const base = `${nome || 'post'}-${video ? 'video' : peca.formato}`.replace(/\s+/g, '-').toLowerCase()
    let arquivo
    if (video && peca.formato === 'story') {
      if (!videoPronto) {
        setErro('')
        setGravando(0)
        try {
          const r = await gravar(opcoesDoDesenho(), base, setGravando)
          setVideoPronto(r.arquivo)
          setAvisoVideo(r.extensao === 'webm' ? 'Este aparelho gravou em WebM. Se o Instagram não aceitar, baixe pelo celular com Chrome ou Safari atualizado.' : '')
        } catch (falha) {
          setErro(falha.message)
        } finally {
          setGravando(null)
        }
        return
      }
      arquivo = videoPronto
    } else arquivo = await paraArquivo(canvas.current, `${base}.png`)
    if (navigator.canShare?.({ files: [arquivo] })) {
      try { await navigator.share({ files: [arquivo] }); return } catch (e) { if (e.name === 'AbortError') return }
    }
    const link = document.createElement('a')
    link.href = URL.createObjectURL(arquivo)
    link.download = arquivo.name
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 4000)
  }

  // "Isso não é a minha marca": a regra entra no guia como versão nova do perfil, e a próxima peça já segue.
  async function juntarAoGuia(lista) {
    const guiaAtual = perfil.voz.guia || {}
    const novo = { ...perfil, voz: { ...perfil.voz, guia: { ...guiaAtual, regras: [...(guiaAtual.regras || []), ...lista], feito_em: new Date().toISOString() } } }
    try {
      await salvarPerfil(negocioId, novo)
    } catch {
      throw new Error('Não deu para salvar agora. Confira a internet e tente de novo.')
    }
    onPerfil?.(novo)
  }

  async function copiar() {
    const r = roteiro
    await navigator.clipboard.writeText(`${r.legenda}\n\n${r.hashtags.join(' ')}`)
    setCopiou(true)
    setTimeout(() => setCopiou(false), 1800)
  }

  const trocar = (campo, valor) => setPeca((p) => ({ ...p, [campo]: valor }))
  const versoes = peca ? [...(peca.versoes || []), { pedido: peca.pedido, roteiro: peca.roteiro }] : []
  const indice = peca ? Math.min(peca.escolhida ?? versoes.length - 1, versoes.length - 1) : 0
  // O que a IA deixou como marcador e o dono preencheu entra na arte e na legenda.
  const roteiroDaIA = versoes[indice]?.roteiro
  const faltando = marcadoresDe(roteiroDaIA)
  const roteiro = roteiroDaIA && preencher(roteiroDaIA, dadosFaltando)
  const semDados = faltando.filter((m) => !(dadosFaltando[m] || '').trim())
  function escolher(i) {
    const valor = i === versoes.length - 1 ? null : i
    trocar('escolhida', valor)
    escolherVersao(peca.id, valor).catch(() => {})
  }
  const comecos = perfil.padrao.tipos.map((t) => [t, TIPOS[t]?.comeco || `Post de ${t.toLowerCase()} sobre `])
  const guia = (tipo && TIPOS[tipo]) || GERAL
  const exemplos = sortear(guia.exemplos, rodada).slice(0, 3)
  const semTexto = pedido.trim().length < 3 || (tipo && pedido.trim() === (TIPOS[tipo]?.comeco || '').trim())

  return (
    <div className="criar">
      <header className="criar__topo">
        <button type="button" className="botao botao--fantasma" onClick={() => onSair(Boolean(peca))}>Voltar</button>
        <p className="marca criar__marca">Neon<span>posts</span></p>
      </header>

      {estado === 'pedido' && (
        <main className="criar__conteudo">
          <h1 className="criar__titulo">O que vamos postar hoje?</h1>
          <div className="campo">
            <label htmlFor="pedido">Escreva como se mandasse uma mensagem para quem faz os seus posts.</label>
            <textarea
              id="pedido" rows={4} maxLength={600} value={pedido} ref={area}
              onChange={(e) => setPedido(e.target.value)}
              placeholder="Ex.: promoção de sites essa semana, chamando para o WhatsApp"
            />
            {comecos.length > 0 && (
              <div className="fichas criar__comecos">
                {comecos.map(([t, comeco]) => (
                  <button key={t} type="button" className="ficha" aria-pressed={tipo === t} onClick={() => { setTipo(t); setPedido(comeco); area.current?.focus() }}>{t}</button>
                ))}
              </div>
            )}
            {semTexto && (
              <div className="criar__exemplos" key={`${tipo || 'geral'}-${rodada}`}>
                <p>{guia.dica.split(/<\/?b>/).map((parte, i) => (i % 2 ? <strong key={i}>{parte}</strong> : parte))}</p>
                {exemplos.map((e) => (
                  <button key={e} type="button" className="criar__exemplo" onClick={() => { setPedido(e); area.current?.focus() }}>{e}</button>
                ))}
                {guia.exemplos.length > 3 && (
                  <button type="button" className="criar__mais-exemplos" onClick={() => setRodada((r) => r + 1)}>Ver outros exemplos</button>
                )}
              </div>
            )}
          </div>

          <div className="campo">
            <span className="campo__rotulo">Formato</span>
            <div className="criar__formatos" role="group" aria-label="Formato">
              {FORMATOS_DE_ESCOLHA.map(([valor, rotulo, medida]) => (
                <button key={valor} type="button" className="criar__formato" aria-pressed={(video ? 'video' : formato) === valor} onClick={() => { setVideo(valor === 'video'); setFormato(valor === 'post' ? 'post' : 'story'); if (valor !== 'video' && SO_NO_VIDEO.includes(layout)) setLayout('ia') }}>
                  <span className={`criar__moldura criar__moldura--${valor}`} aria-hidden="true" />
                  <strong>{rotulo}</strong>
                  <span className="mono">{medida}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="campo">
            <span className="campo__rotulo">Fotos (opcional)</span>
            <p className="campo__ajuda">Até 4 fotos do produto, do serviço ou do dia a dia. A IA olha cada uma e escolhe qual abre a peça{video ? '; no vídeo em cenas, entram todas' : ''}.</p>
            <Imagens negocioId={negocioId} valor={fotos} onChange={setFotos} maximo={4} tipo="peca-foto" texto="Adicionar foto" previa />
          </div>

          <div className="campo">
            <span className="campo__rotulo">Layout</span>
            <p className="campo__ajuda">Escolha um jeito para a arte ou deixe a IA decidir. Dá para trocar depois.</p>
            <Layouts
              sugeridos={sugeridos} escolhido={layout} onEscolher={setLayout} tipo={tipoPercebido}
              perfil={perfil} formato={formato} video={video} {...miniaturas}
            />
          </div>

          {erro && <p className="campo__erro" role="alert">{erro}</p>}
          <button type="button" className="botao botao--primario" disabled={pedido.trim().length < 3} onClick={() => criar(false)}>
            Criar {video ? 'vídeo' : formato === 'story' ? 'story' : 'post'}
          </button>
          <p className="criar__nota">Preço, endereço e horário saem só dos seus dados fixos. Nada inventado.</p>
          {erro && <DeuProblema contexto={{ Negócio: nome, Pedido: pedido.trim(), Formato: video ? 'vídeo' : formato, Erro: erro }} />}
        </main>
      )}

      {(estado === 'gerando' || estado === 'revelando') && (
        <main className="criar__gerando" aria-live="polite">
          <Lente
            pronta={estado === 'revelando'}
            onFim={() => { setFlash(true); setTimeout(() => setFlash(false), 420); setEstado('pronta') }}
          />
          <p className="criar__gerando-texto">{estado === 'revelando' ? 'Pronto.' : `Criando com a cara ${nome ? `da ${nome}` : 'da sua marca'}...`}</p>
          <p className="criar__gerando-sub mono">{estado === 'revelando' ? '\u00a0' : 'Leva uns segundos'}</p>
        </main>
      )}

      {estado === 'pronta' && peca && (
        <main className="criar__pronta">
          {flash && <div className="criar__flash" aria-hidden="true" />}
          <div className={`criar__previa criar__previa--${peca.formato}`}>
            <canvas ref={canvas} aria-label={`Prévia: ${roteiro.titulo}`} />
          </div>

          <div className="criar__painel">
            {ajustando ? (
              <div className="criar__ajustar">
                <div className="campo">
                  <label htmlFor="pedido-novo">Seu pedido</label>
                  <textarea id="pedido-novo" rows={3} maxLength={600} value={pedidoNovo} onChange={(e) => setPedidoNovo(e.target.value)} />
                </div>
                <div className="campo">
                  <label htmlFor="ajuste">O que mudar? (opcional)</label>
                  <p className="campo__ajuda">Com ajuste, a gente mexe só no que você pedir. Em branco, sai uma versão nova.</p>
                  <input id="ajuste" maxLength={300} value={ajuste} onChange={(e) => setAjuste(e.target.value)} placeholder="Ex.: mais curto, falar do site, sem emoji" />
                  <div className="fichas">
                    {AJUSTES.map((a) => (
                      <button key={a} type="button" className="ficha" onClick={() => setAjuste((v) => (v ? `${v}, ${a.toLowerCase()}` : a))}>{a}</button>
                    ))}
                  </div>
                </div>
                <div className="criar__acoes-linha">
                  <button type="button" className="botao botao--fantasma" onClick={() => setAjustando(false)}>Cancelar</button>
                  <button type="button" className="botao botao--destaque" disabled={pedidoNovo.trim().length < 3} onClick={() => criar(true)}>Gerar nova versão ({restantes})</button>
                </div>
              </div>
            ) : (
              <p className="criar__pedido">“{versoes[indice]?.pedido || peca.pedido}”</p>
            )}

            {versoes.length > 1 && (
              <div className="campo">
                <span className="campo__rotulo">Versão que vai para o post</span>
                <div className="criar__versoes">
                  {versoes.map((v, i) => (
                    <button key={i} type="button" className="criar__versao" aria-pressed={indice === i} onClick={() => escolher(i)}>
                      <span className="mono">{i + 1}</span>
                      <span>{v.roteiro.titulo}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="campo">
              <span className="campo__rotulo">Modelo</span>
              <div className="fichas">
                {Object.entries(NOMES_DOS_MODELOS).filter(([valor]) => video || !SO_NO_VIDEO.includes(valor)).map(([valor, rotulo]) => (
                  <button key={valor} type="button" className="ficha" aria-pressed={peca.modelo === valor} onClick={() => trocar('modelo', valor)}>{rotulo}</button>
                ))}
              </div>
            </div>
            <div className="campo">
              <span className="campo__rotulo">Formato</span>
              <div className="fichas">
                {FORMATOS_DE_ESCOLHA.map(([valor, rotulo, medida]) => (
                  <button
                    key={valor} type="button" className="ficha" disabled={gravando !== null}
                    aria-pressed={(video && peca.formato === 'story' ? 'video' : peca.formato) === valor}
                    onClick={() => { setVideo(valor === 'video'); trocar('formato', valor === 'post' ? 'post' : 'story') }}
                  >{rotulo} · {medida}</button>
                ))}
              </div>
            </div>

            {faltando.length > 0 && (
              <div className="criar__faltando">
                <p className="criar__faltando-titulo">Precisamos saber {listaDeNomes(faltando)} para gerar o seu {video && peca.formato === 'story' ? 'vídeo' : peca.formato}</p>
                <p className="criar__faltando-texto">A IA não inventa esse dado. O que você escrever aqui entra na arte e na legenda.</p>
                {faltando.map((m) => (
                  <div className="campo" key={m}>
                    <label htmlFor={`falta-${m}`}>{MARCADORES[m].pergunta}</label>
                    <input
                      id={`falta-${m}`} maxLength={80} value={dadosFaltando[m] || ''} placeholder={MARCADORES[m].exemplo}
                      onChange={(e) => setDadosFaltando((v) => ({ ...v, [m]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}
            {roteiro.avisos?.length > 0 && (
              <ul className="criar__avisos">
                {roteiro.avisos.map((a) => <li key={a}>{a}</li>)}
              </ul>
            )}

            <div className="criar__legenda">
              <p>{roteiro.legenda}</p>
              <p className="criar__hashtags">{roteiro.hashtags.join(' ')}</p>
            </div>

            {erro && <p className="campo__erro" role="alert">{erro}</p>}
            <div className="criar__acoes">
              <button type="button" className="botao botao--primario" onClick={baixar} disabled={gravando !== null || semDados.length > 0}>
                {semDados.length > 0 ? `Preencha ${listaDeNomes(semDados)} para baixar` : gravando !== null ? `Gravando o vídeo... ${Math.ceil(duracaoDe(opcoesDoDesenho()) * (1 - gravando))} s` : video && peca.formato === 'story' ? (videoPronto ? 'Salvar vídeo e postar' : 'Gravar vídeo') : 'Baixar e postar'}
              </button>
              {gravando !== null && (
                <div className="criar__gravando" aria-hidden="true"><span style={{ transform: `scaleX(${gravando})` }} /></div>
              )}
              {gravando !== null && <p className="criar__nota">Deixe esta tela aberta até terminar.</p>}
              {videoPronto && !avisoVideo && <p className="criar__nota">Vídeo pronto. Toque de novo para salvar.</p>}
              {avisoVideo && <p className="criar__nota criar__nota--aviso">{avisoVideo}</p>}
              <button type="button" className="botao botao--destaque" onClick={copiar}>{copiou ? 'Legenda copiada' : 'Copiar legenda'}</button>
              <div className="criar__acoes-linha">
                <button type="button" className="botao botao--fantasma" disabled={restantes <= 0 || ajustando} onClick={() => { setPedidoNovo(peca.pedido); setAjustando(true) }}>
                  Gerar de novo{restantes > 0 ? ` (${restantes})` : ''}
                </button>
                <button type="button" className="botao botao--fantasma" onClick={() => { setPeca(null); setPedido(''); setTipo(null); setFotos([]); setLayout('ia'); setAvisoVideo(''); setDadosFaltando({}); setEstado('pedido') }}>Criar outro</button>
              </div>
              <p className="criar__nota">Gerar de novo não conta como peça nova.</p>
              <NaoEMinhaMarca
                key={`${peca.id}-${peca.refeitas}-${indice}`}
                roteiro={roteiro} regras={perfil.voz.guia?.regras || []} onSalvar={juntarAoGuia}
                salva={restantes > 0 && (
                  <button type="button" className="botao botao--destaque" onClick={() => { setPedidoNovo(''); setAjuste(''); criar(true) }}>
                    Gerar de novo com a regra ({restantes})
                  </button>
                )}
              />
              <DeuProblema
                contexto={{ Negócio: nome, Pedido: versoes[indice]?.pedido, Formato: video && peca.formato === 'story' ? 'vídeo' : peca.formato, Modelo: NOMES_DOS_MODELOS[peca.modelo] || peca.modelo, Peça: peca.id, Erro: erro }}
                imagem={() => paraArquivo(canvas.current, 'deu-problema.png')}
              />
            </div>
          </div>
        </main>
      )}
    </div>
  )
}

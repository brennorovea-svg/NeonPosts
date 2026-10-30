import { useEffect, useRef, useState } from 'react'
import Obturador from '../components/Obturador.jsx'
import Carrossel from '../components/Carrossel.jsx'
import Fichas from '../components/campos/Fichas.jsx'
import Imagens from '../components/campos/Imagens.jsx'
import DeuProblema from '../components/DeuProblema.jsx'
import { salvarPerfil } from '../lib/perfil.js'
import { coresDaImagem, lerCor } from '../lib/cores.js'
import { gerarPeca } from '../lib/pecas.js'
import { desenhar, prepararFontes, carregarImagem } from '../lib/desenhar.js'
import { tocar } from '../lib/video.js'
import { enderecoDaImagem } from '../lib/perfil.js'
import { pecasDaVitrine, RAMOS } from '../lib/vitrine.js'
import './Comecar.css'

// Primeira vez: nome, ramo e cor (ou o logo), e a marca já aparece viva numa vitrine de amostras.
// Tocar numa amostra e "Criar a minha" gera a peça de boas-vindas de verdade (não conta no plano).
const CORES = ['#E53935', '#F4A62A', '#2ECC71', '#4FA3FF', '#7B5CFF', '#EC4899']

function Amostra({ peca, perfil, logo, ativa, onEscolher }) {
  const canvas = useRef(null)
  useEffect(() => {
    let vivo = true
    let parar = null
    prepararFontes(perfil.identidade.fonte).then(() => {
      if (!vivo || !canvas.current) return
      const opcoes = { formato: peca.formato, modelo: peca.modelo, roteiro: peca.roteiro, cores: perfil.identidade.cores, nome: perfil.identidade.nome, fonte: perfil.identidade.fonte, logo, fotos: [] }
      const parado = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (peca.video && !parado) parar = tocar(canvas.current, opcoes)
      else desenhar(canvas.current, opcoes)
    })
    return () => { vivo = false; parar?.() }
  }, [peca, perfil, logo])
  return (
    <button type="button" role="radio" aria-checked={ativa} className={`comecar__amostra comecar__amostra--${peca.formato}${peca.video ? ' comecar__amostra--video' : ''}`} onClick={onEscolher}>
      <span className="comecar__tela"><canvas ref={canvas} aria-hidden="true" /></span>
      <span className="comecar__rotulo">{peca.video && <span className="comecar__rodando" aria-hidden="true" />}{peca.rotulo}</span>
    </button>
  )
}

export default function Comecar({ negocioId, perfil, onSalvo, onDepois, onPeca }) {
  const [etapa, setEtapa] = useState('dados') // dados | vitrine | gerando
  const [nome, setNome] = useState(perfil.identidade.nome || '')
  const [ramo, setRamo] = useState(perfil.identidade.ramo || '')
  const [cor, setCor] = useState(perfil.identidade.cores?.[0] || CORES[0])
  const [outraCor, setOutraCor] = useState('')
  const [logo, setLogo] = useState(perfil.identidade.logo || null)
  const [coresDoLogo, setCoresDoLogo] = useState(null) // cores lidas do logo, viram as cores da marca
  const [logoCarregado, setLogoCarregado] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [salvo, setSalvo] = useState(perfil)
  const [escolhida, setEscolhida] = useState(1) // a do meio, o vídeo
  const [abertura, setAbertura] = useState(0.08)

  useEffect(() => {
    let vivo = true
    if (!logo) { setLogoCarregado(null); return }
    enderecoDaImagem(logo).then(carregarImagem).then((img) => vivo && setLogoCarregado(img)).catch(() => {})
    return () => { vivo = false }
  }, [logo])

  // Enquanto a IA escreve, a lente respira.
  useEffect(() => {
    if (etapa !== 'gerando' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let id
    const inicio = performance.now()
    const passo = (agora) => { setAbertura(0.08 + 0.06 * (0.5 - 0.5 * Math.cos((agora - inicio) / 400))); id = requestAnimationFrame(passo) }
    id = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(id)
  }, [etapa])

  async function lerLogo(arquivo) {
    try {
      const cores = await coresDaImagem(arquivo)
      if (cores.length) { setCoresDoLogo(cores); setCor(cores[0]) }
    } catch { /* sem cor do logo, fica a escolhida */ }
  }

  const pronto = nome.trim().length >= 2 && ramo.trim().length >= 2
  const cores = coresDoLogo && coresDoLogo[0] === cor ? coresDoLogo : [cor]

  async function verVitrine() {
    setErro('')
    setSalvando(true)
    const novo = { ...perfil, identidade: { ...perfil.identidade, nome: nome.trim(), ramo: ramo.trim(), cores, logo } }
    try {
      await salvarPerfil(negocioId, novo)
      setSalvo(novo)
      onSalvo?.(novo)
      setEtapa('vitrine')
      window.scrollTo({ top: 0 })
    } catch {
      setErro('Não deu para salvar agora. Confira a internet e tente de novo.')
    }
    setSalvando(false)
  }

  const amostras = pecasDaVitrine(salvo)
  const amostra = amostras[escolhida]

  async function criar() {
    setErro('')
    setEtapa('gerando')
    window.scrollTo({ top: 0 })
    try {
      const r = await gerarPeca({ boas_vindas: true, formato: amostra.formato, video: amostra.video, modelo: amostra.modelo })
      onPeca(r.peca, amostra.video)
    } catch (falha) {
      setErro(falha.message)
      setEtapa('vitrine')
    }
  }

  if (etapa === 'gerando') {
    return (
      <main className="comecar comecar--gerando" aria-live="polite">
        <Obturador tamanho={140} abertura={abertura} />
        <p className="comecar__gerando">Criando o primeiro post com a cara da {salvo.identidade.nome}...</p>
        <p className="mono comecar__sub">Leva uns segundos</p>
      </main>
    )
  }

  if (etapa === 'vitrine') {
    return (
      <main className="comecar comecar--vitrine">
        <header className="comecar__topo">
          <p className="marca comecar__marca">Neon<span>posts</span></p>
          <span className="mono comecar__passo">{salvo.identidade.nome}</span>
        </header>
        <h1 className="comecar__titulo">Olha a {salvo.identidade.nome} no feed.</h1>
        <p className="comecar__texto">Quatro jeitos de aparecer, já com a sua cor. O story em vídeo está rodando. Toque no que mais combina.</p>
        <Carrossel rotulo="Amostras" className="comecar__carrossel">
          <div role="radiogroup" aria-label="Amostras" className="comecar__amostras">
            {amostras.map((p, i) => <Amostra key={p.chave} peca={p} perfil={salvo} logo={logoCarregado} ativa={escolhida === i} onEscolher={() => setEscolhida(i)} />)}
          </div>
        </Carrossel>
        <p className="comecar__nota">Essas são amostras prontas, sem IA. Toque numa e a IA escreve a sua de verdade, com o seu nome e o seu ramo. A primeira é por conta da casa.</p>
        {erro && <p className="campo__erro" role="alert">{erro}</p>}
        <div className="comecar__acoes">
          <button type="button" className="botao botao--primario" onClick={criar}>Criar a minha: {amostra.rotulo.toLowerCase()}</button>
          <button type="button" className="perfil__depois" onClick={onDepois}>Ver a minha marca primeiro</button>
        </div>
        {erro && <DeuProblema contexto={{ Negócio: salvo.identidade.nome, Pedido: 'boas-vindas', Formato: amostra.rotulo, Erro: erro }} />}
      </main>
    )
  }

  return (
    <main className="comecar">
      <header className="comecar__topo">
        <p className="marca comecar__marca">Neon<span>posts</span></p>
        <span className="mono comecar__passo">passo 1 de 1</span>
      </header>
      <h1 className="comecar__titulo">Três coisas e o seu primeiro post sai agora.</h1>
      <p className="comecar__texto">O resto da marca a gente completa depois, com calma. Dá para mudar tudo.</p>

      <div className="campo">
        <label htmlFor="comecar-nome">Nome do negócio</label>
        <input id="comecar-nome" value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} placeholder="Como aparece na fachada" autoFocus />
      </div>

      <div className="campo" role="group" aria-label="O que você faz">
        <span className="campo__rotulo">O que você faz</span>
        <Fichas rotulo="Ramo" opcoes={RAMOS} valor={ramo} onChange={setRamo} outra />
      </div>

      <div className="campo" role="group" aria-label="Sua cor">
        <span className="campo__rotulo">Sua cor</span>
        <div className="comecar__cores">
          {CORES.map((c) => (
            <button key={c} type="button" className="comecar__cor" style={{ background: c }} aria-label={`Cor ${c}`} aria-pressed={cor === c} onClick={() => { setCor(c); setCoresDoLogo(null) }} />
          ))}
          {!CORES.includes(cor) && <span className="comecar__cor comecar__cor--atual" style={{ background: cor }} aria-hidden="true" />}
          <label className="comecar__cor comecar__cor--outra" aria-label="Outra cor">
            <input type="color" value={cor} onChange={(e) => { const lida = lerCor(e.target.value); if (lida) { setCor(lida); setCoresDoLogo(null) } }} />
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </label>
          <input className="comecar__hex mono" aria-label="Código da cor" value={outraCor || cor} onChange={(e) => { setOutraCor(e.target.value); const lida = lerCor(e.target.value); if (lida) { setCor(lida); setCoresDoLogo(null) } }} onBlur={() => setOutraCor('')} maxLength={20} />
        </div>
        <div className="comecar__logo">
          <Imagens negocioId={negocioId} valor={logo} onChange={setLogo} maximo={1} tipo="logo" texto="Tem logo? Manda que a gente usa as cores dele" onArquivo={lerLogo} />
          {coresDoLogo && <p className="cores__aviso" role="status">Cores tiradas do seu logo. Dá para ajustar depois, na aba Marca.</p>}
        </div>
      </div>

      {erro && <p className="campo__erro" role="alert">{erro}</p>}
      <div className="comecar__acoes">
        <button type="button" className="botao botao--primario" disabled={!pronto || salvando} onClick={verVitrine}>{salvando ? 'Guardando...' : 'Ver meu primeiro post'}</button>
        <p className="comecar__nota">Leva uns 10 segundos. Não gasta post do seu plano.</p>
        <button type="button" className="perfil__depois" onClick={onDepois}>Agora não</button>
      </div>
    </main>
  )
}

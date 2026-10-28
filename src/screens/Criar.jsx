import { useEffect, useRef, useState } from 'react'
import Obturador from '../components/Obturador.jsx'
import Imagens from '../components/campos/Imagens.jsx'
import { enderecoDaImagem } from '../lib/perfil.js'
import { escolherVersao, gerarPeca, guardarImagem } from '../lib/pecas.js'
import { carregarImagem, desenhar, NOMES_DOS_MODELOS, paraArquivo, prepararFontes } from '../lib/desenhar.js'
import './Criar.css'

const suave = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 4)

// Enquanto a IA trabalha, a lente fica fechada e respira. Quando a peça chega,
// a íris abre, dispara o flash e a faísca, e só então a peça aparece.
// Enquanto a IA escreve, as fatias da lente acendem uma a uma (a última espera a peça).
// Quando a peça chega, a última acende, a lente abre e vem o flash.
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
      // Pronta: completa as fatias que faltam (0,35 s), abre a lente e dispara o flash.
      const fatias = base.map((b) => b + (1 - b) * suave(t / 0.3))
      const ta = t - 0.4
      const ft = (ta - 0.5) / 0.32
      const kt = (ta - 0.5) / 0.45
      setQ({
        fatias,
        abertura: 0.08 + suave(ta / 0.55) * 0.92,
        flash: ft < 0 || ft > 1 ? 0 : ft < 0.25 ? ft / 0.25 : 1 - suave((ft - 0.25) / 0.75),
        faisca: kt < 0 || kt > 1 ? 0 : kt < 0.3 ? kt / 0.3 : 1 - (kt - 0.3) / 0.7,
        escalaFaisca: 0.5 + 0.5 * suave(kt),
      })
      if (ta < 1.0) id = requestAnimationFrame(passo)
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
]
const AJUSTES = ['Mais curto', 'Mais divertido', 'Mais direto', 'Outro título', 'Sem emoji']

const FORMATOS = [['post', 'Post', '4:5'], ['story', 'Story', '9:16']]

// Começos de pedido a partir dos tipos que a marca disse que posta.
const COMECOS = {
  Promoção: 'Promoção de ', Novidade: 'Conta a novidade: ', Bastidores: 'Mostra os bastidores de ',
  Cardápio: 'Post do cardápio com ', Dica: 'Uma dica sobre ', Depoimento: 'Post com o depoimento de um cliente sobre ',
  'Antes e depois': 'Antes e depois de ', Evento: 'Convite para o evento ', Aviso: 'Aviso: ',
}

export default function Criar({ negocioId, perfil, pecaInicial, onSair }) {
  const [pedido, setPedido] = useState('')
  const [formato, setFormato] = useState('post')
  const [foto, setFoto] = useState(null)
  const [estado, setEstado] = useState(pecaInicial ? 'pronta' : 'pedido') // pedido | gerando | revelando | pronta
  const [peca, setPeca] = useState(pecaInicial || null)
  const [restantes, setRestantes] = useState(pecaInicial ? 3 - pecaInicial.refeitas : 3)
  const [erro, setErro] = useState('')
  const [copiou, setCopiou] = useState(false)
  const [ajustando, setAjustando] = useState(false)
  const [pedidoNovo, setPedidoNovo] = useState('')
  const [ajuste, setAjuste] = useState('')
  const [flash, setFlash] = useState(false)
  const [imagens, setImagens] = useState({ logo: null, foto: null, pronto: false })
  const canvas = useRef(null)
  const area = useRef(null)
  const nome = perfil.identidade.nome

  // Logo e foto carregados uma vez por peça; fontes antes do primeiro desenho.
  useEffect(() => {
    if (!peca) return
    let vivo = true
    const caminhoFoto = peca.fotos?.[0] || (peca.modelo === 'bastidores' ? perfil.identidade.fotos?.[0] : null)
    Promise.all([
      prepararFontes(),
      enderecoDaImagem(perfil.identidade.logo).then(carregarImagem),
      enderecoDaImagem(caminhoFoto).then(carregarImagem),
    ]).then(([, logo, f]) => vivo && setImagens({ logo, foto: f, pronto: true }))
    return () => { vivo = false }
  }, [peca?.id, peca?.refeitas, peca?.modelo === 'bastidores'])

  // Redesenha a cada troca de modelo ou formato e guarda a imagem para o histórico.
  useEffect(() => {
    if (!peca || !canvas.current || estado !== 'pronta' || !imagens.pronto) return
    desenhar(canvas.current, { formato: peca.formato, modelo: peca.modelo, roteiro: [...(peca.versoes || []), { roteiro: peca.roteiro }][peca.escolhida ?? (peca.versoes || []).length].roteiro, cores: perfil.identidade.cores, nome, logo: imagens.logo, foto: imagens.foto })
    const t = setTimeout(async () => {
      try { await guardarImagem(peca, negocioId, await paraArquivo(canvas.current, 'peca.png')) } catch { /* o histórico fica sem miniatura */ }
    }, 600)
    return () => clearTimeout(t)
  }, [peca, imagens, estado])

  async function criar(refazer) {
    setErro('')
    setEstado('gerando')
    window.scrollTo({ top: 0 })
    try {
      const r = await gerarPeca(refazer
        ? { refazer: peca.id, formato: peca.formato, pedido: pedidoNovo.trim(), ajuste: ajuste.trim() }
        : { pedido: pedido.trim(), formato, fotos: foto ? [foto] : [] })
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
    const arquivo = await paraArquivo(canvas.current, `${nome || 'post'}-${peca.formato}.png`.replace(/\s+/g, '-').toLowerCase())
    if (navigator.canShare?.({ files: [arquivo] })) {
      try { await navigator.share({ files: [arquivo] }); return } catch (e) { if (e.name === 'AbortError') return }
    }
    const link = document.createElement('a')
    link.href = URL.createObjectURL(arquivo)
    link.download = arquivo.name
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 4000)
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
  const roteiro = versoes[indice]?.roteiro
  function escolher(i) {
    const valor = i === versoes.length - 1 ? null : i
    trocar('escolhida', valor)
    escolherVersao(peca.id, valor).catch(() => {})
  }
  const comecos = perfil.padrao.tipos.map((t) => [t, COMECOS[t] || `Post de ${t.toLowerCase()} sobre `])

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
                {comecos.map(([tipo, comeco]) => (
                  <button key={tipo} type="button" className="ficha" onClick={() => { setPedido(comeco); area.current?.focus() }}>{tipo}</button>
                ))}
              </div>
            )}
            {pedido.trim().length < 3 && (
              <div className="criar__exemplos">
                <p>Um bom pedido diz <strong>o que</strong> é o post, <strong>para quem</strong>, o que a pessoa deve <strong>fazer depois</strong> e algum detalhe (preço, data, tom). Toque num exemplo para usar como base.</p>
                {EXEMPLOS.map((e) => (
                  <button key={e} type="button" className="criar__exemplo" onClick={() => { setPedido(e); area.current?.focus() }}>{e}</button>
                ))}
              </div>
            )}
          </div>

          <div className="campo">
            <span className="campo__rotulo">Formato</span>
            <div className="criar__formatos" role="group" aria-label="Formato">
              {FORMATOS.map(([valor, rotulo, medida]) => (
                <button key={valor} type="button" className="criar__formato" aria-pressed={formato === valor} onClick={() => setFormato(valor)}>
                  <span className={`criar__moldura criar__moldura--${valor}`} aria-hidden="true" />
                  <strong>{rotulo}</strong>
                  <span className="mono">{medida}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="campo">
            <span className="campo__rotulo">Foto (opcional)</span>
            <p className="campo__ajuda">Uma foto do produto, do serviço ou do dia a dia deixa o post mais seu.</p>
            <Imagens negocioId={negocioId} valor={foto} onChange={setFoto} maximo={1} tipo="peca-foto" texto="Adicionar foto" />
          </div>

          {erro && <p className="campo__erro" role="alert">{erro}</p>}
          <button type="button" className="botao botao--primario" disabled={pedido.trim().length < 3} onClick={() => criar(false)}>
            Criar {formato === 'story' ? 'story' : 'post'}
          </button>
          <p className="criar__nota">Preço, endereço e horário saem só dos seus dados fixos. Nada inventado.</p>
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
                {Object.entries(NOMES_DOS_MODELOS).map(([valor, rotulo]) => (
                  <button key={valor} type="button" className="ficha" aria-pressed={peca.modelo === valor} onClick={() => trocar('modelo', valor)}>{rotulo}</button>
                ))}
              </div>
            </div>
            <div className="campo">
              <span className="campo__rotulo">Formato</span>
              <div className="fichas">
                {FORMATOS.map(([valor, rotulo, medida]) => (
                  <button key={valor} type="button" className="ficha" aria-pressed={peca.formato === valor} onClick={() => trocar('formato', valor)}>{rotulo} · {medida}</button>
                ))}
              </div>
            </div>

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
              <button type="button" className="botao botao--primario" onClick={baixar}>Baixar e postar</button>
              <button type="button" className="botao botao--destaque" onClick={copiar}>{copiou ? 'Legenda copiada' : 'Copiar legenda'}</button>
              <div className="criar__acoes-linha">
                <button type="button" className="botao botao--fantasma" disabled={restantes <= 0 || ajustando} onClick={() => { setPedidoNovo(peca.pedido); setAjustando(true) }}>
                  Gerar de novo{restantes > 0 ? ` (${restantes})` : ''}
                </button>
                <button type="button" className="botao botao--fantasma" onClick={() => { setPeca(null); setPedido(''); setFoto(null); setEstado('pedido') }}>Criar outro</button>
              </div>
              <p className="criar__nota">Gerar de novo não conta como peça nova.</p>
            </div>
          </div>
        </main>
      )}
    </div>
  )
}

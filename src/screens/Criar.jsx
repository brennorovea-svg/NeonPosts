import { useEffect, useRef, useState } from 'react'
import Obturador from '../components/Obturador.jsx'
import Imagens from '../components/campos/Imagens.jsx'
import { enderecoDaImagem } from '../lib/perfil.js'
import { gerarPeca, guardarImagem } from '../lib/pecas.js'
import { carregarImagem, desenhar, NOMES_DOS_MODELOS, paraArquivo, prepararFontes } from '../lib/desenhar.js'
import './Criar.css'

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
  const [estado, setEstado] = useState(pecaInicial ? 'pronta' : 'pedido') // pedido | gerando | pronta
  const [peca, setPeca] = useState(pecaInicial || null)
  const [restantes, setRestantes] = useState(pecaInicial ? 3 - pecaInicial.refeitas : 3)
  const [erro, setErro] = useState('')
  const [copiou, setCopiou] = useState(false)
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
    desenhar(canvas.current, { formato: peca.formato, modelo: peca.modelo, roteiro: peca.roteiro, cores: perfil.identidade.cores, nome, logo: imagens.logo, foto: imagens.foto })
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
      const r = await gerarPeca(refazer ? { refazer: peca.id, formato: peca.formato } : { pedido: pedido.trim(), formato, fotos: foto ? [foto] : [] })
      setPeca(r.peca)
      setRestantes(r.refeitasRestantes)
      setFlash(true)
      setTimeout(() => setFlash(false), 420)
      setEstado('pronta')
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
    const r = peca.roteiro
    await navigator.clipboard.writeText(`${r.legenda}\n\n${r.hashtags.join(' ')}`)
    setCopiou(true)
    setTimeout(() => setCopiou(false), 1800)
  }

  const trocar = (campo, valor) => setPeca((p) => ({ ...p, [campo]: valor }))
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

      {estado === 'gerando' && (
        <main className="criar__gerando" aria-live="polite">
          <div className="criar__respira"><Obturador tamanho={140} /></div>
          <p className="criar__gerando-texto">Criando com a cara {nome ? `da ${nome}` : 'da sua marca'}...</p>
          <p className="criar__gerando-sub mono">Leva uns segundos</p>
        </main>
      )}

      {estado === 'pronta' && peca && (
        <main className="criar__pronta">
          {flash && <div className="criar__flash" aria-hidden="true" />}
          <div className={`criar__previa criar__previa--${peca.formato}`}>
            <canvas ref={canvas} aria-label={`Prévia: ${peca.roteiro.titulo}`} />
          </div>

          <div className="criar__painel">
            <p className="criar__pedido">“{peca.pedido}”</p>

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

            {peca.roteiro.avisos?.length > 0 && (
              <ul className="criar__avisos">
                {peca.roteiro.avisos.map((a) => <li key={a}>{a}</li>)}
              </ul>
            )}

            <div className="criar__legenda">
              <p>{peca.roteiro.legenda}</p>
              <p className="criar__hashtags">{peca.roteiro.hashtags.join(' ')}</p>
            </div>

            {erro && <p className="campo__erro" role="alert">{erro}</p>}
            <div className="criar__acoes">
              <button type="button" className="botao botao--primario" onClick={baixar}>Baixar e postar</button>
              <button type="button" className="botao botao--destaque" onClick={copiar}>{copiou ? 'Legenda copiada' : 'Copiar legenda'}</button>
              <div className="criar__acoes-linha">
                <button type="button" className="botao botao--fantasma" disabled={restantes <= 0} onClick={() => criar(true)}>
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

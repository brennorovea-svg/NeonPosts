import { createContext, useContext, useEffect, useState } from 'react'
import Fichas from '../components/campos/Fichas.jsx'
import Cores from '../components/campos/Cores.jsx'
import Imagens from '../components/campos/Imagens.jsx'
import Itens from '../components/campos/Itens.jsx'
import Contador from '../components/campos/Contador.jsx'
import { salvarPerfil } from '../lib/perfil.js'
import { coresDaImagem } from '../lib/cores.js'
import { FONTES } from '../lib/fontes.js'
import './PerfilMarca.css'

export const PARTES = [
  {
    chave: 'identidade', numero: '01', titulo: 'Identidade visual',
    resumo: 'Para cada post sair com o seu logo e as suas cores.',
    porque: 'É o que faz o cliente bater o olho no post e saber que é seu, antes mesmo de ler.',
    sem: 'Um post bonito, mas com cara de modelo pronto da internet.',
    com: 'O seu logo no canto, as suas cores no fundo e as suas fotos de verdade.',
  },
  {
    chave: 'voz', numero: '02', titulo: 'Como a marca fala',
    resumo: 'Para o texto soar como você, não como robô.',
    porque: 'Cada marca tem um jeito de falar. Aqui você mostra o seu, e a IA escreve igual.',
    sem: '"Confira nossa promoção imperdível! Aproveite já!"',
    com: '"Saiu quentinho agora. Corre que acaba, viu?"',
  },
  {
    chave: 'padrao', numero: '03', titulo: 'Padrão de postagem',
    resumo: 'Para sugerir o post certo, no ritmo certo.',
    porque: 'Conta o que você costuma postar e com que frequência. Assim o app sugere o que falta na semana.',
    sem: 'Você abre o app sem saber o que postar hoje.',
    com: '"Faz 5 dias sem bastidor. Que tal mostrar a cozinha?"',
  },
  {
    chave: 'dados', numero: '04', titulo: 'Dados fixos',
    resumo: 'Para a IA nunca inventar preço, endereço ou horário.',
    porque: 'Preço, endereço e horário saem só daqui. O que faltar aparece marcado para você completar, nunca inventado.',
    sem: '"Pão de queijo por R$ 3,00" (e o seu custa R$ 4,50).',
    com: '"Pão de queijo por R$ 4,50, das 7h às 19h."',
  },
]

// Sugestões de palavras que mudam com o tom e o ramo escolhidos.
const PALAVRAS_DO_TOM = {
  'Próximo': ['a gente', 'bora', 'te esperamos', 'pertinho de você'],
  'Divertido': ['corre que acaba', 'partiu', 'sextou', 'que delícia'],
  'Direto': ['é só chamar', 'garanta o seu', 'sem enrolação'],
  'Acolhedor': ['com carinho', 'feito pra você', 'fique à vontade'],
  'Formal': ['agradecemos', 'à disposição', 'atendimento personalizado'],
  'Inspirador': ['faça acontecer', 'o seu momento', 'transforme'],
}
const PALAVRAS_DO_RAMO = {
  'Restaurante': ['feito na hora', 'sabor de casa', 'quentinho'],
  'Café ou padaria': ['saindo do forno', 'cafezinho', 'fresquinho'],
  'Loja': ['chegou novidade', 'peças únicas', 'últimas unidades'],
  'Beleza e estética': ['autoestima', 'se sentir bem', 'cuidado'],
  'Saúde': ['bem-estar', 'cuidado', 'agende o seu horário'],
  'Academia': ['bora treinar', 'foco', 'evolução'],
  'Serviços': ['orçamento sem compromisso', 'pontualidade', 'qualidade'],
  'Agência ou estúdio': ['sob medida', 'do zero ao ar', 'a gente cuida'],
}
const PALAVRAS_EVITADAS = ['barato', 'imperdível', 'clique no link', 'promoção relâmpago', 'gíria', 'palavrão', 'termo técnico']

const TRATAMENTOS = {
  'você': 'Vem experimentar, você vai amar.',
  'você, com cerimônia': 'Será um prazer receber você.',
  'o senhor / a senhora': 'Aguardamos a sua visita, senhor(a).',
  'vocês / pessoal': 'Bora, pessoal! Hoje tem novidade.',
}

const EXEMPLO_DE_LEGENDA = 'Saiu do forno agora a fornada das 16h.\nO pão de fermentação natural que vocês pedem toda semana voltou.\nCorre que às 17h já era. Chama no WhatsApp para separar o seu.'

// Liga e desliga uma expressão dentro do texto separado por vírgula.
function alternarPalavra(texto, palavra) {
  const lista = texto.split(',').map((p) => p.trim()).filter(Boolean)
  const nova = lista.includes(palavra) ? lista.filter((p) => p !== palavra) : [...lista, palavra]
  return nova.join(', ')
}

function Sugestoes({ opcoes, texto, onChange, rotulo }) {
  const marcadas = texto.split(',').map((p) => p.trim())
  return (
    <div className="sugestoes" role="group" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button key={o} type="button" className="ficha" aria-pressed={marcadas.includes(o)} onClick={() => onChange(alternarPalavra(texto, o))}>{o}</button>
      ))}
    </div>
  )
}

function Porque({ parte }) {
  return (
    <section className="porque" aria-label="Por que isso importa">
      <p className="porque__texto">{parte.porque}</p>
      <div className="porque__exemplo">
        <p className="porque__lado porque__lado--sem"><small>Sem isso</small>{parte.sem}</p>
        <p className="porque__lado porque__lado--com"><small>Com isso</small>{parte.com}</p>
      </div>
    </section>
  )
}

const RAMOS = ['Restaurante', 'Café ou padaria', 'Loja', 'Beleza e estética', 'Saúde', 'Academia', 'Serviços', 'Agência ou estúdio']
const TONS = ['Próximo', 'Divertido', 'Direto', 'Acolhedor', 'Formal', 'Inspirador']
const TIPOS = ['Promoção', 'Novidade', 'Bastidores', 'Dica', 'Cardápio ou catálogo', 'Depoimento', 'Aviso de horário', 'Antes e depois']

// Dica que abriu esta tela (vinda da Área): o campo dela ganha o recado e o foco.
const DicaContexto = createContext(null)

function Recado({ id }) {
  const dica = useContext(DicaContexto)
  if (dica?.campo !== id) return null
  return <p className="campo__dica" role="note"><strong>{dica.titulo}.</strong> {dica.porque}</p>
}

function Campo({ id, rotulo, ajuda, children }) {
  return (
    <div className="campo" data-campo={id}>
      <label htmlFor={id}>{rotulo}</label>
      <Recado id={id} />
      {ajuda && <p className="campo__ajuda">{ajuda}</p>}
      {children}
    </div>
  )
}

function Grupo({ id, rotulo, ajuda, children }) {
  return (
    <div className="campo" role="group" aria-label={rotulo} data-campo={id}>
      <span className="campo__rotulo">{rotulo}</span>
      <Recado id={id} />
      {ajuda && <p className="campo__ajuda">{ajuda}</p>}
      {children}
    </div>
  )
}

function Identidade({ v, mudar, negocioId }) {
  const [coresDoLogo, setCoresDoLogo] = useState(false)

  async function lerCoresDoLogo(arquivo) {
    const cores = await coresDaImagem(arquivo)
    if (cores.length) { mudar({ cores }); setCoresDoLogo(true) }
  }

  return (
    <>
      <Campo id="nome" rotulo="Nome do negócio">
        <input id="nome" value={v.nome} onChange={(e) => mudar({ nome: e.target.value })} placeholder="Como aparece na fachada" />
      </Campo>
      <Grupo rotulo="Ramo">
        <Fichas rotulo="Ramo" opcoes={RAMOS} valor={v.ramo} onChange={(ramo) => mudar({ ramo })} outra />
      </Grupo>
      <Grupo id="logo" rotulo="Logo" ajuda="PNG com fundo transparente fica melhor.">
        <Imagens negocioId={negocioId} valor={v.logo} onChange={(logo) => mudar({ logo })} maximo={1} tipo="logo" texto="Enviar logo" onArquivo={lerCoresDoLogo} />
      </Grupo>
      <Grupo rotulo="Cores da marca" ajuda="Até 3. Ao enviar o logo, a gente lê as cores dele. Toque na cor para trocar ou digite o código em HEX ou RGB.">
        <Cores valor={v.cores} onChange={(cores) => { mudar({ cores }); setCoresDoLogo(false) }} />
        {coresDoLogo && <p className="cores__aviso" role="status">Cores tiradas do seu logo. Confira e ajuste se precisar.</p>}
      </Grupo>
      <Grupo rotulo="Fonte dos títulos" ajuda="É a letra do título grande das peças. O resto do texto fica na fonte de leitura.">
        <div className="fontes" role="radiogroup" aria-label="Fonte dos títulos">
          {Object.entries(FONTES).map(([chave, f]) => (
            <button
              key={chave} type="button" role="radio" aria-checked={(v.fonte || 'moderna') === chave}
              className="fonte" onClick={() => mudar({ fonte: chave })}
            >
              <span className="fonte__amostra" style={{ fontFamily: `${f.familia}, var(--fonte)`, fontWeight: f.peso, fontSize: `${Math.round(28 * f.escala)}px` }}>{v.nome.trim().split(/\s+/)[0] || 'Sua marca'}</span>
              <span className="fonte__nome">{f.nome}</span>
            </button>
          ))}
        </div>
      </Grupo>
      <Grupo id="fotos" rotulo="Fotos da marca (opcional)" ajuda="O que mostra o seu trabalho: produtos, trabalhos entregues, bastidores, equipe ou o espaço. Até 6, entram nos posts.">
        <Imagens negocioId={negocioId} valor={v.fotos} onChange={(fotos) => mudar({ fotos })} maximo={6} tipo="foto" texto="Enviar fotos" />
      </Grupo>
    </>
  )
}

function Voz({ v, mudar, ramo }) {
  const [verExemplo, setVerExemplo] = useState(false)
  const sugeridas = [...new Set([...v.tom.flatMap((t) => PALAVRAS_DO_TOM[t] || []), ...(PALAVRAS_DO_RAMO[ramo] || [])])]
  return (
    <>
      <Grupo id="tom" rotulo="Tom" ajuda="Escolha até 3. As sugestões de palavras abaixo mudam conforme o tom.">
        <Fichas rotulo="Tom" opcoes={TONS} valor={v.tom} onChange={(tom) => mudar({ tom: tom.slice(0, 3) })} varias />
      </Grupo>
      <Grupo rotulo="Como trata o cliente">
        <Fichas rotulo="Tratamento" opcoes={Object.keys(TRATAMENTOS)} valor={v.tratamento} onChange={(tratamento) => mudar({ tratamento })} />
        {TRATAMENTOS[v.tratamento] && <p className="tratamento-exemplo">Por exemplo: <em>"{TRATAMENTOS[v.tratamento]}"</em></p>}
      </Grupo>
      <Grupo rotulo="Emoji">
        <Fichas rotulo="Emoji" opcoes={['nenhum', 'pouco', 'à vontade']} valor={v.emoji} onChange={(emoji) => mudar({ emoji })} />
      </Grupo>
      <Campo id="usa" rotulo="Palavras e expressões que a marca usa" ajuda={sugeridas.length ? 'Toque para escolher, ou escreva outras separadas por vírgula.' : 'Escolha um tom acima para ver sugestões, ou escreva separado por vírgula.'}>
        {sugeridas.length > 0 && <Sugestoes rotulo="Sugestões de palavras" opcoes={sugeridas} texto={v.usa} onChange={(usa) => mudar({ usa })} />}
        <input id="usa" value={v.usa} onChange={(e) => mudar({ usa: e.target.value })} placeholder="Escreva aqui as suas" />
      </Campo>
      <Campo id="evita" rotulo="Palavras que a marca evita" ajuda="Toque nas que não combinam com você.">
        <Sugestoes rotulo="Palavras para evitar" opcoes={PALAVRAS_EVITADAS} texto={v.evita} onChange={(evita) => mudar({ evita })} />
        <input id="evita" value={v.evita} onChange={(e) => mudar({ evita: e.target.value })} placeholder="Escreva outras, se quiser" />
      </Campo>
      <Campo id="exemplos" rotulo="Legendas que você gosta (opcional)" ajuda="Não tem? Pode pular. Se tiver, cole 1 a 3 legendas suas ou de quem você admira: a IA aprende o jeito, nunca copia.">
        <button type="button" className="link-botao" onClick={() => setVerExemplo(!verExemplo)} aria-expanded={verExemplo}>
          {verExemplo ? 'Esconder o exemplo' : 'Ver um exemplo'}
        </button>
        {verExemplo && <p className="exemplo-legenda">{EXEMPLO_DE_LEGENDA}</p>}
        <textarea id="exemplos" rows={5} value={v.exemplos} onChange={(e) => mudar({ exemplos: e.target.value })} />
      </Campo>
    </>
  )
}

function Padrao({ v, mudar }) {
  return (
    <>
      <Grupo rotulo="Que tipo de post você faz">
        <Fichas rotulo="Tipos de post" opcoes={TIPOS} valor={v.tipos} onChange={(tipos) => mudar({ tipos })} varias outra />
      </Grupo>
      <Grupo rotulo="Quantas vezes você publica por semana?" ajuda="Pode ser o que você faz hoje ou a sua meta. A gente usa para sugerir o ritmo das próximas peças.">
        <div className="frequencia">
          <div className="frequencia__item">
            <span><strong>Posts no feed</strong>ficam no perfil</span>
            <Contador rotulo="Posts no feed por semana" valor={v.feedPorSemana} onChange={(feedPorSemana) => mudar({ feedPorSemana })} maximo={21} />
          </div>
          <div className="frequencia__item">
            <span><strong>Stories</strong>somem em 24 horas</span>
            <Contador rotulo="Stories por semana" valor={v.storiesPorSemana} onChange={(storiesPorSemana) => mudar({ storiesPorSemana })} maximo={50} />
          </div>
        </div>
      </Grupo>
      <Campo id="chamada" rotulo="Chamada para ação" ajuda="O que você pede para o cliente fazer no fim do post.">
        <input id="chamada" value={v.chamada} onChange={(e) => mudar({ chamada: e.target.value })} placeholder="Chama no WhatsApp" />
      </Campo>
      <Campo id="hashtags" rotulo="Hashtags fixas">
        <input id="hashtags" value={v.hashtags} onChange={(e) => mudar({ hashtags: e.target.value })} placeholder="#zonaleste #cafedobairro" />
      </Campo>
    </>
  )
}

function Dados({ v, mudar }) {
  return (
    <>
      <p className="perfil__aviso">O que faltar aparece na peça como <span className="marcador">[SEU PREÇO]</span> para você completar.</p>
      <Campo id="endereco" rotulo="Endereço">
        <input id="endereco" value={v.endereco} onChange={(e) => mudar({ endereco: e.target.value })} placeholder="Rua, número, bairro" />
      </Campo>
      <Campo id="horario" rotulo="Horário de funcionamento">
        <input id="horario" value={v.horario} onChange={(e) => mudar({ horario: e.target.value })} placeholder="Seg a sex, 9h às 18h" />
      </Campo>
      <div className="perfil__dupla">
        <Campo id="whatsapp" rotulo="WhatsApp">
          <input id="whatsapp" value={v.whatsapp} onChange={(e) => mudar({ whatsapp: e.target.value })} inputMode="tel" placeholder="(11) 99999-9999" />
        </Campo>
        <Campo id="instagram" rotulo="Instagram">
          <input id="instagram" value={v.instagram} onChange={(e) => mudar({ instagram: e.target.value })} placeholder="@seunegocio" />
        </Campo>
      </div>
      <Campo id="site" rotulo="Site">
        <input id="site" value={v.site} onChange={(e) => mudar({ site: e.target.value })} inputMode="url" placeholder="seunegocio.com.br" />
      </Campo>
      <Grupo id="itens" rotulo="Produtos, serviços e preços" ajuda="Deixe o preço em branco se ele muda muito.">
        <Itens valor={v.itens} onChange={(itens) => mudar({ itens })} />
      </Grupo>
    </>
  )
}

const TELAS = { identidade: Identidade, voz: Voz, padrao: Padrao, dados: Dados }

export default function PerfilMarca({ negocioId, perfilInicial, parteInicial = 0, dica = null, onSair }) {
  const [perfil, setPerfil] = useState(perfilInicial)
  const [indice, setIndice] = useState(parteInicial)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const parte = PARTES[indice]
  const Tela = TELAS[parte.chave]
  const ultima = indice === PARTES.length - 1

  const dicaAqui = dica?.parte === indice ? dica : null

  // Abre já no campo da dica: rola até ele e põe o cursor no primeiro controle.
  useEffect(() => {
    if (!dicaAqui) return
    const campo = document.querySelector(`[data-campo="${dicaAqui.campo}"]`)
    if (!campo) return
    const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches
    campo.scrollIntoView({ block: 'center', behavior: calmo ? 'auto' : 'smooth' })
    const controle = campo.querySelector('textarea, input:not([type=file])') || campo.querySelector('button')
    controle?.focus({ preventScroll: true })
  }, [dicaAqui])

  function mudar(trecho) { setPerfil((p) => ({ ...p, [parte.chave]: { ...p[parte.chave], ...trecho } })) }

  async function salvar(proximo) {
    setSalvando(true)
    setErro('')
    try {
      await salvarPerfil(negocioId, perfil)
      if (proximo === 'sair' || ultima) onSair(perfil)
      else { setIndice(indice + 1); window.scrollTo({ top: 0 }) }
    } catch {
      setErro('Não deu para salvar agora. Confira a internet e tente de novo.')
    }
    setSalvando(false)
  }

  return (
    <div className="perfil">
      <header className="perfil__topo">
        <button type="button" className="botao botao--fantasma" onClick={() => onSair(null)}>Voltar</button>
        <div className="perfil__passos" aria-label={`Parte ${indice + 1} de 4`}>
          {PARTES.map((p, i) => <span key={p.chave} className={i <= indice ? 'aceso' : ''} />)}
        </div>
        <span className="mono perfil__contagem">{parte.numero}/04</span>
      </header>

      <main className="perfil__conteudo" key={parte.chave}>
        <p className="mono perfil__num">{parte.numero}</p>
        <h1 className="perfil__titulo">{parte.titulo}</h1>
        <Porque parte={parte} />
        <form className="perfil__form" onSubmit={(e) => { e.preventDefault(); salvar('seguir') }}>
          <DicaContexto.Provider value={dicaAqui}>
            <Tela v={perfil[parte.chave]} mudar={mudar} negocioId={negocioId} ramo={perfil.identidade.ramo} />
          </DicaContexto.Provider>
          {erro && <p className="campo__erro" role="alert">{erro}</p>}
          <div className="perfil__acoes">
            <button type="submit" className="botao botao--destaque" disabled={salvando}>
              {salvando ? 'Salvando...' : ultima ? 'Salvar e terminar' : 'Salvar e continuar'}
            </button>
            {!ultima && (
              <button type="button" className="perfil__depois" onClick={() => salvar('sair')} disabled={salvando}>
                Salvar e continuar depois
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  )
}

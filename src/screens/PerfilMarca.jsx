import { useState } from 'react'
import Fichas from '../components/campos/Fichas.jsx'
import Cores from '../components/campos/Cores.jsx'
import Imagens from '../components/campos/Imagens.jsx'
import Itens from '../components/campos/Itens.jsx'
import { salvarPerfil } from '../lib/perfil.js'
import './PerfilMarca.css'

export const PARTES = [
  { chave: 'identidade', numero: '01', titulo: 'Identidade visual', resumo: 'logo, cores, ramo e fotos' },
  { chave: 'voz', numero: '02', titulo: 'Como a marca fala', resumo: 'tom, palavras que usa e evita' },
  { chave: 'padrao', numero: '03', titulo: 'Padrão de postagem', resumo: 'tipos de post e frequência' },
  { chave: 'dados', numero: '04', titulo: 'Dados fixos', resumo: 'endereço, horário, preços' },
]

const RAMOS = ['Restaurante', 'Café ou padaria', 'Loja', 'Beleza e estética', 'Saúde', 'Academia', 'Serviços', 'Agência ou estúdio']
const TONS = ['Próximo', 'Divertido', 'Direto', 'Acolhedor', 'Formal', 'Inspirador']
const TIPOS = ['Promoção', 'Novidade', 'Bastidores', 'Dica', 'Cardápio ou catálogo', 'Depoimento', 'Aviso de horário', 'Antes e depois']

function Campo({ id, rotulo, ajuda, children }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      {ajuda && <p className="campo__ajuda">{ajuda}</p>}
      {children}
    </div>
  )
}

function Grupo({ rotulo, ajuda, children }) {
  return (
    <div className="campo" role="group" aria-label={rotulo}>
      <span className="campo__rotulo">{rotulo}</span>
      {ajuda && <p className="campo__ajuda">{ajuda}</p>}
      {children}
    </div>
  )
}

function Identidade({ v, mudar, negocioId }) {
  return (
    <>
      <Campo id="nome" rotulo="Nome do negócio">
        <input id="nome" value={v.nome} onChange={(e) => mudar({ nome: e.target.value })} placeholder="Como aparece na fachada" />
      </Campo>
      <Grupo rotulo="Ramo">
        <Fichas rotulo="Ramo" opcoes={RAMOS} valor={v.ramo} onChange={(ramo) => mudar({ ramo })} outra />
      </Grupo>
      <Grupo rotulo="Logo" ajuda="PNG com fundo transparente fica melhor.">
        <Imagens negocioId={negocioId} valor={v.logo} onChange={(logo) => mudar({ logo })} maximo={1} tipo="logo" texto="Enviar logo" />
      </Grupo>
      <Grupo rotulo="Cores da marca" ajuda="Até 3. A primeira é a principal.">
        <Cores valor={v.cores} onChange={(cores) => mudar({ cores })} />
      </Grupo>
      <Grupo rotulo="Fotos do negócio" ajuda="Produto, fachada, equipe. Até 6, entram nos posts.">
        <Imagens negocioId={negocioId} valor={v.fotos} onChange={(fotos) => mudar({ fotos })} maximo={6} tipo="foto" texto="Enviar fotos" />
      </Grupo>
    </>
  )
}

function Voz({ v, mudar }) {
  return (
    <>
      <Grupo rotulo="Tom" ajuda="Escolha até 3.">
        <Fichas rotulo="Tom" opcoes={TONS} valor={v.tom} onChange={(tom) => mudar({ tom: tom.slice(0, 3) })} varias />
      </Grupo>
      <Grupo rotulo="Como trata o cliente">
        <Fichas rotulo="Tratamento" opcoes={['você', 'vocês', 'tu', 'o senhor / a senhora']} valor={v.tratamento} onChange={(tratamento) => mudar({ tratamento })} />
      </Grupo>
      <Grupo rotulo="Emoji">
        <Fichas rotulo="Emoji" opcoes={['nenhum', 'pouco', 'à vontade']} valor={v.emoji} onChange={(emoji) => mudar({ emoji })} />
      </Grupo>
      <Campo id="usa" rotulo="Palavras e expressões que a marca usa" ajuda="Separe por vírgula.">
        <input id="usa" value={v.usa} onChange={(e) => mudar({ usa: e.target.value })} placeholder="quentinho, feito na hora, bora" />
      </Campo>
      <Campo id="evita" rotulo="Palavras que a marca evita">
        <input id="evita" value={v.evita} onChange={(e) => mudar({ evita: e.target.value })} placeholder="barato, imperdível" />
      </Campo>
      <Campo id="exemplos" rotulo="Legendas que você gosta" ajuda="Cole 1 a 3 legendas suas, ou de quem você admira. A IA usa como exemplo de jeito, nunca copia.">
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
          <label className="frequencia__item">
            <input type="number" min={0} max={21} inputMode="numeric" value={v.feedPorSemana} onChange={(e) => mudar({ feedPorSemana: Number(e.target.value) })} />
            <span><strong>Posts no feed</strong>ficam no perfil</span>
          </label>
          <label className="frequencia__item">
            <input type="number" min={0} max={50} inputMode="numeric" value={v.storiesPorSemana} onChange={(e) => mudar({ storiesPorSemana: Number(e.target.value) })} />
            <span><strong>Stories</strong>somem em 24 horas</span>
          </label>
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
      <p className="perfil__aviso">A IA só usa preço, endereço e horário daqui. O que faltar aparece na peça como <span className="marcador">[SEU PREÇO]</span> para você completar.</p>
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
      <Grupo rotulo="Produtos, serviços e preços" ajuda="Deixe o preço em branco se ele muda muito.">
        <Itens valor={v.itens} onChange={(itens) => mudar({ itens })} />
      </Grupo>
    </>
  )
}

const TELAS = { identidade: Identidade, voz: Voz, padrao: Padrao, dados: Dados }

export default function PerfilMarca({ negocioId, perfilInicial, parteInicial = 0, onSair }) {
  const [perfil, setPerfil] = useState(perfilInicial)
  const [indice, setIndice] = useState(parteInicial)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const parte = PARTES[indice]
  const Tela = TELAS[parte.chave]
  const ultima = indice === PARTES.length - 1

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
        <form className="perfil__form" onSubmit={(e) => { e.preventDefault(); salvar('seguir') }}>
          <Tela v={perfil[parte.chave]} mudar={mudar} negocioId={negocioId} />
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

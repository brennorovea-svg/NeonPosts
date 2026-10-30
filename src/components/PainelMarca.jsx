import { useEffect, useState } from 'react'
import { enderecoDaImagem } from '../lib/perfil.js'
import { fonteDa } from '../lib/fontes.js'
import './PainelMarca.css'

// A marca do jeito que fica guardada, em cartões. Cada cartão abre a edição da parte dele.
const MOSTRAR_ITENS = 8
const MOSTRAR_REGRAS = 6

function Imagem({ caminho, className, alt = '' }) {
  const [src, setSrc] = useState(null)
  useEffect(() => { let vivo = true; enderecoDaImagem(caminho).then((s) => vivo && setSrc(s)); return () => { vivo = false } }, [caminho])
  return src ? <img src={src} alt={alt} className={className} /> : <span className={`${className} painel__vazio`} aria-hidden="true" />
}

function Cartao({ numero, titulo, onEditar, largo, dicas = 0, children }) {
  return (
    <button type="button" className={`painel__cartao${largo ? ' painel__cartao--largo' : ''}`} onClick={onEditar}>
      <span className="painel__topo">
        <span className="mono painel__rotulo">{numero} · {titulo}</span>
        {dicas > 0 && <span className="mono painel__dicas">{dicas === 1 ? '1 dica' : `${dicas} dicas`}</span>}
        <span className="painel__editar">Editar</span>
      </span>
      {children}
    </button>
  )
}

const Fichas = ({ lista }) => lista.length > 0 && (
  <span className="painel__fichas">{lista.map((t) => <span key={t} className="painel__ficha">{t}</span>)}</span>
)

function Linha({ rotulo, valor, vazio }) {
  return (
    <span className="painel__linha">
      <span className="painel__chave">{rotulo}</span>
      {valor ? <span>{valor}</span> : <span className="painel__falta">{vazio || 'Não informado'}</span>}
    </span>
  )
}

const reais = (preco) => {
  const n = Number(String(preco).replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: n % 1 ? 2 : 0 }) : preco
}

export default function PainelMarca({ perfil, versao, dicas = [], onEditar, onGuia }) {
  const { identidade: i, voz: v, padrao: p, dados: d } = perfil
  // Dicas por cartão; as de itens contam no cartão de itens, as outras de dados no de dados fixos.
  const contar = (parte, itensDoCartao) => dicas.filter((x) => x.parte === parte && (parte !== 3 || (x.campo === 'itens') === itensDoCartao)).length
  const itens = d.itens.filter((x) => x.nome)
  const regras = v.guia?.regras || []
  return (
    <section className="painel" aria-labelledby="painel-titulo">
      <h2 id="painel-titulo" className="painel__titulo">Sua marca</h2>
      <div className="painel__marca">
        <Imagem caminho={i.logo} className="painel__logo" alt={`Logo da ${i.nome}`} />
        <span className="painel__nome">
          <strong>{i.nome}</strong>
          <span>{i.ramo}</span>
        </span>
        {versao > 0 && <span className="mono painel__versao">versão {versao}</span>}
      </div>

      <div className="painel__grade">
        <Cartao numero="01" titulo="Identidade" onEditar={() => onEditar(0)} dicas={contar(0)}>
          <span className="painel__cores">
            {i.cores.map((c) => (
              <span key={c} className="painel__cor"><span style={{ background: c }} /><span className="mono">{c.toUpperCase()}</span></span>
            ))}
          </span>
          <Linha rotulo="Fonte dos títulos" valor={fonteDa(i.fonte).nome} />
          {i.fotos.length > 0 && (
            <span className="painel__fotos">{i.fotos.slice(0, 4).map((f) => <Imagem key={f} caminho={f} className="painel__foto" />)}</span>
          )}
        </Cartao>

        <Cartao numero="02" titulo="Como a marca fala" onEditar={() => onEditar(1)} dicas={contar(1)}>
          <Fichas lista={v.tom} />
          <Linha rotulo="Usa" valor={v.usa} />
          <Linha rotulo="Evita" valor={v.evita} />
          <Linha rotulo="Trata por" valor={`${v.tratamento} · emoji ${v.emoji}`} />
        </Cartao>

        <Cartao numero="03" titulo="Padrão de postagem" onEditar={() => onEditar(2)} dicas={contar(2)}>
          <Fichas lista={p.tipos} />
          <Linha rotulo="Por semana" valor={`${p.feedPorSemana} posts e ${p.storiesPorSemana} stories`} />
          <Linha rotulo="Hashtags" valor={p.hashtags} />
          <Linha rotulo="Chamada" valor={p.chamada} />
        </Cartao>

        <Cartao numero="04" titulo="Dados fixos" onEditar={() => onEditar(3)} dicas={contar(3, false) + (itens.length ? 0 : contar(3, true))}>
          <Linha rotulo="Endereço" valor={d.endereco} />
          <Linha rotulo="Horário" valor={d.horario} vazio="Em branco: o app pergunta quando precisar" />
          <Linha rotulo="WhatsApp" valor={d.whatsapp} />
          <Linha rotulo="Instagram" valor={d.instagram} />
          <Linha rotulo="Site" valor={d.site} />
        </Cartao>

        {itens.length > 0 && (
          <Cartao numero="04" titulo={`Itens e preços · ${itens.length}`} onEditar={() => onEditar(3)} dicas={contar(3, true)} largo>
            <span className="painel__itens">
              {itens.slice(0, MOSTRAR_ITENS).map((x, k) => (
                <span key={k} className="painel__item"><span>{x.nome}</span><strong>{x.preco ? reais(x.preco) : '—'}</strong></span>
              ))}
            </span>
            {itens.length > MOSTRAR_ITENS && <span className="painel__mais">e mais {itens.length - MOSTRAR_ITENS}</span>}
          </Cartao>
        )}

        <Cartao numero="05" titulo="Guia da marca" onEditar={onGuia} largo>
          {regras.length ? (
            <ol className="painel__regras">
              {regras.slice(0, MOSTRAR_REGRAS).map((r, k) => <li key={k}>{r}</li>)}
            </ol>
          ) : (
            <span className="painel__falta">Ainda sem guia. Faça a entrevista da marca: 12 perguntas e a IA passa a seguir as suas regras em todo post.</span>
          )}
          {regras.length > MOSTRAR_REGRAS && <span className="painel__mais">e mais {regras.length - MOSTRAR_REGRAS}</span>}
        </Cartao>
      </div>
    </section>
  )
}

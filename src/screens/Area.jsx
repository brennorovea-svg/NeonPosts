import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { carregarPerfil, parteFeita, PERFIL_VAZIO } from '../lib/perfil.js'
import PerfilMarca, { PARTES } from './PerfilMarca.jsx'
import ApresentacaoMarca from './ApresentacaoMarca.jsx'
import './Area.css'

const NEGOCIO_DE_TESTE = { id: 'teste', nome: null, limite_pecas: 30 }

export default function Area({ sessao, teste = false }) {
  const [negocio, setNegocio] = useState(teste ? NEGOCIO_DE_TESTE : null)
  const [perfil, setPerfil] = useState(null)
  const [versao, setVersao] = useState(0)
  const [editando, setEditando] = useState(null) // índice da parte aberta
  const [erro, setErro] = useState('')
  const [apresentou, setApresentou] = useState(false)
  const usuario = sessao.user
  const primeiroNome = (usuario.user_metadata?.full_name || usuario.user_metadata?.name || '').split(' ')[0]

  useEffect(() => {
    if (teste || !supabase) return
    supabase.from('negocios').select('id, nome, limite_pecas').maybeSingle()
      .then(({ data }) => setNegocio(data))
  }, [teste])

  const recarregar = useCallback(() => {
    if (!negocio) return
    carregarPerfil(negocio.id)
      .then(({ versao: v, perfil: p }) => { setVersao(v); setPerfil(p) })
      .catch(() => { setErro('Não deu para carregar a sua marca. Atualize a página.'); setPerfil(PERFIL_VAZIO) })
  }, [negocio])

  useEffect(recarregar, [recarregar])

  if (editando !== null && perfil) {
    return (
      <PerfilMarca
        negocioId={negocio.id}
        perfilInicial={perfil}
        parteInicial={editando}
        onSair={(salvo) => {
          if (salvo) { setPerfil(salvo); recarregar() }
          setEditando(null)
          window.scrollTo({ top: 0 })
        }}
      />
    )
  }

  // Primeira vez (nenhuma versão salva): explica para que serve antes de tudo.
  if (perfil && versao === 0 && !apresentou) {
    return (
      <ApresentacaoMarca
        onComecar={() => { setApresentou(true); setEditando(0) }}
        onDepois={() => setApresentou(true)}
      />
    )
  }

  const limite = negocio?.limite_pecas ?? 30
  const feitas = perfil ? PARTES.map((p) => parteFeita(perfil, p.chave)) : [false, false, false, false]
  const total = feitas.filter(Boolean).length
  const proxima = feitas.indexOf(false)
  const nomeMarca = perfil?.identidade.nome || negocio?.nome

  return (
    <div className="area">
      <header className="area__topo">
        <p className="marca area__marca">Neon<span>posts</span></p>
        <div className="area__direita">
          <span className="mono area__contador" title="Peças usadas neste mês">0/{limite} peças</span>
          <button type="button" className="botao botao--fantasma" onClick={() => supabase?.auth.signOut()}>Sair</button>
        </div>
      </header>

      <main className="area__conteudo">
        <p className="mono area__ola">{primeiroNome ? `Olá, ${primeiroNome}` : 'Olá'}</p>
        {total === 4 ? (
          <>
            <h1 className="area__titulo">{nomeMarca ? `${nomeMarca} está pronta.` : 'Sua marca está pronta.'}</h1>
            <p className="area__texto">Tudo guardado. Toque em uma parte para rever ou mudar; cada mudança vira uma versão nova, sem perder a anterior.</p>
          </>
        ) : (
          <>
            <h1 className="area__titulo">Primeiro, conte a sua marca.</h1>
            <p className="area__texto">
              Com isso, cada post já sai com as suas cores, o seu jeito de falar e os seus dados certos.
              Você configura uma vez e fica guardado.
            </p>
          </>
        )}

        <ol className="area__passos">
          {PARTES.map((p, i) => (
            <li key={p.chave}>
              <button type="button" className="area__passo" onClick={() => setEditando(i)} disabled={!perfil}>
                <span className="mono area__num">{p.numero}</span>
                <span className="area__passo-texto">
                  <strong>{p.titulo}</strong>
                  <span>{p.resumo}</span>
                </span>
                <span className={`mono area__estado${feitas[i] ? ' area__estado--feito' : ''}`}>{feitas[i] ? 'Feito' : 'Falta'}</span>
              </button>
            </li>
          ))}
        </ol>

        {erro && <p className="campo__erro" role="alert">{erro}</p>}

        {total === 4 ? (
          <button type="button" className="botao botao--primario area__cta" disabled>Criar post · em breve</button>
        ) : (
          <button type="button" className="botao botao--primario area__cta" onClick={() => setEditando(proxima)} disabled={!perfil}>
            {total === 0 ? 'Começar' : `Continuar: ${PARTES[proxima].titulo}`}
          </button>
        )}
        <p className="area__email mono">
          {usuario.email}{versao > 0 && ` · marca na versão ${versao}`}
        </p>
      </main>
    </div>
  )
}

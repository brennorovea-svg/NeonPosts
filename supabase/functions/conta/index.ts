// LGPD: a pessoa baixa tudo que a conta guarda ou exclui a conta inteira.
// - "baixar": devolve um JSON com conta, marca (todas as versões), posts, agenda e os arquivos (links de 1 hora).
// - "excluir": cancela a assinatura na Stripe, apaga os arquivos do storage e apaga o login;
//   o banco apaga negócio, marca, posts, agenda e uso em cascata. Não chama a IA.
import Stripe from 'npm:stripe@22.6.2'
import { createClient } from 'npm:@supabase/supabase-js@2.117.3'

const CABECALHOS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CABECALHOS, 'Content-Type': 'application/json' } })
}
const erro = (mensagem: string, status: number) => resposta({ erro: mensagem }, status)

function chaveDeServico() {
  const antiga = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (antiga) return antiga
  try { return Object.values(JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'))[0] as string } catch { return '' }
}

const banco = createClient(Deno.env.get('SUPABASE_URL')!, chaveDeServico(), { auth: { persistSession: false } })
const chaveStripe = Deno.env.get('STRIPE_SECRET_KEY') || ''
const stripe = chaveStripe ? new Stripe(chaveStripe, { httpClient: Stripe.createFetchHttpClient() }) : null

// Todos os arquivos da pasta do negócio no bucket "marcas" (logo, fotos, cópias pequenas e imagens dos posts).
async function arquivosDoNegocio(negocioId: string) {
  const nomes: string[] = []
  for (let pagina = 0; pagina < 50; pagina++) {
    const { data, error } = await banco.storage.from('marcas').list(negocioId, { limit: 1000, offset: pagina * 1000 })
    if (error) throw error
    for (const a of data || []) if (a.name) nomes.push(`${negocioId}/${a.name}`)
    if (!data || data.length < 1000) break
  }
  return nomes
}

async function baixar(usuario: { id: string; email?: string; created_at: string }, negocio: Record<string, unknown>) {
  const id = negocio.id as string
  const [marca, posts, agenda, uso, arquivos] = await Promise.all([
    banco.from('perfis_marca').select('versao, identidade, voz, padrao, dados, criado_em').eq('negocio', id).order('versao'),
    banco.from('pecas').select('id, formato, modelo, pedido, roteiro, versoes, escolhida, fotos, imagem, refeitas, cortesia, criado_em').eq('negocio', id).order('criado_em'),
    banco.from('agenda').select('titulo, rede, formato, quando, lembrete_minutos, avisado_em, postado_em, peca, criado_em').eq('negocio', id).order('quando'),
    banco.from('uso_ia').select('funcao, peso, criado_em').eq('negocio', id).order('criado_em'),
    arquivosDoNegocio(id),
  ])
  // Links assinados de 1 hora para a pessoa baixar as imagens; o arquivo em si fica privado.
  const { data: links } = arquivos.length ? await banco.storage.from('marcas').createSignedUrls(arquivos, 3600) : { data: [] }
  return resposta({
    gerado_em: new Date().toISOString(),
    aviso: 'Os links dos arquivos valem por 1 hora. Os dados da marca e dos posts são os guardados no Neonposts até este momento.',
    conta: { email: usuario.email, criada_em: usuario.created_at, aceitou_termos_em: negocio.aceitou_termos_em, termos_versao: negocio.termos_versao },
    negocio: { nome: negocio.nome, plano: negocio.plano, limite_posts_por_mes: negocio.limite_pecas, assinatura_status: negocio.assinatura_status, renova_em: negocio.renova_em, cancela_no_fim: negocio.cancela_no_fim, criado_em: negocio.criado_em },
    marca: marca.data || [],
    posts: posts.data || [],
    agenda: agenda.data || [],
    uso_da_ia: uso.data || [],
    arquivos: (links || []).map((l, i) => ({ caminho: arquivos[i], link: l.signedUrl || null })),
  })
}

async function excluir(usuario: { id: string }, negocio: Record<string, unknown>) {
  const id = negocio.id as string
  // 1. Assinatura: cancela na hora para não cobrar de novo. Sem a Stripe ligada, segue (não há o que cancelar).
  if (negocio.stripe_assinatura && stripe) {
    try {
      await stripe.subscriptions.cancel(negocio.stripe_assinatura as string)
    } catch (falha) {
      // Já cancelada na Stripe é ok; outro erro para aqui, para a pessoa não ficar com cobrança viva e conta apagada.
      const codigo = (falha as { code?: string }).code
      if (codigo !== 'resource_missing') { console.error('stripe', falha); return erro('Não deu para cancelar a assinatura agora. Tente de novo em um minuto.', 502) }
    }
  }
  // 2. Arquivos: logo, fotos, cópias pequenas e imagens dos posts.
  try {
    const arquivos = await arquivosDoNegocio(id)
    for (let i = 0; i < arquivos.length; i += 100) {
      const { error } = await banco.storage.from('marcas').remove(arquivos.slice(i, i + 100))
      if (error) throw error
    }
  } catch (falha) {
    console.error('storage', falha)
    return erro('Não deu para apagar as fotos agora. Tente de novo.', 502)
  }
  // 3. Login: apagar o usuário apaga o negócio e, em cascata, marca, posts, agenda e uso.
  const { error } = await banco.auth.admin.deleteUser(usuario.id)
  if (error) { console.error('auth', error); return erro('Não deu para apagar o login agora. Tente de novo.', 502) }
  return resposta({ excluida: true })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS })
  if (req.method !== 'POST') return erro('Método não aceito.', 405)

  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  const { data: conta } = await banco.auth.getUser(token)
  if (!conta?.user) return erro('Entre de novo para continuar.', 401)

  const { data: negocio } = await banco.from('negocios')
    .select('id, nome, plano, limite_pecas, assinatura_status, renova_em, cancela_no_fim, stripe_assinatura, aceitou_termos_em, termos_versao, criado_em')
    .eq('dono', conta.user.id).single()
  if (!negocio) return erro('Não achamos o seu negócio.', 404)

  let corpo: { acao?: string }
  try { corpo = await req.json() } catch { return erro('Pedido inválido.', 400) }

  try {
    if (corpo.acao === 'baixar') return await baixar(conta.user, negocio)
    if (corpo.acao === 'excluir') return await excluir(conta.user, negocio)
    return erro('Ação desconhecida.', 400)
  } catch (falha) {
    console.error('conta', falha)
    return erro('Não deu para concluir agora. Tente de novo.', 502)
  }
})

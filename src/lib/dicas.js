// Onde a marca pode melhorar para as peças saírem melhores.
// Cada dica aponta a parte do perfil (0 a 3) e o campo que abre já em foco.
// Peso: 3 muda muito o resultado, 2 ajuda bastante, 1 é acabamento.

const temTexto = (t) => Boolean(String(t ?? '').trim())
const lista = (t) => String(t ?? '').split(',').map((p) => p.trim()).filter(Boolean)

const REGRAS = [
  {
    id: 'entrevista', parte: 'entrevista', campo: null, peso: 3,
    falta: (m) => !m.voz.guia?.regras?.length,
    titulo: 'Faça a entrevista da marca',
    porque: '12 perguntas rápidas sobre como a marca fala, o que nunca diz e quando mostra preço. Vira um guia que a IA segue em todo post.',
  },
  {
    id: 'exemplos', parte: 1, campo: 'exemplos', peso: 3,
    falta: (m) => !temTexto(m.voz.exemplos),
    titulo: 'Cole 1 a 3 legendas suas',
    porque: 'É o que mais ensina a IA a escrever do seu jeito. Pode ser legenda antiga ou de alguém que você admira.',
  },
  {
    id: 'itens', parte: 3, campo: 'itens', peso: 3,
    falta: (m) => m.dados.itens.filter((x) => temTexto(x.nome)).length === 0,
    titulo: 'Cadastre seus produtos ou serviços',
    porque: 'Sem eles, a IA não cita o que você vende e a peça sai genérica.',
  },
  {
    id: 'logo', parte: 0, campo: 'logo', peso: 3,
    falta: (m) => !m.identidade.logo,
    titulo: 'Envie o seu logo',
    porque: 'Com o logo, quem vê o post sabe que é seu antes de ler.',
  },
  {
    id: 'whatsapp', parte: 3, campo: 'whatsapp', peso: 3,
    falta: (m) => !temTexto(m.dados.whatsapp) && !temTexto(m.dados.site),
    titulo: 'Diga como o cliente fala com você',
    porque: 'WhatsApp ou site. Sem isso, a chamada do post fica sem destino.',
  },
  {
    id: 'poucos-itens', parte: 3, campo: 'itens', peso: 2,
    falta: (m) => { const n = m.dados.itens.filter((x) => temTexto(x.nome)).length; return n > 0 && n < 3 },
    titulo: (m) => { const n = m.dados.itens.filter((x) => temTexto(x.nome)).length; return `Só ${n === 1 ? '1 item cadastrado' : `${n} itens cadastrados`}` },
    porque: 'Com mais itens, a IA varia os posts e monta cardápio, tabela e vídeo em cenas.',
  },
  {
    id: 'sem-preco', parte: 3, campo: 'itens', peso: 2,
    falta: (m) => m.dados.itens.some((x) => temTexto(x.nome) && !temTexto(x.preco)),
    titulo: (m) => { const n = m.dados.itens.filter((x) => temTexto(x.nome) && !temTexto(x.preco)).length; return `${n === 1 ? '1 item está' : `${n} itens estão`} sem preço` },
    porque: 'Sem preço, a peça mostra [SEU PREÇO] e você precisa completar antes de postar. Se o preço muda muito, pode deixar assim.',
  },
  {
    id: 'evita', parte: 1, campo: 'evita', peso: 2,
    falta: (m) => !temTexto(m.voz.evita),
    titulo: 'Conte o que a marca nunca diz',
    porque: 'Palavras, apelidos e promessas que você não quer ver no post. A IA passa longe.',
  },
  {
    id: 'usa', parte: 1, campo: 'usa', peso: 2,
    falta: (m) => lista(m.voz.usa).length < 2,
    titulo: 'Diga as expressões da marca',
    porque: 'O jeito que você se chama, bordões e palavras do dia a dia deixam o texto com a sua cara.',
  },
  {
    id: 'fotos', parte: 0, campo: 'fotos', peso: 2,
    falta: (m) => m.identidade.fotos.length === 0,
    titulo: 'Envie fotos do seu trabalho',
    porque: 'Foto real vende mais que fundo de cor. A IA olha a foto e escreve sobre o que aparece nela.',
  },
  {
    id: 'chamada', parte: 2, campo: 'chamada', peso: 2,
    falta: (m) => m.padrao.chamada.trim().length < 6,
    titulo: 'Escreva a sua chamada para ação',
    porque: 'É o pedido do fim do post, como "Chama no WhatsApp para separar o seu".',
  },
  {
    id: 'instagram', parte: 3, campo: 'instagram', peso: 1,
    falta: (m) => !/^@[\w.]{2,30}$/.test(m.dados.instagram.trim()),
    titulo: (m) => (temTexto(m.dados.instagram) ? 'Confira o seu Instagram' : 'Coloque o seu Instagram'),
    porque: 'Escreva com @ e sem espaço, igual aparece no perfil, para a IA citar certo.',
  },
  {
    id: 'endereco', parte: 3, campo: 'endereco', peso: 1,
    falta: (m) => !temTexto(m.dados.endereco),
    titulo: 'Diga onde o cliente encontra você',
    porque: 'Endereço, bairro ou "só online". Sem isso, peça de visita sai com [ENDEREÇO].',
  },
  {
    id: 'hashtags', parte: 2, campo: 'hashtags', peso: 1,
    falta: (m) => m.padrao.hashtags.split(/[\s,]+/).filter((h) => h.replace(/#/g, '')).length < 2,
    titulo: 'Escolha as suas hashtags fixas',
    porque: 'Duas ou três da marca e do bairro entram em todo post.',
  },
  {
    id: 'tom', parte: 1, campo: 'tom', peso: 1,
    falta: (m) => m.voz.tom.length < 2,
    titulo: 'Escolha mais um tom',
    porque: 'Dois ou três tons juntos dão mais nuance ao texto.',
  },
]

const PESO_TOTAL = REGRAS.reduce((s, r) => s + r.peso, 0)

// Dicas em ordem de impacto, e quanto da marca está completo (0 a 100).
export function dicasDaMarca(perfil) {
  const dicas = REGRAS.filter((r) => r.falta(perfil)).map((r) => ({
    id: r.id, parte: r.parte, campo: r.campo, peso: r.peso,
    titulo: typeof r.titulo === 'function' ? r.titulo(perfil) : r.titulo,
    porque: r.porque,
  }))
  const faltando = dicas.reduce((s, d) => s + d.peso, 0)
  return { dicas: dicas.sort((a, b) => b.peso - a.peso), forca: Math.round(100 * (1 - faltando / PESO_TOTAL)) }
}

export const IMPACTO = { 3: 'Muda muito', 2: 'Ajuda bastante', 1: 'Acabamento' }

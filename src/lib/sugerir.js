// Antes de gerar, o app sugere 3 layouts para o pedido, sem chamar a IA:
// pelo tipo de post (escolhido na ficha ou percebido no texto) e por ter ou não foto.
// As miniaturas são desenhadas no aparelho com as cores e o logo da marca.

// Para cada tipo, os 3 layouts que mais combinam, com foto e sem foto.
const POR_TIPO = {
  Promoção: { foto: ['promo', 'mosaico', 'foto'], sem: ['promo', 'numero', 'cupom'] },
  Novidade: { foto: ['capa', 'dividido', 'mosaico'], sem: ['manchete', 'faixas', 'cartao'] },
  Bastidores: { foto: ['bastidores', 'mosaico', 'capa'], sem: ['manchete', 'conversa', 'citacao'] },
  Dica: { foto: ['lista', 'dividido', 'foto'], sem: ['lista', 'enquete', 'manchete'] },
  'Cardápio ou catálogo': { foto: ['tabela', 'promo', 'dividido'], sem: ['tabela', 'promo', 'lista'] },
  Depoimento: { foto: ['citacao', 'foto', 'capa'], sem: ['citacao', 'conversa', 'cartao'] },
  'Aviso de horário': { foto: ['agenda', 'aviso', 'cartao'], sem: ['agenda', 'aviso', 'cartao'] },
  'Antes e depois': { foto: ['comparar', 'dividido', 'bastidores'], sem: ['comparar', 'dividido', 'manchete'] },
}
const GERAL = { foto: ['dividido', 'capa', 'manchete'], sem: ['manchete', 'faixas', 'enquete'] }
// No vídeo, os stories com movimento que mais combinam com cada tipo.
const POR_TIPO_NO_VIDEO = {
  Promoção: { foto: ['vitrine', 'glitch', 'cenas'], sem: ['vitrine', 'glitch', 'contador'] },
  Novidade: { foto: ['acende', 'revelacao', 'cenas'], sem: ['acende', 'revelacao', 'glitch'] },
  Bastidores: { foto: ['aovivo', 'cenas', 'movimento'], sem: ['movimento', 'pronto', 'impacto'] },
  Dica: { foto: ['inclui', 'pergunta', 'cenas'], sem: ['inclui', 'pergunta', 'direct'] },
  'Cardápio ou catálogo': { foto: ['vitrine', 'cenas', 'semana'], sem: ['vitrine', 'semana', 'inclui'] },
  Depoimento: { foto: ['estrelas', 'direct', 'aovivo'], sem: ['estrelas', 'direct', 'impacto'] },
  'Aviso de horário': { foto: ['semana', 'contagem', 'local'], sem: ['semana', 'contagem', 'local'] },
  'Antes e depois': { foto: ['escolha', 'pergunta', 'cenas'], sem: ['escolha', 'pergunta', 'impacto'] },
}
const GERAL_NO_VIDEO = { foto: ['aovivo', 'impacto', 'cenas'], sem: ['impacto', 'direct', 'busca'] }

// Quando a pessoa escreve sem tocar numa ficha, o texto ainda diz o tipo.
const PISTAS = [
  ['Promoção', /promo|desconto|oferta|combo|\boff\b|black friday|liquida/i],
  ['Aviso de horário', /aviso|feriado|hor[aá]rio|fechad|abrir|abrimos|fechar/i],
  ['Depoimento', /depoimento|cliente (disse|falou)|avalia[cç]/i],
  ['Antes e depois', /antes e depois/i],
  ['Dica', /\bdicas?\b|passo a passo|erros? comu|como (escolher|fazer|cuidar)/i],
  ['Bastidores', /bastidor|equipe|preparando|por tr[aá]s/i],
  ['Cardápio ou catálogo', /card[aá]pio|cat[aá]logo|menu|mais pedidos/i],
  ['Novidade', /novidade|lan[cç]amento|lan[cç]amos|chegou|agora (a gente|tem)|novo/i],
]

export function tipoDoPedido(tipo, pedido) {
  if (tipo && POR_TIPO[tipo]) return tipo
  return PISTAS.find(([, r]) => r.test(pedido || ''))?.[0] || null
}

// No vídeo, os stories com movimento.
export function sugerirLayouts(tipo, temFoto, video = false) {
  const lista = video ? POR_TIPO_NO_VIDEO[tipo] || GERAL_NO_VIDEO : POR_TIPO[tipo] || GERAL
  return temFoto ? lista.foto : lista.sem
}

// Todos os layouts, com os 3 sugeridos na frente. No vídeo e no story, os com movimento vêm antes dos parados
// (Brenno, 30/10); no post, os que só servem para vídeo saem.
export function todosOsLayouts(sugeridos, todos, soNoVideo = [], video = false) {
  const validos = todos.filter((m) => video || !soNoVideo.includes(m))
  const resto = validos.filter((m) => !sugeridos.includes(m))
  return [...sugeridos.filter((m) => validos.includes(m)), ...resto.filter((m) => soNoVideo.includes(m)), ...resto.filter((m) => !soNoVideo.includes(m))]
}

// Texto de exemplo só para a miniatura mostrar onde cada coisa fica.
const AMOSTRA = {
  Promoção: { titulo: 'Oferta da semana', apoio: 'Só até domingo, para quem ainda não conhece a gente.', destaque: 'semana' },
  Novidade: { titulo: 'Tem novidade por aqui', apoio: 'Conta para quem ainda não viu o que mudou.', destaque: 'novidade' },
  Bastidores: { titulo: 'Por trás de cada pedido', apoio: 'O cuidado que vai em cada detalhe antes de chegar até você.', destaque: 'cada pedido' },
  Dica: { titulo: 'Dicas rápidas para o dia a dia', apoio: 'Salve para lembrar depois.', destaque: 'Dicas' },
  'Cardápio ou catálogo': { titulo: 'Os mais pedidos', apoio: 'Escolha o seu e chama a gente.', destaque: 'mais pedidos' },
  Depoimento: { titulo: 'Atendimento rápido e resultado lindo', apoio: 'Obrigado pela confiança.', destaque: 'resultado lindo' },
  'Aviso de horário': { titulo: 'Horário especial no feriado', apoio: 'O resto continua igual, é só chamar.', destaque: 'feriado' },
  'Antes e depois': { titulo: 'Antes e depois', apoio: 'O capricho que faz diferença.', destaque: 'depois' },
}
const AMOSTRA_GERAL = { titulo: 'Seu título aparece aqui', apoio: 'E aqui a frase que completa o título.', destaque: 'aqui' }

export function roteiroDeAmostra(modelo, tipo, perfil, temFoto) {
  const a = AMOSTRA[tipo] || AMOSTRA_GERAL
  const itens = (perfil.dados.itens || []).filter((i) => i.nome).slice(0, 2)
    .map((i) => ({ nome: i.nome, preco: i.preco ? `R$ ${String(i.preco).replace(/^r\$\s*/i, '')}` : 'R$ --' }))
  const nomes = (perfil.dados.itens || []).map((i) => i.nome).filter(Boolean)
  const PONTOS = {
    lista: ['Primeira dica', 'Segunda dica', 'Terceira dica'],
    cenas: ['Primeira cena', 'Segunda cena', 'Terceira cena'],
    conversa: ['Vocês atendem no fim de semana?', 'Dá para pedir pelo WhatsApp?'],
    faixas: nomes.length ? nomes.slice(0, 4) : (perfil.padrao.tipos || []).slice(0, 4),
    comparar: ['Como era antes', 'Como ficou depois'],
    enquete: ['Primeira opção', 'Segunda opção', 'Terceira opção'],
    tabela: nomes.length ? [] : ['Seu produto', 'Outro produto'],
    direct: ['Vocês entregam hoje?', 'Quanto fica?'],
    busca: [`${String(perfil.identidade.ramo || 'loja').toLowerCase()} perto de mim`],
    painel: ['12', '18', '15', '24', '31'],
    semana: ['SEG: Seu destaque', 'QUA: Outro destaque', 'SEX: Mais um destaque', 'SÁB: Aberto o dia todo'],
    inclui: ['Primeiro item', 'Segundo item', 'Terceiro item'],
    movimento: (nomes.length ? nomes.slice(0, 3) : ['Seu produto', 'Seu serviço']).map((n) => `Saiu agora · ${n}`),
    escolha: ['Opção um', 'Opção dois'],
    vitrine: nomes.length ? [] : ['Seu produto', 'Outro produto', 'Mais um'],
  }
  const APOIO = { busca: 'Seu resultado aparece aqui', painel: 'Pedidos por dia', local: String(perfil.dados.endereco || '').trim() || '[ENDEREÇO]', direct: '' }
  return {
    modelo,
    titulo: a.titulo,
    apoio: modelo in APOIO ? APOIO[modelo] : a.apoio,
    chamada: perfil.padrao.chamada || 'Chama no WhatsApp',
    itens: modelo === 'promo' ? (itens.length ? itens : [{ nome: 'Seu produto', preco: 'R$ --' }])
      : ['tabela', 'vitrine'].includes(modelo) ? (perfil.dados.itens || []).filter((i) => i.nome).slice(0, 4).map((i) => ({ nome: i.nome, preco: i.preco ? `R$ ${String(i.preco).replace(/^r\$\s*/i, '')}` : 'R$ --' }))
      : [],
    pontos: PONTOS[modelo] || [],
    autor: ['citacao', 'estrelas'].includes(modelo) ? 'Cliente' : '',
    numero: { numero: '30%', mosaico: '7 dias', contador: '1.200', comemoracao: '5' }[modelo] || '',
    cupom: modelo === 'cupom' ? 'BEMVINDO' : '',
    data: ['agenda', 'cupom', 'contagem'].includes(modelo) ? '29/11' : '',
    horario: modelo === 'agenda' ? '10h às 14h' : '',
    arte: { destaque: a.destaque, tamanho_titulo: 'normal', alinhamento: '', fundo: temFoto && ['manchete', 'cartao'].includes(modelo) ? 'foto' : '' },
    cores: {},
  }
}

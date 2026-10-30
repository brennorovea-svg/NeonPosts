// Parte pura da função gerar-peca: instruções para a IA, formato da resposta e a
// conferência final, que tira qualquer preço, data, horário ou telefone inventado.

// Stories com movimento (desenho em src/lib/historias.js): só no vídeo.
export const HISTORIAS = [
  'direct', 'busca', 'contador', 'painel', 'semana', 'impacto', 'acende', 'revelacao', 'glitch', 'pergunta',
  'inclui', 'comemoracao', 'pronto', 'movimento', 'estrelas', 'aovivo', 'contagem', 'escolha', 'vitrine', 'local',
]
// Animados feitos para a foto (desenho em src/lib/desenhar.js): só no animado e só com foto.
export const ANIMADOS_DA_FOTO = ['zoom', 'cortina', 'cardfoto', 'deslize', 'moldura', 'portas', 'foco']
export const MODELOS = [
  'promo', 'aviso', 'bastidores', 'manchete', 'lista', 'citacao', 'dividido', 'foto', 'cartao',
  'numero', 'cupom', 'agenda', 'conversa', 'mosaico', 'faixas', 'capa', 'comparar', 'tabela', 'enquete', 'polaroid', 'cenas',
  ...HISTORIAS, ...ANIMADOS_DA_FOTO,
]
// Só no animado (post 4:5 ou story 9:16 em vídeo).
export const SO_NO_VIDEO = ['cenas', ...HISTORIAS, ...ANIMADOS_DA_FOTO]
// Com foto, o parado usa só layouts em que a foto é o centro; os outros viram o mais parecido com foto (Brenno, 30/10).
const PARADOS_COM_FOTO = ['foto', 'bastidores', 'capa', 'dividido', 'promo', 'mosaico', 'comparar', 'polaroid',
  'numero', 'conversa', 'citacao', 'enquete', 'agenda', 'cupom', 'lista', 'tabela']
const COM_FOTO: Record<string, string> = { aviso: 'dividido', manchete: 'foto', cartao: 'foto', faixas: 'mosaico', escolha: 'cardfoto' }
// Sem foto, os que precisam dela viram o da marca mais parecido.
const SEM_FOTO: Record<string, string> = {
  polaroid: 'bastidores', zoom: 'impacto', cortina: 'revelacao', cardfoto: 'impacto', deslize: 'escolha', moldura: 'acende', portas: 'impacto', foco: 'vitrine',
}
// Fora do animado, cada um vira o layout parado mais parecido.
const PARECIDO: Record<string, string> = {
  zoom: 'foto', cortina: 'foto', cardfoto: 'foto', deslize: 'comparar', moldura: 'polaroid', portas: 'numero', foco: 'promo',
  cenas: 'lista', direct: 'conversa', busca: 'manchete', contador: 'numero', painel: 'numero', semana: 'lista',
  impacto: 'manchete', acende: 'manchete', revelacao: 'manchete', glitch: 'manchete', pergunta: 'cartao', inclui: 'lista',
  comemoracao: 'numero', pronto: 'aviso', movimento: 'lista', estrelas: 'citacao', aovivo: 'bastidores', contagem: 'agenda',
  escolha: 'enquete', vitrine: 'tabela', local: 'aviso',
}
// Quantos pontos cada modelo aceita (o padrão é 4).
const PONTOS_POR_MODELO: Record<string, number> = { semana: 7, painel: 7, inclui: 5 }
const TAMANHOS = ['normal', 'grande', 'gigante']
const ALINHAMENTOS = ['esquerda', 'centro', 'direita']
const FUNDOS = ['marca', 'escuro', 'claro', 'foto']

export const ESQUEMA = {
  type: 'object',
  properties: {
    modelo: { type: 'string', enum: MODELOS },
    titulo: { type: 'string' },
    apoio: { type: 'string' },
    itens: { type: 'array', items: { type: 'string' } },
    chamada: { type: 'string' },
    legenda: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } },
    pontos: { type: 'array', items: { type: 'string' } },
    autor: { type: 'string' },
    numero: { type: 'string' },
    cupom: { type: 'string' },
    data: { type: 'string' },
    horario: { type: 'string' },
    arte: {
      type: 'object',
      properties: {
        destaque: { type: 'string' },
        tamanho_titulo: { type: 'string', enum: TAMANHOS },
        alinhamento: { type: 'string', enum: ALINHAMENTOS },
        fundo: { type: 'string', enum: FUNDOS },
      },
      required: ['destaque', 'tamanho_titulo', 'alinhamento', 'fundo'],
      additionalProperties: false,
    },
    cores: {
      type: 'object',
      properties: { titulo: { type: 'string' }, texto: { type: 'string' }, destaque: { type: 'string' } },
      required: ['titulo', 'texto', 'destaque'],
      additionalProperties: false,
    },
    ordem_fotos: { type: 'array', items: { type: 'integer' } },
    nao_deu: { type: 'array', items: { type: 'string' } },
  },
  required: ['modelo', 'titulo', 'apoio', 'itens', 'chamada', 'legenda', 'hashtags', 'pontos', 'autor', 'numero', 'cupom', 'data', 'horario', 'arte', 'cores', 'ordem_fotos', 'nao_deu'],
  additionalProperties: false,
}

export const INSTRUCOES = `Você escreve posts e stories de Instagram para pequenos negócios brasileiros, sempre na voz da marca descrita pelo dono. Recebe um pedido curto e devolve o roteiro de uma peça.

Guia da marca
- Se a marca tiver "voz.guia.regras", siga cada regra em todos os campos da peça. O guia vale acima das outras orientações de estilo daqui, mas nunca libera inventar dado.

Dados que não podem ser inventados
- Preço, endereço, data, horário e telefone só podem vir dos dados fixos da marca ou do próprio pedido.
- Se a peça precisar de um desses e ele não existir, escreva exatamente o marcador: [SEU PREÇO], [ENDEREÇO], [DATA], [HORÁRIO] ou [TELEFONE]. O dono troca antes de postar.
- Em "itens", use só nomes da lista de itens da marca, escritos igual. O sistema coloca o preço; não escreva preço em nenhum outro campo. Deixe "itens" vazio se o pedido não fala de itens.

Texto da arte
- "titulo": até 6 palavras, forte, sem ponto final.
- "apoio": uma frase de até 18 palavras que completa o título. Conte as palavras: passou de 18, corte.
- "chamada": até 5 palavras, começando pelo verbo, ligada à chamada preferida da marca.

Legenda
- Na voz da marca: tom, tratamento, palavras que usa e que evita, e no jeito das legendas de exemplo.
- Emoji conforme a preferência da marca: "nenhum" é nenhum, "pouco" é no máximo dois.
- Termina com a chamada. Sem hashtags na legenda.

Como escrever bem
- A primeira linha da legenda é o gancho: uma pergunta, um benefício direto ou uma frase curta que faça parar de rolar. Evite aberturas gastas como "Chegou o dia" quando não forem exatamente o caso.
- Fale do ganho de quem lê, com detalhes concretos do pedido e da marca. Se a frase serviria para qualquer negócio, reescreva.
- Título da arte, apoio e legenda se completam; não repita a mesma frase.
- Post de feed: legenda de 3 a 6 frases curtas, em parágrafos. Story: legenda de 1 ou 2 frases, porque a arte faz o trabalho.
- Contato (WhatsApp, site, Instagram) só quando a chamada pedir, e escrito como está nos dados fixos.

"hashtags": de 3 a 8, sem repetir, incluindo as fixas da marca.

"cores": o app desenha a arte com as cores da marca. Só preencha quando o pedido ou o ajuste pedir uma cor; senão deixe os três vazios (""). Use código hex de 6 dígitos, na cor que a pessoa nomeou (vermelho "#E53935", verde "#2E7D32", azul "#1E63D6"); o app ajusta o tom para dar leitura sobre o fundo. Se o pedido der duas cores sem dizer onde, ponha a primeira no título e a segunda no destaque. "titulo" é a cor do título da arte, "texto" a da frase de apoio, "destaque" a do botão, da moldura e dos detalhes. "Palavras em branco" ou "texto" quer dizer título e apoio. Se a versão anterior tinha cores e o ajuste não fala delas, repita as mesmas.

Arte: você também decide como a peça é desenhada, para cada peça ter a sua cara.
"modelo", o layout:
- "promo": oferta com itens e preço (usa "itens").
- "aviso": comunicado curto e centralizado, com moldura (horário, feriado, recado).
- "bastidores": foto do dia a dia ocupando tudo, texto embaixo. Melhor com foto.
- "manchete": título enorme como protagonista, para novidade ou frase de impacto.
- "lista": título e de 2 a 4 pontos numerados em "pontos", para dica, passo a passo ou o que está incluso.
- "citacao": a fala de um cliente no "titulo", com o nome em "autor", para depoimento.
- "dividido": foto em cima e texto embaixo, para lançamento ou produto.
- "foto": foto inteira com um cartão de texto embaixo. Só com foto.
- "cartao": cartão branco no meio, para convite, evento ou comunicado mais formal.
- "numero": um número enorme é o protagonista (50%, 7 dias, 3x), com o título embaixo. Usa "numero".
- "cupom": cupom recortado com o código e a validade. Usa "cupom" e, se houver, "data" (validade).
- "agenda": folha de calendário com o dia e o horário, para evento, aula, live ou data especial. Usa "data" e "horario".
- "conversa": perguntas de cliente em balões ("pontos") e a resposta da marca no "titulo", para dúvida frequente.
- "mosaico": três quadros (foto, outro pedaço da foto e um bloco de cor com "numero" ou o destaque) e o texto embaixo. Melhor com foto.
- "faixas": duas fitas inclinadas com palavras curtas da marca ("pontos") e o título no meio, para lançamento ou chamada geral.
- "capa": capa de revista com o nome da marca no alto, a chamada da matéria no "apoio" e o título grande embaixo. Melhor com foto.
- "comparar": antes e depois em texto, lado a lado: "pontos" com exatamente 2 frases, a primeira o antes e a segunda o depois.
- "tabela": tabela de preços com os itens da marca (usa "itens"), para cardápio ou lista de serviços.
- "enquete": a pergunta no "titulo" e de 2 a 4 opções em "pontos", para enquete nos stories.
- "cenas": só quando o formato é vídeo. Vídeo em cenas: abre com o "titulo" e o "apoio", mostra um item da lista ("itens") ou um ponto ("pontos") por cena e fecha com o logo e a "chamada". Bom para cardápio, lançamento de mais de um produto, passo a passo ou várias fotos. Fora do vídeo, nunca use.
Stories com movimento: só quando o formato é vídeo. Fora do vídeo, nunca use. Cada um tem uma animação própria; escolha pelo que o pedido quer dizer:
- "direct": 1 a 3 perguntas de cliente em "pontos" chegam como mensagem e a marca responde no "titulo" (até 10 palavras). Dúvida frequente, preço, entrega.
- "busca": alguém digita uma busca ("pontos" com 1 termo, ex.: "pizzaria perto de mim"), a marca aparece nos resultados com o "apoio" curto embaixo do nome (até 6 palavras) e o "titulo" fecha. Para ser achado no Google e no mapa.
- "contador": um número real do pedido ou da marca em "numero" conta do zero; o "titulo" explica o número. Resultado, marca, número que impressiona.
- "painel": gráfico de linha com 3 a 7 números do pedido em "pontos" (só os números, na ordem, ex.: "12", "18", "25"); "apoio" diz o que eles medem, curto. Só se o pedido trouxer os números.
- "semana": programação da semana em "pontos", de 2 a 7, cada um "SEG: o que tem" (SEG, TER, QUA, QUI, SEX, SÁB, DOM). O dia de hoje acende.
- "impacto": uma frase da voz da marca, grande, palavra por palavra, no "titulo" (até 10 palavras). Manifesto, promessa.
- "acende": título curto acendendo como letreiro em fundo escuro. Lançamento, novidade.
- "revelacao": título curto que aparece embaralhado e se revela, em fundo escuro. Teaser, "em breve".
- "glitch": "NOVO" com corte de cor e o título embaixo, em fundo escuro. Novidade com cara de tecnologia.
- "pergunta": a pergunta no "titulo" e a resposta no "apoio" (até 18 palavras), que sobe como cortina. Curiosidade, mito ou verdade.
- "inclui": o que vem no pacote, combo ou serviço, em "pontos" (2 a 5, até 5 palavras cada), com check que se desenha.
- "comemoracao": um número em "numero" (anos, clientes, pedidos) conta e solta confete; o "titulo" diz o motivo. Aniversário, meta batida.
- "pronto": carregando que vira check, com a confirmação no "titulo" (ex.: "Seu pedido saiu"). Pedido pronto, horário confirmado.
- "movimento": avisos do dia chegando, em "pontos" (2 a 4, cada um "Título · detalhe", ex.: "Encomenda pronta · bolo de pote"), só com o que o pedido conta; o "titulo" chama para ser o próximo.
- "estrelas": cinco estrelas acendem e o depoimento do cliente entra no "titulo" (até 18 palavras, sem aspas), com o nome em "autor".
- "aovivo": a foto aproxima devagar, selo de ao vivo e o "apoio" digitado como legenda; o "titulo" fecha. Bastidores, preparo, equipe. Melhor com foto.
- "contagem": quantos dias faltam até a "data" do pedido (ex.: "29/11"); o "titulo" é o evento. Inauguração, campanha, evento.
- "escolha": isso ou aquilo, "pontos" com exatamente 2 opções de até 3 palavras; "titulo" com a pergunta curta. Engajamento.
- "vitrine": os itens da lista ("itens") com preço correndo em duas fitas, "titulo" curto. Sem itens, "pontos" com 3 a 6 nomes curtos. Cardápio, catálogo.
- "local": mapa com pino caindo e o endereço dos dados fixos digitado; o app escreve o endereço, o "titulo" convida a vir. Como chegar.
Com foto, o parado também tem "polaroid": a foto em moldura branca, com legenda curta à mão (o "apoio", até 5 palavras), e o título embaixo. Bastidores, agradecimento, momento.
Animados feitos para a foto (só no vídeo e só com foto; a foto é a primeira coisa que se mexe):
- "zoom": a foto aproxima devagar e o texto sobe no pé. Bastidores, aviso, depoimento.
- "cortina": a cor da marca com o nome cobre a foto e sobe, revelando. Novidade, lançamento.
- "cardfoto": a foto sobe num card sobre a cor da marca; com "numero", ele estala num selo. Novidade, promoção.
- "deslize": antes e depois; a foto do depois (a 1ª) entra deslizando sobre a do antes (a 2ª). Resultado, reforma.
- "moldura": a foto num quadro e a borda acende como letreiro. Aviso de horário, abertura, evento.
- "portas": dois painéis da marca se abrem e mostram a foto e o "numero" da oferta. Promoção, cupom, lançamento.
- "foco": começa no detalhe e abre para a foto toda; o primeiro dos "itens" aponta o produto com o preço. Produto, cardápio.
Varie: não use sempre o mesmo. Com foto, a foto é sempre o centro: no parado use "foto", "bastidores", "capa", "dividido", "promo", "mosaico", "comparar", "polaroid", "numero", "conversa", "citacao", "enquete", "agenda", "cupom", "lista" ou "tabela" (com foto, esses ganham a versão com a foto); no vídeo, prefira os animados feitos para a foto ou o "cenas". Sem foto, não use "polaroid" nem os animados feitos para a foto. No vídeo sem foto, prefira o story com movimento que mais combina com o pedido; com 2 ou mais itens ou pontos para mostrar um a um, "cenas".
"pontos": nos stories com movimento, como está em cada um acima; no "cenas" (2 a 4 frases de até 8 palavras, uma por cena, quando a peça não fala de itens da lista), no "lista" (2 a 4 frases de até 6 palavras), "conversa" (1 a 3 perguntas de até 12 palavras, no jeito de um cliente escrever), "faixas" (3 a 5 palavras soltas), "comparar" (2 frases de até 6 palavras) e "enquete" (2 a 4 opções de até 5 palavras); nos outros, lista vazia. "autor": só no "citacao" e no "estrelas"; nos outros, "".
"numero": só no "numero", no "mosaico", no "contador", no "comemoracao", no "cardfoto" e no "portas", o número que é o coração da peça, curto (até 7 caracteres, ex.: "50%", "7 dias", "3x"). Tem de estar no pedido ou nos dados da marca; se não estiver, "" e o app usa o título. Nos outros modelos, "".
"cupom": só no "cupom", o código escrito igual ao pedido. Se o pedido não traz o código, escreva [CUPOM]. Nos outros, "".
"data" e "horario": no "agenda", na validade do "cupom" e no "contagem" (só "data"). Só do pedido ou dos dados da marca; se a peça precisa e não tem, [DATA] e [HORÁRIO]. "data" curta (ex.: "29/11"), "horario" curto (ex.: "10h às 14h"). Nos outros, "".
"arte":
- "destaque": 1 a 3 palavras do título, escritas igual a ele, que a arte pinta na cor de destaque (o coração da mensagem). "" para nenhuma.
- "tamanho_titulo": "normal", "grande" ou "gigante" (título curto e forte pede maior).
- "alinhamento": "esquerda", "centro" ou "direita". Se o pedido ou o ajuste pedir um alinhamento, use exatamente esse. "aviso" e "cartao" são sempre centralizados: se o pedido quiser texto à esquerda ou à direita, escolha outro modelo (se o dono já escolheu um desses dois layouts, mantenha centralizado e ponha o alinhamento em "nao_deu").
- "fundo": "marca" (cores da marca), "escuro", "claro" ou "foto" (só se houver foto).

Fotos
- Quando o dono manda fotos, elas vêm antes do texto, na ordem 1, 2, 3... Olhe cada uma antes de escrever.
- Escreva sobre o que aparece de verdade (o produto, o prato, o serviço, o lugar, as pessoas), com detalhe concreto. Não diga que a foto mostra algo que não está nela, e não descreva a foto quando ela não tem relação com o pedido.
- Nunca leia preço, data, horário, telefone ou endereço de dentro da foto: esses dados continuam vindo só do pedido e da marca.
- "ordem_fotos": os números das fotos na ordem em que devem aparecer, a primeira é a que abre a peça (a mais bonita e mais ligada ao pedido). Sem fotos, lista vazia.

Pedidos sobre o visual: no pedido ou no ajuste, a pessoa pode pedir layout, destaque, tamanho do título, alinhamento, fundo claro ou escuro e cores. Atenda mudando esses campos. Esses pedidos são instrução para a arte: não escreva sobre eles no texto da peça.
"nao_deu": cada coisa que o pedido ou o ajuste pediu sobre o visual e esses campos não fazem (trocar a foto, mudar a fonte, texto em itálico, mover o logo), em frase curta começando pelo verbo, por exemplo "trocar a fonte". Lista vazia quando deu para atender tudo. Nunca invente o que não dá.`

// O que cada layout precisa quando o dono já escolheu (o texto tem de caber nele).
const DICAS_DO_LAYOUT: Record<string, string> = {
  promo: 'oferta com título curto; preencha "itens" se o pedido fala de itens da lista.',
  aviso: 'comunicado curto e direto, título de até 5 palavras.',
  bastidores: 'título curto sobre o momento mostrado; o apoio conta o que está acontecendo.',
  manchete: 'título forte e curto, de até 5 palavras, que funcione sozinho.',
  lista: 'preencha "pontos" com 2 a 4 frases de até 6 palavras.',
  citacao: 'a fala do cliente vai no "titulo" (até 18 palavras, sem aspas) e o nome em "autor" (vazio se o pedido não tem o nome).',
  dividido: 'título curto e apoio que completa; a foto ou a cor da marca fica em cima.',
  foto: 'título curto, a foto é a protagonista.',
  cartao: 'tom de convite ou comunicado, título de até 6 palavras.',
  numero: 'preencha "numero" com o número do pedido (ex.: "50%"); o título completa o número em até 5 palavras.',
  cupom: 'título curto com a oferta (ex.: "50% off"); "cupom" com o código do pedido ou [CUPOM]; "data" com a validade, se houver.',
  agenda: '"data" e "horario" do pedido (ou os marcadores); título com o nome do evento, até 6 palavras.',
  conversa: '"pontos" com 1 a 3 perguntas que um cliente faria e a resposta da marca no "titulo", até 10 palavras.',
  mosaico: 'título curto; "numero" com um número do pedido, se houver.',
  faixas: '"pontos" com 3 a 5 palavras soltas da marca (serviços, produtos, valores); título de até 5 palavras.',
  capa: 'título de manchete de revista, até 7 palavras; o "apoio" é a chamada da matéria; a "chamada" cabe em 2 palavras.',
  comparar: '"pontos" com exatamente 2 frases de até 6 palavras: antes e depois.',
  tabela: 'preencha "itens" com os itens da lista que entram; título curto.',
  enquete: 'a pergunta no "titulo" e 2 a 4 opções curtas em "pontos".',
  cenas: 'título de abertura de até 6 palavras e apoio curto; "itens" com os itens da lista que entram (até 4) ou, sem itens, "pontos" com 2 a 4 frases de até 8 palavras, uma por cena; "chamada" fecha o vídeo.',
  direct: '"pontos" com 1 a 3 perguntas que um cliente faria, no jeito de escrever no direct; a resposta da marca no "titulo", até 10 palavras; "apoio" vazio.',
  busca: '"pontos" com 1 termo de busca que o cliente digitaria (ex.: "salão de beleza perto de mim"); "apoio" com até 6 palavras que aparecem sob o nome no resultado, sem inventar horário; título de até 6 palavras.',
  contador: '"numero" com um número real do pedido ou da marca (ex.: "1.200"); o título explica o número em até 6 palavras. Sem número, deixe "numero" vazio e escreva uma frase forte no título.',
  painel: '"pontos" com 3 a 7 números do pedido, na ordem (só o número); "apoio" diz o que medem, em até 6 palavras; título de até 6 palavras. Sem números no pedido, "pontos" vazio.',
  semana: '"pontos" com 2 a 7 dias no formato "SEG: o que tem"; título de até 5 palavras.',
  impacto: 'uma frase forte da voz da marca no "titulo", até 10 palavras; "apoio" opcional e curto.',
  acende: 'título curto de lançamento, até 5 palavras; apoio curto.',
  revelacao: 'título curto, até 5 palavras, que dá vontade de saber mais; apoio com o convite (ex.: ativar o lembrete).',
  glitch: 'título curto do que é novo, até 6 palavras; apoio curto.',
  pergunta: 'a pergunta no "titulo", até 10 palavras; a resposta no "apoio", até 18 palavras.',
  inclui: '"pontos" com 2 a 5 itens do que vem, até 5 palavras cada; título de até 6 palavras.',
  comemoracao: '"numero" com o número que se comemora (anos, clientes), do pedido ou da marca; título com o motivo, até 6 palavras.',
  pronto: 'título com a confirmação, até 6 palavras (ex.: "Seu pedido saiu do forno"); apoio curto.',
  movimento: '"pontos" com 2 a 4 avisos "Título · detalhe" só com o que o pedido conta; título de até 6 palavras chamando para ser o próximo.',
  estrelas: 'a fala do cliente no "titulo" (até 18 palavras, sem aspas) e o nome em "autor" (vazio se o pedido não tem o nome).',
  aovivo: '"apoio" é a legenda digitada sobre a foto, até 12 palavras; título curto.',
  contagem: '"data" do pedido (ou [DATA]); título com o nome do evento, até 6 palavras.',
  escolha: '"pontos" com exatamente 2 opções de até 3 palavras; título com a pergunta, até 6 palavras.',
  vitrine: '"itens" com os itens da lista que entram (até 6); sem itens, "pontos" com 3 a 6 nomes curtos; título de até 4 palavras.',
  local: 'título de até 6 palavras convidando a vir; o endereço o app tira dos dados fixos.',
  polaroid: 'título curto, até 6 palavras; "apoio" é a legenda à mão da foto, até 5 palavras.',
  zoom: 'título curto sobre o que a foto mostra, até 7 palavras; apoio curto.',
  cortina: 'título curto de novidade, até 6 palavras; apoio curto.',
  cardfoto: 'título curto, até 6 palavras; "numero" com o número do pedido (ex.: "30%"), se houver.',
  deslize: 'título com o resultado, até 7 palavras; apoio curto.',
  moldura: 'título curto, até 6 palavras, como um letreiro aceso.',
  portas: '"numero" com a oferta do pedido (ex.: "2x1", "30%"), se houver; título que completa, até 6 palavras.',
  foco: '"itens" com o produto da foto, se estiver na lista; título curto, até 6 palavras.',
}

type Perfil = {
  identidade: { nome: string; ramo: string }
  voz: Record<string, unknown>
  padrao: { tipos: string[]; hashtags: string; chamada: string }
  dados: { endereco: string; horario: string; whatsapp: string; instagram: string; site: string; itens: { nome: string; preco: string }[] }
}

// `fotos`: quantas o dono mandou; `vistas`: quantas a IA recebe como imagem (as que têm cópia pequena).
export function montarMensagem(perfil: Perfil, pedido: string, formato: string, anterior?: Record<string, unknown> | null, ajuste?: string, fotos = 0, layout = '', video = false, vistas = 0) {
  // Do guia da marca vão só as regras; as respostas da entrevista ficam no perfil.
  const guia = (perfil.voz as { guia?: { regras?: string[] } }).guia
  const marca = {
    nome: perfil.identidade.nome,
    ramo: perfil.identidade.ramo,
    voz: { ...perfil.voz, guia: guia?.regras?.length ? { regras: guia.regras } : undefined },
    padrao: { tipos: perfil.padrao.tipos, chamada: perfil.padrao.chamada, hashtags_fixas: perfil.padrao.hashtags },
    dados_fixos: perfil.dados,
  }
  const formatoTexto = video ? `vídeo animado, sem som, no formato ${formato === 'story' ? 'story 9:16' : 'post de feed 4:5'}; use um dos animados (os feitos para a foto, o "cenas" ou os stories com movimento)` : formato === 'story' ? 'story (9:16); não use o "cenas", os stories com movimento nem os animados feitos para a foto' : 'post de feed (4:5); não use o "cenas", os stories com movimento nem os animados feitos para a foto'
  const fotoTexto = !fotos
    ? 'sem foto: não use o fundo "foto" nem o modelo "foto"; "ordem_fotos" vazia'
    : vistas === fotos
      ? `o dono mandou ${fotos === 1 ? '1 foto' : `${fotos} fotos`} para esta peça, que vêm antes deste texto`
      : vistas
        ? `o dono mandou ${fotos} fotos; você vê as ${vistas} primeiras, antes deste texto`
        : `o dono mandou ${fotos === 1 ? '1 foto' : `${fotos} fotos`}, mas você não consegue vê-las: não descreva o que aparece nelas`
  let texto = `<marca>\n${JSON.stringify(marca, null, 2)}\n</marca>\n\n<formato>${formatoTexto}</formato>\n\n<foto>${fotoTexto}</foto>\n\n<pedido>\n${pedido}\n</pedido>`
  if (layout) {
    texto += `\n\n<layout>${layout}</layout>\n\nO dono já escolheu o layout. Use "modelo": "${layout}" e escreva pensando nele: ${DICAS_DO_LAYOUT[layout] || ''} Você continua decidindo o destaque, o tamanho do título, o alinhamento e o fundo.`
  }
  if (anterior) {
    const { modelo, titulo, apoio, chamada, legenda, pontos, autor, numero, cupom, data, horario, arte, cores, ordem_fotos } = anterior as Record<string, unknown>
    texto += `\n\n<versao_anterior>\n${JSON.stringify({ modelo, titulo, apoio, chamada, legenda, pontos: pontos || [], autor: autor || '', numero: numero || '', cupom: cupom || '', data: data || '', horario: horario || '', arte: arte || {}, cores: cores || { titulo: '', texto: '', destaque: '' }, ordem_fotos: ordem_fotos || [] }, null, 2)}\n</versao_anterior>`
    texto += ajuste
      ? `\n\n<ajuste>\n${ajuste}\n</ajuste>\n\nO dono gostou da versão anterior e quer só este ajuste. Parta dela e mude apenas o que o ajuste pede; o resto fica igual, palavra por palavra quando der.`
      : `\n\nO dono pediu outra versão, sem dizer o que mudar. Escreva uma peça nova de verdade: outro ângulo, outro título, outra primeira linha na legenda. Se o pedido mudou, siga o pedido novo.`
  }
  return texto
}

const MARCADORES: Record<string, string> = {
  '[SEU PREÇO]': 'Falta o preço',
  '[ENDEREÇO]': 'Falta o endereço',
  '[DATA]': 'Falta a data',
  '[HORÁRIO]': 'Falta o horário',
  '[TELEFONE]': 'Falta o telefone',
  '[CUPOM]': 'Falta o código do cupom',
}

// Cada número que aparece nos dados ou no pedido, com e sem separadores.
function numerosDaFonte(fonte: string) {
  const set = new Set<string>()
  for (const m of fonte.matchAll(/\d[\d.,:/h-]*\d|\d/gi)) {
    const so = m[0].replace(/\D/g, '')
    const partes = [so, ...m[0].split(/\D+/)]
    if (so.endsWith('00')) partes.push(so.slice(0, -2))
    for (const parte of partes) if (parte) set.add(semZero(parte))
  }
  return set
}

const semZero = (n: string) => n.replace(/^0+(?=\d)/, '')

// Todo número do trecho (ex.: "10h às 14h" tem 10 e 14) aparece no pedido ou nos dados.
function numerosPermitidos(trecho: string, fonte: Set<string>) {
  return (trecho.match(/\d+/g) || []).every((n) => permitido(n, fonte))
}

function permitido(trecho: string, fonte: Set<string>) {
  const so = semZero(trecho.replace(/\D/g, ''))
  if (!so) return true
  return fonte.has(so) || (so.endsWith('00') && fonte.has(so.slice(0, -2))) || fonte.has(so + '00')
}

const SUSPEITOS: [RegExp, string][] = [
  [/R\$\s?\d[\d.,]*/g, '[SEU PREÇO]'],
  [/\(?\b\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g, '[TELEFONE]'],
  [/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, '[DATA]'],
  [/\b\d{1,2}\s?(?:h|:)\s?\d{0,2}\b(?:\s?min)?/gi, '[HORÁRIO]'],
]

export function formatarPreco(preco: string) {
  const limpo = String(preco ?? '').trim()
  if (!limpo) return '[SEU PREÇO]'
  if (/^\d+([.,]\d{1,2})?$/.test(limpo)) {
    const valor = Number(limpo.replace(',', '.'))
    return 'R$ ' + valor.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(valor) ? 0 : 2, maximumFractionDigits: 2 })
  }
  return /^r\$/i.test(limpo) ? limpo : `R$ ${limpo}`
}

export function conferir(bruto: Record<string, unknown>, perfil: Perfil, pedido: string, layout = '', fotos = 0, video = false) {
  const fonte = numerosDaFonte(pedido + ' ' + JSON.stringify(perfil.dados))
  const avisos: string[] = []
  const trocados = new Set<string>()

  const limpar = (texto: unknown) => {
    let t = String(texto ?? '').trim()
    for (const [padrao, marcador] of SUSPEITOS) {
      t = t.replace(padrao, (trecho) => {
        if (permitido(trecho, fonte)) return trecho
        trocados.add(marcador)
        return marcador
      })
    }
    return t
  }

  const roteiro = {
    modelo: MODELOS.includes(layout) ? layout : MODELOS.includes(bruto.modelo as string) ? bruto.modelo as string : 'aviso',
    ordem_fotos: [] as number[],
    titulo: limpar(bruto.titulo),
    apoio: limpar(bruto.apoio),
    chamada: limpar(bruto.chamada),
    legenda: limpar(bruto.legenda),
    itens: [] as { nome: string; preco: string }[],
    hashtags: [] as string[],
    pontos: ((bruto.pontos as string[] | undefined) || []).map(limpar).filter(Boolean),
    autor: limpar(bruto.autor),
    numero: '',
    cupom: '',
    data: '',
    horario: '',
    arte: {} as Record<string, string>,
    cores: {} as Record<string, string>,
    avisos,
  }

  // Modelo só de vídeo fora do vídeo vira o layout parado mais parecido (os campos continuam servindo).
  if (!video && SO_NO_VIDEO.includes(roteiro.modelo)) roteiro.modelo = PARECIDO[roteiro.modelo] || 'lista'
  // Com foto, ela é o centro; sem foto, nada que dependa dela.
  if (fotos && COM_FOTO[roteiro.modelo] && (video || !SO_NO_VIDEO.includes(COM_FOTO[roteiro.modelo]))) roteiro.modelo = COM_FOTO[roteiro.modelo]
  if (fotos && !video && !PARADOS_COM_FOTO.includes(roteiro.modelo)) roteiro.modelo = 'foto'
  if (!fotos && SEM_FOTO[roteiro.modelo]) roteiro.modelo = SEM_FOTO[roteiro.modelo]
  // No animado, só layouts animados (parado e animado são grupos separados).
  if (video && !SO_NO_VIDEO.includes(roteiro.modelo)) roteiro.modelo = fotos ? 'zoom' : 'impacto'
  if (!video && SO_NO_VIDEO.includes(roteiro.modelo)) roteiro.modelo = PARECIDO[roteiro.modelo] || 'lista'
  roteiro.pontos = roteiro.pontos.slice(0, PONTOS_POR_MODELO[roteiro.modelo] || 4)
  // O gráfico só com números que vieram do pedido ou dos dados; senão, sem gráfico (o app mostra o título).
  if (roteiro.modelo === 'painel' && !roteiro.pontos.every((p) => numerosPermitidos(p, fonte))) {
    roteiro.pontos = []
    trocados.add('numero')
  }
  // O endereço do mapa vem sempre dos dados fixos.
  if (roteiro.modelo === 'local') roteiro.apoio = String(perfil.dados.endereco || '').trim() || '[ENDEREÇO]'
  // Ordem das fotos: números de 1 até quantas o dono mandou, sem repetir.
  for (const n of (bruto.ordem_fotos as unknown[] | undefined) || []) {
    const i = Number(n)
    if (Number.isInteger(i) && i >= 1 && i <= fotos && !roteiro.ordem_fotos.includes(i)) roteiro.ordem_fotos.push(i)
  }

  // Número, data e horário só com números que vieram do pedido ou dos dados; senão, sem número ou o marcador.
  const numero = String(bruto.numero ?? '').trim().slice(0, 12)
  // "1.200" vale se o pedido diz 1200 (o número inteiro, sem o ponto).
  roteiro.numero = numero && (numerosPermitidos(numero, fonte) || /^\D*\d{1,3}(\.\d{3})+\D*$/.test(numero) && permitido(numero, fonte)) && !/R\$/.test(numero) ? numero : ''
  if (numero && !roteiro.numero) trocados.add('numero')
  const data = String(bruto.data ?? '').trim().slice(0, 30)
  roteiro.data = !data || data === '[DATA]' || numerosPermitidos(data, fonte) ? data : (trocados.add('[DATA]'), '[DATA]')
  const horario = String(bruto.horario ?? '').trim().slice(0, 30)
  roteiro.horario = !horario || horario === '[HORÁRIO]' || numerosPermitidos(horario, fonte) ? horario : (trocados.add('[HORÁRIO]'), '[HORÁRIO]')
  // O código do cupom tem de estar escrito no pedido.
  const codigo = String(bruto.cupom ?? '').trim().slice(0, 24)
  if (roteiro.modelo === 'cupom') {
    roteiro.cupom = codigo && codigo !== '[CUPOM]' && pedido.toLowerCase().includes(codigo.toLowerCase()) ? codigo : '[CUPOM]'
    if (codigo && codigo !== '[CUPOM]' && roteiro.cupom === '[CUPOM]') trocados.add('[CUPOM]')
  }

  const arte = (bruto.arte || {}) as Record<string, unknown>
  const escolha = (valor: unknown, opcoes: string[]) => (opcoes.includes(String(valor)) ? String(valor) : '')
  roteiro.arte = {
    // Destaque é de 1 a 3 palavras; se a IA marcou o título inteiro, fica só a última.
    destaque: ((d) => (d.split(/\s+/).length > 3 ? d.split(/\s+/).pop() || '' : d))(String(arte.destaque ?? '').trim().slice(0, 40)),
    tamanho_titulo: escolha(arte.tamanho_titulo, TAMANHOS) || 'normal',
    alinhamento: escolha(arte.alinhamento, ALINHAMENTOS) || 'esquerda',
    fundo: escolha(arte.fundo, FUNDOS) || 'marca',
  }

  const pedidas = (bruto.cores || {}) as Record<string, unknown>
  for (const chave of ['titulo', 'texto', 'destaque']) {
    const cor = String(pedidas[chave] ?? '').trim()
    if (/^#[0-9a-f]{6}$/i.test(cor)) roteiro.cores[chave] = cor.toUpperCase()
  }

  const daMarca = perfil.dados.itens || []
  for (const nome of (bruto.itens as string[] | undefined) || []) {
    const achado = daMarca.find((i) => i.nome.trim().toLowerCase() === String(nome).trim().toLowerCase())
    if (achado) roteiro.itens.push({ nome: achado.nome, preco: formatarPreco(achado.preco) })
  }

  const fixas = (perfil.padrao.hashtags || '').split(/[\s,]+/)
  const todas = [...fixas, ...((bruto.hashtags as string[] | undefined) || [])]
  const vistas = new Set<string>()
  for (const h of todas) {
    const tag = '#' + String(h).replace(/^#+/, '').replace(/\s+/g, '')
    if (tag.length < 2 || vistas.has(tag.toLowerCase())) continue
    vistas.add(tag.toLowerCase())
    roteiro.hashtags.push(tag)
  }

  const naoDeu = ((bruto.nao_deu as string[] | undefined) || []).map((t) => String(t).trim().replace(/\.$/, '')).filter(Boolean).slice(0, 3)
  if (naoDeu.length) avisos.push(`Por aqui ainda não dá para ${naoDeu.join(', ')}. O resto do pedido foi atendido.${naoDeu.some((t) => /fonte|letra/i.test(t)) ? ' A fonte dos títulos você troca no perfil da marca.' : ''}`)
  if (trocados.size) avisos.push('A IA tentou escrever um dado que não está na sua marca. Trocamos por um marcador.')
  const tudo = [roteiro.titulo, roteiro.apoio, roteiro.chamada, roteiro.legenda, roteiro.numero, roteiro.cupom, roteiro.data, roteiro.horario, ...roteiro.pontos, ...roteiro.itens.map((i) => i.preco)].join(' ')
  for (const [marcador, texto] of Object.entries(MARCADORES)) {
    if (tudo.includes(marcador)) avisos.push(`${texto}: troque ${marcador} antes de postar.`)
  }
  return roteiro
}

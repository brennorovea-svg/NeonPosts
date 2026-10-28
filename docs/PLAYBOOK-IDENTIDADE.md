# Neonposts · Playbook de identidade visual

Versão 1.1 · 2026-10-27 · nome trocado de Posta.AI para Neonposts (o domínio postaai.com.br já estava em uso). Cores, ícone e animação seguem os da v1.0.
Fonte única de verdade da marca Neonposts. Antes de criar tela, peça, post ou vídeo do produto, leia aqui. Mudou algo? Atualize este arquivo e o log no fim.

---

## 1. Essência

- **Nome:** Neonposts. Os posts com a luz da Neon Scripts: o nome já diz de quem é e o que faz.
- **O que é:** gerador de posts e stories (imagem ou vídeo) para pequenos negócios. O cliente escreve uma frase, sai a peça pronta com a cara da marca dele, ele baixa e publica.
- **Assinatura:** sempre "da Neon Scripts". A identidade é própria, mais descolada que a da Neon Scripts, porque o assunto é rede social.
- **Personalidade:** limpo, rápido, confiante, cara de produto tech. Moderno sem ser frio.
- **Taglines aprovadas:**
  - "Uma frase. Um post pronto. Com a cara da sua marca." (principal)
  - "Posta aí." (curta, para CTA e redes; continua valendo como chamado)

## 2. Nome e wordmark

| Onde | Como escrever |
|---|---|
| Logo / wordmark | `Neonposts`, numa palavra só, com N maiúsculo e o resto minúsculo: `Neon` em neve #F5F5F7 e `posts` em violeta #7B5CFF |
| Texto corrido | Neonposts (igual ao logo) |
| Assinatura | "da Neon Scripts" em JetBrains Mono, cor #A1A1B0, abaixo ou ao lado do wordmark |

- Fonte do wordmark: Instrument Sans 700, letter-spacing -0.05em, line-height 0.9.
- Sobre fundo claro: `Neon` em grafite #101014 e `posts` em #5B3FE0.
- Nunca: "Neon Posts" separado, "NeonPosts" com P maiúsculo, "NEONPOSTS" em caixa alta, "neonposts" todo minúsculo, "neon.posts" com ponto.
- Nunca abreviar para "Neon": conflita com o banco Neon e com o Neon Postgres.
- Dentro do app e no dia a dia pode chamar só de "Posts" ("Abrir Posts", "Seus Posts do mês"). O nome oficial, que vai em domínio, contrato e INPI, é sempre Neonposts.
- Família da Neon Scripts: os próximos produtos seguem o molde Neon + palavra.
- Domínio livre em 27/10/2026 (consulta, sem compra): neonposts.com.br e neonposts.app. neonposts.com está ocupado.

## 3. Ícone: Obturador

Uma íris de câmera de 6 lâminas num disco violeta, sobre placa grafite. Representa "a foto sai na hora".

### SVG oficial (viewBox 120)

```svg
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <rect width="120" height="120" rx="30" fill="#101014"/>
  <circle cx="60" cy="60" r="34" fill="#7B5CFF"/>
  <g stroke="#101014" stroke-width="3.5" stroke-linecap="round">
    <path d="M74 60 L77 89.4"/><path d="M67 72.1 L43 89.4"/><path d="M53 72.1 L26 60"/>
    <path d="M46 60 L43 30.6"/><path d="M53 47.9 L77 30.6"/><path d="M67 47.9 L94 60"/>
  </g>
  <polygon points="74,60 67,72.1 53,72.1 46,60 53,47.9 67,47.9" fill="#F5F5F7"/>
</svg>
```

### Variante pequena (favicon, até 48px)

Placa violeta #7B5CFF, disco grafite r=36, hexágono neve `78,60 69,75.6 51,75.6 42,60 51,44.4 69,44.4`, **sem as linhas das lâminas** (somem em tamanho pequeno).

### Regras do ícone

- Raio da placa: 25% do lado (rx 30 em 120).
- Área de respiro: no mínimo 1/4 do lado em volta.
- Tamanho mínimo da versão completa: 48px. Abaixo disso, a variante pequena.
- Não girar, não inclinar, não trocar cores, não pôr sombra nem contorno.
- **Nunca** aproximar do glifo do Instagram (quadrado arredondado + círculo + pontinho). É marca da Meta.

### Arquivos prontos

`/mnt/project-files/neonposts/marca/`: `neonposts-icone.svg`, `neonposts-icone-1024.png`, `-512`, `-192`, `-180` (Apple), `-32` (favicon).

## 4. Cores

| Token | Hex | Uso |
|---|---|---|
| `--grafite` | #101014 | fundo principal do app, texto sobre claro |
| `--painel` | #1C1C23 | cartões, painéis, folhas |
| `--borda` | #2E2E38 | bordas de 1px, divisores |
| `--violeta` | #7B5CFF | cor de destaque: `posts` do logo, ícone, seleção, botão de destaque |
| `--lilas` | #A28BFF | destaque secundário, links, frase de apoio |
| `--neve` | #F5F5F7 | texto principal no escuro, botão primário, fundo das peças |
| `--texto-2` | #A1A1B0 | texto secundário, legendas, contadores |
| `--violeta-escuro` | #5B3FE0 | violeta para texto pequeno sobre claro, pílulas com texto pequeno |
| `--cinza-claro` | #55555F | texto secundário sobre claro |

**Proporção:** ~70% grafite/painel, ~20% neve, ~10% violeta/lilás. O violeta é tempero, não fundo de tela inteira.

**Contraste conferido (WCAG):**

| Par | Razão | Pode |
|---|---|---|
| neve sobre grafite | 17,4 | tudo |
| neve sobre painel | 15,6 | tudo |
| #A1A1B0 sobre grafite | 7,5 | texto pequeno |
| lilás sobre grafite | 6,9 | texto pequeno, links |
| #5B3FE0 sobre neve | 6,0 | texto pequeno |
| violeta sobre grafite | 4,35 | só título grande (24px+ ou 19px bold) e ícones |
| branco sobre violeta | 4,36 | só texto 19px bold+; texto menor vai em #5B3FE0 |
| violeta sobre neve | 4,0 | só elementos gráficos, nunca texto pequeno |

Sem rosa neon #FF2E9A, mesmo com "Neon" no nome: o rosa e o letreiro são da Neon Scripts. O Neonposts é o irmão violeta.

## 5. Tipografia

- **Instrument Sans** (400, 600, 700): tudo. Títulos em 700 com letter-spacing -0.04em a -0.05em e line-height 0.9 a 1.1.
- **JetBrains Mono** (400, 600): sobretítulos em caixa alta (letter-spacing .1em a .14em), contadores ("7/30 peças"), assinatura "da Neon Scripts". É o toque de "script".
- Google Fonts: `family=Instrument+Sans:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap`
- Escala sugerida (app): 12 / 14 / 16 / 19 / 24 / 32 / 40 / 56 / 90.

## 6. Animação do ícone

Todas as animações usam a mesma função de íris. **Sem giro em nenhum momento.**

### Função da íris

```
o = abertura de 0 (fechado) a 1 (aberto)
h = 3 + 15·o                       // raio do hexágono central
vértice k (k = 0..5): ângulo k·60°, raio h
linha da lâmina k: do vértice até o círculo R=34, no ângulo k·60° + 75° − 15°·o
ease(t) = 1 − (1 − t)^4
```

### Estado 1: abertura do app (3s)

| Tempo | O que acontece |
|---|---|
| 0 a 1,0s | íris abre de 0 a 1, com ease |
| 1,25s | clique: em 0,36s fecha até o=0,1 nos primeiros 40% e reabre com ease |
| 1,40s | **flash**: brilho branco radial (r 40), 0,32s, pico de opacidade 0,9, sobe nos primeiros 25% e apaga |
| 1,40s | **faísca** no canto superior direito, 0,45s, escala 0,5 a 1 e some |
| 1,6s | wordmark `Neonposts` sobe 12px (30px no vídeo 1080) e aparece em 0,5s |

Path da faísca: `M92 14 C93 23 95.5 25.5 104 27 C95.5 28.5 93 31 92 40 C91 31 88.5 28.5 80 27 C88.5 25.5 91 23 92 14 Z`

### Estado 2: gerando (enquanto a IA trabalha)

Só respira: `o = 0,6 + 0,15·sen(2πt / 1,2s)`. Loop de 1,2s. É o único loop do produto, porque é status.

### Estado 3: pronto

Repete o clique + flash + faísca do estado 1 (0,36s). Aí a peça aparece.

### Movimento reduzido

Com `prefers-reduced-motion: reduce`: ícone parado aberto (o=1), sem flash, wordmark já visível.

### Arquivos

- `neonposts-abertura.mp4` (3s, 1080x1080, com flash)
- `neonposts-gerando-loop.mp4` (1,2s, loop sem emenda)
- `previa-abertura.png` (tira de quadros)
- `fonte-animacao.html` (fonte com `renderAt(t)`, para renderizar de novo no Playwright + ffmpeg)

## 7. Regras de movimento (interface)

Seguem a skill `emil-kowalski-motion`.

- Easing único: `cubic-bezier(.22, 1, .36, 1)`.
- Controles (botão, aba, campo): 180ms.
- Hover: `translateY(-2px)`. Clique: `scale(.97)` em 100ms.
- Só anima `transform` e `opacity`.
- `prefers-reduced-motion`: tudo parado.
- Sem loops decorativos. O único loop é o "gerando".
- Sem rotação em nada.

## 8. Componentes de interface

| Componente | Especificação |
|---|---|
| Fundo da tela | grafite #101014 |
| Painel / folha / celular | #1C1C23, borda 1px #2E2E38, raio 16 (cartão) ou 44 (moldura de celular) |
| Campo de texto | fundo #101014, borda 1px #2E2E38, raio 12, texto neve 14px, rótulo 12px #A1A1B0 acima |
| Seletor segmentado (Post / Stories / Vídeo) | trilho #101014, raio 12, padding 4; item ativo é pílula violeta raio 9, texto 13px 600 |
| Botão primário | fundo neve, texto grafite 16px 600, raio 12, padding 14 |
| Botão de destaque | fundo violeta, texto branco 16px+ 600 (ou fundo #5B3FE0 para texto menor), raio 12 |
| Contador de uso | JetBrains Mono 11px #A1A1B0, ex.: "7/30 peças" |
| Cabeçalho do app | wordmark 19px à esquerda, contador à direita |
| Pergunta de entrada | "O que vamos postar hoje?", 24px 600 |

## 9. Peças geradas (modelo padrão)

O visual das peças que o cliente baixa vem do **perfil da marca do cliente** (cores, logo, voz), não do Neonposts. O modelo neutro abaixo é o de demonstração:

- Cartão neve #F5F5F7, texto grafite, raio 16, proporção 4:5 (post) ou 9:16 (stories).
- Sobretítulo JetBrains Mono caixa alta em #5B3FE0 (ex.: "SÓ ATÉ SEXTA").
- Título Instrument Sans 700, apertado (ex.: "Combo da semana").
- Pílula de preço violeta, raio 999.
- Logo do cliente no canto inferior direito.
- **A IA nunca inventa preço, endereço, data ou horário.** Esses vêm dos dados fixos do cliente; sem o dado, aparece um marcador como `[SEU PREÇO]`.
- Nas peças do cliente não aparece marca do Neonposts (no máximo, opcional, "feito com Neonposts" bem pequeno no plano gratuito, se existir).

## 10. Tom de voz do produto

- Português do Brasil, "você", frases curtas, verbo na frente: "Baixar e postar", "Gerar de novo".
- Caloroso e direto, sem jargão técnico (segue a skill `voz-do-brenno` para textos ao cliente).
- Sem emoji na interface.
- Erros explicam o que fazer: "Faltou o preço. Quer colocar agora?"

## 11. O que não fazer

- Imitar o ícone do Instagram (marca da Meta).
- Girar o ícone ou qualquer elemento.
- Usar o rosa neon #FF2E9A ou o letreiro da Neon Scripts.
- Escrever só "Neon" (conflita com o banco Neon e com o Neon Postgres). Sempre "Neon Scripts".
- Tema de metrô (estação, linha, plataforma etc.), vetado na Neon.
- Emoji na interface.
- Loops decorativos, brilhos piscando, gradientes arco-íris.
- Violeta como fundo de tela inteira ou em texto pequeno sobre claro.
- IA inventando preço, endereço, data ou horário.

## 12. Onde está cada coisa

- Canvas de identidade (todos os caminhos A-F, 8 ícones, obturador animado interativo): https://claude.ai/artifact/RNXo2PeA4PUC9nQXUTUrUW
- Plano do SaaS (Claude Doc): https://claude.ai/artifact/EQ24RLCKExmCkvahmQbrGv
- Plano em blocos: https://claude.ai/artifact/TYuCHEdJpTP2H8axptyaZP
- Guia de pagamento: https://claude.ai/artifact/UesKGM5txJ5hSo4KvNoP6H
- Arquivos da marca: `/mnt/project-files/neonposts/marca/` (a pasta antiga `posta-ai/marca/` fica só como histórico)

### Tokens CSS prontos

```css
:root {
  --grafite: #101014;
  --painel: #1C1C23;
  --borda: #2E2E38;
  --violeta: #7B5CFF;
  --violeta-escuro: #5B3FE0;
  --lilas: #A28BFF;
  --neve: #F5F5F7;
  --texto-2: #A1A1B0;
  --cinza-claro: #55555F;
  --raio-campo: 12px;
  --raio-cartao: 16px;
  --raio-celular: 44px;
  --ease: cubic-bezier(.22, 1, .36, 1);
  --dur-controle: 180ms;
  --fonte: 'Instrument Sans', system-ui, sans-serif;
  --fonte-mono: 'JetBrains Mono', ui-monospace, monospace;
}
```

## 13. Log de decisões (2026-10-27)

| Hora | Decisão do Brenno |
|---|---|
| 19:55 | Nome Posta.AI (trocado às 21:55), sempre "da Neon Scripts", identidade própria e mais descolada |
| 20:01 | Pediu mais caminhos (D, E, F) além de A, B, C |
| 20:10 | Escolheu as **cores do F** (grafite + violeta), pediu outro ícone |
| 20:18 | Escolheu o **ícone 04, Obturador**, animado |
| 20:36 | Abertura aprovada, **sem giro**, com **pequeno flash** quando a lente fotografa |
| 20:43 | Pediu este playbook para não ter retrabalho |
| 21:43 | Descobriu que postaai.com.br já está em uso; nome reaberto |
| 21:55 | Nome novo: **Neonposts**. Identidade visual mantida, só o nome muda |
| 21:58 | Logo com **N maiúsculo**: Neonposts |
| 28/10 01:48 | Nome oficial Neonposts; "Posts" só como apelido dentro do app; família Neon + palavra |

Pendente: domínio (qual extensão), INPI depois do MVP.

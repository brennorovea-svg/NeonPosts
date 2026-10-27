# Posta.AI

Produto SaaS da Neon Scripts: gera posts e stories para pequenos negócios a partir de uma frase e do perfil de marca do cliente.

## Como trabalhar aqui
- Toda mudança vai por PR. O Brenno avalia antes de publicar; nunca fazer push direto no `main`.
- Identidade visual: `docs/PLAYBOOK-IDENTIDADE.md` é a fonte de verdade. Tokens em `src/styles/tokens.css`. Se mudar um, mudar o outro.
- Movimento segue a skill `emil-kowalski-motion`: easing único `cubic-bezier(.22,1,.36,1)`, só transform e opacity, `prefers-reduced-motion` sempre respeitado, sem giro em nada.
- Textos de interface: português do Brasil, "você", verbo na frente, sem emoji, sem jargão.
- Antes do PR, tirar print com o Playwright em 390x844 e 1440x900. Prints ficam fora do repo.

## Regras do produto
- O perfil da marca (identidade, voz, padrão de postagem, dados fixos) é o motor da criação e é versionado.
- A IA nunca inventa preço, endereço, data ou horário. Sem o dado, a peça mostra um marcador como `[SEU PREÇO]`.
- Chave da IA e chaves secretas só em edge functions do Supabase. No front só a URL e a chave pública (anon) do Supabase.
- Nome: `posta.ai` no logo, Posta.AI no texto, sempre "da Neon Scripts". Nunca escrever só "Neon".
- Nunca imitar o ícone do Instagram.

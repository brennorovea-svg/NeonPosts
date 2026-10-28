# Neonposts

**Uma frase. Um post pronto. Com a cara da sua marca.**

Neonposts, da Neon Scripts: gerador de posts e stories (imagem ou vídeo) para pequenos negócios. O cliente conta a marca uma vez (identidade visual, jeito de falar, padrão de postagem e dados fixos), escreve uma frase e baixa a peça pronta para publicar.

## Stack
- App: React + Vite (PWA), publicado no GitHub Pages.
- Dados e login: Supabase (região São Paulo), com login Google ou link mágico, banco com RLS e storage privado.
- IA: Claude, chamado só por edge function (a chave nunca vai para o navegador).
- Peças renderizadas no aparelho (canvas; vídeo MP4 quando o aparelho suporta).
- Cobrança: Stripe em modo teste, trocável depois.

## Identidade
Tudo em [`docs/PLAYBOOK-IDENTIDADE.md`](docs/PLAYBOOK-IDENTIDADE.md). Ler antes de mexer em qualquer tela.

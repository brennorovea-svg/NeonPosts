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

## Avisos com o app fechado (Web Push)
- `public/sw.js` é o service worker (só avisos, sem cache). O aparelho assina em Redes › Ativar avisos; a assinatura fica em `assinaturas_push`.
- A Edge Function `avisar` manda o push: `hora` (pg_cron a cada minuto, com o cabeçalho `x-segredo`), `celular` ("Mandar para o celular", com o login da pessoa), `teste` e `chave` (chave pública VAPID).
- Segredos nas Edge Functions: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (gerar com `npx web-push generate-vapid-keys`), `VAPID_SUBJECT` (`mailto:neonposts@neonscripts.com.br`) e `AVISAR_SEGREDO`. O mesmo segredo vai para o cofre do banco: `select vault.create_secret('<AVISAR_SEGREDO>', 'avisar_segredo');`.
- Deploy: `supabase functions deploy avisar --no-verify-jwt`. A migração `0018_avisos_push.sql` cria a tabela, a função `avisos_pendentes()` e o cron `neonposts-avisar`.
- iPhone: o aviso só chega com o app na tela inicial (iOS 16.4+). Android: funciona no Chrome, instalado ou não.

## Rodar e publicar
- `npm install` e `npm run dev` para ver no computador.
- Todo merge no `main` publica sozinho em https://neonposts.com.br pela Action `Publicar no GitHub Pages`.
- Por enquanto publica no endereço provisório https://brennorovea-svg.github.io/NeonPosts/. Quando o DNS do Registro.br estiver pronto, criar `public/CNAME` com `neonposts.com.br` e colocar o domínio em Settings › Pages.

## Publicar sozinho no Instagram (piloto da Neon Scripts)
- Só a marca ligada em `publicacao_direta` (hoje a Neon Scripts, @neon.scripts). Cliente só depois da revisão da Meta + CNPJ.
- Secret das Edge Functions: `INSTAGRAM_TOKEN_NEON_SCRIPTS` (token EAA do app "Publicador Neon Scripts"). Nunca no repositório nem no chat.
- Migração `0020_publicar_no_instagram.sql`: colunas de publicação na `agenda`, bucket privado `publicar`, `pegar_publicacoes()` e o cron `neonposts-publicar` (a cada 5 min, mesmo segredo do `avisar`).
- Deploy: `supabase functions deploy publicar --no-verify-jwt`.


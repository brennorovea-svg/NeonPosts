// A função de teste da bateria de pedidos foi desligada antes do lançamento (etapa de segurança).
// Fica só esta resposta para quem ainda chamar o endereço. Para rodar uma bateria nova,
// publicar de novo a partir de /mnt/project-files/neonposts/auditoria/ e desligar ao terminar.
Deno.serve(() => new Response(JSON.stringify({ erro: 'Função desligada.' }), {
  status: 410, headers: { 'Content-Type': 'application/json' },
}))

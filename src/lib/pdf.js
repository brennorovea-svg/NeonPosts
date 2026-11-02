// Lê o texto de um PDF no próprio aparelho (o PDF do perfil do LinkedIn).
// O arquivo não sobe para lugar nenhum: só o texto vai para o perfil profissional.
// A biblioteca só carrega quando a pessoa escolhe um PDF.
export async function textoDoPdf(arquivo, limite = 6000) {
  const [pdfjs, { default: worker }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker
  const doc = await pdfjs.getDocument({ data: await arquivo.arrayBuffer() }).promise
  const paginas = []
  for (let i = 1; i <= Math.min(doc.numPages, 8); i++) {
    const pagina = await doc.getPage(i)
    const { items } = await pagina.getTextContent()
    // Junta os pedaços por linha: quebra quando o item marca fim de linha.
    paginas.push(items.map((t) => t.str + (t.hasEOL ? '\n' : ' ')).join(''))
  }
  await doc.destroy()
  return paginas.join('\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    // O rodapé do PDF do LinkedIn ("Page 1 of 3", "Página 1 de 3") não interessa.
    .replace(/^(Page|Página) \d+ (of|de) \d+$/gim, '')
    .trim()
    .slice(0, limite)
}

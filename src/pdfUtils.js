import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

// Pre-warm the worker so the first upload doesn't pay cold-start cost
pdfjsLib.getDocument({ data: new Uint8Array() }).promise.catch(() => {})

export async function extractTextFromPDF(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  // Fetch all pages in parallel instead of sequentially
  const pageNumbers = Array.from({ length: pdf.numPages }, (_, i) => i + 1)
  const pageTexts = await Promise.all(
    pageNumbers.map(async (i) => {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const text = textContent.items.map((item) => item.str).join(' ')
      return `\u2500\u2500\u2500 Page ${i} \u2500\u2500\u2500\n${text}`
    })
  )

  return pageTexts.join('\n\n')
}

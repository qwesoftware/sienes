import { groupIntoLines, type PageLines, type PositionedItem } from "./lines";

// Extraction through PDF.js. The caller supplies the PDF.js module so the
// same code runs in a browser worker and in Node for tests and scripts.

type TextItemLike = { str: string; transform: number[]; width: number; height: number };
type PageLike = {
  getViewport(params: { scale: number }): { width: number; height: number };
  getTextContent(): Promise<{ items: unknown[] }>;
};
type DocumentLike = { numPages: number; getPage(n: number): Promise<PageLike>; destroy?: () => Promise<void> | void };
export type PdfjsLike = {
  getDocument(params: Record<string, unknown>): { promise: Promise<DocumentLike> };
};

export async function extractPages(pdfjs: PdfjsLike, data: Uint8Array, maxPages: number): Promise<PageLines[]> {
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false, disableFontFace: true, verbosity: 0 }).promise;
  try {
    if (doc.numPages > maxPages) {
      throw new Error(`El PDF tiene ${doc.numPages} páginas; el máximo es ${maxPages}.`);
    }
    const pages: PageLines[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items: PositionedItem[] = [];
      for (const raw of content.items) {
        if (!raw || typeof raw !== "object" || !("str" in raw)) continue;
        const item = raw as TextItemLike;
        items.push({ str: item.str, x: item.transform[4], y: item.transform[5], width: item.width, height: item.height });
      }
      pages.push({ page: n, width: viewport.width, height: viewport.height, lines: groupIntoLines(items) });
    }
    return pages;
  } finally {
    await doc.destroy?.();
  }
}

import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PageLines } from "./lines";
import { extractPages, type PdfjsLike } from "./pdf";

// Node entry point for tests and local scripts.
export function extractPagesNode(data: Uint8Array, maxPages = 300): Promise<PageLines[]> {
  return extractPages(pdfjs as unknown as PdfjsLike, data, maxPages);
}

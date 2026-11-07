"use client";

import * as pdfjs from "pdfjs-dist";
import type { PageLines } from "./lines";
import { extractPages, type PdfjsLike } from "./pdf";

// Browser entry point. PDF.js parses the file in its own worker (copied to
// /pdf.worker.min.mjs on install); the file never leaves the machine.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export async function extractPagesBrowser(file: File, maxPages: number): Promise<PageLines[]> {
  const data = new Uint8Array(await file.arrayBuffer());
  return extractPages(pdfjs as unknown as PdfjsLike, data, maxPages);
}

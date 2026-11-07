// Parses the real exports held locally and prints structure only: page
// counts, note counts, which header fields were found and the specialty
// labels seen. No note text, name or number is printed or stored.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseMedexis, ParseError } from "@/parser/medexis";
import { extractPagesNode } from "@/parser/pdf-node";

const dir = process.argv[2] ?? "exports-medexis";

async function main() {
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf"));
  if (files.length === 0) {
    console.log(`no PDF files in ${dir}`);
    return;
  }
  let failures = 0;
  let index = 0;
  for (const file of files) {
    index++;
    const started = Date.now();
    try {
      const pages = await extractPagesNode(new Uint8Array(readFileSync(join(dir, file))));
      const parsed = parseMedexis(pages);
      const h = parsed.header;
      const present = Object.entries(h)
        .filter(([k, v]) => k !== "cud" && typeof v === "object" && v.status === "extracted")
        .map(([k]) => k);
      const labels = new Map<string, number>();
      for (const n of parsed.notes) labels.set(n.authorSpecialtyLabel ?? "(none)", (labels.get(n.authorSpecialtyLabel ?? "(none)") ?? 0) + 1);
      const unresolved = parsed.notes.filter((n) => n.authorSpecialtyLabel && !n.authorSpecialtyKey).map((n) => n.authorSpecialtyLabel);
      console.log(
        `export ${index}: pages=${parsed.pageCount} imageOnly=${parsed.imageOnlyPages.length} notes=${parsed.notes.length} ` +
          `range=${parsed.dateRange ? `${parsed.dateRange.from}..${parsed.dateRange.to}` : "-"} header=[${present.join(",")}] ` +
          `labels=${JSON.stringify(Object.fromEntries(labels))} unresolved=${JSON.stringify([...new Set(unresolved)])} ` +
          `chars=${parsed.notes.reduce((a, n) => a + n.text.length, 0)} ${Date.now() - started}ms`,
      );
    } catch (err) {
      failures++;
      console.log(`export ${index}: ERROR ${err instanceof ParseError ? err.code : err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

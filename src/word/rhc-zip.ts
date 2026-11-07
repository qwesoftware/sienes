import JSZip from "jszip";
import type { CaseRecord } from "@/case/types";
import { insurerLabels } from "@/contracts/case";
import { stateLabels } from "@/lib/format";
import { rhcBlob, rhcFileName } from "./rhc-docx";

// The batch ZIP holds one Word document per reviewed case and a text file
// naming the cases left out and why. File names stay in the browser.
export function zipPartition(cases: CaseRecord[]) {
  const included = cases.filter((c) => c.draft && c.header && c.insurer && c.reviewedRevision === c.revision);
  const excluded = cases.filter((c) => !included.includes(c));
  return { included, excluded };
}

export async function rhcZip(cases: CaseRecord[]): Promise<Blob> {
  const { included, excluded } = zipPartition(cases);
  const zip = new JSZip();
  const used = new Set<string>();
  for (const c of included) {
    let name = rhcFileName(c.header!);
    for (let i = 2; used.has(name); i++) name = rhcFileName(c.header!).replace(/\.docx$/, `-${i}.docx`);
    used.add(name);
    zip.file(name, await rhcBlob({ header: c.header!, insurerLabel: insurerLabels[c.insurer!], draft: c.draft!, dateRange: c.parsed?.dateRange ?? null }));
  }
  if (excluded.length > 0) {
    const lines = excluded.map((c) => `${c.header?.patientName.value ?? c.fileName}: ${c.state === "reviewed" ? "sin revisar" : stateLabels[c.state].toLowerCase()}`);
    zip.file("excluidos.txt", ["Casos no incluidos en este lote:", ...lines].join("\n") + "\n");
  }
  return zip.generateAsync({ type: "blob" });
}

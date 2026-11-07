import { randomUUID } from "node:crypto";
import type { Insurer, ParsedExport } from "@/contracts/case";
import type { ModelSetup } from "./model";
import { runGenerate } from "./generate";
import { runSelect } from "./select";

// Runs both stages on a parsed export exactly as the app does, in process.
// Used by the smoke and local evaluation scripts; never by the server.
export async function runCase(parsed: ParsedExport, insurer: Insurer, setup: ModelSetup) {
  const notes = parsed.notes.map((n) => ({ id: n.id, recordedDate: n.recordedDate, authorName: n.authorName, authorSpecialtyLabel: n.authorSpecialtyLabel, text: n.text, pages: n.pages }));
  const t0 = Date.now();
  const select = await runSelect({ attemptId: randomUUID(), insurer, notes }, setup);
  const t1 = Date.now();
  const used = new Set([
    ...select.selection.specialties.flatMap((s) => [s.primaryNoteId, ...s.supportingNoteIds]),
    ...select.selection.diagnosisNoteIds,
    ...select.selection.historyNoteIds,
    ...select.selection.medicationNoteIds,
  ]);
  const sources = notes.filter((n) => used.has(n.id));
  const generate = await runGenerate({ attemptId: randomUUID(), insurer, selection: select.selection, sources }, setup);
  const t2 = Date.now();
  return {
    selection: select.selection,
    draft: generate.draft,
    versions: generate.versions,
    stages: {
      select: { ms: t1 - t0, ...select.usage },
      generate: { ms: t2 - t1, ...generate.usage },
    },
  };
}

// Reported list price for gpt-6-luna (USD per million tokens); override
// through AI_PRICE_INPUT_PER_M and AI_PRICE_OUTPUT_PER_M.
export function costUsd(inputTokens: number, outputTokens: number): number {
  const input = Number(process.env.AI_PRICE_INPUT_PER_M ?? 0.1);
  const output = Number(process.env.AI_PRICE_OUTPUT_PER_M ?? 0.5);
  return (inputTokens * input + outputTokens * output) / 1_000_000;
}

import { generateText, isStepCount, Output, tool, type LanguageModel } from "ai";
import { z } from "zod";
import { type GenerateRequest, type Selection, type SourceNote } from "@/contracts/ai";
import { draftSchema, findReferenceIssues, referenceSchema, type Alert, type Draft, type Reference } from "@/contracts/draft";
import { composeModules } from "./modules";
import type { generateText as GenerateText } from "ai";

export type GenerateOptions = {
  model: LanguageModel;
  modelId: string;
  callOptions: { maxRetries: 0; timeout: number; providerOptions: Parameters<typeof GenerateText>[0]["providerOptions"] };
  abortSignal?: AbortSignal;
};

// The agent's only tool: in-process, read-only, verifies citations against
// the sources of this call. It never fetches anything.
export function checkReferencesTool(sources: SourceNote[]) {
  const byId = new Map(sources.map((n) => [n.id, n]));
  return tool({
    description: "Verifica que cada referencia (noteId y page) exista entre las fuentes recibidas. Usala antes de responder.",
    inputSchema: z.object({ references: z.array(referenceSchema) }),
    execute: async ({ references }) => {
      const invalid: { noteId: string; page: number; reason: string }[] = [];
      for (const r of references) {
        const note = byId.get(r.noteId);
        if (!note) invalid.push({ ...r, reason: "la nota no existe entre las fuentes" });
        else if (!note.pages.includes(r.page)) invalid.push({ ...r, reason: `la nota ocupa las páginas ${note.pages.join(", ")}` });
      }
      return { valid: references.length - invalid.length, invalid };
    },
  });
}

export function generatePrompt(selection: Selection, sources: SourceNote[]): string {
  return `Fuentes confirmadas por el revisor y selección por especialidad:\n${JSON.stringify({ selection, sources })}`;
}

// App-side validation after the call: a dangling reference becomes an alert
// and is removed; a quantity that no cited source states becomes an alert.
export function validateDraft(draft: Draft, sources: SourceNote[]): Draft {
  const alerts: Alert[] = [...draft.alerts];
  // A section that only states the absence of clinical content has nothing to cite.
  const noContent = new Set(draft.alerts.filter((a) => a.code === "no-clinical-content").map((a) => a.sectionKey));
  const issues = findReferenceIssues(draft, sources).filter((i) => !(i.reason === "missing-reference" && noContent.has(i.where)));
  // The diagnosis is both a section and a field, so the same gap is found twice.
  const seen = new Set<string>();
  for (const issue of issues) {
    const where = issue.where.startsWith("progress:") ? draft.sections.find((s) => s.key === issue.where)?.title ?? issue.where : issue.where;
    const key = `${issue.where}|${issue.reason}|${issue.reference?.noteId ?? ""}|${issue.reference?.page ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    alerts.push({
      code: "invalid-reference",
      sectionKey: issue.where,
      noteId: issue.reference?.noteId ?? null,
      message:
        issue.reason === "missing-reference"
          ? `La sección "${where}" tiene texto sin referencia a una fuente. Verificá su contenido.`
          : `La sección "${where}" cita una fuente o página que no existe en el caso (${issue.reference?.noteId}, página ${issue.reference?.page}). Verificá su contenido.`,
    });
  }
  const bad = new Set(issues.filter((i) => i.reference).map((i) => `${i.reference!.noteId}:${i.reference!.page}`));
  const keep = (refs: Reference[]) => refs.filter((r) => !bad.has(`${r.noteId}:${r.page}`));
  const byId = new Map(sources.map((n) => [n.id, n]));
  const quantity = draft.prestacion.quantity;
  if (quantity !== null) {
    const cited = keep(draft.prestacion.references).map((r) => byId.get(r.noteId)?.text ?? "");
    const stated = cited.some((text) => new RegExp(`(^|\\D)${quantity}(\\D|$)`).test(text));
    if (!stated) {
      alerts.push({ code: "numeric-mismatch", sectionKey: "prestacion", noteId: null, message: `La cantidad ${quantity} no aparece en las fuentes citadas para la prestación.` });
    }
  }
  return {
    sections: draft.sections.map((s) => ({ ...s, references: keep(s.references) })),
    diagnosis: { ...draft.diagnosis, references: keep(draft.diagnosis.references) },
    prestacion: { ...draft.prestacion, references: keep(draft.prestacion.references) },
    alerts,
  };
}

export async function runGenerate(request: GenerateRequest, options: GenerateOptions) {
  const modules = composeModules("generate", request.insurer);
  const result = await generateText({
    model: options.model,
    system: modules.instructions,
    prompt: generatePrompt(request.selection, request.sources),
    tools: { check_references: checkReferencesTool(request.sources) },
    stopWhen: isStepCount(4),
    output: Output.object({ schema: draftSchema }),
    ...options.callOptions,
    abortSignal: options.abortSignal,
  });
  return {
    draft: validateDraft(result.output, request.sources),
    versions: { model: options.modelId, modules: modules.versions },
    usage: { inputTokens: result.usage.inputTokens ?? null, outputTokens: result.usage.outputTokens ?? null },
  };
}

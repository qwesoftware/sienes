import { generateText, Output, type LanguageModel } from "ai";
import { selectionSchema, type SelectRequest, type Selection, type SourceNote } from "@/contracts/ai";
import { specialties, specialtyCatalogVersion } from "@/parser/specialties";
import { InvalidAiResponse } from "./errors";
import { composeModules } from "./modules";

export type SelectOptions = {
  model: LanguageModel;
  modelId: string;
  callOptions: { maxRetries: 0; timeout: number; providerOptions: Parameters<typeof generateText>[0]["providerOptions"] };
  abortSignal?: AbortSignal;
};



// Builds the user message: the catalog keys the model may use and the notes
// as data. No header field travels here.
export function selectPrompt(notes: SourceNote[]): string {
  const catalog = specialties.map((s) => `${s.key} = ${s.label}`).join(", ");
  return `Catálogo de especialidades (versión ${specialtyCatalogVersion}): ${catalog}.\n\nNotas de la exportación, en orden de documento:\n${JSON.stringify({ notes })}`;
}

// Every id the model returns must exist in the request; otherwise the
// response is rejected and the reviewer may start a new attempt.
export function assertKnownNotes(selection: Selection, notes: SourceNote[]): void {
  const known = new Set(notes.map((n) => n.id));
  const ids = [
    ...selection.specialties.flatMap((s) => [s.primaryNoteId, ...s.supportingNoteIds, ...s.flags.map((f) => f.noteId)]),
    ...selection.diagnosisNoteIds,
    ...selection.historyNoteIds,
    ...selection.medicationNoteIds,
    ...selection.excludedNoteIds.map((e) => e.noteId),
  ];
  for (const id of ids) {
    if (id !== null && !known.has(id)) throw new InvalidAiResponse("La respuesta cita una nota inexistente");
  }
}

export async function runSelect(request: SelectRequest, options: SelectOptions) {
  const modules = composeModules("select", request.insurer);
  const result = await generateText({
    model: options.model,
    system: modules.instructions,
    prompt: selectPrompt(request.notes),
    output: Output.object({ schema: selectionSchema }),
    ...options.callOptions,
    abortSignal: options.abortSignal,
  });
  const selection = result.output;
  assertKnownNotes(selection, request.notes);
  return {
    selection,
    versions: { model: options.modelId, modules: modules.versions },
    usage: { inputTokens: result.usage.inputTokens ?? null, outputTokens: result.usage.outputTokens ?? null },
  };
}

import { MockLanguageModelV4 } from "ai/test";
import type { SourceNote } from "@/contracts/ai";
import type { Selection } from "@/contracts/ai";
import { normalizeLabel, resolveSpecialty, specialtyLabel } from "@/parser/specialties";

// A deterministic stand-in for the real model. It reads the notes from the
// prompt and applies simple content rules so the whole pipeline (structured
// output, validation, UI) runs in tests without a provider. The clinical
// rules themselves live in `prompts/`; this mock only imitates their shape.

const contentStems: [string, string][] = [
  ["kinesiol", "kinesiologia"],
  ["fonoaudiol", "fonoaudiologia"],
  ["psicopedag", "psicopedagogia"],
  ["psiquiat", "psiquiatria"],
  ["psicolog", "psicologia"],
  ["neurol", "neurologia"],
  ["terapia ocupacional", "terapia-ocupacional"],
  ["evolucion to", "terapia-ocupacional"],
  ["interdisciplinario", "hospital-de-dia"],
];

function contentSpecialty(text: string): string | null {
  const head = normalizeLabel(text.slice(0, 80));
  return contentStems.find(([stem]) => head.includes(stem))?.[1] ?? null;
}

function kindOf(text: string, labelKey: string | null): "report" | "progress-note" | "administrative" | "prior-summary" {
  const head = normalizeLabel(text.slice(0, 60));
  if (head.startsWith("resumen de historia clinica")) return "prior-summary";
  if (head.startsWith("informe")) return "report";
  if (labelKey === "administracion" || head.includes("ausente") || head.includes("se entrega documentacion")) return "administrative";
  return "progress-note";
}

export function mockSelect(notes: SourceNote[]): Selection {
  const groups = new Map<string, { note: SourceNote; kind: ReturnType<typeof kindOf>; override: boolean }[]>();
  const excluded: Selection["excludedNoteIds"] = [];
  for (const note of notes) {
    const labelKey = resolveSpecialty(note.authorSpecialtyLabel)?.key ?? null;
    const kind = kindOf(note.text, labelKey);
    if (kind === "administrative") {
      excluded.push({ noteId: note.id, reason: "Nota administrativa o de ausencia; no es fuente clínica." });
      continue;
    }
    const fromContent = contentSpecialty(note.text);
    const key = fromContent ?? labelKey ?? "unknown";
    const override = fromContent !== null && labelKey !== null && fromContent !== labelKey;
    const list = groups.get(key) ?? [];
    list.push({ note, kind, override });
    groups.set(key, list);
  }
  const specialties: Selection["specialties"] = [...groups.entries()].map(([key, entries]) => {
    const sorted = [...entries].sort((a, b) => b.note.recordedDate.localeCompare(a.note.recordedDate));
    const primary = sorted[0];
    const flags: Selection["specialties"][number]["flags"] = [];
    for (const e of entries) {
      if (e.override) {
        flags.push({
          code: "label-override",
          message: `La nota está firmada como ${e.note.authorSpecialtyLabel} pero su contenido describe ${specialtyLabel(key)}.`,
          noteId: e.note.id,
        });
      }
    }
    if (key === "unknown") flags.push({ code: "unknown-specialty", message: "No se pudo determinar el área de estas notas.", noteId: primary.note.id });
    return {
      specialtyKey: key,
      specialtyLabel: specialtyLabel(key === "unknown" ? null : key),
      primaryNoteId: primary.note.id,
      primaryKind: primary.kind,
      supportingNoteIds: sorted.slice(1).map((e) => e.note.id),
      labelOverride: entries.some((e) => e.override),
      flags,
    };
  });
  const clinical = notes.filter((n) => !excluded.some((x) => x.noteId === n.id));
  return {
    specialties,
    diagnosisNoteIds: clinical.filter((n) => /\b[A-Z]\d\d(\.\d)?\b/.test(n.text) || /\bDx\b/i.test(n.text)).map((n) => n.id),
    historyNoteIds: clinical.filter((n) => ["report", "prior-summary"].includes(kindOf(n.text, null))).map((n) => n.id),
    medicationNoteIds: clinical.filter((n) => /\d+\s?mg\b/.test(n.text)).map((n) => n.id),
    excludedNoteIds: excluded,
  };
}

// The user message carries one JSON object; `notes` is what the mock reads.
function notesFromPrompt(prompt: { role: string; content: unknown }[]): SourceNote[] {
  const user = [...prompt].reverse().find((m) => m.role === "user");
  const parts = (user?.content as { type: string; text?: string }[] | undefined) ?? [];
  const text = parts.map((p) => p.text ?? "").join("");
  const payload = JSON.parse(text.slice(text.indexOf("{"))) as { notes: SourceNote[] };
  return payload.notes;
}

export function mockLanguageModel() {
  return new MockLanguageModelV4({
    provider: "mock",
    modelId: "mock",
    doGenerate: async ({ prompt }) => {
      const system = prompt.find((m) => m.role === "system");
      const task = typeof system?.content === "string" && system.content.includes("Tarea: GENERACIÓN") ? "generate" : "select";
      if (task !== "select") throw new Error("mock generate not implemented");
      const text = JSON.stringify(mockSelect(notesFromPrompt(prompt)));
      return {
        content: [{ type: "text", text }],
        finishReason: { unified: "stop", raw: undefined },
        usage: {
          inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 0, text: 0, reasoning: 0 },
        },
        warnings: [],
      };
    },
  });
}

import { MockLanguageModelV4 } from "ai/test";
import type { Selection, SourceNote } from "@/contracts/ai";
import type { Alert, Draft, Reference, Section } from "@/contracts/draft";
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

const sentences = (text: string) => text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
const codePattern = /\b[A-Z]\d\d(?:\.\d)?\b/;

// A draft assembled from the confirmed sources with the same shape the real
// model must return: every non-empty section cites the note it came from.
export function mockGenerate(selection: Selection, sources: SourceNote[]): Draft {
  const byId = new Map(sources.map((n) => [n.id, n]));
  const ref = (id: string): Reference | null => (byId.has(id) ? { noteId: id, page: byId.get(id)!.pages[0] } : null);
  const refs = (ids: string[]) => ids.map(ref).filter((r): r is Reference => r !== null);
  const pick = (ids: string[], test: (s: string) => boolean) => {
    const out: { text: string; ref: Reference }[] = [];
    for (const id of ids) {
      const note = byId.get(id);
      if (!note) continue;
      for (const s of sentences(note.text)) if (test(s)) out.push({ text: s, ref: ref(id)! });
    }
    return out;
  };
  const section = (key: string, title: string, picked: { text: string; ref: Reference }[]): Section => ({
    key,
    title,
    text: picked.map((p) => p.text).join(" "),
    references: [...new Map(picked.map((p) => [`${p.ref.noteId}:${p.ref.page}`, p.ref])).values()],
  });
  const alerts: Alert[] = [];
  const firstPrimary = selection.specialties.map((s) => s.primaryNoteId).find((id): id is string => id !== null && byId.has(id));

  const diagnosis = pick(selection.diagnosisNoteIds, (s) => /\bDx\b|diagn[oó]stico/i.test(s) || codePattern.test(s));
  const cie10 = diagnosis.map((d) => codePattern.exec(d.text)?.[0]).find((c): c is string => Boolean(c)) ?? null;
  if (cie10 === null) alerts.push({ code: "missing-information", message: "Ninguna fuente escribe un código CIE-10.", sectionKey: "diagnosis", noteId: null });

  const progress: Section[] = selection.specialties.map((sp) => {
    const primary = sp.primaryNoteId ? byId.get(sp.primaryNoteId) : undefined;
    if (!primary) {
      alerts.push({ code: "no-clinical-content", message: `${sp.specialtyLabel}: no hay contenido clínico para resumir.`, sectionKey: `progress:${sp.specialtyKey}`, noteId: null });
      return { key: `progress:${sp.specialtyKey}`, title: sp.specialtyLabel, text: "", references: [] };
    }
    const text = sentences(primary.text).slice(0, 3).join(" ");
    return { key: `progress:${sp.specialtyKey}`, title: sp.specialtyLabel, text, references: refs([primary.id, ...sp.supportingNoteIds]) };
  });

  const history = selection.historyNoteIds.flatMap((id) => {
    const note = byId.get(id);
    return note ? [{ text: sentences(note.text)[0], ref: ref(id)! }] : [];
  });
  const allIds = sources.map((n) => n.id);
  const indication = pick(allIds, (s) => /se indica|indicaci[oó]n|pr[aá]ctica/i.test(s));
  const all = sources.map((n) => n.text).join("\n");
  const practiceCode = /[Pp]r[aá]ctica (\d{6})/.exec(all)?.[1] ?? null;
  const moduleName = /m[oó]dulo ([^,.\n]+)/.exec(all)?.[1]?.trim() ?? null;
  const quantity = /cantidad (\d+)/.exec(all)?.[1] ?? null;
  const prestacionRefs = refs(allIds.filter((id) => /[Pp]r[aá]ctica|cantidad|m[oó]dulo/.test(byId.get(id)!.text)));
  if (practiceCode === null || quantity === null) {
    alerts.push({ code: "missing-information", message: "La prestación (práctica, módulo o cantidad) no está documentada en las fuentes.", sectionKey: "prestacion", noteId: null });
  }

  return {
    sections: [
      {
        key: "reason",
        title: "Motivo",
        text: firstPrimary ? "Se solicita la renovación del tratamiento de rehabilitación interdisciplinaria en curso." : "",
        references: firstPrimary ? refs([firstPrimary]) : [],
      },
      section("diagnosis", "Diagnóstico", diagnosis.map((d) => ({ ...d, text: d.text.replace(/^Dx:\s*/i, "") }))),
      section("history", "Antecedentes", history),
      section("medication", "Medicación", pick(selection.medicationNoteIds, (s) => /\d+\s?mg\b/.test(s))),
      { key: "assessments", title: "Estudios complementarios", text: "", references: [] },
      ...progress,
      section("indication", "Indicación", indication),
    ],
    diagnosis: { text: diagnosis[0]?.text.replace(/^Dx:\s*/i, "") ?? null, cie10, references: refs(selection.diagnosisNoteIds) },
    prestacion: { practiceCode, module: moduleName, quantity: quantity === null ? null : Number(quantity), references: prestacionRefs },
    alerts,
  };
}

// The user message carries one JSON object with the data the mock reads.
function payloadFromPrompt<T>(prompt: { role: string; content: unknown }[]): T {
  const user = prompt.find((m) => m.role === "user");
  const parts = (user?.content as { type: string; text?: string }[] | undefined) ?? [];
  const text = parts.map((p) => p.text ?? "").join("");
  return JSON.parse(text.slice(text.indexOf("{"))) as T;
}

const usage = { inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 0, text: 0, reasoning: 0 } };

export function mockLanguageModel() {
  return new MockLanguageModelV4({
    provider: "mock",
    modelId: "mock",
    doGenerate: async ({ prompt }) => {
      const system = prompt.find((m) => m.role === "system");
      const task = typeof system?.content === "string" && system.content.includes("Tarea: GENERACIÓN") ? "generate" : "select";
      if (task === "select") {
        const { notes } = payloadFromPrompt<{ notes: SourceNote[] }>(prompt);
        return { content: [{ type: "text", text: JSON.stringify(mockSelect(notes)) }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] };
      }
      const { selection, sources } = payloadFromPrompt<{ selection: Selection; sources: SourceNote[] }>(prompt);
      const draft = mockGenerate(selection, sources);
      // First step: verify every citation with the tool, as the prompt asks. Second step: answer.
      const checked = prompt.some((m) => m.role === "tool");
      if (!checked) {
        const references = [...draft.sections.flatMap((s) => s.references), ...draft.diagnosis.references, ...draft.prestacion.references];
        return {
          content: [{ type: "tool-call", toolCallId: "check-1", toolName: "check_references", input: JSON.stringify({ references }) }],
          finishReason: { unified: "tool-calls", raw: undefined },
          usage,
          warnings: [],
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(draft) }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] };
    },
  });
}

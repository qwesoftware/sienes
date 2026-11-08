import type { Alert, Draft } from "@/contracts/draft";

// Codes that say the history lacks something. Every other alert or source flag
// asks the reviewer to check something (a contradiction, a number without a
// source, a corrected label) and is the only kind shown as "Para revisar".
const gapCodes: ReadonlySet<string> = new Set(["missing-information", "no-clinical-content", "no-sources"]);

export const isGap = (item: { code: string }) => gapCodes.has(item.code);

export const checksOf = (draft: Draft): Alert[] => draft.alerts.filter((a) => !isGap(a));

// The portal fields, keyed by the alert section that covers them.
const portalFields: { label: string; sectionKey: string; empty: (d: Draft) => boolean }[] = [
  { label: "Diagnóstico", sectionKey: "diagnosis", empty: (d) => !d.diagnosis.text },
  { label: "Código CIE-10", sectionKey: "diagnosis", empty: (d) => !d.diagnosis.cie10 },
  { label: "Práctica", sectionKey: "prestacion", empty: (d) => !d.prestacion.practiceCode },
  { label: "Módulo", sectionKey: "prestacion", empty: (d) => !d.prestacion.module },
  { label: "Cantidad", sectionKey: "prestacion", empty: (d) => d.prestacion.quantity === null },
];

// What the history does not contain: the empty portal fields and sections by
// name, plus the gap alerts about anything that is not already empty.
export function missingInHistory(draft: Draft): { labels: string[]; notes: Alert[] } {
  const fields = portalFields.filter((f) => f.empty(draft));
  const sections = draft.sections.filter((s) => s.text === "");
  const covered = new Set([...fields.map((f) => f.sectionKey), ...sections.map((s) => s.key)]);
  return {
    labels: [...fields.map((f) => f.label), ...sections.map((s) => s.title)],
    notes: draft.alerts.filter((a) => isGap(a) && !(a.sectionKey && covered.has(a.sectionKey))),
  };
}

// What makes confirming the review ask first: open checks only. Missing data
// is the usual state of a history and does not ask. Null when nothing is open.
export function pendingSummary(draft: Draft): string | null {
  const n = checksOf(draft).length;
  if (n === 0) return null;
  return n === 1 ? "Queda 1 punto para revisar" : `Quedan ${n} puntos para revisar`;
}

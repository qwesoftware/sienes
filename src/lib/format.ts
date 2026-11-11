import type { NoteKind, SelectedSpecialty } from "@/contracts/ai";
import type { Alert } from "@/contracts/draft";
import type { EditEvent } from "@/contracts/telemetry";
import type { CaseState } from "@/contracts/case";

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export const stateLabels: Record<CaseState, string> = {
  reading: "Leyendo",
  "confirmation-required": "Confirmar datos",
  "ready-to-analyze": "Analizar fuentes",
  analyzing: "Analizando",
  "ready-to-generate": "Revisar fuentes",
  generating: "Generando",
  draft: "Revisar resumen",
  reviewed: "Revisado",
  error: "Error",
  canceled: "Cancelado",
};

export const noteKindLabels: Record<NoteKind, string> = {
  report: "Informe completo",
  "progress-note": "Nota de evolución",
  administrative: "Administrativa o ausencia",
  "prior-summary": "Resumen anterior",
  ambiguous: "Tipo ambiguo",
};

export const flagLabels: Record<SelectedSpecialty["flags"][number]["code"], string> = {
  "ambiguous-kind": "Tipo ambiguo",
  "label-override": "Etiqueta corregida",
  contradiction: "Contradicción",
  undated: "Sin fecha confiable",
  "no-clinical-content": "Sin contenido clínico",
  "unknown-specialty": "Sin especialidad identificada",
};

export const alertLabels: Record<Alert["code"], string> = {
  "missing-information": "Falta información",
  contradiction: "Contradicción",
  "ambiguous-source": "Fuente ambigua",
  "label-override": "Etiqueta corregida",
  "undated-note": "Nota sin fecha",
  "no-clinical-content": "Sin contenido clínico",
  "unknown-specialty": "Sin especialidad identificada",
  "invalid-reference": "Referencia inválida",
  "numeric-mismatch": "Número sin respaldo",
  "no-sources": "Sin fuentes",
};

export const editReasonLabels: Record<NonNullable<EditEvent["reason"]>, string> = {
  omission: "Omisión",
  "incorrect-fact": "Dato incorrecto",
  format: "Formato",
  wording: "Redacción",
  "source-selection": "Selección de fuentes",
};

// Medexis writes names in capitals: "RUIZ DIAZ CARLOS" reads as "Ruiz Diaz Carlos".
export function titleCase(text: string): string {
  return text.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, gap: string, letter: string) => gap + letter.toUpperCase());
}

// "1 nota", "3 notas".
export function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

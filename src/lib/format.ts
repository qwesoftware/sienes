import type { CaseState } from "@/contracts/case";

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export const stateLabels: Record<CaseState, string> = {
  reading: "Leyendo",
  "confirmation-required": "Confirmar datos",
  "ready-to-analyze": "Listo para analizar",
  analyzing: "Analizando",
  "ready-to-generate": "Listo para generar",
  generating: "Generando",
  draft: "Borrador",
  reviewed: "Revisado",
  error: "Error",
  canceled: "Cancelado",
};

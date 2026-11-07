import type { Draft } from "@/contracts/draft";

// Portal fields the reviewer is warned about when empty, with the gender
// the Spanish adjective agrees with.
const portalFields: { label: string; feminine: boolean; empty: (d: Draft) => boolean }[] = [
  { label: "Diagnóstico", feminine: false, empty: (d) => !d.diagnosis.text },
  { label: "Práctica", feminine: true, empty: (d) => !d.prestacion.practiceCode },
  { label: "Módulo", feminine: false, empty: (d) => !d.prestacion.module },
  { label: "Cantidad", feminine: true, empty: (d) => d.prestacion.quantity === null },
];

const joinList = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`);

// What is still open when the reviewer confirms: e.g. "1 alerta abierta ·
// Práctica, Módulo y Cantidad vacíos". Null when nothing is pending.
export function pendingSummary(draft: Draft): string | null {
  const parts: string[] = [];
  const n = draft.alerts.length;
  if (n > 0) parts.push(n === 1 ? "1 alerta abierta" : `${n} alertas abiertas`);
  const empty = portalFields.filter((f) => f.empty(draft));
  if (empty.length > 0) {
    const feminine = empty.every((f) => f.feminine);
    const adjective = `vací${feminine ? "a" : "o"}${empty.length > 1 ? "s" : ""}`;
    parts.push(`${joinList(empty.map((f) => f.label))} ${adjective}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

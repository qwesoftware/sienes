import type { Insurer } from "@/contracts/case";

// Names as they appear in the Medexis coverage field (e.g. "390-OSDE"),
// compared without case or accents.
const coverageNames: [string, Insurer][] = [
  ["PAMI", "pami"],
  ["OSDE", "osde"],
  ["SWISS", "swiss-medical"],
  ["UNION PERSONAL", "union-personal"],
  ["OSTVLA", "ostvla"],
];

// The insurer the printed coverage points to, proposed to the reviewer; null when it names none.
export function proposeInsurer(coverageText: string | null): Insurer | null {
  if (!coverageText) return null;
  const text = coverageText.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase();
  return coverageNames.find(([name]) => text.includes(name))?.[1] ?? null;
}
